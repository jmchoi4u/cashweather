import type { JejuLocation } from "./weather";

/**
 * Korean public-data layer.
 *
 * Two things live here:
 *  1. A real adapter for the KMA short-term forecast service on data.go.kr,
 *     including the DFS grid projection its API requires.
 *  2. A curated Jeju open-data snapshot used for weather-linked place guidance.
 *
 * The KMA endpoint does not send CORS headers and requires a service key, so the
 * adapter stays dormant until `VITE_KMA_SERVICE_KEY` and a proxy are configured.
 * Everything it would supply is currently served by Open-Meteo, and the UI must
 * say so rather than implying a live 기상청 feed.
 */

export type KmaGrid = { nx: number; ny: number };

export type KmaStatus = "configured" | "missing-key";

export type PublicDataSource = {
  id: string;
  name: string;
  provider: string;
  usage: string;
  status: "live" | "snapshot" | "ready";
  url: string;
};

/**
 * 기상청 동네예보 DFS 격자 변환 (Lambert Conformal Conic).
 * Parameters are fixed by the KMA specification; do not tune them.
 */
const DFS = {
  RE: 6371.00877, // 지구 반경 (km)
  GRID: 5.0, // 격자 간격 (km)
  SLAT1: 30.0, // 표준 위도 1
  SLAT2: 60.0, // 표준 위도 2
  OLON: 126.0, // 기준점 경도
  OLAT: 38.0, // 기준점 위도
  XO: 43, // 기준점 X 좌표
  YO: 136, // 기준점 Y 좌표
} as const;

export function latLonToGrid(latitude: number, longitude: number): KmaGrid {
  const DEGRAD = Math.PI / 180.0;
  const re = DFS.RE / DFS.GRID;
  const slat1 = DFS.SLAT1 * DEGRAD;
  const slat2 = DFS.SLAT2 * DEGRAD;
  const olon = DFS.OLON * DEGRAD;
  const olat = DFS.OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (sf ** sn * Math.cos(slat1)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / ro ** sn;

  let ra = Math.tan(Math.PI * 0.25 + latitude * DEGRAD * 0.5);
  ra = (re * sf) / ra ** sn;

  let theta = longitude * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + DFS.XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + DFS.YO + 0.5),
  };
}

/** KMA publishes 단기예보 at 8 fixed base times each day. */
export function kmaBaseTime(now: Date = new Date()): { baseDate: string; baseTime: string } {
  const seoul = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60_000);
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const hour = seoul.getHours();

  let slot = slots.filter((value) => value + 1 <= hour).pop();
  const target = new Date(seoul);

  if (slot === undefined) {
    slot = 23;
    target.setDate(target.getDate() - 1);
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  const baseDate = `${target.getFullYear()}${pad(target.getMonth() + 1)}${pad(target.getDate())}`;
  return { baseDate, baseTime: `${pad(slot)}00` };
}

export function kmaServiceKey(): string | null {
  const key = import.meta.env?.VITE_KMA_SERVICE_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
}

export function kmaStatus(): KmaStatus {
  return kmaServiceKey() ? "configured" : "missing-key";
}

/**
 * Builds the exact 기상청 단기예보조회 request for a location.
 * Exposed so the UI can show a real, inspectable public-data call even while the
 * service key is not provisioned.
 */
export function kmaForecastRequest(location: JejuLocation, now: Date = new Date()) {
  const grid = latLonToGrid(location.latitude, location.longitude);
  const { baseDate, baseTime } = kmaBaseTime(now);
  const params = new URLSearchParams({
    serviceKey: kmaServiceKey() ?? "{VITE_KMA_SERVICE_KEY}",
    pageNo: "1",
    numOfRows: "290",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(grid.nx),
    ny: String(grid.ny),
  });

  return {
    grid,
    baseDate,
    baseTime,
    endpoint: "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    url: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params}`,
  };
}

export type JejuPlace = {
  id: string;
  name: string;
  category: "indoor" | "outdoor" | "shelter";
  district: string;
  latitude: number;
  longitude: number;
  note: string;
};

/**
 * Curated snapshot derived from 제주특별자치도 공공데이터 (관광지·민방위대피시설).
 * Static on purpose: the MVP ships the extract rather than calling the portal at
 * runtime, and every surface that renders it must label it as a snapshot.
 */
export const JEJU_PLACES: JejuPlace[] = [
  { id: "folk", name: "제주민속자연사박물관", category: "indoor", district: "제주시 삼성로", latitude: 33.5074, longitude: 126.5341, note: "비 오는 날 실내 관람" },
  { id: "arte", name: "아르떼뮤지엄 제주", category: "indoor", district: "제주시 애월읍", latitude: 33.4176, longitude: 126.3227, note: "전천후 실내 전시" },
  { id: "market", name: "동문재래시장", category: "indoor", district: "제주시 관덕로", latitude: 33.5122, longitude: 126.5273, note: "아케이드 구간 우천 대응" },
  { id: "sarabong", name: "사라봉공원", category: "outdoor", district: "제주시 건입동", latitude: 33.5216, longitude: 126.5416, note: "맑은 날 일몰 명소" },
  { id: "hamdeok", name: "함덕해수욕장", category: "outdoor", district: "제주시 조천읍", latitude: 33.5433, longitude: 126.6697, note: "바람 약한 날 추천" },
  { id: "seongsan", name: "성산일출봉", category: "outdoor", district: "서귀포시 성산읍", latitude: 33.4580, longitude: 126.9425, note: "강풍 시 탐방 통제" },
  { id: "shelter-ara", name: "아라동주민센터 대피시설", category: "shelter", district: "제주시 아라동", latitude: 33.4931, longitude: 126.5568, note: "호우·태풍 시 대피" },
  { id: "shelter-ido", name: "이도2동 민방위대피소", category: "shelter", district: "제주시 이도2동", latitude: 33.4996, longitude: 126.5312, note: "호우·태풍 시 대피" },
];

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type PlaceSuggestion = JejuPlace & { distanceKm: number; reason: string };

/** Picks places that suit the current conditions, nearest first. */
export function suggestPlaces(
  location: JejuLocation,
  conditions: { raining: boolean; windSpeed: number; heavyRain: boolean },
  limit = 3,
): PlaceSuggestion[] {
  const wanted: JejuPlace["category"] = conditions.heavyRain
    ? "shelter"
    : conditions.raining || conditions.windSpeed >= 25
      ? "indoor"
      : "outdoor";

  const reason = conditions.heavyRain
    ? "호우 상황 · 대피시설 안내"
    : conditions.raining
      ? "강수 중 · 실내 우선"
      : conditions.windSpeed >= 25
        ? "강풍 · 실내 우선"
        : "야외 활동 좋은 조건";

  return JEJU_PLACES.filter((place) => place.category === wanted)
    .map((place) => ({
      ...place,
      distanceKm: distanceKm(location.latitude, location.longitude, place.latitude, place.longitude),
      reason,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function publicDataSources(location: JejuLocation): PublicDataSource[] {
  const request = kmaForecastRequest(location);
  return [
    {
      id: "kma",
      name: `기상청 단기예보 (격자 ${request.grid.nx},${request.grid.ny})`,
      provider: "공공데이터포털 · 기상청",
      usage: kmaStatus() === "configured" ? "정산 교차검증 호출" : "어댑터 구현 완료 · 서비스키 발급 시 활성화",
      status: kmaStatus() === "configured" ? "live" : "ready",
      url: "https://www.data.go.kr/data/15084084/openapi.do",
    },
    {
      id: "jeju-places",
      name: "제주 관광지·민방위대피시설",
      provider: "제주특별자치도 공공데이터",
      usage: "날씨 조건별 실내/야외/대피 장소 추천",
      status: "snapshot",
      url: "https://www.jeju.go.kr/open/open/iopenboard.htm",
    },
    {
      id: "open-meteo",
      name: "Open-Meteo 예보·관측",
      provider: "Open-Meteo (CC BY 4.0)",
      usage: "마켓 생성 · 자동 정산 실측값",
      status: "live",
      url: "https://open-meteo.com/",
    },
    {
      id: "weathernext",
      name: "Google WeatherNext 2 앙상블",
      provider: "Open-Meteo Ensemble API",
      usage: "64멤버 확률 산출 · 마켓 가격",
      status: "live",
      url: "https://open-meteo.com/en/docs/google-weathernext-api",
    },
  ];
}
