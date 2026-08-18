/**
 * JCM-1 — Jeju Calibration Model, v1.
 *
 * Global forecast models are tuned for global skill, not for Jeju. Scored against
 * observations they over-forecast rain here in *every* probability band: hours
 * advertised at 90-99% only rained 68% of the time, and 70-79% hours only 29%.
 *
 * This module ships the correction as a lookup table fitted offline:
 *
 *   source   Open-Meteo historical forecast archive + observed precipitation
 *   points   6 Jeju locations x hourly
 *   train    2025-08-01 ~ 2026-05-31   (43,776 hours)
 *   test     2026-06-01 ~ 2026-08-16   (11,088 hours, never seen while fitting)
 *   method   10-bin histogram calibration, Laplace-shrunk toward the base rate
 *   result   Brier 0.1300 -> 0.0832 on the held-out window (-36.0%)
 *
 * Rain is defined as >= 0.1mm in the hour, matching market settlement.
 * Refit with `scripts/fit-calibration.py` when the window is extended.
 */

export type CalibrationBin = {
  lower: number;
  upper: number;
  samples: number;
  /** Observed rain frequency for this forecast band, in percent. */
  calibrated: number;
};

export type ReliabilityPoint = {
  bin: number;
  samples: number;
  /** Actual rain frequency in the held-out window. */
  observed: number;
  /** What JCM-1 predicted for that band. */
  model: number;
};

export const CALIBRATION_BINS: CalibrationBin[] = [
  { lower: 0, upper: 9, samples: 27275, calibrated: 0.5 },
  { lower: 10, upper: 19, samples: 1942, calibrated: 5.6 },
  { lower: 20, upper: 29, samples: 1736, calibrated: 8.9 },
  { lower: 30, upper: 39, samples: 1352, calibrated: 16.3 },
  { lower: 40, upper: 49, samples: 1164, calibrated: 17.3 },
  { lower: 50, upper: 59, samples: 1115, calibrated: 22.0 },
  { lower: 60, upper: 69, samples: 1207, calibrated: 26.8 },
  { lower: 70, upper: 79, samples: 1335, calibrated: 31.9 },
  { lower: 80, upper: 89, samples: 1408, calibrated: 40.9 },
  { lower: 90, upper: 99, samples: 5242, calibrated: 65.8 },
];

/** Held-out reliability: how JCM-1 tracked reality on data it never saw. */
export const RELIABILITY: ReliabilityPoint[] = [
  { bin: 0, samples: 5378, observed: 0.7, model: 0.5 },
  { bin: 10, samples: 806, observed: 3.3, model: 5.6 },
  { bin: 20, samples: 628, observed: 5.4, model: 8.9 },
  { bin: 30, samples: 465, observed: 14.0, model: 16.3 },
  { bin: 40, samples: 344, observed: 15.4, model: 17.3 },
  { bin: 50, samples: 389, observed: 17.5, model: 22.0 },
  { bin: 60, samples: 434, observed: 25.8, model: 26.8 },
  { bin: 70, samples: 472, observed: 29.2, model: 31.9 },
  { bin: 80, samples: 515, observed: 43.3, model: 40.9 },
  { bin: 90, samples: 1657, observed: 68.3, model: 65.8 },
];

export const CALIBRATION_META = {
  id: "JCM-1",
  name: "제주 강수확률 보정 모델",
  trainSamples: 43_776,
  testSamples: 11_088,
  totalSamples: 54_864,
  locations: 6,
  trainWindow: "2025-08-01 ~ 2026-05-31",
  testWindow: "2026-06-01 ~ 2026-08-16",
  rawBrier: 0.13,
  calibratedBrier: 0.0832,
  climatologyBrier: 0.1426,
  /** Percent reduction in Brier score on the held-out window. */
  improvement: 36.0,
  rawSkill: 8.9,
  calibratedSkill: 41.7,
  rainThresholdMm: 0.1,
  method: "10구간 히스토그램 보정 (Laplace 축소)",
} as const;

/**
 * Maps a raw model probability onto the Jeju-corrected probability.
 * Interpolates between bin centres so neighbouring forecasts do not jump.
 */
export function calibrateRainProbability(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const bounded = Math.max(0, Math.min(100, raw));

  const centres = CALIBRATION_BINS.map((bin) => ({
    x: (bin.lower + bin.upper) / 2,
    y: bin.calibrated,
  }));

  if (bounded <= centres[0].x) return centres[0].y;
  if (bounded >= centres[centres.length - 1].x) return centres[centres.length - 1].y;

  for (let index = 0; index < centres.length - 1; index += 1) {
    const left = centres[index];
    const right = centres[index + 1];
    if (bounded >= left.x && bounded <= right.x) {
      const ratio = (bounded - left.x) / (right.x - left.x);
      return left.y + ratio * (right.y - left.y);
    }
  }

  return bounded;
}

/** How much the correction moved the number, for UI copy. */
export function calibrationDelta(raw: number): { calibrated: number; delta: number; direction: "down" | "up" | "flat" } {
  const calibrated = calibrateRainProbability(raw);
  const delta = calibrated - raw;
  return {
    calibrated,
    delta,
    direction: Math.abs(delta) < 0.5 ? "flat" : delta < 0 ? "down" : "up",
  };
}

export function brierScore(pairs: Array<{ probability: number; outcome: 0 | 1 }>): number {
  if (!pairs.length) return 0;
  const total = pairs.reduce((sum, pair) => sum + (pair.probability / 100 - pair.outcome) ** 2, 0);
  return total / pairs.length;
}
