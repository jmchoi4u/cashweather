import pptxgen from "pptxgenjs";
import { existsSync } from "node:fs";

const OUT = "/Users/jm/Desktop/Projects/cashweather-mvp/제출/CashWeather_발표자료.pptx";
const SHOTS = "/Users/jm/Desktop/Projects/cashweather-mvp/제출/shots";

/**
 * Live-demo URL for the QR slide. Set it once the app is deployed:
 *   DEMO_URL=https://... node deck.mjs
 * Without it the slide renders a labelled placeholder instead of a dead QR code.
 */
const DEMO_URL = process.env.DEMO_URL ?? "";
const QR_PATH = `${SHOTS}/qr.png`;
const HAS_QR = Boolean(DEMO_URL) && existsSync(QR_PATH);

const NAVY = "102D3D";
const NAVY_DEEP = "091E29";
const BLUE = "2764F1";
const YELLOW = "FFD43B";
const RED = "D95757";
const GREEN = "1A7F4F";
const WHITE = "FFFFFF";
const INK = "1E2C34";
const MUTED = "76858D";
const LIGHT = "F5F7F8";

const H = "Apple SD Gothic Neo";
const B = "Apple SD Gothic Neo";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "CashWeather";
pres.title = "CashWeather 발표자료";

const W = 13.3;
const HT = 7.5;

/** Yellow circle badge — the deck's repeating motif. */
function badge(s, x, y, text, size = 0.52) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: size, h: size, fill: { color: YELLOW },
  });
  s.addText(text, {
    x, y, w: size, h: size,
    align: "center", valign: "middle",
    fontFace: H, fontSize: 14, bold: true, color: NAVY, margin: 0,
  });
}

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  return s;
}

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  return s;
}

function kicker(s, text, color = YELLOW, x = 0.85, y = 0.62) {
  s.addText(text, {
    x, y, w: 8, h: 0.3,
    fontFace: H, fontSize: 12, bold: true, color, charSpacing: 2, margin: 0,
  });
}

function title(s, text, color = INK, opts = {}) {
  s.addText(text, {
    x: 0.85, y: 0.98, w: opts.w ?? 11.6, h: opts.h ?? 1.0,
    fontFace: H, fontSize: opts.fontSize ?? 38, bold: true, color,
    margin: 0, lineSpacing: opts.lineSpacing ?? 44, ...(opts.extra ?? {}),
  });
}

/* ---------------------------------------------------------------- 1. 표지 */
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, { x: -1.7, y: -2.1, w: 6.4, h: 6.4, fill: { color: NAVY_DEEP } });
  s.addShape(pres.ShapeType.ellipse, { x: 10.6, y: 5.1, w: 4.2, h: 4.2, fill: { color: NAVY_DEEP } });

  badge(s, 0.95, 1.62, "☂", 0.72);
  s.addText("제주 공공데이터 해커톤", {
    x: 1.85, y: 1.68, w: 6, h: 0.42,
    fontFace: H, fontSize: 13, bold: true, color: YELLOW, charSpacing: 2, margin: 0, valign: "middle",
  });

  s.addText("CashWeather", {
    x: 0.95, y: 2.42, w: 11, h: 1.15,
    fontFace: H, fontSize: 60, bold: true, color: WHITE, margin: 0,
  });
  s.addText("제주 날씨, 맞히면 포인트가 됩니다", {
    x: 0.95, y: 3.58, w: 11, h: 0.72,
    fontFace: H, fontSize: 27, color: "CADCFC", margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.95, y: 4.72, w: 8.5, h: 0.92, rectRadius: 0.16,
    fill: { color: NAVY_DEEP },
  });
  s.addText("글로벌 AI 예보의 제주 편향을 실측 54,864시간으로 보정하는 생활날씨 예측·검증 서비스", {
    x: 1.25, y: 4.72, w: 7.9, h: 0.92,
    fontFace: B, fontSize: 13, color: "9FBACB", margin: 0, valign: "middle",
  });

  s.addText("2026. 08. 18.", {
    x: 0.95, y: 6.05, w: 5, h: 0.34,
    fontFace: B, fontSize: 12, color: "6E8C9E", margin: 0,
  });
  s.addNotes("CashWeather입니다. 한 줄로 말씀드리면, 제주에서 날씨를 맞히면 포인트가 되는 서비스입니다. 그런데 그 밑에는 훨씬 진지한 이야기가 있습니다.");
}

/* ------------------------------------------------------------ 2. 공감 훅 */
{
  const s = darkSlide();
  s.addText("“비 온다길래", {
    x: 1.0, y: 1.75, w: 11.3, h: 1.0,
    fontFace: H, fontSize: 46, bold: true, color: WHITE, margin: 0,
  });
  s.addText("우산 챙겼는데…”", {
    x: 1.0, y: 2.72, w: 11.3, h: 1.0,
    fontFace: H, fontSize: 46, bold: true, color: WHITE, margin: 0,
  });
  s.addText("☀", {
    x: 9.4, y: 1.5, w: 2.6, h: 2.6,
    fontFace: B, fontSize: 120, color: YELLOW, align: "center", valign: "middle", margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 1.0, y: 4.35, w: 11.0, h: 1.28, rectRadius: 0.18,
    fill: { color: NAVY_DEEP },
  });
  s.addText([
    { text: "제주에 살면 한 달에 몇 번씩 겪는 일입니다.  ", options: { fontSize: 16, color: "CADCFC" } },
    { text: "그런데 아무도 묻지 않았습니다 — ", options: { fontSize: 16, color: "CADCFC" } },
    { text: "“그 예보, 실제로 얼마나 맞았지?”", options: { fontSize: 16, color: YELLOW, bold: true } },
  ], {
    x: 1.35, y: 4.35, w: 10.3, h: 1.28,
    fontFace: B, margin: 0, valign: "middle",
  });
  s.addNotes("모두가 겪는 일입니다. 그런데 아무도 검증하지 않습니다. 그래서 저희가 직접 재봤습니다.");
}

/* -------------------------------------------------------- 3. 직접 측정함 */
{
  const s = lightSlide();
  kicker(s, "우리가 한 일 · 추정이 아니라 측정", BLUE);
  title(s, "그래서, 진짜로 재봤습니다");

  const cards = [
    { n: "54,864", l: "분석한 제주 시간", d: "6개 생활권 × 시간 단위" },
    { n: "6", l: "제주 생활권", d: "첨단로·아라동·시청·애월·성산·서귀포" },
    { n: "1:1", l: "예보 vs 실측 대조", d: "과거 예보 아카이브 × 실제 관측" },
  ];
  cards.forEach((c, i) => {
    const x = 0.85 + i * 3.95;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.35, w: 3.6, h: 2.62, rectRadius: 0.18,
      fill: { color: LIGHT },
    });
    s.addText(c.n, {
      x: x + 0.35, y: 2.65, w: 2.9, h: 0.95,
      fontFace: H, fontSize: 44, bold: true, color: NAVY, margin: 0,
    });
    s.addText(c.l, {
      x: x + 0.35, y: 3.62, w: 2.9, h: 0.36,
      fontFace: H, fontSize: 15, bold: true, color: INK, margin: 0,
    });
    s.addText(c.d, {
      x: x + 0.35, y: 4.02, w: 2.95, h: 0.72,
      fontFace: B, fontSize: 11.5, color: MUTED, margin: 0, lineSpacing: 16,
    });
  });

  s.addText("제주 6개 지점의 과거 예보 아카이브와 실제 관측 강수량을 시간 단위로 맞춰, 예보가 약속한 확률과 현실을 비교했습니다.", {
    x: 0.85, y: 5.35, w: 11.6, h: 0.42,
    fontFace: B, fontSize: 13.5, color: MUTED, margin: 0,
  });
  s.addNotes("추정이 아닙니다. 제주 6개 생활권의 54,864시간을 직접 수집해서, 예보가 약속한 확률과 실제로 비가 왔는지를 1:1로 대조했습니다.");
}

/* ------------------------------------------------- 4. 충격적 발견 (차트) */
{
  const s = lightSlide();
  kicker(s, "발견 · 이게 문제의 핵심입니다", RED);
  title(s, "글로벌 AI는 제주에서 비를 과대예측합니다");

  s.addChart(
    pres.ChartType.bar,
    [
      {
        name: "예보가 약속한 확률",
        labels: ["20~29%", "40~49%", "50~59%", "70~79%", "80~89%", "90~99%"],
        values: [25, 45, 55, 75, 85, 95],
      },
      {
        name: "제주에서 실제 강수율",
        labels: ["20~29%", "40~49%", "50~59%", "70~79%", "80~89%", "90~99%"],
        values: [5.4, 15.4, 17.5, 29.2, 43.3, 68.3],
      },
    ],
    {
      x: 0.85, y: 2.28, w: 7.9, h: 4.05,
      barDir: "col",
      chartColors: ["C9D5DA", RED],
      showTitle: false,
      showLegend: true,
      legendPos: "t",
      legendFontFace: B,
      legendFontSize: 11,
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFontFace: B,
      dataLabelFontSize: 9,
      dataLabelColor: INK,
      dataLabelFormatCode: '0"%"',
      catAxisLabelColor: MUTED,
      catAxisLabelFontFace: B,
      catAxisLabelFontSize: 10,
      valAxisLabelColor: MUTED,
      valAxisLabelFontFace: B,
      valAxisLabelFontSize: 10,
      valAxisMaxVal: 100,
      valGridLine: { color: "EDF1F3", size: 1 },
      catGridLine: { style: "none" },
      barGapWidthPct: 55,
    },
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 9.1, y: 2.28, w: 3.35, h: 4.05, rectRadius: 0.18,
    fill: { color: NAVY },
  });
  s.addText("모든 구간에서", {
    x: 9.42, y: 2.62, w: 2.75, h: 0.38,
    fontFace: H, fontSize: 15, color: "9FBACB", margin: 0,
  });
  s.addText("예외 없이", {
    x: 9.42, y: 3.0, w: 2.75, h: 0.55,
    fontFace: H, fontSize: 27, bold: true, color: WHITE, margin: 0,
  });
  s.addText("과대예측", {
    x: 9.42, y: 3.55, w: 2.75, h: 0.55,
    fontFace: H, fontSize: 27, bold: true, color: YELLOW, margin: 0,
  });
  s.addText("“90% 확률로 비”라고 한\n시간대 중 실제로 비가\n온 건 68.3%뿐이었습니다.\n\n70~79% 구간은\n겨우 29.2%였습니다.", {
    x: 9.42, y: 4.32, w: 2.8, h: 1.75,
    fontFace: B, fontSize: 12, color: "CADCFC", margin: 0, lineSpacing: 18,
  });
  s.addNotes("이게 핵심 발견입니다. 회색이 예보가 약속한 확률, 빨강이 제주에서 실제로 비가 온 비율입니다. 모든 구간에서 예외 없이 과대예측하고 있습니다. 90% 이상이라고 한 시간대도 실제로는 68%만 비가 왔습니다.");
}

/* ----------------------------------------------------- 5. 적중률 53% */
{
  const s = lightSlide();
  kicker(s, "그리고 더 심각한 사실", RED);
  title(s, "하루 전 예보, 맞을 확률은?");

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.85, y: 2.4, w: 5.5, h: 3.55, rectRadius: 0.2,
    fill: { color: NAVY },
  });
  s.addText("53%", {
    x: 1.2, y: 2.95, w: 4.8, h: 1.5,
    fontFace: H, fontSize: 96, bold: true, color: YELLOW, margin: 0,
  });
  s.addText("하루 전 예보의 강수 유무 적중률", {
    x: 1.2, y: 4.5, w: 4.8, h: 0.4,
    fontFace: H, fontSize: 16, bold: true, color: WHITE, margin: 0,
  });
  s.addText("제주 첨단로 기준 · 최근 62시간 실측 대조", {
    x: 1.2, y: 4.92, w: 4.8, h: 0.35,
    fontFace: B, fontSize: 12, color: "9FBACB", margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 6.95, y: 2.4, w: 5.5, h: 1.66, rectRadius: 0.2,
    fill: { color: LIGHT },
  });
  s.addText("🪙", {
    x: 7.3, y: 2.72, w: 0.9, h: 0.9,
    fontFace: B, fontSize: 34, align: "center", valign: "middle", margin: 0,
  });
  s.addText([
    { text: "동전 던지기\n", options: { fontSize: 19, bold: true, color: INK } },
    { text: "앞면이 나올 확률 50%", options: { fontSize: 12.5, color: MUTED } },
  ], {
    x: 8.35, y: 2.4, w: 3.85, h: 1.66,
    fontFace: H, margin: 0, valign: "middle", lineSpacing: 26,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 6.95, y: 4.29, w: 5.5, h: 1.66, rectRadius: 0.2,
    fill: { color: "FDF0F0" },
  });
  s.addText("우리가 매일 믿고 우산을 챙기는 예보가, 사실상 동전 던지기와 크게 다르지 않았습니다.", {
    x: 7.3, y: 4.29, w: 4.85, h: 1.66,
    fontFace: B, fontSize: 13.5, color: "9E3838", margin: 0, valign: "middle", lineSpacing: 20,
  });
  s.addNotes("하루 전 예보의 강수 유무 적중률은 53%였습니다. 동전 던지기가 50%입니다. 우리가 매일 믿고 있는 예보의 실체입니다.");
}

/* ------------------------------------------------------ 6. 솔루션 선언 */
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, { x: 10.2, y: -1.6, w: 5.2, h: 5.2, fill: { color: NAVY_DEEP } });
  kicker(s, "우리의 접근", YELLOW, 0.95, 1.35);

  s.addText("우리는 날씨를", {
    x: 0.95, y: 1.95, w: 11.4, h: 0.85,
    fontFace: H, fontSize: 40, color: "8FA9BA", margin: 0,
  });
  s.addText("새로 예측하지 않습니다", {
    x: 0.95, y: 2.72, w: 11.4, h: 0.9,
    fontFace: H, fontSize: 40, bold: true, color: WHITE, margin: 0,
  });
  s.addText("이미 세계 최고인 AI 예보를, 제주 실측으로 보정합니다", {
    x: 0.95, y: 3.82, w: 11.4, h: 0.85,
    fontFace: H, fontSize: 33, bold: true, color: YELLOW, margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.95, y: 5.12, w: 11.4, h: 1.28, rectRadius: 0.18,
    fill: { color: NAVY_DEEP },
  });
  s.addText("Google WeatherNext 2는 이미 훌륭한 모델입니다. 문제는 그게 전 지구 평균에 맞춰져 있다는 것입니다.\n한라산이 만드는 제주의 국지 특성은 그 안에 없습니다. 우리는 그 간극만 정확히 메웁니다.", {
    x: 1.3, y: 5.12, w: 10.7, h: 1.28,
    fontFace: B, fontSize: 13, color: "9FBACB", margin: 0, valign: "middle", lineSpacing: 20,
  });
  s.addNotes("저희는 새 예보 모델을 만들지 않습니다. 구글 WeatherNext 2는 이미 세계 최고 수준입니다. 다만 전 지구 평균에 최적화돼 있어서 제주 국지 특성이 빠져 있습니다. 저희는 그 간극만 메웁니다.");
}

/* ------------------------------------------------------- 7. JCM-1 3단계 */
{
  const s = lightSlide();
  kicker(s, "JCM-1 · Jeju Calibration Model v1", BLUE);
  title(s, "어떻게 보정하나요?");

  const steps = [
    { n: "1", t: "원본 확률 산출", d: "Google WeatherNext 2\n앙상블 64멤버 중\n몇 개가 비를 예측했나", tag: "95%", tagColor: MUTED },
    { n: "2", t: "제주 보정", d: "그 구간이 제주에서\n실제로 비가 온 비율로\n확률을 재조정", tag: "→ 66%", tagColor: BLUE },
    { n: "3", t: "실측 자동 정산", d: "해당 시각이 지나면\n실제 관측값으로\n자동 채점", tag: "0.2mm", tagColor: GREEN },
  ];

  steps.forEach((st, i) => {
    const x = 0.85 + i * 4.0;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.35, w: 3.62, h: 3.1, rectRadius: 0.18,
      fill: { color: i === 1 ? "EDF3FF" : LIGHT },
    });
    badge(s, x + 0.32, 2.62, st.n, 0.5);
    s.addText(st.t, {
      x: x + 0.95, y: 2.62, w: 2.5, h: 0.5,
      fontFace: H, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(st.d, {
      x: x + 0.34, y: 3.32, w: 3.0, h: 1.15,
      fontFace: B, fontSize: 12, color: MUTED, margin: 0, lineSpacing: 17,
    });
    s.addText(st.tag, {
      x: x + 0.34, y: 4.62, w: 3.0, h: 0.55,
      fontFace: H, fontSize: 25, bold: true, color: st.tagColor, margin: 0,
    });

    if (i < 2) {
      s.addText("→", {
        x: x + 3.62, y: 3.6, w: 0.38, h: 0.5,
        fontFace: B, fontSize: 20, color: "B9C6CC", align: "center", valign: "middle", margin: 0,
      });
    }
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.85, y: 5.72, w: 11.62, h: 0.86, rectRadius: 0.14,
    fill: { color: NAVY },
  });
  s.addText("보정된 확률이 곧 마켓의 배당이 됩니다. 그래서 우리 모델이 틀리면 우리가 포인트를 지급합니다.", {
    x: 1.2, y: 5.72, w: 11, h: 0.86,
    fontFace: H, fontSize: 14, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addNotes("3단계입니다. 앙상블 64멤버에서 원본 확률을 뽑고, 제주 실측 기준으로 보정하고, 시간이 지나면 실제 관측값으로 자동 채점합니다.");
}

/* --------------------------------------------------------- 8. 검증 결과 */
{
  const s = lightSlide();
  kicker(s, "검증 · 학습에 쓰지 않은 11,088시간", GREEN);
  title(s, "정말 좋아졌나? 숫자로 증명합니다");

  s.addShape(pres.ShapeType.roundRect, { x: 0.85, y: 2.35, w: 3.35, h: 2.15, rectRadius: 0.18, fill: { color: LIGHT } });
  s.addText("보정 전", { x: 1.15, y: 2.6, w: 2.8, h: 0.34, fontFace: H, fontSize: 13, color: MUTED, margin: 0 });
  s.addText("0.1300", { x: 1.15, y: 2.98, w: 2.8, h: 0.85, fontFace: H, fontSize: 40, bold: true, color: MUTED, margin: 0 });
  s.addText("Brier score", { x: 1.15, y: 3.86, w: 2.8, h: 0.32, fontFace: B, fontSize: 11.5, color: MUTED, margin: 0 });

  s.addText("→", { x: 4.32, y: 3.1, w: 0.5, h: 0.6, fontFace: B, fontSize: 26, color: "B9C6CC", align: "center", valign: "middle", margin: 0 });

  s.addShape(pres.ShapeType.roundRect, { x: 4.95, y: 2.35, w: 3.35, h: 2.15, rectRadius: 0.18, fill: { color: "E9F5EE" } });
  s.addText("보정 후", { x: 5.25, y: 2.6, w: 2.8, h: 0.34, fontFace: H, fontSize: 13, color: GREEN, margin: 0 });
  s.addText("0.0832", { x: 5.25, y: 2.98, w: 2.8, h: 0.85, fontFace: H, fontSize: 40, bold: true, color: GREEN, margin: 0 });
  s.addText("Brier score · 낮을수록 정확", { x: 5.25, y: 3.86, w: 2.95, h: 0.32, fontFace: B, fontSize: 11.5, color: GREEN, margin: 0 });

  s.addShape(pres.ShapeType.roundRect, { x: 9.05, y: 2.35, w: 3.4, h: 2.15, rectRadius: 0.18, fill: { color: NAVY } });
  s.addText("36%", { x: 9.35, y: 2.72, w: 2.85, h: 0.95, fontFace: H, fontSize: 48, bold: true, color: YELLOW, margin: 0 });
  s.addText("정확도 개선", { x: 9.35, y: 3.72, w: 2.85, h: 0.38, fontFace: H, fontSize: 15, bold: true, color: WHITE, margin: 0 });

  const rows = [
    ["학습 구간", "2025-08-01 ~ 2026-05-31 · 43,776시간"],
    ["검증 구간", "2026-06-01 ~ 2026-08-16 · 11,088시간 (학습에 전혀 미사용)"],
    ["분리 방식", "시간 순서 분리 — 무작위 분할 금지, 미래 데이터 유입 차단"],
    ["기후값 대비 스킬", "8.9% → 41.7%"],
  ];
  rows.forEach((r, i) => {
    const y = 4.78 + i * 0.46;
    s.addText(r[0], {
      x: 0.85, y, w: 2.7, h: 0.4,
      fontFace: H, fontSize: 12.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(r[1], {
      x: 3.6, y, w: 8.85, h: 0.4,
      fontFace: B, fontSize: 12.5, color: MUTED, margin: 0, valign: "middle",
    });
  });
  s.addNotes("시간 순서로 학습과 검증을 분리했습니다. 무작위로 나누면 미래 날씨가 학습에 새어 들어가 성능이 부풀려집니다. 학습에 한 번도 쓰지 않은 11,088시간에서 Brier가 36% 개선됐습니다.");
}

/* ------------------------------------------------------------- 9. 앱 마켓 */
{
  const s = lightSlide();
  kicker(s, "PRODUCT", BLUE);
  title(s, "예측이 재미있어야 데이터가 쌓입니다");

  s.addImage({ path: `${SHOTS}/02-market.png`, x: 0.9, y: 2.05, w: 2.5, h: 4.73 });
  s.addImage({ path: `${SHOTS}/04-bet.png`, x: 3.6, y: 2.05, w: 2.5, h: 4.73 });

  const points = [
    { t: "원본과 보정을 나란히", d: "“원본 AI 95% → 제주 보정 66%” — 무엇이 왜 바뀌었는지 사용자가 직접 확인합니다." },
    { t: "제주 전역 마켓 보드", d: "6개 생활권 × 강수·기온·바람·구름. 마감 임박순으로 탐색합니다." },
    { t: "현금이 아닌 무료 포인트", d: "충전·환전이 없습니다. 포인트는 제주 지역 제휴 쿠폰으로만 교환됩니다." },
  ];
  points.forEach((p, i) => {
    const y = 2.25 + i * 1.5;
    badge(s, 6.5, y, String(i + 1), 0.46);
    s.addText(p.t, {
      x: 7.15, y: y - 0.04, w: 5.3, h: 0.42,
      fontFace: H, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(p.d, {
      x: 7.15, y: y + 0.44, w: 5.3, h: 0.82,
      fontFace: B, fontSize: 12.5, color: MUTED, margin: 0, lineSpacing: 18,
    });
  });
  s.addNotes("아무리 좋은 모델도 사람이 안 쓰면 데이터가 안 쌓입니다. 그래서 예측을 마켓 형태로 만들었습니다. 핵심은 원본 확률과 보정 확률을 항상 나란히 보여준다는 겁니다.");
}

/* ------------------------------------------------- 10. 틀리면 포인트 */
{
  const s = lightSlide();
  kicker(s, "차별점 · 이건 마케팅 문구가 아닙니다", YELLOW === YELLOW ? "B8860B" : MUTED);
  title(s, "“우리 예측이 틀리면 포인트를 드립니다”");

  s.addImage({ path: `${SHOTS}/05-ledger.png`, x: 8.9, y: 1.95, w: 2.5, h: 4.73 });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.85, y: 2.3, w: 7.65, h: 1.72, rectRadius: 0.18, fill: { color: "E9F5EE" },
  });
  s.addText("실측 0.2mm  →  결과 YES  →  +145P 자동 지급", {
    x: 1.2, y: 2.5, w: 7.0, h: 0.5,
    fontFace: H, fontSize: 20, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("대상 시각이 지나면 실제 관측값을 조회해 자동으로 채점합니다.\n우리 모델이 틀렸다면, 사용자의 적중 여부와 무관하게 보상 포인트를 지급합니다.", {
    x: 1.2, y: 3.05, w: 7.0, h: 0.8,
    fontFace: B, fontSize: 12.5, color: "3F6F58", margin: 0, lineSpacing: 18,
  });

  const facts = [
    ["정산 근거", "마켓을 만든 예보와 정산에 쓰는 실측은 서로 다른 데이터입니다"],
    ["숨길 수 없는 구조", "모든 예측이 자동 채점되어 정확도가 상시 공개됩니다"],
    ["사행성 배제", "현금 충전·환전·상금이 없는 무료 포인트 구조입니다"],
  ];
  facts.forEach((f, i) => {
    const y = 4.35 + i * 0.78;
    s.addShape(pres.ShapeType.roundRect, { x: 0.85, y, w: 7.65, h: 0.64, rectRadius: 0.12, fill: { color: LIGHT } });
    s.addText(f[0], {
      x: 1.15, y, w: 2.1, h: 0.64,
      fontFace: H, fontSize: 12.5, bold: true, color: NAVY, margin: 0, valign: "middle",
    });
    s.addText(f[1], {
      x: 3.3, y, w: 5.05, h: 0.64,
      fontFace: B, fontSize: 11.5, color: MUTED, margin: 0, valign: "middle",
    });
  });
  s.addNotes("이게 저희의 진짜 차별점입니다. 마켓을 만든 데이터와 정산하는 데이터가 다릅니다. 그래서 우리는 우리 정확도를 숨길 수 없습니다.");
}

/* --------------------------------------------------- 11. 라이브 QR 참여 */
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, { x: -1.4, y: 4.6, w: 5.0, h: 5.0, fill: { color: NAVY_DEEP } });

  kicker(s, "LIVE DEMO", YELLOW, 0.95, 0.85);
  s.addText("지금, 심사위원님도\n같이 예측해보시죠", {
    x: 0.95, y: 1.35, w: 7.2, h: 1.9,
    fontFace: H, fontSize: 38, bold: true, color: WHITE, margin: 0, lineSpacing: 46,
  });

  s.addText("QR을 찍으면 바로 지금 제주 날씨 마켓이 열립니다.\n설치 없이 웹에서 바로 참여하실 수 있습니다.", {
    x: 0.95, y: 3.45, w: 7.2, h: 0.9,
    fontFace: B, fontSize: 15, color: "CADCFC", margin: 0, lineSpacing: 24,
  });

  const items = [
    "QR 스캔 → 잠금화면 → 밀어서 참여",
    "‘복기’ 탭 선택 → 지난 시각 마켓",
    "YES / NO 선택 → 즉시 실측으로 채점",
  ];
  items.forEach((t, i) => {
    const y = 4.6 + i * 0.62;
    badge(s, 0.95, y, String(i + 1), 0.42);
    s.addText(t, {
      x: 1.55, y, w: 6.6, h: 0.42,
      fontFace: B, fontSize: 13.5, color: WHITE, margin: 0, valign: "middle",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.75, y: 1.45, w: 3.7, h: 4.6, rectRadius: 0.22, fill: { color: WHITE },
  });

  if (HAS_QR) {
    s.addImage({ path: QR_PATH, x: 9.3, y: 1.95, w: 2.6, h: 2.6 });
    s.addText(DEMO_URL.replace(/^https?:\/\//, ""), {
      x: 8.95, y: 4.68, w: 3.3, h: 0.36,
      fontFace: B, fontSize: 11, color: MUTED, align: "center", margin: 0,
    });
  } else {
    s.addShape(pres.ShapeType.roundRect, {
      x: 9.3, y: 1.95, w: 2.6, h: 2.6, rectRadius: 0.16, fill: { color: LIGHT },
    });
    s.addText("QR", {
      x: 9.3, y: 2.35, w: 2.6, h: 0.8,
      fontFace: H, fontSize: 40, bold: true, color: "C3CED4", align: "center", valign: "middle", margin: 0,
    });
    s.addText("배포 URL 확정 후 삽입", {
      x: 9.3, y: 3.15, w: 2.6, h: 0.4,
      fontFace: B, fontSize: 11, color: "9BA8AE", align: "center", margin: 0,
    });
    s.addText("DEMO_URL=… node deck.mjs", {
      x: 8.95, y: 4.68, w: 3.3, h: 0.36,
      fontFace: B, fontSize: 10, color: "B0BBC1", align: "center", margin: 0,
    });
  }

  s.addText("설치 없이 웹에서 바로", {
    x: 8.95, y: 5.06, w: 3.3, h: 0.4,
    fontFace: H, fontSize: 14, bold: true, color: NAVY, align: "center", margin: 0,
  });
  s.addNotes("여기서 실제로 시연합니다. 복기 마켓은 이미 지난 시각이라 예측하면 바로 실측으로 채점됩니다. 예보값과 관측값 모두 실제 데이터이고, 참여 시점만 사후입니다.");
}

/* ------------------------------------------------------- 12. 공공데이터 */
{
  const s = lightSlide();
  kicker(s, "공공데이터 활용", BLUE);
  title(s, "흩어진 데이터를 판단 정보로");

  const sources = [
    { tag: "LIVE", tagBg: "E6F6EE", tagColor: GREEN, t: "Open-Meteo 예보·관측·아카이브", d: "마켓 생성 · 자동 정산 실측값 · 보정 모델 학습 데이터" },
    { tag: "LIVE", tagBg: "E6F6EE", tagColor: GREEN, t: "Google WeatherNext 2 앙상블", d: "64멤버 확률 산출 · 마켓 가격 결정" },
    { tag: "READY", tagBg: "FFF5DA", tagColor: "94700C", t: "기상청 단기예보 (공공데이터포털)", d: "DFS 격자 변환 구현 완료 · 서비스키 발급 시 즉시 활성화" },
    { tag: "SNAP", tagBg: "EEF3F6", tagColor: "5C7280", t: "제주 관광지 · 민방위대피시설", d: "날씨 조건별 실내/야외/대피 장소 추천" },
  ];
  sources.forEach((src, i) => {
    const y = 2.3 + i * 0.92;
    s.addShape(pres.ShapeType.roundRect, { x: 0.85, y, w: 8.2, h: 0.78, rectRadius: 0.13, fill: { color: LIGHT } });
    s.addShape(pres.ShapeType.roundRect, { x: 1.1, y: y + 0.21, w: 0.82, h: 0.36, rectRadius: 0.07, fill: { color: src.tagBg } });
    s.addText(src.tag, {
      x: 1.1, y: y + 0.21, w: 0.82, h: 0.36,
      fontFace: H, fontSize: 8.5, bold: true, color: src.tagColor, align: "center", valign: "middle", margin: 0,
    });
    s.addText(src.t, {
      x: 2.1, y: y + 0.08, w: 6.75, h: 0.34,
      fontFace: H, fontSize: 13, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(src.d, {
      x: 2.1, y: y + 0.4, w: 6.75, h: 0.32,
      fontFace: B, fontSize: 10.5, color: MUTED, margin: 0, valign: "middle",
    });
  });

  s.addShape(pres.ShapeType.roundRect, { x: 9.4, y: 2.3, w: 3.05, h: 3.62, rectRadius: 0.18, fill: { color: NAVY } });
  s.addText("기상청 격자 변환", {
    x: 9.7, y: 2.6, w: 2.5, h: 0.36,
    fontFace: H, fontSize: 13, bold: true, color: YELLOW, margin: 0,
  });
  s.addText("공식값과 대조 검증", {
    x: 9.7, y: 2.94, w: 2.5, h: 0.3,
    fontFace: B, fontSize: 10.5, color: "9FBACB", margin: 0,
  });
  const grids = [["제주시청", "53, 38"], ["서울시청", "60, 127"], ["부산시청", "98, 76"]];
  grids.forEach((g, i) => {
    const y = 3.42 + i * 0.62;
    s.addText(g[0], { x: 9.7, y, w: 1.4, h: 0.36, fontFace: B, fontSize: 11.5, color: "CADCFC", margin: 0, valign: "middle" });
    s.addText(g[1], { x: 11.05, y, w: 1.2, h: 0.36, fontFace: H, fontSize: 12.5, bold: true, color: WHITE, margin: 0, valign: "middle", align: "right" });
  });
  s.addText("전부 일치 ✓", {
    x: 9.7, y: 5.32, w: 2.5, h: 0.34,
    fontFace: H, fontSize: 12.5, bold: true, color: "6FD59B", margin: 0,
  });
  s.addNotes("기상청 연동은 DFS 격자 변환까지 실제로 구현했고 공식값과 대조해서 검증했습니다. 서비스키가 없어서 호출은 못 하기 때문에 앱에 READY로 정직하게 표기했습니다.");
}

/* ------------------------------------------------------------ 13. 확장 */
{
  const s = lightSlide();
  kicker(s, "확장 · 같은 구조가 그대로 커집니다", BLUE);
  title(s, "제주에서 검증하고, 전국으로");

  const stages = [
    { p: "NOW", t: "제주 생활날씨", d: "6개 생활권 강수 보정\n무료 포인트 마켓\n지역 제휴 쿠폰 교환", c: NAVY, tc: WHITE, sc: "CADCFC" },
    { p: "NEXT", t: "변수·지역 확장", d: "기온·바람·운량 보정 추가\n영동·영남 등 지역 특성 구간\n기상청 API 정식 연동", c: "EDF3FF", tc: NAVY, sc: MUTED },
    { p: "THEN", t: "B2G 재난 대응", d: "호우·강풍 확률 보정\n과대예측 경보 피로 감소\n대피시설 연계 안내", c: LIGHT, tc: NAVY, sc: MUTED },
  ];
  stages.forEach((st, i) => {
    const x = 0.85 + i * 4.0;
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.35, w: 3.62, h: 3.3, rectRadius: 0.18, fill: { color: st.c } });
    s.addText(st.p, {
      x: x + 0.34, y: 2.62, w: 2.9, h: 0.32,
      fontFace: H, fontSize: 11, bold: true, color: st.tc === WHITE ? YELLOW : BLUE, charSpacing: 2, margin: 0,
    });
    s.addText(st.t, {
      x: x + 0.34, y: 3.0, w: 3.0, h: 0.48,
      fontFace: H, fontSize: 19, bold: true, color: st.tc, margin: 0,
    });
    s.addText(st.d, {
      x: x + 0.34, y: 3.68, w: 3.0, h: 1.6,
      fontFace: B, fontSize: 12, color: st.sc, margin: 0, lineSpacing: 20,
    });
  });

  s.addText("보정 방법론 자체가 자산입니다. 지역이 바뀌어도 데이터만 갈아끼우면 그대로 작동합니다.", {
    x: 0.85, y: 5.95, w: 11.6, h: 0.42,
    fontFace: B, fontSize: 13.5, color: MUTED, margin: 0,
  });
  s.addNotes("제주에서 검증한 방법론은 지역만 바꾸면 그대로 확장됩니다. 나아가 호우·강풍 같은 위험기상에 적용하면 과대예측으로 인한 경보 피로를 줄일 수 있습니다.");
}

/* ---------------------------------------------------------- 14. 마무리 */
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, { x: 9.9, y: 3.6, w: 5.6, h: 5.6, fill: { color: NAVY_DEEP } });

  s.addText("예보는 전달이 아니라", {
    x: 0.95, y: 2.0, w: 11.4, h: 0.9,
    fontFace: H, fontSize: 42, color: "8FA9BA", margin: 0,
  });
  s.addText("검증입니다", {
    x: 0.95, y: 2.85, w: 11.4, h: 1.0,
    fontFace: H, fontSize: 52, bold: true, color: YELLOW, margin: 0,
  });

  const stats = [
    ["54,864", "분석 시간"],
    ["36%", "정확도 개선"],
    ["4종", "공공데이터"],
  ];
  stats.forEach((st, i) => {
    const x = 0.95 + i * 2.75;
    s.addText(st[0], {
      x, y: 4.55, w: 2.4, h: 0.65,
      fontFace: H, fontSize: 30, bold: true, color: WHITE, margin: 0,
    });
    s.addText(st[1], {
      x, y: 5.2, w: 2.4, h: 0.32,
      fontFace: B, fontSize: 12, color: "8FA9BA", margin: 0,
    });
  });

  s.addText("CashWeather", {
    x: 0.95, y: 6.15, w: 6, h: 0.5,
    fontFace: H, fontSize: 22, bold: true, color: WHITE, margin: 0,
  });
  s.addNotes("예보는 전달이 아니라 검증입니다. 감사합니다.");
}

await pres.writeFile({ fileName: OUT });
console.log("saved:", OUT);
