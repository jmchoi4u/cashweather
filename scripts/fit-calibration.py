#!/usr/bin/env python3
"""
Fits JCM-1, the Jeju rain-probability calibration table shipped in src/calibration.ts.

Run:  python3 scripts/fit-calibration.py

Pulls Open-Meteo's archived forecast probabilities and the matching observed
precipitation for every Jeju location, splits by time (never randomly — that
would leak future weather into training), fits a smoothed histogram calibration
on the training window only, and scores it on the held-out window.

Prints a TypeScript-ready table plus the validation numbers quoted in the docs.
"""

import collections
import json
import sys
import urllib.request

LOCATIONS = [
    ("cheomdan", 33.446006, 126.570715),
    ("ara", 33.49309, 126.55684),
    ("cityhall", 33.49962, 126.53119),
    ("aewol", 33.46235, 126.31155),
    ("seongsan", 33.45806, 126.94245),
    ("seogwipo", 33.25405, 126.5601),
]

START = "2025-08-01"
SPLIT = "2026-06-01"   # everything from here on is test-only
END = "2026-08-16"

RAIN_MM = 0.1          # must match market settlement in src/markets.ts
BINS = 10
SHRINK = 20            # pseudo-counts pulling sparse bins toward the base rate


def fetch(lat, lon):
    url = (
        "https://historical-forecast-api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={START}&end_date={END}"
        "&hourly=precipitation_probability,precipitation&timezone=Asia%2FSeoul"
    )
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def collect():
    train, test = [], []
    for name, lat, lon in LOCATIONS:
        hourly = fetch(lat, lon)["hourly"]
        rows = zip(hourly["time"], hourly["precipitation_probability"], hourly["precipitation"])
        for time, probability, amount in rows:
            if probability is None or amount is None:
                continue
            record = (probability / 100.0, 1 if amount >= RAIN_MM else 0)
            (train if time < SPLIT else test).append(record)
        print(f"  fetched {name}", file=sys.stderr)
    return train, test


def fit(train):
    counts = collections.defaultdict(lambda: [0, 0])
    for probability, outcome in train:
        index = min(BINS - 1, int(probability * BINS))
        counts[index][0] += 1
        counts[index][1] += outcome

    prior = sum(outcome for _, outcome in train) / len(train)
    table = {}
    for index in range(BINS):
        n, hits = counts[index]
        table[index] = (hits + prior * SHRINK) / (n + SHRINK) if n else prior
    return table, counts, prior


def brier(pairs, predict):
    return sum((predict(p) - o) ** 2 for p, o in pairs) / len(pairs)


def main():
    print("fetching...", file=sys.stderr)
    train, test = collect()
    table, counts, prior = fit(train)

    def calibrated(probability):
        return table[min(BINS - 1, int(probability * BINS))]

    raw_brier = brier(test, lambda p: p)
    cal_brier = brier(test, calibrated)
    clim_brier = brier(test, lambda _: prior)

    print(f"\ntrain={len(train)}  test={len(test)}  base rate={prior:.4f}")
    print(f"TEST Brier   raw={raw_brier:.4f}  calibrated={cal_brier:.4f}  climatology={clim_brier:.4f}")
    print(f"improvement  {100 * (raw_brier - cal_brier) / raw_brier:.1f}%")
    print(f"skill        raw={100 * (1 - raw_brier / clim_brier):.1f}%  calibrated={100 * (1 - cal_brier / clim_brier):.1f}%")

    print("\nexport const CALIBRATION_BINS: CalibrationBin[] = [")
    for index in range(BINS):
        n, _ = counts[index]
        print(f"  {{ lower: {index * 10}, upper: {index * 10 + 9}, samples: {n}, calibrated: {table[index] * 100:.1f} }},")
    print("];")

    test_counts = collections.defaultdict(lambda: [0, 0])
    for probability, outcome in test:
        index = min(BINS - 1, int(probability * BINS))
        test_counts[index][0] += 1
        test_counts[index][1] += outcome

    print("\nexport const RELIABILITY: ReliabilityPoint[] = [")
    for index in sorted(test_counts):
        n, hits = test_counts[index]
        print(f"  {{ bin: {index * 10}, samples: {n}, observed: {100 * hits / n:.1f}, model: {100 * table[index]:.1f} }},")
    print("];")


if __name__ == "__main__":
    main()
