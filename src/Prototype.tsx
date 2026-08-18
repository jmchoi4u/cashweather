import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowRight,
  IconBell,
  IconBellRinging,
  IconBolt,
  IconBuildingBank,
  IconCamera,
  IconChartBar,
  IconChartHistogram,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconCloud,
  IconCloudRain,
  IconCoins,
  IconCrown,
  IconDatabase,
  IconDroplet,
  IconFaceMask,
  IconFilter,
  IconFlame,
  IconGauge,
  IconHanger,
  IconHistory,
  IconHome,
  IconInfoCircle,
  IconLockOpen,
  IconMan,
  IconMapPin,
  IconPlus,
  IconRadar,
  IconRefresh,
  IconScale,
  IconSearch,
  IconShieldCheck,
  IconShirt,
  IconShoe,
  IconSparkles,
  IconSun,
  IconTarget,
  IconTemperature,
  IconTicket,
  IconTrendingDown,
  IconTrendingUp,
  IconTrophy,
  IconUmbrella,
  IconUser,
  IconWallet,
  IconWind,
  IconWoman,
  IconX,
} from "@tabler/icons-react";
import { BottomSheet, Carousel, KeyboardInput, MobileScroll, publicAsset, useKeyboard, useScreenPortal } from "./mobile";
import {
  fetchJejuWeather,
  isRainCode,
  JEJU_LOCATIONS,
  weatherLabel,
  type JejuLocation,
  type WeatherBundle,
} from "./weather";
import { CALIBRATION_META, RELIABILITY, calibrationDelta } from "./calibration";
import {
  buildMarkets,
  buildReplayMarkets,
  createTicket,
  formatObserved,
  isMarketOpen,
  loadLedger,
  loadSettlements,
  minutesUntilClose,
  saveLedger,
  saveSettlements,
  scoreLedger,
  settleLedger,
  CATEGORY_LABELS,
  DEFAULT_STAKE,
  GUARANTEE_POINTS,
  STAKE_OPTIONS,
  type MarketCategory,
  type ScoreCard,
  type Settlement,
  type Side,
  type Ticket,
  type WeatherMarket,
} from "./markets";
import { kmaForecastRequest, publicDataSources, suggestPlaces } from "./publicdata";
import {
  fetchForecastAudit,
  fetchJejuBoard,
  fetchObservedSeries,
  fetchReplayHours,
  formatHourKey,
  type BoardPoint,
  type ForecastAudit,
  type ReplayHour,
} from "./verification";

type Tab = "home" | "market" | "live" | "ledger";
type Prediction = "rain" | "dry";
type Report = "dry" | "drizzle" | "rain" | "wet";
type OutfitGender = "men" | "women";
type TablerIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>;

type OutfitPreset = {
  summary: string;
  top: string;
  bottom: string;
  shoes: string;
  reason: string;
};

const reports: Array<{ id: Report; title: string; detail: string; icon: TablerIcon }> = [
  { id: "dry", title: "비 안 와요", detail: "노면도 말라 있어요", icon: IconSun },
  { id: "drizzle", title: "약한 비", detail: "우산이 있으면 좋아요", icon: IconCloudRain },
  { id: "rain", title: "강한 비", detail: "빗줄기가 굵어요", icon: IconUmbrella },
  { id: "wet", title: "노면 젖음", detail: "지금 비는 안 와요", icon: IconDroplet },
];

const neighborhood = [
  { place: "아라초등학교", distance: "180m", status: "약한 비", count: 38, trust: 96, tone: "rain" },
  { place: "제주대학교 정문", distance: "640m", status: "노면 젖음", count: 24, trust: 91, tone: "wet" },
  { place: "아라동 주민센터", distance: "920m", status: "비 안 옴", count: 17, trust: 88, tone: "dry" },
];

type WeatherState = {
  data: WeatherBundle | null;
  loading: boolean;
  error: string | null;
  refreshedAt: Date | null;
  reload: () => void;
};

function useJejuWeather(location: JejuLocation): WeatherState {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setLoading(true);
    setError(null);

    fetchJejuWeather(location, controller.signal)
      .then((next) => {
        setData(next);
        setRefreshedAt(new Date());
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "날씨 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [location, reloadKey]);

  return { data, loading, error, refreshedAt, reload: () => setReloadKey((value) => value + 1) };
}

function formatHour(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "예정";
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", hour12: true }).format(value);
}

function formatShortTime(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "--:--";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

function weatherIconFor(code: number): TablerIcon {
  if (isRainCode(code)) return IconCloudRain;
  if (code <= 1) return IconSun;
  return IconCloud;
}

function rainMessage(weather: WeatherBundle | null) {
  if (!weather) return { headline: "제주 실시간 예보 연결 중", short: "예보 연결 중", description: "Open-Meteo 응답을 기다리고 있어요.", raining: false };

  const rainingNow = weather.current.precipitation >= 0.05 || isRainCode(weather.current.weatherCode);
  const currentTime = new Date(weather.current.time).getTime();
  const future = weather.minutely.slice(1);
  const targetIndex = future.findIndex((point) => {
    const raining = point.precipitation >= 0.05 || isRainCode(point.weatherCode);
    return rainingNow ? !raining : raining;
  });

  if (targetIndex < 0) {
    const nextHour = weather.hourly[0];
    const nextHourRain = !rainingNow && nextHour && (
      nextHour.precipitationProbability >= 50
      || nextHour.precipitation >= 0.05
      || isRainCode(nextHour.weatherCode)
    );

    if (nextHourRain) {
      const probability = Math.round(nextHour.precipitationProbability);
      return {
        headline: `다음 1시간 비 가능성 ${probability}%`,
        short: `1시간 내 비 ${probability}%`,
        description: "15분 보간값에는 아직 강수가 없지만 시간별 예보에는 비 가능성이 있어요.",
        raining: false,
      };
    }

    return rainingNow
      ? { headline: "앞으로 4시간 비가 이어질 수 있어요", short: "비가 이어질 수 있어요", description: "Open-Meteo 15분 간격 예보에서 그침 시점이 잡히지 않았어요.", raining: true }
      : { headline: "앞으로 4시간 비 소식 없어요", short: "4시간 비 소식 없음", description: "Open-Meteo 15분 간격 예보 기준이에요.", raining: false };
  }

  const target = future[targetIndex];
  const targetTime = new Date(target.time).getTime();
  const fallbackMinutes = (targetIndex + 1) * 15;
  const minutes = Number.isFinite(currentTime) && Number.isFinite(targetTime)
    ? Math.max(15, Math.round((targetTime - currentTime) / 900_000) * 15)
    : fallbackMinutes;

  return rainingNow
    ? { headline: `${minutes}분 뒤 비가 그칠 가능성이 있어요`, short: `${minutes}분 뒤 비 그침 예상`, description: "제주 지역은 시간별 모델을 15분 간격으로 보간한 값이에요.", raining: true }
    : { headline: `${minutes}분 뒤 비가 시작될 수 있어요`, short: `${minutes}분 뒤 비 시작 가능`, description: "제주 지역은 시간별 모델을 15분 간격으로 보간한 값이에요.", raining: false };
}

function predictionMetrics(weather: WeatherBundle | null) {
  const target = weather?.hourly[0];
  const liveProbability = weather?.weatherNext?.rainProbability ?? target?.precipitationProbability ?? 50;
  const probability = Math.max(1, Math.min(99, Math.round(liveProbability)));
  const aiPrediction: Prediction = probability >= 50 ? "rain" : "dry";
  const rainMultiplier = Math.min(5, Math.max(1.05, 0.96 / (probability / 100)));
  const dryMultiplier = Math.min(5, Math.max(1.05, 0.96 / ((100 - probability) / 100)));
  const targetDate = target ? new Date(target.time) : null;
  const endDate = targetDate ? new Date(targetDate.getTime() + 3_600_000) : null;

  return {
    probability,
    aiPrediction,
    confidence: aiPrediction === "rain" ? probability : 100 - probability,
    rainMultiplier,
    dryMultiplier,
    rainReward: Math.round(rainMultiplier * 120),
    dryReward: Math.round(dryMultiplier * 120),
    range: target && endDate ? `${formatHour(target.time)}–${formatHour(endDate.toISOString())}` : "다음 1시간",
  };
}

function airQualitySummary(weather: WeatherBundle | null) {
  if (!weather) return { grade: "연결 중", detail: "PM2.5 --" };
  const aqi = weather.air.europeanAqi;
  const grade = aqi <= 20 ? "좋음" : aqi <= 40 ? "양호" : aqi <= 60 ? "보통" : aqi <= 80 ? "나쁨" : "매우 나쁨";
  return { grade, detail: `PM2.5 ${Math.round(weather.air.pm25)}` };
}

function outfitSummary(weather: WeatherBundle | null) {
  const apparent = weather?.current.apparentTemperature ?? 25;
  if (apparent >= 29) return { clothes: "반팔 티 + 반바지", detail: "덥고 습해요" };
  if (apparent >= 23) return { clothes: "반팔 티 + 얇은 바지", detail: "활동하기 좋아요" };
  if (apparent >= 17) return { clothes: "긴팔 티 + 얇은 겉옷", detail: "바람에 대비하세요" };
  return { clothes: "가벼운 재킷", detail: "체감이 서늘해요" };
}

function umbrellaNeeded(weather: WeatherBundle | null) {
  return Boolean(weather && (
    weather.daily.precipitationProbabilityMax >= 40
    || (weather.weatherNext?.rainProbability ?? 0) >= 50
    || rainMessage(weather).raining
  ));
}

function outfitPresetFor(weather: WeatherBundle | null, gender: OutfitGender): OutfitPreset {
  const apparent = weather?.current.apparentTemperature ?? 25;
  const wet = umbrellaNeeded(weather);

  if (apparent >= 29) {
    return gender === "men"
      ? { summary: "기능성 반팔 + 통풍 쇼츠", top: "흡습 반팔 티", bottom: "통풍 쇼츠", shoes: wet ? "방수 운동화" : "메시 운동화", reason: "체감온도가 높고 습해요" }
      : { summary: "린넨 반팔 + 라이트 팬츠", top: "린넨 반팔", bottom: "라이트 와이드 팬츠", shoes: wet ? "방수 스니커즈" : "통풍 스니커즈", reason: "얇고 잘 마르는 소재가 좋아요" };
  }

  if (apparent >= 23) {
    return gender === "men"
      ? { summary: "반팔 티 + 얇은 면바지", top: "코튼 반팔 티", bottom: "얇은 면바지", shoes: wet ? "방수 운동화" : "가벼운 스니커즈", reason: "활동하기 좋은 체감이에요" }
      : { summary: "반팔 상의 + 와이드 팬츠", top: "반팔 블라우스", bottom: "얇은 와이드 팬츠", shoes: wet ? "방수 스니커즈" : "가벼운 스니커즈", reason: "낮에는 가볍게 입어도 좋아요" };
  }

  if (apparent >= 17) {
    return gender === "men"
      ? { summary: "긴팔 티 + 얇은 재킷", top: "긴팔 티", bottom: "데님 팬츠", shoes: "운동화", reason: "바람에 대비해 겉옷을 챙겨요" }
      : { summary: "긴팔 상의 + 가벼운 재킷", top: "긴팔 니트", bottom: "롱 팬츠", shoes: "스니커즈", reason: "얇은 겉옷이 있으면 편해요" };
  }

  return gender === "men"
    ? { summary: "니트 + 바람막이", top: "보온 니트", bottom: "긴 면바지", shoes: "운동화", reason: "체감이 서늘해 보온이 필요해요" }
    : { summary: "니트 + 가벼운 코트", top: "보온 니트", bottom: "롱 팬츠", shoes: "스니커즈", reason: "체감이 서늘해 겹쳐 입어요" };
}

function osmEmbedUrl(location: JejuLocation) {
  const longitudePadding = 0.018;
  const latitudePadding = 0.012;
  const params = new URLSearchParams({
    bbox: `${location.longitude - longitudePadding},${location.latitude - latitudePadding},${location.longitude + longitudePadding},${location.latitude + latitudePadding}`,
    layer: "mapnik",
    marker: `${location.latitude},${location.longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return {
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now),
    date: new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(now),
  };
}

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={`brand ${inverted ? "brand-inverted" : ""}`} aria-label="캐시웨더">
      <span><IconCloudRain size={19} stroke={2.3} /></span>
      <strong>CashWeather</strong>
    </div>
  );
}

function LockScreen({ onUnlock, location, weather, gender }: { onUnlock: () => void; location: JejuLocation; weather: WeatherState; gender: OutfitGender }) {
  const { time, date } = useClock();
  const rain = rainMessage(weather.data);
  const market = predictionMetrics(weather.data);
  const outfit = outfitPresetFor(weather.data, gender);
  const air = airQualitySummary(weather.data);
  const umbrella = umbrellaNeeded(weather.data);
  const temperature = weather.data ? `${Math.round(weather.data.current.temperature)}°` : "--°";
  const WeatherGlyph = weather.data ? weatherIconFor(weather.data.current.weatherCode) : IconCloud;
  const opposite: Prediction = market.aiPrediction === "rain" ? "dry" : "rain";
  const oppositeMultiplier = opposite === "rain" ? market.rainMultiplier : market.dryMultiplier;
  return (
    <MobileScroll className="cw-shell cw-locked">
      <main className="lock-screen" data-testid="lock-screen">
        <img className="lock-photo" src={publicAsset("assets/cashweather/jeju-rain-lockscreen.png")} alt="비 내린 제주 해안도로" />
        <div className="lock-overlay" aria-hidden="true" />
        <div className="lock-inner">
          <section className="lock-clock">
            <p>{date}</p>
            <strong>{time}</strong>
            <span><IconMapPin size={14} /> {location.name}</span>
          </section>

          <section className="lock-weather">
            <WeatherGlyph size={31} stroke={1.7} />
            <div><strong>{temperature}</strong><span>{weather.error ? "실시간 예보 연결 실패" : rain.short}</span></div>
          </section>

          <section className="lock-practical" aria-label="잠금화면 외출 브리핑">
            <div className="lock-practical-head">
              <span><IconShirt size={15} /> 바로 입는 {gender === "men" ? "남성" : "여성"} 프리셋</span>
              <strong>{outfit.summary}</strong>
            </div>
            <div className="lock-outfit-row">
              <span><IconShirt size={14} /> {outfit.top}</span>
              <span><IconHanger size={14} /> {outfit.bottom}</span>
              <span><IconShoe size={14} /> {outfit.shoes}</span>
            </div>
            <div className="lock-practical-chips">
              <span className={umbrella ? "attention" : ""}><IconUmbrella size={13} /> {umbrella ? "우산 필요" : "우산 없이 OK"}</span>
              <span><IconFaceMask size={13} /> {air.grade} · {air.detail}</span>
            </div>
          </section>

          <section className="lock-alert">
            <div className="lock-alert-head"><Brand inverted /><span>지금</span></div>
            <strong>MARKET LIVE · AI는 {market.range}에 {market.aiPrediction === "rain" ? "비가 온다" : "비가 안 온다"}고 봐요</strong>
            <p>AI 반대 결과를 예측하면 <b>{oppositeMultiplier.toFixed(2)}×</b> 포인트 기회가 열려요.</p>
            <span className="lock-odds"><IconTrophy size={15} /> {weather.data?.weatherNext ? "WeatherNext 2 앙상블 · 무료 예측" : "Open-Meteo 실데이터 · 무료 예측"}</span>
          </section>

          <div className="unlock-wrap">
            <motion.button type="button" className="unlock-button" onClick={onUnlock} whileTap={{ scale: 0.97 }}>
              <motion.span animate={{ x: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.35 }}>
                <IconLockOpen size={19} />
              </motion.span>
              밀어서 예측 참여하기
              <IconChevronRight size={18} />
            </motion.button>
            <p>현금 충전 없이 포인트로만 참여해요</p>
          </div>
        </div>
      </main>
    </MobileScroll>
  );
}

function Header({ points, location, onLocation, live }: { points: number; location: JejuLocation; onLocation: () => void; live: boolean }) {
  return (
    <header className="app-header">
      <div>
        <Brand />
        <button type="button" className="location" onClick={onLocation}><IconMapPin size={14} /> {location.name} <IconChevronDown size={13} />{live ? <i className="data-dot" aria-label="실시간 데이터 연결됨" /> : null}</button>
      </div>
      <div className="header-side">
        <button type="button" className="icon-button" aria-label="알림"><IconBell size={19} /><i /></button>
        <span className="points-pill"><IconCoins size={16} /> {points.toLocaleString()}P</span>
      </div>
    </header>
  );
}

function PracticalBrief({
  weather,
  gender,
  onGender,
  closetSaved,
  onCloset,
  reminderOn,
  onReminder,
}: {
  weather: WeatherState;
  gender: OutfitGender;
  onGender: (gender: OutfitGender) => void;
  closetSaved: boolean;
  onCloset: () => void;
  reminderOn: boolean;
  onReminder: () => void;
}) {
  const data = weather.data;
  const preset = outfitPresetFor(data, gender);
  const air = airQualitySummary(data);
  const umbrella = umbrellaNeeded(data);
  const rainProbability = data?.weatherNext?.rainProbability ?? data?.hourly[0]?.precipitationProbability ?? 0;
  const headline = umbrella ? "우산 챙기고, 가볍게 입어요" : "우산 없이 가볍게 나가도 좋아요";

  return (
    <section className="practical-brief" data-testid="practical-brief">
      <div className="practical-head">
        <div><span><i /> 지금 나갈 준비</span><h1>{data ? headline : "첨단로 외출 정보를 불러오는 중"}</h1></div>
        <button type="button" onClick={weather.reload} aria-label="실용 브리핑 새로고침"><IconRefresh size={17} /></button>
      </div>
      <div className="practical-metrics">
        <span><IconTemperature size={17} /><small>체감</small><strong>{data ? `${Math.round(data.current.apparentTemperature)}°` : "--"}</strong></span>
        <span><IconCloudRain size={17} /><small>1시간 비</small><strong>{data ? `${Math.round(rainProbability)}%` : "--"}</strong></span>
        <span><IconFaceMask size={17} /><small>미세먼지</small><strong>{air.grade}</strong></span>
      </div>
      <div className="outfit-preset-head">
        <div><small>바로 입는 옷차림</small><strong>{preset.summary}</strong></div>
        <div className="gender-switch" role="group" aria-label="옷차림 프리셋 성별">
          <button type="button" className={gender === "men" ? "active" : ""} onClick={() => onGender("men")} aria-pressed={gender === "men"}><IconMan size={15} /> 남성</button>
          <button type="button" className={gender === "women" ? "active" : ""} onClick={() => onGender("women")} aria-pressed={gender === "women"}><IconWoman size={15} /> 여성</button>
        </div>
      </div>
      <div className="outfit-preset-grid">
        <article><span><IconShirt size={22} /></span><small>상의</small><strong>{preset.top}</strong></article>
        <article><span><IconHanger size={22} /></span><small>하의</small><strong>{preset.bottom}</strong></article>
        <article><span><IconShoe size={22} /></span><small>신발</small><strong>{preset.shoes}</strong></article>
      </div>
      <p className="preset-reason"><IconSparkles size={14} /> {preset.reason}</p>
      <div className="practical-actions">
        <button type="button" className={closetSaved ? "active" : ""} onClick={onCloset}><IconHanger size={16} /> {closetSaved ? "내 옷장 저장됨" : "프리셋 저장"}</button>
        <button type="button" className={reminderOn ? "active" : ""} onClick={onReminder}><IconBellRinging size={16} /> {reminderOn ? "우산 알림 켜짐" : "우산 알림"}</button>
      </div>
    </section>
  );
}

function RankingCard({ joinedCount }: { joinedCount: number }) {
  const xp = 740 + joinedCount * 40;
  const rank = Math.max(24, 128 - joinedCount * 17);
  const progress = Math.min(100, Math.round(((xp % 500) / 500) * 100));
  const leaders = [
    { rank: 1, name: "한라레이더", xp: 2480 },
    { rank: 2, name: "제주구름", xp: 2310 },
    { rank: 3, name: "바람잡이", xp: 2190 },
  ];
  return (
    <section className="white-card ranking-card" data-testid="ranking-card">
      <div className="ranking-head"><div><span>MVP WEEKLY LEAGUE</span><h2>첨단로 예측 랭킹</h2></div><IconCrown size={25} /></div>
      <div className="my-rank">
        <span><IconUser size={19} /></span>
        <div><small>내 주간 순위</small><strong>#{rank} · 날씨 루키</strong><div><i style={{ width: `${progress}%` }} /></div></div>
        <em>{xp} XP</em>
      </div>
      <div className="leader-list">
        {leaders.map((leader) => <span key={leader.rank}><b>{leader.rank}</b><IconCrown size={13} /><strong>{leader.name}</strong><em>{leader.xp.toLocaleString()} XP</em></span>)}
      </div>
      <p>랭킹·닉네임은 MVP 목데이터이며, 내 XP는 이 기기에서 선택한 챌린지에 따라 올라갑니다.</p>
    </section>
  );
}

function MissionBanners({ joinedCount, closetSaved, reminderOn }: { joinedCount: number; closetSaved: boolean; reminderOn: boolean }) {
  const missions = [
    { icon: IconFlame, kicker: "DAILY STREAK", title: "3일 연속 예측 중", detail: "내일도 참여하면 +100P", tone: "streak" },
    { icon: IconBolt, kicker: "AI MARKET", title: `오늘 ${Math.max(0, 4 - joinedCount)}개 시장 남음`, detail: "모두 참여하면 루키 배지", tone: "market" },
    { icon: closetSaved ? IconCircleCheck : IconHanger, kicker: "OUTFIT MISSION", title: closetSaved ? "옷장 프리셋 저장 완료" : "오늘 옷차림 저장하기", detail: closetSaved ? "내일 자동 추천 준비됨" : "저장하면 +20P", tone: "outfit" },
    { icon: reminderOn ? IconBellRinging : IconUmbrella, kicker: "SMART ALERT", title: reminderOn ? "우산 알림 켜짐" : "비 오기 전 알림 받기", detail: reminderOn ? "출발 전에 알려드릴게요" : "한 번 누르면 설정", tone: "alert" },
  ];
  return (
    <section className="mission-section">
      <div className="section-head"><div><small>매일 돌아오는 이유</small><h2>오늘의 미션</h2></div><span className="mvp-chip">MVP</span></div>
      <Carousel ariaLabel="오늘의 미션 배너" className="mission-carousel" contentClassName="mission-track">
        {missions.map((mission) => {
          const Glyph = mission.icon;
          return <article key={mission.kicker} className={`mission-banner tone-${mission.tone}`}><span><Glyph size={22} /></span><div><small>{mission.kicker}</small><strong>{mission.title}</strong><em>{mission.detail}</em></div><IconChevronRight size={17} /></article>;
        })}
      </Carousel>
    </section>
  );
}

function WeatherHero({ reportCount, onReport, weather, location }: { reportCount: number; onReport: () => void; weather: WeatherState; location: JejuLocation }) {
  const current = weather.data?.current;
  const rain = rainMessage(weather.data);
  const WeatherGlyph = current ? weatherIconFor(current.weatherCode) : IconCloud;
  const probability = weather.data?.hourly[0]?.precipitationProbability ?? 0;

  if (weather.error) {
    return (
      <section className="weather-card weather-error">
        <span className="live-badge"><i /> OPEN-METEO OFFLINE</span>
        <h2>실시간 제주 예보를 불러오지 못했어요</h2>
        <p>네트워크를 확인한 뒤 다시 연결해주세요. 목데이터로 대체하지 않습니다.</p>
        <button type="button" className="weather-report" onClick={weather.reload}><IconRefresh size={18} /> 다시 연결하기</button>
      </section>
    );
  }

  return (
    <section className="weather-card">
      <div className="weather-card-top">
        <span className="live-badge"><i /> OPEN-METEO LIVE</span>
        <button type="button" className="updated data-refresh" onClick={weather.reload}><IconRefresh size={13} /> {current ? formatShortTime(current.time) : "연결 중"}</button>
      </div>
      <div className="weather-main">
        <WeatherGlyph size={55} stroke={1.45} />
        <strong>{current ? Math.round(current.temperature) : "--"}<span>°</span></strong>
        <div><span>체감 {current ? Math.round(current.apparentTemperature) : "--"}°</span><span>습도 {current ? Math.round(current.humidity) : "--"}%</span></div>
      </div>
      <h2>{rain.headline}</h2>
      <p>{rain.description}</p>
      <div className="countdown-track"><span style={{ width: `${weather.loading ? 12 : Math.max(12, 100 - probability)}%` }} /></div>
      <div className="weather-proof">
        <span><IconMapPin size={15} /> {location.name} {weather.data ? `${weather.data.latitude.toFixed(2)}, ${weather.data.longitude.toFixed(2)}` : "좌표 확인 중"}</span>
        <span>주민 제보 {reportCount}건</span>
      </div>
      <button type="button" className="weather-report" onClick={onReport}><IconPlus size={19} /> 지금 날씨 알려주고 <b>+30P</b></button>
    </section>
  );
}

function HourlyRail({ weather }: { weather: WeatherBundle | null }) {
  const hours = weather?.hourly.slice(0, 6) ?? [];
  return (
    <section className="white-card hourly-section">
      <div className="section-head"><div><small>Open-Meteo 시간별 예보</small><h2>제주 다음 6시간</h2></div><button type="button">전체 <IconChevronRight size={15} /></button></div>
      <Carousel ariaLabel="시간별 날씨" className="hourly-carousel" contentClassName="hourly-track">
        {hours.length ? hours.map((hour, index) => {
          const Glyph = weatherIconFor(hour.weatherCode);
          return (
            <article key={hour.time} className={`hour-item ${index === 0 ? "active" : ""}`}>
              <span>{index === 0 ? "다음" : formatHour(hour.time)}</span><Glyph size={25} stroke={1.8} /><strong>{Math.round(hour.temperature)}°</strong><em>{Math.round(hour.precipitationProbability)}%</em><small>{weatherLabel(hour.weatherCode)}</small>
            </article>
          );
        }) : <div className="hourly-loading"><IconRefresh size={18} /> 실시간 예보 연결 중...</div>}
      </Carousel>
    </section>
  );
}

function DailyAssist({ weather }: { weather: WeatherBundle | null }) {
  const outfit = outfitSummary(weather);
  const air = airQualitySummary(weather);
  const umbrella = weather && (weather.daily.precipitationProbabilityMax >= 40 || rainMessage(weather).raining);
  return (
    <section className="white-card assist-section">
      <div className="section-head"><div><small>실시간 생활 추천</small><h2>오늘 이렇게 준비하세요</h2></div><span className="mvp-chip">LIVE DATA</span></div>
      <div className="assist-grid">
        <article className="outfit-card">
          <div className="assist-icon outfit"><IconShirt size={25} /></div>
          <small>추천 옷차림</small>
          <strong>{outfit.clothes}</strong>
          <span>{outfit.detail}</span>
          <button type="button"><IconHanger size={15} /> 내 옷장 등록 <IconChevronRight size={14} /></button>
        </article>
        <article>
          <div className="assist-icon umbrella"><IconUmbrella size={24} /></div>
          <small>챙길 것</small><strong>{umbrella ? "접이식 우산" : "가볍게 외출"}</strong><span>{weather ? `오늘 최대 ${Math.round(weather.daily.precipitationProbabilityMax)}%` : "예보 연결 중"}</span>
        </article>
        <article>
          <div className="assist-icon dust"><IconFaceMask size={24} /></div>
          <small>미세먼지</small><strong>{air.grade}</strong><span>{air.detail}</span>
        </article>
      </div>
    </section>
  );
}

function ModelAgreement({ weather }: { weather: WeatherBundle | null }) {
  const ensemble = weather?.weatherNext;
  const memberCount = ensemble?.memberCount ?? 64;
  const rainMembers = ensemble?.rainMembers ?? 0;
  const agreement = ensemble?.rainProbability ?? 0;
  const dots = Array.from({ length: memberCount }, (_, index) => index < rainMembers);

  return (
    <section className="white-card agreement-card" data-testid="weather-next-card">
      <div className="section-head">
        <div><small>GOOGLE AI ENSEMBLE · LIVE</small><h2>WeatherNext 2 모델 합의도</h2></div>
        <span className="weather-next-chip">64 AI</span>
      </div>
      <div className="agreement-body">
        <div className="agreement-score">
          <span>{ensemble ? "RAIN AGREEMENT" : "CONNECTING"}</span>
          <strong>{ensemble ? agreement : "--"}<b>%</b></strong>
          <em>{ensemble ? `${rainMembers}/${memberCount} 시나리오` : "앙상블 연결 중"}</em>
        </div>
        <div className="member-grid" aria-label={ensemble ? `${memberCount}개 시나리오 중 ${rainMembers}개 강수 예측` : "WeatherNext 앙상블 연결 중"}>
          {dots.map((rain, index) => <i key={index} className={rain ? "rain" : "dry"} />)}
        </div>
      </div>
      <div className="agreement-stats">
        <span>평균 강수 <strong>{ensemble ? `${ensemble.meanPrecipitation.toFixed(2)}mm` : "--"}</strong></span>
        <span>기온 범위 <strong>{ensemble ? `${ensemble.temperatureMin.toFixed(1)}–${ensemble.temperatureMax.toFixed(1)}°` : "--"}</strong></span>
      </div>
      <p>WeatherNext 2의 6시간 원자료를 Open-Meteo가 시간별로 보간한 값입니다. 강수 0.05mm 이상을 ‘비’ 시나리오로 집계했어요.</p>
    </section>
  );
}

function outdoorScore(weather: WeatherBundle | null) {
  if (!weather) return 0;
  const rainProbability = predictionMetrics(weather).probability;
  const temperaturePenalty = Math.abs(weather.current.apparentTemperature - 23) * 1.7;
  const windPenalty = Math.max(0, weather.current.windSpeed - 12) * 1.1;
  const airPenalty = Math.max(0, weather.air.europeanAqi - 20) * 0.35;
  return Math.max(18, Math.min(98, Math.round(100 - rainProbability * 0.52 - temperaturePenalty - windPenalty - airPenalty)));
}

function JejuContext({ weather, location }: { weather: WeatherBundle | null; location: JejuLocation }) {
  const [shareState, setShareState] = useState("");
  const probability = predictionMetrics(weather).probability;
  const wet = probability >= 50;
  const score = outdoorScore(weather);
  const placeSets: Record<string, { wet: string[]; dry: string[] }> = {
    cheomdan: { wet: ["첨단단지 실내 라운지", "넥슨컴퓨터박물관"], dry: ["한라생태숲", "절물자연휴양림"] },
    ara: { wet: ["제주도립미술관", "넥슨컴퓨터박물관"], dry: ["한라생태숲", "산천단 산책로"] },
    cityhall: { wet: ["제주민속자연사박물관", "동문시장"], dry: ["산지천 산책길", "사라봉"] },
    aewol: { wet: ["아르떼뮤지엄 제주", "애월 실내 카페거리"], dry: ["한담해안산책로", "곽지해수욕장"] },
    seongsan: { wet: ["빛의 벙커", "성산 실내 카페"], dry: ["성산일출봉", "섭지코지"] },
    seogwipo: { wet: ["이중섭미술관", "서귀포 매일올레시장"], dry: ["천지연폭포", "새연교 산책로"] },
  };
  const places = placeSets[location.id] ?? placeSets.ara;
  const recommendations = wet ? places.wet : places.dry;
  const sponsoredTitle = wet ? "비 오는 제주, 따뜻한 브루잉" : "산책 뒤 시원한 제주 한 잔";
  const sponsoredDetail = wet ? "실내 좌석 넉넉한 카페 · 10% 쿠폰" : "테이크아웃 음료 · 1,000원 할인";

  const sharePrediction = async () => {
    const message = `${location.name} ${wet ? "비 온다" : "비 안 온다"}에 예측했어요. WeatherNext 2 합의도 ${probability}%, 틀리면 포인트!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "CashWeather 제주 예측", text: message, url: window.location.href });
        setShareState("공유 완료");
      } else {
        await navigator.clipboard.writeText(`${message} ${window.location.href}`);
        setShareState("링크 복사됨");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("공유를 다시 시도해주세요");
    }
  };

  return (
    <section className="white-card context-section">
      <div className="section-head">
        <div><small>실시간 날씨 조건 + 추천 목데이터</small><h2>오늘의 {location.name}</h2></div>
        <button type="button" className="share-prediction" onClick={sharePrediction}><IconTicket size={14} /> {shareState || "예측 공유"}</button>
      </div>
      <div className="outdoor-score">
        <div><span>OUTDOOR SCORE</span><strong>{weather ? score : "--"}<b>/100</b></strong></div>
        <div className="score-track"><span style={{ width: `${weather ? score : 8}%` }} /></div>
        <em>{wet ? "실내 활동 추천" : "야외 활동 추천"}</em>
      </div>
      <div className="place-list">
        {recommendations.map((place, index) => (
          <article key={place}><span>{index + 1}</span><div><strong>{place}</strong><small>Weather Fit {wet ? 95 - index * 4 : 96 - index * 4}</small></div><IconChevronRight size={17} /></article>
        ))}
      </div>
      <article className="sponsored-card">
        <div className="sponsored-label"><span>SPONSORED</span><em>MVP 광고 슬롯 · AdFit 연동 예정</em></div>
        <div><span className="sponsor-icon">{wet ? "☕" : "🥤"}</span><p><strong>{sponsoredTitle}</strong><small>{sponsoredDetail}</small></p><button type="button">쿠폰 보기</button></div>
        <footer>개인정보 대신 현재 지역·날씨 조건으로만 고른 컨텍스트 광고예요.</footer>
      </article>
      <p className="context-footnote">장소·광고는 MVP 예시이며 VisitJeju/Kakao Local/AdFit 실제 데이터가 아닙니다. 공유는 Web Share API와 링크 복사로 동작해요.</p>
    </section>
  );
}

function MarketCta({ market, onGo }: { market: WeatherMarket | null; onGo: () => void }) {
  if (!market) return null;

  return (
    <button type="button" className="market-cta" onClick={onGo} data-testid="market-cta">
      <div className="cta-top">
        <span className="live-badge"><i /> MARKET LIVE</span>
        <em>{market.probability}% YES</em>
      </div>
      <strong>{market.question}</strong>
      <span>우리 예측이 틀리면 {GUARANTEE_POINTS}P를 드려요 · 현금 없이 무료 참여</span>
      <div className="cta-go">마켓에서 예측하기 <IconArrowRight size={13} /></div>
    </button>
  );
}

function HomeScreen(props: {
  points: number;
  location: JejuLocation;
  weather: WeatherState;
  featuredMarket: WeatherMarket | null;
  onGoMarket: () => void;
  onReport: () => void;
  onLocation: () => void;
  reportCount: number;
  outfitGender: OutfitGender;
  onOutfitGender: (gender: OutfitGender) => void;
  closetSaved: boolean;
  onCloset: () => void;
  reminderOn: boolean;
  onReminder: () => void;
  joinedCount: number;
}) {
  return (
    <>
      <Header points={props.points} location={props.location} onLocation={props.onLocation} live={Boolean(props.weather.data)} />
      <main className="app-content home-content" data-testid="home-screen">
        <PracticalBrief
          weather={props.weather}
          gender={props.outfitGender}
          onGender={props.onOutfitGender}
          closetSaved={props.closetSaved}
          onCloset={props.onCloset}
          reminderOn={props.reminderOn}
          onReminder={props.onReminder}
        />
        <MarketCta market={props.featuredMarket} onGo={props.onGoMarket} />
        <RankingCard joinedCount={props.joinedCount} />
        <ModelAgreement weather={props.weather.data} />
        <WeatherHero reportCount={props.reportCount} onReport={props.onReport} weather={props.weather} location={props.location} />
        <HourlyRail weather={props.weather.data} />
        <DailyAssist weather={props.weather.data} />
        <JejuContext weather={props.weather.data} location={props.location} />
        <MissionBanners joinedCount={props.joinedCount} closetSaved={props.closetSaved} reminderOn={props.reminderOn} />
        <section className="engine-note data-source-note">
          <IconGauge size={21} />
          <div>
            <strong>{props.weather.data ? "제주 실데이터 연결됨" : props.weather.error ? "실데이터 재연결 필요" : "실데이터 연결 중"}</strong>
            <span>예보 Open-Meteo · AI 앙상블 WeatherNext 2 · 대기질 Open-Meteo/CAMS · 지도 OpenStreetMap</span>
            <span className="source-links">
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
              <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">OSM</a>
              <a href="https://open-meteo.com/en/docs/google-weathernext-api" target="_blank" rel="noreferrer">WeatherNext 2 API</a>
            </span>
          </div>
          <em>{props.weather.data ? "LIVE" : "CHECK"}</em>
        </section>
      </main>
    </>
  );
}

function LiveScreen({
  points,
  reportCount,
  onReport,
  location,
  onLocation,
  weather,
}: {
  points: number;
  reportCount: number;
  onReport: () => void;
  location: JejuLocation;
  onLocation: () => void;
  weather: WeatherState;
}) {
  const rain = rainMessage(weather.data);
  const forecastProbability = Math.round(weather.data?.hourly[0]?.precipitationProbability ?? 0);
  const wind = Math.round(weather.data?.current.windSpeed ?? 0);
  const localNeighborhood = location.id === "ara" ? neighborhood : neighborhood.map((row, index) => ({
    ...row,
    place: index === 0 ? `${location.name} 중심` : index === 1 ? `${location.name} 동쪽` : `${location.name} 생활권`,
  }));

  return (
    <>
      <Header points={points} location={location} onLocation={onLocation} live={Boolean(weather.data)} />
      <main className="app-content live-content" data-testid="live-screen">
        <div className="page-title"><span>실제 지도 위 예보 + 주민 목데이터</span><h1>{location.name} 실황</h1></div>
        <section className="map-card">
          <iframe key={location.id} src={osmEmbedUrl(location)} title={`${location.name} OpenStreetMap 지도`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" data-scroll-drag="ignore" />
          <div className="map-toolbar"><span><i /> OSM + 실시간 예보</span><em>{weather.data ? formatShortTime(weather.data.current.time) : "연결 중"}</em></div>
          <button type="button" className="map-marker marker-a"><IconCloudRain size={17} /> 38</button>
          <button type="button" className="map-marker marker-b"><IconDroplet size={17} /> 24</button>
          <a className="osm-attribution" href={`https://www.openstreetmap.org/#map=13/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
          <div className="map-metrics"><div><strong>{weather.data ? `${forecastProbability}%` : "--"}</strong><span>다음 1시간 강수확률</span></div><div><strong>{weather.data ? `${wind}km/h` : "--"}</strong><span>현재 바람</span></div></div>
        </section>
        <section className="insight-card"><IconSparkles size={20} /><div><strong>{rain.headline}</strong><span>{rain.description}</span></div></section>
        <section className="white-card live-list-card">
          <div className="section-head"><div><small>MVP 주민 제보 · 예보와 분리</small><h2>내 주변 현장 목데이터</h2></div><button type="button">최신순</button></div>
          <div className="live-list">
            {localNeighborhood.map((row) => (
              <article key={row.place}>
                <i className={`tone-${row.tone}`} />
                <div><strong>{row.place}</strong><span>{row.distance} · 제보 {row.count}건</span></div>
                <div><strong>{row.status}</strong><span><IconShieldCheck size={12} /> {row.trust}%</span></div>
              </article>
            ))}
          </div>
        </section>
        <button type="button" className="wide-report" onClick={onReport}><IconCamera size={19} /> 내 위치 날씨 제보하기 <b>+30P</b></button>
      </main>
    </>
  );
}

function Navigation({ tab, onTab, onReport }: { tab: Tab; onTab: (tab: Tab) => void; onReport: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <button type="button" className={tab === "home" ? "active" : ""} onClick={() => onTab("home")}><IconHome size={21} /><span>홈</span></button>
      <button type="button" className={tab === "market" ? "active" : ""} onClick={() => onTab("market")}><IconChartBar size={21} /><span>마켓</span></button>
      <button type="button" className="report-fab" onClick={onReport} aria-label="날씨 제보"><i><IconPlus size={25} /></i><span>제보</span></button>
      <button type="button" className={tab === "live" ? "active" : ""} onClick={() => onTab("live")}><IconRadar size={22} /><span>실황</span></button>
      <button type="button" className={tab === "ledger" ? "active" : ""} onClick={() => onTab("ledger")}><IconWallet size={21} /><span>내예측</span></button>
    </nav>
  );
}

function LocationSheet({ open, onOpen, location, onSelect }: {
  open: boolean;
  onOpen: (open: boolean) => void;
  location: JejuLocation;
  onSelect: (location: JejuLocation) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpen} title="제주 기준 지역 선택" description="선택한 좌표로 예보·대기질·지도를 다시 불러옵니다." snap={0.58}>
      <div className="location-list" role="radiogroup" aria-label="제주 지역">
        {JEJU_LOCATIONS.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={location.id === item.id} className={location.id === item.id ? "selected" : ""} onClick={() => onSelect(item)}>
            <span><IconMapPin size={20} /></span>
            <div><strong>{item.name}</strong><small>{item.district} · {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</small></div>
            {location.id === item.id ? <IconCircleCheck size={21} /> : <IconChevronRight size={18} />}
          </button>
        ))}
      </div>
      <div className="privacy-note"><IconShieldCheck size={17} /><div><strong>기준 좌표만 서버로 전송해요</strong><span>현재 MVP는 사용자의 GPS 위치를 자동 수집하지 않습니다.</span></div></div>
    </BottomSheet>
  );
}

function ReportSheet({ open, selected, loading, onOpen, onSelect, onSubmit, location }: {
  open: boolean;
  selected: Report | null;
  loading: boolean;
  onOpen: (open: boolean) => void;
  onSelect: (report: Report) => void;
  onSubmit: () => void;
  location: JejuLocation;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpen} title="지금 밖에 비가 오나요?" description="예측 결과 판정에 쓰일 현장 목데이터예요." snap={0.68}>
      <div className="report-location"><IconMapPin size={15} /> {location.name} 기준 · 정확 위치 미수집</div>
      <div className="report-grid" role="group" aria-label="현재 날씨 선택">
        {reports.map((report) => {
          const Glyph = report.icon;
          return <button type="button" key={report.id} className={selected === report.id ? "selected" : ""} onClick={() => onSelect(report.id)} aria-pressed={selected === report.id}><Glyph size={26} /><strong>{report.title}</strong><span>{report.detail}</span>{selected === report.id ? <IconCircleCheck className="report-check" size={19} /> : null}</button>;
        })}
      </div>
      <div className="privacy-note"><IconShieldCheck size={17} /><div><strong>주변 제보와 교차 검증해요</strong><span>정확한 위치는 공개하지 않고 격자 단위로만 집계합니다.</span></div></div>
      <button type="button" className="submit-report" disabled={!selected || loading} onClick={onSubmit}>{loading ? <><i /> 제보 검증 중...</> : <>제보하고 30포인트 받기 <IconCoins size={18} /></>}</button>
    </BottomSheet>
  );
}

function RewardModal({ points, onClose, location }: { points: number; onClose: () => void; location: JejuLocation }) {
  const { screenRef } = useScreenPortal();
  const content = (
    <motion.div className="reward-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="포인트 적립 완료">
      <motion.section className="reward-modal" initial={{ y: 35, scale: 0.9 }} animate={{ y: 0, scale: 1 }} exit={{ y: 22, scale: 0.94 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기"><IconX size={19} /></button>
        <img src={publicAsset("assets/cashweather/cloud-coin-mascot.png")} alt="기뻐하는 캐시웨더 마스코트" />
        <span className="reward-kicker"><IconSparkles size={15} /> 현장 데이터 검증 완료</span>
        <h2><b>+30</b> 포인트 적립!</h2>
        <p>{location.name} 날씨 정확도가 <strong>92% → 94%</strong>로 올라갔어요. 방금 제보가 AI 예측 판정에 반영됐습니다.</p>
        <div className="modal-balance"><span>내 포인트</span><strong>{points.toLocaleString()}P</strong></div>
        <button type="button" className="modal-confirm" onClick={onClose}>좋아요, 계속 보기</button>
      </motion.section>
    </motion.div>
  );
  return screenRef.current ? createPortal(content, screenRef.current) : content;
}

/* ------------------------------------------------------------------ market feed */

const CATEGORY_ICONS: Record<MarketCategory, TablerIcon> = {
  rain: IconCloudRain,
  temperature: IconTemperature,
  wind: IconWind,
  cloud: IconCloud,
};

function useNow(intervalMs = 20_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function compactCount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}

function ProbabilityDial({ value, size = 58 }: { value: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value)) / 100;

  return (
    <div className="dial" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e7edef" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--market-blue)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dial-label">
        <strong>{Math.round(value)}%</strong>
        <span>YES</span>
      </div>
    </div>
  );
}

/** Shows how far the Jeju correction moved the upstream model's number. */
function CalibrationNote({ market }: { market: WeatherMarket }) {
  if (!market.calibrated) return null;
  const { delta, direction } = calibrationDelta(market.rawProbability);
  if (direction === "flat") return null;
  const Arrow = direction === "down" ? IconTrendingDown : IconTrendingUp;

  return (
    <div className="calib-note" data-testid="calibration-note">
      <Arrow size={12} />
      <span>
        원본 AI <b>{Math.round(market.rawProbability)}%</b> → 제주 보정 <b>{market.probability}%</b>
      </span>
      <em>{delta > 0 ? "+" : ""}{Math.round(delta)}p</em>
    </div>
  );
}

function MarketMeta({ market, now }: { market: WeatherMarket; now: Date }) {
  const open = isMarketOpen(market, now);
  const minutes = minutesUntilClose(market, now);

  if (market.replay) {
    return (
      <>
        <span className="replay-badge"><IconHistory size={10} /> 복기</span>
        <em>예측 즉시 실측 채점</em>
      </>
    );
  }

  return (
    <>
      {open ? (
        <span className="live-badge"><i /> LIVE</span>
      ) : (
        <span className="closed-badge">정산 대기</span>
      )}
      <em>{open ? `${Math.max(0, minutes)}분 후 마감` : formatHourKey(market.targetHour)}</em>
    </>
  );
}

function FeaturedMarket({
  market,
  ticket,
  now,
  onPick,
}: {
  market: WeatherMarket;
  ticket?: Ticket;
  now: Date;
  onPick: (market: WeatherMarket, side: Side) => void;
}) {
  const open = isMarketOpen(market, now);
  const Icon = CATEGORY_ICONS[market.category];

  return (
    <section className="featured-market" data-testid="featured-market">
      <div className="featured-head">
        <span className="cat-badge"><Icon size={12} /> {CATEGORY_LABELS[market.category]}</span>
        <MarketMeta market={market} now={now} />
      </div>

      <div className="featured-body">
        <div className="featured-copy">
          <h2>{market.question}</h2>
          <p>{market.subtitle}</p>
        </div>
        <ProbabilityDial value={market.probability} size={62} />
      </div>

      <CalibrationNote market={market} />

      <div className="outcome-row">
        <button
          type="button"
          className={`outcome yes ${ticket?.side === "yes" ? "picked" : ""}`}
          disabled={!open}
          onClick={() => onPick(market, "yes")}
        >
          <strong>YES</strong>
          <em>+{Math.round(DEFAULT_STAKE * market.yesMultiplier)}P</em>
        </button>
        <button
          type="button"
          className={`outcome no ${ticket?.side === "no" ? "picked" : ""}`}
          disabled={!open}
          onClick={() => onPick(market, "no")}
        >
          <strong>NO</strong>
          <em>+{Math.round(DEFAULT_STAKE * market.noMultiplier)}P</em>
        </button>
      </div>

      <div className="featured-foot">
        <span><IconUser size={11} /> {compactCount(market.volume)}명</span>
        {market.members ? <span><IconActivity size={11} /> 앙상블 {market.members.yes}/{market.members.total}</span> : null}
        <span className="foot-rule">{market.rule}</span>
      </div>
    </section>
  );
}

function MarketRow({
  market,
  ticket,
  now,
  onPick,
}: {
  market: WeatherMarket;
  ticket?: Ticket;
  now: Date;
  onPick: (market: WeatherMarket, side: Side) => void;
}) {
  const open = isMarketOpen(market, now);
  const Icon = CATEGORY_ICONS[market.category];

  return (
    <article className="market-row" data-testid="market-row">
      <div className="row-head">
        <span className="row-icon"><Icon size={15} /></span>
        <div className="row-copy">
          <strong>{market.question}</strong>
          <small>{market.subtitle}</small>
        </div>
        <div className="row-prob">
          <strong>{market.probability}%</strong>
          <span>YES</span>
        </div>
      </div>

      <div className="row-actions">
        <button
          type="button"
          className={`chip-outcome yes ${ticket?.side === "yes" ? "picked" : ""}`}
          disabled={!open}
          onClick={() => onPick(market, "yes")}
        >
          Yes <em>{market.yesMultiplier.toFixed(2)}×</em>
        </button>
        <button
          type="button"
          className={`chip-outcome no ${ticket?.side === "no" ? "picked" : ""}`}
          disabled={!open}
          onClick={() => onPick(market, "no")}
        >
          No <em>{market.noMultiplier.toFixed(2)}×</em>
        </button>
      </div>

      <div className="row-foot">
        <MarketMeta market={market} now={now} />
        <span><IconUser size={10} /> {compactCount(market.volume)}</span>
        {market.calibrated ? <span className="row-calib"><IconScale size={10} /> 보정</span> : null}
      </div>
    </article>
  );
}

type MarketFilter = "all" | "closing" | "replay" | MarketCategory | "region";

const MARKET_FILTERS: Array<{ id: MarketFilter; label: string; icon: TablerIcon }> = [
  { id: "all", label: "전체", icon: IconChartBar },
  { id: "closing", label: "마감임박", icon: IconFlame },
  { id: "replay", label: "복기·즉시정산", icon: IconHistory },
  { id: "rain", label: "강수", icon: IconCloudRain },
  { id: "temperature", label: "기온", icon: IconTemperature },
  { id: "wind", label: "바람", icon: IconWind },
  { id: "cloud", label: "구름", icon: IconCloud },
  { id: "region", label: "제주전역", icon: IconMapPin },
];

function MarketSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const keyboard = useKeyboard();

  return (
    <div className="market-search">
      <span className="search-field">
        <IconSearch size={14} />
        <KeyboardInput
          id="market-search"
          value={value}
          placeholder="마켓 검색"
          aria-label="마켓 검색"
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={() => keyboard.hide()}
        />
        {value ? (
          <button type="button" aria-label="검색어 지우기" onClick={() => { keyboard.hide(); onChange(""); }}>
            <IconX size={13} />
          </button>
        ) : null}
      </span>
      <button type="button" className="search-icon-button" aria-label="필터"><IconFilter size={15} /></button>
    </div>
  );
}

function CalibrationCard({ onDetail }: { onDetail: () => void }) {
  return (
    <section className="white-card calib-card" data-testid="calibration-card">
      <div className="section-head">
        <div>
          <small>{CALIBRATION_META.id} · 제주 특화 보정</small>
          <h2>글로벌 AI는 제주에서 비를 과대예측합니다</h2>
        </div>
      </div>
      <div className="calib-stat-row">
        <div><strong>{CALIBRATION_META.totalSamples.toLocaleString()}</strong><span>학습·검증 시간</span></div>
        <div><strong>{CALIBRATION_META.improvement}%</strong><span>Brier 개선</span></div>
        <div><strong>{CALIBRATION_META.calibratedSkill}%</strong><span>기후값 대비 스킬</span></div>
      </div>
      <p className="calib-explain">
        예보가 90~99%라고 한 시간대 중 제주에 실제로 비가 온 건 {RELIABILITY[9].observed}%뿐이었습니다.
        {CALIBRATION_META.testWindow} 미사용 구간에서 Brier {CALIBRATION_META.rawBrier} → {CALIBRATION_META.calibratedBrier}로 개선했습니다.
      </p>
      <button type="button" className="ghost-button" onClick={onDetail}>
        <IconChartHistogram size={14} /> 신뢰도 곡선 보기 <IconChevronRight size={13} />
      </button>
    </section>
  );
}

function MarketScreen(props: {
  points: number;
  location: JejuLocation;
  onLocation: () => void;
  live: boolean;
  markets: WeatherMarket[];
  ticketsByMarket: Record<string, Ticket>;
  onPick: (market: WeatherMarket, side: Side) => void;
  onCalibrationDetail: () => void;
  loading: boolean;
}) {
  const [filter, setFilter] = useState<MarketFilter>("all");
  const [query, setQuery] = useState("");
  const now = useNow();

  const visible = useMemo(() => {
    const term = query.trim();
    let list = props.markets;

    if (filter === "closing") {
      list = list.filter((market) => !market.replay && isMarketOpen(market, now));
      list = [...list].sort((a, b) => minutesUntilClose(a, now) - minutesUntilClose(b, now));
    } else if (filter === "replay") {
      list = list.filter((market) => market.replay);
    } else if (filter === "region") {
      list = list.filter((market) => market.locationId !== props.location.id);
    } else if (filter !== "all") {
      list = list.filter((market) => market.category === filter);
    }

    if (term) {
      list = list.filter((market) => `${market.question} ${market.subtitle} ${market.locationName}`.includes(term));
    }

    return list;
  }, [props.markets, props.location.id, filter, query, now]);

  const featured = visible.find((market) => market.featured) ?? visible[0];
  const rest = featured ? visible.filter((market) => market.id !== featured.id) : visible;

  return (
    <>
      <Header points={props.points} location={props.location} onLocation={props.onLocation} live={props.live} />
      <main className="app-content market-screen" data-testid="market-screen">
        <div className="market-title">
          <span><IconBolt size={12} /> WEATHER PREDICTION MARKET</span>
          <h1>제주 날씨 마켓</h1>
          <p>세계 최고 AI 예보를 제주 실측 {(CALIBRATION_META.totalSamples / 10000).toFixed(1)}만 시간으로 보정한 확률로 참여해요</p>
        </div>

        <MarketSearch value={query} onChange={setQuery} />

        <Carousel className="market-chips" contentClassName="market-chip-track">
          {MARKET_FILTERS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`market-chip ${filter === item.id ? "active" : ""}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                <Icon size={12} /> {item.label}
              </button>
            );
          })}
        </Carousel>

        {props.loading && !props.markets.length ? (
          <section className="white-card market-empty"><IconRefresh size={18} /><p>제주 실시간 예보로 마켓을 만드는 중이에요</p></section>
        ) : null}

        {featured ? (
          <FeaturedMarket market={featured} ticket={props.ticketsByMarket[featured.id]} now={now} onPick={props.onPick} />
        ) : null}

        {rest.length ? (
          <div className="market-list">
            {rest.map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                ticket={props.ticketsByMarket[market.id]}
                now={now}
                onPick={props.onPick}
              />
            ))}
          </div>
        ) : null}

        {!props.loading && !visible.length ? (
          <section className="white-card market-empty"><IconSearch size={18} /><p>조건에 맞는 마켓이 없어요</p></section>
        ) : null}

        <CalibrationCard onDetail={props.onCalibrationDetail} />
      </main>
    </>
  );
}

function BetSheet({
  market,
  side,
  stake,
  points,
  onStake,
  onConfirm,
  onOpenChange,
}: {
  market: WeatherMarket | null;
  side: Side;
  stake: number;
  points: number;
  onStake: (stake: number) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const multiplier = market ? (side === "yes" ? market.yesMultiplier : market.noMultiplier) : 1;
  const payout = Math.round(stake * multiplier);
  const affordable = stake <= points;

  return (
    <BottomSheet
      open={Boolean(market)}
      onOpenChange={onOpenChange}
      title={side === "yes" ? "YES 예측하기" : "NO 예측하기"}
      description="현금 충전 없이 무료 포인트로만 참여해요."
      snap={0.72}
    >
      {market ? (
        <div className="bet-sheet">
          <div className="bet-question">
            <strong>{market.question}</strong>
            <span>{market.rule}</span>
          </div>

          <div className="bet-price">
            <div><small>내 선택</small><strong className={side}>{side.toUpperCase()}</strong></div>
            <div><small>배당</small><strong>{multiplier.toFixed(2)}×</strong></div>
            <div><small>적중 시</small><strong className="payout">+{payout}P</strong></div>
          </div>

          {market.calibrated ? (
            <div className="bet-calib">
              <IconScale size={13} />
              <span>원본 AI {Math.round(market.rawProbability)}% → 제주 보정 {market.probability}% 기준 배당이에요</span>
            </div>
          ) : null}

          <div className="stake-row" role="radiogroup" aria-label="참여 포인트">
            {STAKE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={stake === option}
                className={stake === option ? "active" : ""}
                onClick={() => onStake(option)}
              >
                {option}P
              </button>
            ))}
          </div>

          <div className="bet-guarantee">
            <IconShieldCheck size={14} />
            <div>
              <strong>우리 예측이 틀리면 {GUARANTEE_POINTS}P를 드려요</strong>
              <span>정산은 {formatHourKey(market.targetHour)} 실측값으로 자동 채점돼요</span>
            </div>
          </div>

          <button type="button" className="submit-report" disabled={!affordable} onClick={onConfirm}>
            {affordable ? `${stake}P로 ${side.toUpperCase()} 예측하기` : "포인트가 부족해요"}
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}

/* ------------------------------------------------------- verification screens */

function ReliabilityChart() {
  const width = 244;
  const height = 150;
  const padLeft = 26;
  const padBottom = 22;
  const plotWidth = width - padLeft - 10;
  const plotHeight = height - padBottom - 12;

  const x = (value: number) => padLeft + (value / 100) * plotWidth;
  const y = (value: number) => 12 + plotHeight - (value / 100) * plotHeight;

  const rawLine = RELIABILITY.map((point) => `${x(point.bin + 5)},${y(point.observed)}`).join(" ");
  const calLine = RELIABILITY.map((point) => `${x(point.model)},${y(point.observed)}`).join(" ");

  return (
    <div className="reliability-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="신뢰도 곡선">
        <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} stroke="#c9d5da" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={padLeft} y1={y(0)} x2={x(100)} y2={y(0)} stroke="#dbe4e7" strokeWidth="1" />
        <line x1={padLeft} y1={12} x2={padLeft} y2={y(0)} stroke="#dbe4e7" strokeWidth="1" />

        <polyline points={rawLine} fill="none" stroke="var(--market-red)" strokeWidth="2" strokeLinecap="round" />
        <polyline points={calLine} fill="none" stroke="var(--market-blue)" strokeWidth="2" strokeLinecap="round" />

        {RELIABILITY.map((point) => (
          <circle key={`raw-${point.bin}`} cx={x(point.bin + 5)} cy={y(point.observed)} r="2.4" fill="var(--market-red)" />
        ))}
        {RELIABILITY.map((point) => (
          <circle key={`cal-${point.bin}`} cx={x(point.model)} cy={y(point.observed)} r="2.4" fill="var(--market-blue)" />
        ))}

        <text x={padLeft - 4} y={y(100) + 3} textAnchor="end" fontSize="6" fill="#8a979d">100</text>
        <text x={padLeft - 4} y={y(50) + 3} textAnchor="end" fontSize="6" fill="#8a979d">50</text>
        <text x={padLeft - 4} y={y(0) + 3} textAnchor="end" fontSize="6" fill="#8a979d">0</text>
        <text x={x(50)} y={height - 6} textAnchor="middle" fontSize="6" fill="#8a979d">예보 확률 (%)</text>
      </svg>
      <div className="chart-legend">
        <span><i className="dot-red" /> 보정 전 (대각선에서 멀수록 부정확)</span>
        <span><i className="dot-blue" /> {CALIBRATION_META.id} 보정 후</span>
        <span><i className="dot-line" /> 완벽한 예보</span>
      </div>
    </div>
  );
}

function CalibrationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${CALIBRATION_META.id} 신뢰도 검증`}
      description={`${CALIBRATION_META.testWindow} 미사용 구간 ${CALIBRATION_META.testSamples.toLocaleString()}시간으로 검증했어요.`}
      snap={0.86}
    >
      <div className="calib-sheet">
        <ReliabilityChart />

        <div className="calib-metrics">
          <div><small>보정 전 Brier</small><strong>{CALIBRATION_META.rawBrier}</strong></div>
          <div className="win"><small>보정 후 Brier</small><strong>{CALIBRATION_META.calibratedBrier}</strong></div>
          <div><small>기후값 Brier</small><strong>{CALIBRATION_META.climatologyBrier}</strong></div>
        </div>

        <div className="calib-method">
          <p><b>학습</b> {CALIBRATION_META.trainWindow} · {CALIBRATION_META.trainSamples.toLocaleString()}시간 · 제주 {CALIBRATION_META.locations}개 지점</p>
          <p><b>검증</b> {CALIBRATION_META.testWindow} · {CALIBRATION_META.testSamples.toLocaleString()}시간 (학습에 미사용)</p>
          <p><b>방법</b> {CALIBRATION_META.method}</p>
          <p><b>기준</b> 시간당 강수 {CALIBRATION_META.rainThresholdMm}mm 이상을 '비'로 판정 · 마켓 정산 기준과 동일</p>
        </div>

        <p className="calib-caption">
          시간 순서로 학습/검증을 분리해 미래 데이터가 학습에 새지 않도록 했습니다.
          재현 스크립트는 <b>scripts/fit-calibration.py</b>에 포함돼 있어요.
        </p>
      </div>
    </BottomSheet>
  );
}

function TicketRow({ ticket, settlement }: { ticket: Ticket; settlement?: Settlement }) {
  const Icon = CATEGORY_ICONS[ticket.snapshot.category];
  const pending = !settlement;

  return (
    <article className={`ticket-row ${pending ? "pending" : settlement.won ? "won" : "lost"}`}>
      <span className="ticket-icon"><Icon size={15} /></span>
      <div className="ticket-copy">
        <strong>{ticket.snapshot.question}</strong>
        <small>
          {ticket.side.toUpperCase()} · {ticket.stake}P · {ticket.snapshot.multiplier.toFixed(2)}×
          {" · "}{formatHourKey(ticket.snapshot.targetHour)}
        </small>
        {settlement ? (
          <small className="ticket-observed">
            실측 {formatObserved(settlement.observed, ticket.snapshot.unit)} → 결과 {settlement.outcome.toUpperCase()}
            {settlement.modelCorrect ? "" : " · AI 오답"}
          </small>
        ) : (
          <small className="ticket-observed">정산 대기 · 실측값 수집 중</small>
        )}
      </div>
      <div className="ticket-result">
        {pending ? (
          <span className="pending-chip"><IconClock size={12} /> 대기</span>
        ) : (
          <>
            <strong className={settlement.won ? "win" : "lose"}>
              {settlement.won ? `+${settlement.payout}P` : `-${ticket.stake}P`}
            </strong>
            {settlement.guaranteeBonus ? <em>보상 +{settlement.guaranteeBonus}P</em> : null}
          </>
        )}
      </div>
    </article>
  );
}

function ScoreSummary({ score, points }: { score: ScoreCard; points: number }) {
  return (
    <section className="score-card" data-testid="score-card">
      <div className="score-main">
        <small>사용 가능한 포인트</small>
        <strong>{points.toLocaleString()}<span>P</span></strong>
        <p>자동 정산 완료 <b>{score.settled}건</b> · 대기 <b>{score.pending}건</b></p>
      </div>
      <div className="score-grid">
        <div><strong>{score.settled ? `${Math.round(score.userAccuracy)}%` : "--"}</strong><span>내 적중률</span></div>
        <div><strong>{score.settled ? `${Math.round(score.modelAccuracy)}%` : "--"}</strong><span>AI 적중률</span></div>
        <div><strong>{score.guaranteePaid.toLocaleString()}P</strong><span>AI 오답 보상</span></div>
      </div>
    </section>
  );
}

function VerificationCard({ score }: { score: ScoreCard }) {
  const hasSample = score.calibratedSample >= 3;
  const improved = hasSample && score.rawBrier > 0 ? ((score.rawBrier - score.modelBrier) / score.rawBrier) * 100 : 0;

  return (
    <section className="white-card verify-card" data-testid="verification-card">
      <div className="section-head">
        <div>
          <small>실측 기반 자동 검증</small>
          <h2>내 마켓에서의 보정 성능</h2>
        </div>
        <span className="verify-badge"><IconTarget size={12} /> {score.calibratedSample}건</span>
      </div>

      {hasSample ? (
        <div className="verify-compare">
          <div><small>보정 전 Brier</small><strong>{score.rawBrier.toFixed(3)}</strong></div>
          <IconArrowRight size={14} />
          <div className="win"><small>보정 후 Brier</small><strong>{score.modelBrier.toFixed(3)}</strong></div>
          <em className={improved >= 0 ? "up" : "down"}>{improved >= 0 ? "-" : "+"}{Math.abs(improved).toFixed(0)}%</em>
        </div>
      ) : (
        <p className="verify-empty">
          정산된 강수 마켓이 3건 이상 쌓이면, 내가 참여한 마켓만으로 보정 전/후 Brier를 직접 비교해 보여드려요.
          현재 {score.calibratedSample}건 정산됐어요.
        </p>
      )}

      <div className="verify-shipped">
        <IconShieldCheck size={13} />
        <span>
          출시 검증: {CALIBRATION_META.testSamples.toLocaleString()}시간 미사용 구간에서
          Brier {CALIBRATION_META.rawBrier} → {CALIBRATION_META.calibratedBrier} ({CALIBRATION_META.improvement}% 개선)
        </span>
      </div>
    </section>
  );
}

function ForecastAuditCard({ audit, loading }: { audit: ForecastAudit | null; loading: boolean }) {
  return (
    <section className="white-card audit-card" data-testid="audit-card">
      <div className="section-head">
        <div>
          <small>어제 예보 vs 오늘 실측</small>
          <h2>예보 성적표</h2>
        </div>
        <span className="verify-badge"><IconHistory size={12} /> {audit ? `${audit.sampleSize}시간` : "--"}</span>
      </div>

      {loading && !audit ? (
        <p className="verify-empty">지난 예보와 실측값을 대조하는 중이에요.</p>
      ) : audit && audit.sampleSize ? (
        <>
          <div className="audit-grid">
            <div><strong>{Math.round(audit.rainHitRate)}%</strong><span>강수 유무 적중</span></div>
            <div><strong>{audit.temperatureMae.toFixed(1)}°</strong><span>기온 평균오차</span></div>
            <div><strong>{audit.missedRainHours}</strong><span>비 놓친 시간</span></div>
            <div><strong>{audit.falseAlarmHours}</strong><span>헛방 시간</span></div>
          </div>
          <p className="audit-note">
            하루 전 예보를 같은 시각의 실측값과 1:1로 대조한 결과예요. 이 격차가 {CALIBRATION_META.id} 보정이 필요한 이유입니다.
          </p>
        </>
      ) : (
        <p className="verify-empty">아직 대조할 수 있는 과거 예보 구간이 없어요.</p>
      )}
    </section>
  );
}

function PublicDataCard({ location }: { location: JejuLocation }) {
  const sources = publicDataSources(location);
  const request = kmaForecastRequest(location);

  return (
    <section className="white-card publicdata-card" data-testid="publicdata-card">
      <div className="section-head">
        <div>
          <small>데이터 출처</small>
          <h2>공공데이터 활용 내역</h2>
        </div>
        <span className="verify-badge"><IconDatabase size={12} /> {sources.length}종</span>
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <span className={`source-status ${source.status}`}>
              {source.status === "live" ? "LIVE" : source.status === "snapshot" ? "SNAP" : "READY"}
            </span>
            <div>
              <strong>{source.name}</strong>
              <small>{source.provider}</small>
              <small className="source-usage">{source.usage}</small>
            </div>
            <IconChevronRight size={13} />
          </a>
        ))}
      </div>

      <div className="kma-grid-note">
        <IconBuildingBank size={13} />
        <div>
          <strong>기상청 격자 변환 구현 완료</strong>
          <span>{location.name} → nx {request.grid.nx}, ny {request.grid.ny} · 발표 {request.baseDate} {request.baseTime}</span>
        </div>
      </div>
    </section>
  );
}

function LedgerScreen(props: {
  points: number;
  location: JejuLocation;
  onLocation: () => void;
  live: boolean;
  tickets: Ticket[];
  settlements: Record<string, Settlement>;
  score: ScoreCard;
  audit: ForecastAudit | null;
  auditLoading: boolean;
  checked: boolean;
  onCheck: () => void;
  onSettle: () => void;
  settling: boolean;
}) {
  const ordered = useMemo(
    () => [...props.tickets].sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1)),
    [props.tickets],
  );

  return (
    <>
      <Header points={props.points} location={props.location} onLocation={props.onLocation} live={props.live} />
      <main className="app-content ledger-content" data-testid="ledger-screen">
        <div className="page-title">
          <span>실측값으로 자동 채점되는</span>
          <h1>내 예측 원장</h1>
        </div>

        <ScoreSummary score={props.score} points={props.points} />

        <button type="button" className={`checkin ${props.checked ? "done" : ""}`} onClick={props.onCheck} disabled={props.checked}>
          <span><IconTrophy size={22} /></span>
          <div>
            <strong>{props.checked ? "오늘 보너스 받기 완료" : "오늘의 출석 보너스"}</strong>
            <small>{props.checked ? "내일 또 만나요" : "확인하면 보너스 포인트"}</small>
          </div>
          <em>{props.checked ? <IconCheck size={18} /> : "+10P"}</em>
        </button>

        <section className="white-card ledger-card">
          <div className="section-head">
            <div>
              <small>참여한 마켓 {props.tickets.length}건</small>
              <h2>정산 내역</h2>
            </div>
            <button type="button" onClick={props.onSettle} disabled={props.settling}>
              <IconRefresh size={13} /> {props.settling ? "확인 중" : "정산 확인"}
            </button>
          </div>

          {ordered.length ? (
            <div className="ticket-list">
              {ordered.slice(0, 12).map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} settlement={props.settlements[ticket.id]} />
              ))}
            </div>
          ) : (
            <p className="verify-empty">아직 참여한 마켓이 없어요. 마켓 탭에서 무료 포인트로 예측해보세요.</p>
          )}
        </section>

        <VerificationCard score={props.score} />
        <ForecastAuditCard audit={props.audit} loading={props.auditLoading} />

        <section className="white-card exchange-card">
          <div className="section-head">
            <div><small>제주에서 바로 쓰는</small><h2>포인트 교환소</h2></div>
            <button type="button">전체 <IconChevronRight size={15} /></button>
          </div>
          <div className="exchange-grid">
            <button type="button"><span><IconWallet size={26} /></span><strong>동네 카페<br />1,000원 쿠폰</strong><em><IconCoins size={14} /> 1,000P</em></button>
            <button type="button"><span><IconTicket size={26} /></span><strong>제주 실내체험<br />10% 할인</strong><em><IconCoins size={14} /> 800P</em></button>
          </div>
        </section>

        <PublicDataCard location={props.location} />
      </main>
    </>
  );
}

export default function Prototype() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("market");
  const [location, setLocation] = useState<JejuLocation>(JEJU_LOCATIONS[0]);
  const [locationOpen, setLocationOpen] = useState(false);
  const [points, setPoints] = useState(1240);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [reportCount, setReportCount] = useState(128);
  const [checked, setChecked] = useState(false);
  const [outfitGender, setOutfitGender] = useState<OutfitGender>(() => {
    if (typeof window === "undefined") return "men";
    return window.localStorage.getItem("cashweather-outfit-gender") === "women" ? "women" : "men";
  });
  const [closetSaved, setClosetSaved] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("cashweather-closet-saved") === "true");
  const [reminderOn, setReminderOn] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("cashweather-umbrella-reminder") === "true");

  // Prediction ledger and the data needed to settle it.
  const [tickets, setTickets] = useState<Ticket[]>(() => loadLedger());
  const [settlements, setSettlements] = useState<Record<string, Settlement>>(() => loadSettlements());
  const [board, setBoard] = useState<BoardPoint[]>([]);
  const [replayHours, setReplayHours] = useState<ReplayHour[]>([]);
  const [audit, setAudit] = useState<ForecastAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [betMarket, setBetMarket] = useState<WeatherMarket | null>(null);
  const [betSide, setBetSide] = useState<Side>("yes");
  const [stake, setStake] = useState(DEFAULT_STAKE);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const weather = useJejuWeather(location);

  useEffect(() => {
    window.localStorage.setItem("cashweather-outfit-gender", outfitGender);
  }, [outfitGender]);

  useEffect(() => {
    window.localStorage.setItem("cashweather-closet-saved", String(closetSaved));
  }, [closetSaved]);

  useEffect(() => {
    window.localStorage.setItem("cashweather-umbrella-reminder", String(reminderOn));
  }, [reminderOn]);

  useEffect(() => saveLedger(tickets), [tickets]);
  useEffect(() => saveSettlements(settlements), [settlements]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Island-wide board powers the regional markets.
  useEffect(() => {
    const controller = new AbortController();
    fetchJejuBoard(controller.signal)
      .then(setBoard)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // Already-resolved hours power the replay markets.
  useEffect(() => {
    const controller = new AbortController();
    fetchReplayHours(location, controller.signal)
      .then(setReplayHours)
      .catch(() => undefined);
    return () => controller.abort();
  }, [location]);

  useEffect(() => {
    const controller = new AbortController();
    setAuditLoading(true);
    fetchForecastAudit(location, controller.signal)
      .then(setAudit)
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setAuditLoading(false);
      });
    return () => controller.abort();
  }, [location]);

  const markets = useMemo(
    () => [
      ...buildMarkets(weather.data, board, location),
      ...buildReplayMarkets(replayHours, location),
    ],
    [weather.data, board, location, replayHours],
  );

  const ticketsByMarket = useMemo(() => {
    const map: Record<string, Ticket> = {};
    tickets.forEach((ticket) => {
      map[ticket.marketId] = ticket;
    });
    return map;
  }, [tickets]);

  const score = useMemo(() => scoreLedger(tickets, settlements), [tickets, settlements]);
  const featuredMarket = useMemo(() => markets.find((market) => market.featured) ?? markets[0] ?? null, [markets]);

  /** Settles every ticket whose target hour has an observed value. */
  const runSettlement = useCallback(async () => {
    const pending = tickets.filter((ticket) => !settlements[ticket.id]);
    if (!pending.length) return;

    setSettling(true);
    try {
      const observed = await fetchObservedSeries(location);
      const result = settleLedger(tickets, settlements, observed);
      if (result.newlySettled.length) {
        setSettlements(result.settlements);
        setPoints((value) => value + result.awarded);
        setToast(`${result.newlySettled.length}건 자동 정산 · +${result.awarded}P`);
      }
    } catch {
      // Observed data unavailable right now; the ledger stays untouched.
    } finally {
      setSettling(false);
    }
  }, [tickets, settlements, location]);

  useEffect(() => {
    void runSettlement();
  }, [runSettlement]);

  function openBet(market: WeatherMarket, side: Side) {
    setBetMarket(market);
    setBetSide(side);
    setStake(DEFAULT_STAKE);
  }

  function confirmBet() {
    if (!betMarket) return;

    // One open position per market: re-picking refunds the previous stake.
    const existing = tickets.find((item) => item.marketId === betMarket.id && !settlements[item.id]);
    const refund = existing ? existing.stake : 0;
    if (stake > points + refund) return;

    const ticket = createTicket(betMarket, betSide, stake);
    setTickets((current) => [...current.filter((item) => item.id !== existing?.id), ticket]);
    setPoints((value) => value + refund - stake);
    setBetMarket(null);
    setToast(`${betSide.toUpperCase()} 예측 완료 · ${formatHourKey(betMarket.targetHour)} 자동 정산`);
  }

  function submitReport() {
    if (!selectedReport || reportLoading) return;
    setReportLoading(true);
    window.setTimeout(() => {
      setReportLoading(false);
      setReportOpen(false);
      setSelectedReport(null);
      setPoints((value) => value + 30);
      setReportCount((value) => value + 1);
      window.setTimeout(() => setRewardOpen(true), 320);
    }, 720);
  }

  function checkIn() {
    if (checked) return;
    setChecked(true);
    setPoints((value) => value + 10);
  }

  function selectLocation(next: JejuLocation) {
    setLocation(next);
    setLocationOpen(false);
  }

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} location={location} weather={weather} gender={outfitGender} />;
  }

  return (
    <>
      <MobileScroll key={tab} className="cw-shell cw-app">
        <div className="app-surface">
          {tab === "home" ? (
            <HomeScreen
              points={points}
              location={location}
              weather={weather}
              featuredMarket={featuredMarket}
              onGoMarket={() => setTab("market")}
              onReport={() => setReportOpen(true)}
              onLocation={() => setLocationOpen(true)}
              reportCount={reportCount}
              outfitGender={outfitGender}
              onOutfitGender={setOutfitGender}
              closetSaved={closetSaved}
              onCloset={() => setClosetSaved((value) => !value)}
              reminderOn={reminderOn}
              onReminder={() => setReminderOn((value) => !value)}
              joinedCount={tickets.length}
            />
          ) : null}

          {tab === "market" ? (
            <MarketScreen
              points={points}
              location={location}
              onLocation={() => setLocationOpen(true)}
              live={Boolean(weather.data)}
              markets={markets}
              ticketsByMarket={ticketsByMarket}
              onPick={openBet}
              onCalibrationDetail={() => setCalibrationOpen(true)}
              loading={weather.loading}
            />
          ) : null}

          {tab === "live" ? (
            <LiveScreen
              points={points}
              reportCount={reportCount}
              onReport={() => setReportOpen(true)}
              location={location}
              onLocation={() => setLocationOpen(true)}
              weather={weather}
            />
          ) : null}

          {tab === "ledger" ? (
            <LedgerScreen
              points={points}
              location={location}
              onLocation={() => setLocationOpen(true)}
              live={Boolean(weather.data)}
              tickets={tickets}
              settlements={settlements}
              score={score}
              audit={audit}
              auditLoading={auditLoading}
              checked={checked}
              onCheck={checkIn}
              onSettle={() => void runSettlement()}
              settling={settling}
            />
          ) : null}
        </div>
      </MobileScroll>

      <Navigation tab={tab} onTab={setTab} onReport={() => setReportOpen(true)} />
      <LocationSheet open={locationOpen} onOpen={setLocationOpen} location={location} onSelect={selectLocation} />
      <ReportSheet open={reportOpen} selected={selectedReport} loading={reportLoading} onOpen={setReportOpen} onSelect={setSelectedReport} onSubmit={submitReport} location={location} />
      <BetSheet
        market={betMarket}
        side={betSide}
        stake={stake}
        points={points}
        onStake={setStake}
        onConfirm={confirmBet}
        onOpenChange={(open) => { if (!open) setBetMarket(null); }}
      />
      <CalibrationSheet open={calibrationOpen} onOpenChange={setCalibrationOpen} />
      <AnimatePresence>
        {toast ? (
          <motion.div
            className="settle-toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <IconCircleCheck size={15} /> {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{rewardOpen ? <RewardModal points={points} onClose={() => setRewardOpen(false)} location={location} /> : null}</AnimatePresence>
    </>
  );
}
