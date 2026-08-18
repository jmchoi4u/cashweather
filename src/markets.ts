import { calibrateRainProbability } from "./calibration";
import {
  addHoursToKey,
  formatHourKey,
  keyToDate,
  seoulHourKey,
  RAIN_THRESHOLD_MM,
  type BoardPoint,
  type ObservedSeries,
  type ObservedVariable,
  type ReplayHour,
} from "./verification";
import { JEJU_LOCATIONS, type JejuLocation, type WeatherBundle } from "./weather";

/**
 * Market definition, pricing, ledger and settlement.
 *
 * A market is only ever created from forecast data, and only ever settled from
 * the observed series in `verification.ts`. Keeping those two sources apart is
 * what lets the app claim a verifiable hit rate instead of a decorative one.
 */

export type MarketCategory = "rain" | "temperature" | "wind" | "cloud";
export type Side = "yes" | "no";
export type MarketScope = "hour" | "day";

export type WeatherMarket = {
  id: string;
  category: MarketCategory;
  scope: MarketScope;
  locationId: string;
  locationName: string;
  question: string;
  subtitle: string;
  threshold: number;
  unit: string;
  variable: ObservedVariable;
  rule: string;
  /** Asia/Seoul hour the market resolves against (or any hour of the day for day scope). */
  targetHour: string;
  /** Price shown to the user. For rain markets this is the JCM-1 corrected number. */
  probability: number;
  /** What the upstream model said before the Jeju correction. */
  rawProbability: number;
  calibrated: boolean;
  source: string;
  members: { yes: number; total: number } | null;
  yesMultiplier: number;
  noMultiplier: number;
  volume: number;
  featured: boolean;
  /** Replay markets cover an hour that already happened and settle immediately. */
  replay: boolean;
};

export type Ticket = {
  id: string;
  marketId: string;
  side: Side;
  stake: number;
  placedAt: string;
  /** Frozen market terms, so settlement cannot be re-priced after the fact. */
  snapshot: {
    question: string;
    category: MarketCategory;
    scope: MarketScope;
    locationId: string;
    locationName: string;
    threshold: number;
    unit: string;
    variable: ObservedVariable;
    targetHour: string;
    probability: number;
    rawProbability: number;
    calibrated: boolean;
    multiplier: number;
    source: string;
    rule: string;
  };
};

export type Settlement = {
  ticketId: string;
  observed: number;
  outcome: Side;
  won: boolean;
  payout: number;
  modelSide: Side;
  modelCorrect: boolean;
  guaranteeBonus: number;
  settledAt: string;
};

export type ScoreCard = {
  settled: number;
  userWins: number;
  userAccuracy: number;
  modelWins: number;
  modelAccuracy: number;
  /** Brier score of the priced (JCM-1 corrected) probability. Lower is better. */
  modelBrier: number;
  /** Brier score the upstream model would have scored without the correction. */
  rawBrier: number;
  /** Settled rain markets, the only ones where both scores are comparable. */
  calibratedSample: number;
  pointsWon: number;
  guaranteePaid: number;
  pending: number;
};

/** Points paid out whenever our own model call turns out wrong. */
export const GUARANTEE_POINTS = 200;
export const DEFAULT_STAKE = 100;
export const STAKE_OPTIONS = [100, 300, 500];

const LEDGER_KEY = "cashweather-ledger-v1";
const SETTLEMENT_KEY = "cashweather-settlements-v1";

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  rain: "강수",
  temperature: "기온",
  wind: "바람",
  cloud: "구름",
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Deterministic so the participant count does not flicker between renders. */
function volumeFor(id: string) {
  return 180 + (hashString(id) % 4200);
}

function multiplierFor(probability: number) {
  const bounded = Math.min(0.97, Math.max(0.03, probability / 100));
  return Math.min(8, Math.max(1.05, 0.96 / bounded));
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function marketCloses(market: WeatherMarket): Date {
  // Day markets stay open all day; hour markets close as their hour begins.
  if (market.scope === "day") return keyToDate(`${market.targetHour.slice(0, 10)}T23:00`);
  return keyToDate(market.targetHour);
}

/** Observed values for an hour only exist once the following hour has begun. */
export function marketSettles(market: WeatherMarket): Date {
  if (market.scope === "day") {
    const date = keyToDate(market.targetHour);
    date.setHours(24, 0, 0, 0);
    return date;
  }
  return keyToDate(addHoursToKey(market.targetHour, 1));
}

export function isMarketOpen(market: WeatherMarket, now: Date = new Date()): boolean {
  // Replay markets are deliberately open after the fact.
  if (market.replay) return true;
  return now.getTime() < marketCloses(market).getTime();
}

export function minutesUntilClose(market: WeatherMarket, now: Date = new Date()): number {
  return Math.round((marketCloses(market).getTime() - now.getTime()) / 60_000);
}

function hourLabel(key: string) {
  const date = keyToDate(key);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hour12: true,
  }).format(date);
}

/**
 * Builds the full market board.
 * Ensemble-backed markets use the 64-member WeatherNext 2 spread as the price;
 * the remaining markets fall back to the deterministic Open-Meteo probability.
 */
export function buildMarkets(
  weather: WeatherBundle | null,
  board: BoardPoint[],
  primary: JejuLocation,
  now: Date = new Date(),
): WeatherMarket[] {
  if (!weather) return [];

  const currentHour = seoulHourKey(now);
  const nextHour = addHoursToKey(currentHour, 1);
  const model = weather.weatherNext;
  const markets: WeatherMarket[] = [];

  type MarketDraft = Omit<
    WeatherMarket,
    "volume" | "yesMultiplier" | "noMultiplier" | "rawProbability" | "calibrated" | "replay"
  > & { calibrate?: boolean; replay?: boolean };

  const push = ({ calibrate = false, replay = false, ...draft }: MarketDraft) => {
    const rawProbability = draft.probability;
    // Only rain has a fitted correction; other variables ship uncalibrated.
    const probability = calibrate
      ? clampProbability(calibrateRainProbability(rawProbability))
      : rawProbability;

    markets.push({
      ...draft,
      probability,
      rawProbability,
      calibrated: calibrate,
      replay,
      volume: volumeFor(draft.id),
      yesMultiplier: multiplierFor(probability),
      noMultiplier: multiplierFor(100 - probability),
    });
  };

  const ensembleSource = model ? "WeatherNext 2 앙상블 · 64멤버" : "Open-Meteo 예보";

  // Headline market: next-hour rain at the user's own location.
  const rainProbability = clampProbability(
    model?.rainProbability ?? weather.hourly[0]?.precipitationProbability ?? 50,
  );
  push({
    id: `${primary.id}:rain:${nextHour}`,
    category: "rain",
    scope: "hour",
    locationId: primary.id,
    locationName: primary.name,
    question: `${hourLabel(nextHour)}에 ${primary.name}에 비가 올까요?`,
    subtitle: `${hourLabel(nextHour)} 정시 기준 강수량 ${RAIN_THRESHOLD_MM}mm 이상`,
    threshold: RAIN_THRESHOLD_MM,
    unit: "mm",
    variable: "precipitation",
    rule: `${hourLabel(nextHour)} 관측 강수량이 ${RAIN_THRESHOLD_MM}mm 이상이면 YES`,
    targetHour: nextHour,
    probability: rainProbability,
    source: ensembleSource,
    members: model ? { yes: model.rainMembers, total: model.memberCount } : null,
    featured: true,
    calibrate: true,
  });

  if (model) {
    push({
      id: `${primary.id}:temperature:${nextHour}`,
      category: "temperature",
      scope: "hour",
      locationId: primary.id,
      locationName: primary.name,
      question: `${hourLabel(nextHour)} 기온이 ${model.temperatureThreshold}° 이상일까요?`,
      subtitle: `앙상블 평균 ${model.temperatureMean.toFixed(1)}° · 범위 ${model.temperatureMin.toFixed(1)}–${model.temperatureMax.toFixed(1)}°`,
      threshold: model.temperatureThreshold,
      unit: "°C",
      variable: "temperature_2m",
      rule: `${hourLabel(nextHour)} 관측 기온이 ${model.temperatureThreshold}° 이상이면 YES`,
      targetHour: nextHour,
      probability: clampProbability(model.warmProbability),
      source: ensembleSource,
      members: { yes: model.warmMembers, total: model.memberCount },
      featured: false,
    });

    push({
      id: `${primary.id}:wind:${nextHour}`,
      category: "wind",
      scope: "hour",
      locationId: primary.id,
      locationName: primary.name,
      question: `${hourLabel(nextHour)} 바람이 ${model.windThreshold}km/h 이상일까요?`,
      subtitle: `앙상블 평균 ${model.windMean.toFixed(1)}km/h · 최대 ${model.windMax.toFixed(1)}km/h`,
      threshold: model.windThreshold,
      unit: "km/h",
      variable: "wind_speed_10m",
      rule: `${hourLabel(nextHour)} 관측 풍속이 ${model.windThreshold}km/h 이상이면 YES`,
      targetHour: nextHour,
      probability: clampProbability(model.windyProbability),
      source: ensembleSource,
      members: { yes: model.windyMembers, total: model.memberCount },
      featured: false,
    });

    push({
      id: `${primary.id}:cloud:${nextHour}`,
      category: "cloud",
      scope: "hour",
      locationId: primary.id,
      locationName: primary.name,
      question: `${hourLabel(nextHour)} 운량이 ${model.cloudThreshold}% 이상일까요?`,
      subtitle: `앙상블 평균 운량 ${Math.round(model.cloudMean)}%`,
      threshold: model.cloudThreshold,
      unit: "%",
      variable: "cloud_cover",
      rule: `${hourLabel(nextHour)} 관측 운량이 ${model.cloudThreshold}% 이상이면 YES`,
      targetHour: nextHour,
      probability: clampProbability(model.cloudyProbability),
      source: ensembleSource,
      members: { yes: model.cloudyMembers, total: model.memberCount },
      featured: false,
    });
  }

  // Later-today rain markets keep the board alive outside the next-hour window.
  [3, 6].forEach((offset) => {
    const targetHour = addHoursToKey(currentHour, offset);
    const forecast = weather.hourly.find((hour) => hour.time.startsWith(targetHour.slice(0, 13)));
    if (!forecast) return;

    push({
      id: `${primary.id}:rain:${targetHour}`,
      category: "rain",
      scope: "hour",
      locationId: primary.id,
      locationName: primary.name,
      question: `${hourLabel(targetHour)}에 ${primary.name}에 비가 올까요?`,
      subtitle: `${offset}시간 뒤 · Open-Meteo 강수확률 ${Math.round(forecast.precipitationProbability)}%`,
      threshold: RAIN_THRESHOLD_MM,
      unit: "mm",
      variable: "precipitation",
      rule: `${hourLabel(targetHour)} 관측 강수량이 ${RAIN_THRESHOLD_MM}mm 이상이면 YES`,
      targetHour,
      probability: clampProbability(forecast.precipitationProbability),
      source: "Open-Meteo 시간별 예보",
      members: null,
      featured: false,
      calibrate: true,
    });
  });

  // Today's high-temperature market resolves against the day's observed maximum.
  push({
    id: `${primary.id}:temperature:day:${currentHour.slice(0, 10)}`,
    category: "temperature",
    scope: "day",
    locationId: primary.id,
    locationName: primary.name,
    question: `오늘 ${primary.name} 최고기온이 ${Math.round(weather.daily.temperatureMax)}°를 넘을까요?`,
    subtitle: `예보 최고 ${weather.daily.temperatureMax.toFixed(1)}° · 최저 ${weather.daily.temperatureMin.toFixed(1)}°`,
    threshold: Math.round(weather.daily.temperatureMax),
    unit: "°C",
    variable: "temperature_2m",
    rule: `오늘 관측 최고기온이 ${Math.round(weather.daily.temperatureMax)}°를 넘으면 YES`,
    targetHour: currentHour,
    probability: 50,
    source: "Open-Meteo 일별 예보",
    members: null,
    featured: false,
  });

  // Island-wide board: one rain market per Jeju living zone.
  board
    .filter((point) => point.location.id !== primary.id)
    .forEach((point) => {
      push({
        id: `${point.location.id}:rain:${nextHour}`,
        category: "rain",
        scope: "hour",
        locationId: point.location.id,
        locationName: point.location.name,
        question: `${hourLabel(nextHour)}에 ${point.location.name}에 비가 올까요?`,
        subtitle: `${point.location.district} · 현재 ${Math.round(point.temperature)}° · 강수확률 ${Math.round(point.rainProbability)}%`,
        threshold: RAIN_THRESHOLD_MM,
        unit: "mm",
        variable: "precipitation",
        rule: `${hourLabel(nextHour)} 관측 강수량이 ${RAIN_THRESHOLD_MM}mm 이상이면 YES`,
        targetHour: nextHour,
        probability: clampProbability(point.rainProbability),
        source: "Open-Meteo 지점별 예보",
        members: null,
        featured: false,
        calibrate: true,
      });
    });

  return markets;
}

/**
 * Markets over hours that have already resolved.
 *
 * The price is the probability the forecast genuinely carried at the time, pulled
 * from the archive, and settlement reads the real observation — so these score by
 * exactly the same rules as live markets. Only the participation happens after the
 * fact, which is what makes the settlement engine demonstrable on the spot.
 */
export function buildReplayMarkets(hours: ReplayHour[], location: JejuLocation, limit = 10): WeatherMarket[] {
  return hours.slice(0, limit).map((hour) => {
    const rawProbability = clampProbability(hour.probability);
    const probability = clampProbability(calibrateRainProbability(rawProbability));
    const id = `${location.id}:replay:${hour.time}`;
    const label = formatHourKey(hour.time);

    return {
      id,
      category: "rain",
      scope: "hour",
      locationId: location.id,
      locationName: location.name,
      question: `${label} ${location.name}에 비가 왔을까요?`,
      subtitle: `복기 마켓 · 당시 예보 확률 ${rawProbability}% · 예측 즉시 실측으로 채점`,
      threshold: RAIN_THRESHOLD_MM,
      unit: "mm",
      variable: "precipitation",
      rule: `${label} 관측 강수량이 ${RAIN_THRESHOLD_MM}mm 이상이면 YES`,
      targetHour: hour.time,
      probability,
      rawProbability,
      calibrated: true,
      source: "Open-Meteo 예보 아카이브 + 실측",
      members: null,
      yesMultiplier: multiplierFor(probability),
      noMultiplier: multiplierFor(100 - probability),
      volume: volumeFor(id),
      featured: false,
      replay: true,
    };
  });
}

export function locationById(id: string): JejuLocation {
  return JEJU_LOCATIONS.find((item) => item.id === id) ?? JEJU_LOCATIONS[0];
}

export function createTicket(market: WeatherMarket, side: Side, stake: number): Ticket {
  return {
    id: `${market.id}::${side}::${Date.now()}`,
    marketId: market.id,
    side,
    stake,
    placedAt: new Date().toISOString(),
    snapshot: {
      question: market.question,
      category: market.category,
      scope: market.scope,
      locationId: market.locationId,
      locationName: market.locationName,
      threshold: market.threshold,
      unit: market.unit,
      variable: market.variable,
      targetHour: market.targetHour,
      probability: market.probability,
      rawProbability: market.rawProbability,
      calibrated: market.calibrated,
      multiplier: side === "yes" ? market.yesMultiplier : market.noMultiplier,
      source: market.source,
      rule: market.rule,
    },
  };
}

function observedValueFor(ticket: Ticket, observed: ObservedSeries): number | null {
  const { scope, targetHour, variable } = ticket.snapshot;

  if (scope === "day") {
    const date = targetHour.slice(0, 10);
    const values = Object.entries(observed.hours)
      .filter(([key]) => key.startsWith(date))
      .map(([, hour]) => hour[variable])
      .filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return Math.max(...values);
  }

  const hour = observed.hours[targetHour];
  if (!hour) return null;
  const value = hour[variable];
  return Number.isFinite(value) ? value : null;
}

function isSettleable(ticket: Ticket, now: Date): boolean {
  if (ticket.snapshot.scope === "day") {
    const endOfDay = keyToDate(`${ticket.snapshot.targetHour.slice(0, 10)}T23:00`);
    return now.getTime() >= endOfDay.getTime() + 3_600_000;
  }
  return now.getTime() >= keyToDate(addHoursToKey(ticket.snapshot.targetHour, 1)).getTime();
}

/** Settles a single ticket, or returns null while the outcome is still unknown. */
export function settleTicket(ticket: Ticket, observed: ObservedSeries, now: Date = new Date()): Settlement | null {
  if (!isSettleable(ticket, now)) return null;

  const value = observedValueFor(ticket, observed);
  if (value === null) return null;

  const outcome: Side = value >= ticket.snapshot.threshold ? "yes" : "no";
  const won = ticket.side === outcome;
  const modelSide: Side = ticket.snapshot.probability >= 50 ? "yes" : "no";
  const modelCorrect = modelSide === outcome;

  return {
    ticketId: ticket.id,
    observed: value,
    outcome,
    won,
    payout: won ? Math.round(ticket.stake * ticket.snapshot.multiplier) : 0,
    modelSide,
    modelCorrect,
    // The product promise: when our own call misses, the user is paid regardless.
    guaranteeBonus: modelCorrect ? 0 : GUARANTEE_POINTS,
    settledAt: new Date().toISOString(),
  };
}

export function settleLedger(
  tickets: Ticket[],
  settlements: Record<string, Settlement>,
  observed: ObservedSeries,
  now: Date = new Date(),
): { settlements: Record<string, Settlement>; awarded: number; newlySettled: Settlement[] } {
  const next = { ...settlements };
  const newlySettled: Settlement[] = [];
  let awarded = 0;

  tickets.forEach((ticket) => {
    if (next[ticket.id]) return;
    const settlement = settleTicket(ticket, observed, now);
    if (!settlement) return;
    next[ticket.id] = settlement;
    newlySettled.push(settlement);
    awarded += settlement.payout + settlement.guaranteeBonus;
  });

  return { settlements: next, awarded, newlySettled };
}

export function scoreLedger(tickets: Ticket[], settlements: Record<string, Settlement>): ScoreCard {
  const settled = tickets.filter((ticket) => settlements[ticket.id]);
  const count = settled.length;

  let userWins = 0;
  let modelWins = 0;
  let brierSum = 0;
  let rawBrierSum = 0;
  let calibratedBrierSum = 0;
  let calibratedSample = 0;
  let pointsWon = 0;
  let guaranteePaid = 0;

  settled.forEach((ticket) => {
    const settlement = settlements[ticket.id];
    if (settlement.won) userWins += 1;
    if (settlement.modelCorrect) modelWins += 1;

    const realised = settlement.outcome === "yes" ? 1 : 0;
    brierSum += (ticket.snapshot.probability / 100 - realised) ** 2;
    pointsWon += settlement.payout;
    guaranteePaid += settlement.guaranteeBonus;

    // Before/after is only meaningful on the same subset, so score both there.
    if (ticket.snapshot.calibrated) {
      rawBrierSum += (ticket.snapshot.rawProbability / 100 - realised) ** 2;
      calibratedBrierSum += (ticket.snapshot.probability / 100 - realised) ** 2;
      calibratedSample += 1;
    }
  });

  return {
    settled: count,
    userWins,
    userAccuracy: count ? (userWins / count) * 100 : 0,
    modelWins,
    modelAccuracy: count ? (modelWins / count) * 100 : 0,
    modelBrier: calibratedSample ? calibratedBrierSum / calibratedSample : count ? brierSum / count : 0,
    rawBrier: calibratedSample ? rawBrierSum / calibratedSample : 0,
    calibratedSample,
    pointsWon,
    guaranteePaid,
    pending: tickets.length - count,
  };
}

export function loadLedger(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LEDGER_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is Ticket => Boolean(item && item.id && item.marketId && item.snapshot));
  } catch {
    return [];
  }
}

export function saveLedger(tickets: Ticket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(tickets));
}

export function loadSettlements(): Record<string, Settlement> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTLEMENT_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw as Record<string, Settlement>;
  } catch {
    return {};
  }
}

export function saveSettlements(settlements: Record<string, Settlement>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTLEMENT_KEY, JSON.stringify(settlements));
}

export function formatObserved(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "--";
  if (unit === "mm") return `${value.toFixed(1)}mm`;
  if (unit === "°C") return `${value.toFixed(1)}°`;
  if (unit === "km/h") return `${value.toFixed(1)}km/h`;
  if (unit === "%") return `${Math.round(value)}%`;
  return String(value);
}
