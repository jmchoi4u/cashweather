import { JEJU_LOCATIONS, type JejuLocation } from "./weather";

/**
 * Observation + forecast-audit layer.
 *
 * Everything here answers one question: "what actually happened?"
 * Market settlement must never read from the same forecast payload that created
 * the market, so these requests are kept separate from `fetchJejuWeather`.
 */

export type ObservedVariable = "precipitation" | "temperature_2m" | "wind_speed_10m" | "cloud_cover";

export type ObservedHour = Record<ObservedVariable, number>;

export type ObservedSeries = {
  /** Keyed by Asia/Seoul hour, e.g. `2026-08-18T14:00`. */
  hours: Record<string, ObservedHour>;
  fetchedAt: string;
};

export type AuditPoint = {
  time: string;
  forecastPrecipitation: number;
  observedPrecipitation: number;
  forecastRain: boolean;
  observedRain: boolean;
  hit: boolean;
  forecastTemperature: number;
  observedTemperature: number;
};

export type ForecastAudit = {
  /** Hours that already have both a day-ahead forecast and an observed value. */
  points: AuditPoint[];
  sampleSize: number;
  /** Share of hours where the rain/no-rain call was right. */
  rainHitRate: number;
  /** Mean absolute temperature error in °C. */
  temperatureMae: number;
  /** Hours the day-ahead run missed rain that actually fell. */
  missedRainHours: number;
  /** Hours the day-ahead run called rain that never arrived. */
  falseAlarmHours: number;
  window: { from: string; to: string } | null;
};

export type BoardPoint = {
  location: JejuLocation;
  temperature: number;
  precipitation: number;
  rainProbability: number;
  windSpeed: number;
  cloudCover: number;
};

export const RAIN_THRESHOLD_MM = 0.1;

/** Open-Meteo returns Asia/Seoul local timestamps; keep every key in that frame. */
export function seoulHourKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:00`;
}

export function addHoursToKey(key: string, hours: number): string {
  const base = new Date(`${key}:00+09:00`);
  if (Number.isNaN(base.getTime())) return key;
  return seoulHourKey(new Date(base.getTime() + hours * 3_600_000));
}

export function keyToDate(key: string): Date {
  return new Date(`${key}:00+09:00`);
}

export function formatHourKey(key: string): string {
  const date = keyToDate(key);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  }).format(date);
}

function numberAt(values: Array<number | string> | undefined, index: number) {
  const value = Number(values?.[index] ?? Number.NaN);
  return Number.isFinite(value) ? value : Number.NaN;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Verification request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

type HourlyResponse = { hourly: Record<string, Array<number | string>> };

/**
 * Observed/analysed values for the last two days plus today, used to settle markets.
 * Open-Meteo blends station observations into these past hours, so they are the
 * closest thing to ground truth the free tier exposes.
 */
export async function fetchObservedSeries(location: JejuLocation, signal?: AbortSignal): Promise<ObservedSeries> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "precipitation,temperature_2m,wind_speed_10m,cloud_cover",
    past_days: "2",
    forecast_days: "1",
    timezone: "Asia/Seoul",
  });

  const payload = await getJson<HourlyResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, signal);
  const times = payload.hourly.time ?? [];
  const hours: Record<string, ObservedHour> = {};

  times.forEach((time, index) => {
    hours[String(time)] = {
      precipitation: numberAt(payload.hourly.precipitation, index),
      temperature_2m: numberAt(payload.hourly.temperature_2m, index),
      wind_speed_10m: numberAt(payload.hourly.wind_speed_10m, index),
      cloud_cover: numberAt(payload.hourly.cloud_cover, index),
    };
  });

  return { hours, fetchedAt: new Date().toISOString() };
}

/**
 * Scores yesterday's model run against what actually happened.
 * `*_previous_day1` is the forecast issued a day earlier for the same timestamp,
 * so pairing it with the current analysis gives a real, reproducible accuracy read.
 */
export async function fetchForecastAudit(location: JejuLocation, signal?: AbortSignal): Promise<ForecastAudit> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: [
      "precipitation",
      "precipitation_previous_day1",
      "temperature_2m",
      "temperature_2m_previous_day1",
    ].join(","),
    past_days: "2",
    forecast_days: "1",
    timezone: "Asia/Seoul",
  });

  const payload = await getJson<HourlyResponse>(
    `https://previous-runs-api.open-meteo.com/v1/forecast?${params}`,
    signal,
  );

  const times = payload.hourly.time ?? [];
  const nowKey = seoulHourKey(new Date());
  const points: AuditPoint[] = [];

  times.forEach((rawTime, index) => {
    const time = String(rawTime);
    // Only hours that are already in the past can be scored.
    if (time >= nowKey) return;

    const forecastPrecipitation = numberAt(payload.hourly.precipitation_previous_day1, index);
    const observedPrecipitation = numberAt(payload.hourly.precipitation, index);
    const forecastTemperature = numberAt(payload.hourly.temperature_2m_previous_day1, index);
    const observedTemperature = numberAt(payload.hourly.temperature_2m, index);

    if (!Number.isFinite(forecastPrecipitation) || !Number.isFinite(observedPrecipitation)) return;

    const forecastRain = forecastPrecipitation >= RAIN_THRESHOLD_MM;
    const observedRain = observedPrecipitation >= RAIN_THRESHOLD_MM;

    points.push({
      time,
      forecastPrecipitation,
      observedPrecipitation,
      forecastRain,
      observedRain,
      hit: forecastRain === observedRain,
      forecastTemperature,
      observedTemperature,
    });
  });

  const sampleSize = points.length;
  const hits = points.filter((point) => point.hit).length;
  const temperaturePoints = points.filter(
    (point) => Number.isFinite(point.forecastTemperature) && Number.isFinite(point.observedTemperature),
  );
  const temperatureError = temperaturePoints.reduce(
    (sum, point) => sum + Math.abs(point.forecastTemperature - point.observedTemperature),
    0,
  );

  return {
    points,
    sampleSize,
    rainHitRate: sampleSize ? (hits / sampleSize) * 100 : 0,
    temperatureMae: temperaturePoints.length ? temperatureError / temperaturePoints.length : 0,
    missedRainHours: points.filter((point) => !point.forecastRain && point.observedRain).length,
    falseAlarmHours: points.filter((point) => point.forecastRain && !point.observedRain).length,
    window: sampleSize ? { from: points[0].time, to: points[sampleSize - 1].time } : null,
  };
}

export type ReplayHour = {
  time: string;
  /** The probability the forecast actually carried for that hour, from the archive. */
  probability: number;
  /** What was then observed. */
  precipitation: number;
};

function isoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Past hours with both the archived forecast probability and the observed outcome.
 *
 * These power "replay" markets: a settled hour can be predicted and scored on the
 * spot, which makes the settlement engine demonstrable without waiting an hour.
 * Both numbers are real archive values — only the participation is after the fact.
 */
export async function fetchReplayHours(location: JejuLocation, signal?: AbortSignal): Promise<ReplayHour[]> {
  const now = new Date();
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: isoDate(new Date(now.getTime() - 2 * 86_400_000)),
    end_date: isoDate(now),
    hourly: "precipitation_probability,precipitation",
    timezone: "Asia/Seoul",
  });

  const payload = await getJson<HourlyResponse>(
    `https://historical-forecast-api.open-meteo.com/v1/forecast?${params}`,
    signal,
  );

  const times = payload.hourly.time ?? [];
  const nowKey = seoulHourKey(now);
  const rows: ReplayHour[] = [];

  times.forEach((rawTime, index) => {
    const time = String(rawTime);
    if (time >= nowKey) return;

    const probability = numberAt(payload.hourly.precipitation_probability, index);
    const precipitation = numberAt(payload.hourly.precipitation, index);
    if (!Number.isFinite(probability) || !Number.isFinite(precipitation)) return;

    rows.push({ time, probability, precipitation });
  });

  // Most recent first; the feed only needs a handful.
  return rows.reverse();
}

type BoardResponse = {
  current?: Record<string, number | string>;
  hourly?: Record<string, Array<number | string>>;
};

/**
 * One multi-point request covering every Jeju living zone, so the market board can
 * show the whole island without six separate round trips.
 */
export async function fetchJejuBoard(signal?: AbortSignal): Promise<BoardPoint[]> {
  const params = new URLSearchParams({
    latitude: JEJU_LOCATIONS.map((item) => item.latitude).join(","),
    longitude: JEJU_LOCATIONS.map((item) => item.longitude).join(","),
    current: "temperature_2m,precipitation,wind_speed_10m,cloud_cover",
    hourly: "precipitation_probability",
    forecast_hours: "2",
    timezone: "Asia/Seoul",
  });

  const payload = await getJson<BoardResponse | BoardResponse[]>(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    signal,
  );
  const entries = Array.isArray(payload) ? payload : [payload];

  return JEJU_LOCATIONS.map((location, index) => {
    const entry = entries[index];
    const current = entry?.current ?? {};
    const probability = numberAt(entry?.hourly?.precipitation_probability, 0);

    return {
      location,
      temperature: Number(current.temperature_2m ?? Number.NaN),
      precipitation: Number(current.precipitation ?? 0),
      rainProbability: Number.isFinite(probability) ? probability : 0,
      windSpeed: Number(current.wind_speed_10m ?? 0),
      cloudCover: Number(current.cloud_cover ?? 0),
    };
  });
}
