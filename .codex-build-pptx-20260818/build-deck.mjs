import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/jm/Desktop/Projects/cashweather-mvp";
const BUILD = path.join(ROOT, ".codex-build-pptx-20260818");
const OUT = path.join(ROOT, "제출", "CashWeather_25조_7분발표_초안.pptx");

const W = 1280;
const H = 720;
const FONT = "Apple SD Gothic Neo";
const COLORS = {
  ink: "#0B172A",
  navy: "#10243B",
  blue: "#2D66F6",
  blueSoft: "#E9F0FF",
  yellow: "#FFD548",
  yellowSoft: "#FFF6C8",
  coral: "#FF6B59",
  coralSoft: "#FFEAE6",
  cream: "#FBFAF5",
  white: "#FFFFFF",
  line: "#DCE2EA",
  muted: "#6C7788",
  green: "#19A974",
};

async function bytes(file) {
  return new Uint8Array(await fs.readFile(file));
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? "none",
    line: { style: "solid", fill: opts.line ?? "none", width: opts.lineWidth ?? 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: opts.typeface ?? FONT,
    fontSize: opts.fontSize ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? COLORS.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
    wrap: opts.wrap ?? "square",
    lineSpacing: opts.lineSpacing,
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function addBox(slide, x, y, w, h, fill, opts = {}) {
  const geometry = opts.geometry ?? "roundRect";
  const config = {
    geometry,
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: {
      style: opts.lineStyle ?? "solid",
      fill: opts.line ?? "none",
      width: opts.lineWidth ?? 0,
    },
  };
  if (["rect", "textbox", "roundRect"].includes(geometry)) {
    config.borderRadius = opts.radius ?? "rounded-2xl";
  }
  return slide.shapes.add(config);
}

function addPill(slide, text, x, y, w, fill, color, opts = {}) {
  addBox(slide, x, y, w, opts.h ?? 34, fill, {
    geometry: "roundRect",
    radius: "rounded-full",
    line: opts.line ?? "none",
    lineWidth: opts.lineWidth ?? 0,
  });
  addText(slide, text, x, y + 1, w, (opts.h ?? 34) - 2, {
    fontSize: opts.fontSize ?? 15,
    bold: opts.bold ?? true,
    color,
    align: "center",
    valign: "middle",
  });
}

function addHeader(slide, title, index, opts = {}) {
  addText(slide, opts.eyebrow ?? "CASHWEATHER / 25조", 72, 34, 360, 26, {
    fontSize: 14,
    bold: true,
    color: opts.dark ? "#FFFFFFB8" : COLORS.blue,
    valign: "middle",
  });
  addText(slide, String(index).padStart(2, "0"), 1168, 34, 40, 24, {
    fontSize: 14,
    bold: true,
    color: opts.dark ? "#FFFFFF99" : COLORS.muted,
    align: "right",
    valign: "middle",
  });
  addText(slide, title, 72, 78, 1120, opts.titleHeight ?? 84, {
    fontSize: opts.fontSize ?? 42,
    bold: true,
    color: opts.dark ? COLORS.white : COLORS.ink,
    valign: "middle",
  });
}

function addImage(slide, blob, alt, x, y, w, h, opts = {}) {
  return slide.images.add({
    blob,
    contentType: opts.contentType ?? "image/png",
    alt,
    fit: opts.fit ?? "contain",
    position: { left: x, top: y, width: w, height: h },
    geometry: opts.geometry ?? "rect",
    borderRadius: opts.radius,
    crop: opts.crop,
  });
}

function addNotes(slide, notes, sources) {
  const block = [
    ...notes,
    "",
    "[Sources]",
    ...sources.map((source) => `- ${source}`),
    "[/Sources]",
  ].join("\n");
  slide.speakerNotes.textFrame.setText(block);
  slide.speakerNotes.setVisible(true);
}

async function main() {
  await fs.mkdir(path.join(BUILD, "rendered"), { recursive: true });
  const rain = await bytes(path.join(ROOT, "public/assets/cashweather/jeju-rain-lockscreen.png"));
  const mascot = await bytes(path.join(ROOT, "public/assets/cashweather/cloud-coin-mascot.png"));
  const lock = await bytes(path.join(ROOT, "qa/final-lock.png"));
  const home = await bytes(path.join(ROOT, "qa/final-home-pixel.png"));
  const reward = await bytes(path.join(ROOT, "qa/reward-success-browser.png"));
  const ensemble = await bytes(path.join(ROOT, "qa/final-ranking-pixel.png"));

  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Cold open / meme-video thumbnail.
  {
    const slide = deck.slides.add();
    addImage(slide, rain, "비 내리는 제주 도로", 0, 0, W, H, { fit: "cover" });
    addBox(slide, 0, 0, W, H, "linear(90deg, #08111EEB 0%, #08111E8A 58%, #08111E3D 100%)", { geometry: "rect" });
    addText(slide, "여러분,", 72, 88, 430, 72, { fontSize: 54, bold: true, color: COLORS.white });
    addText(slide, "저 오늘\n날씨 앱을 믿었어요.", 72, 158, 590, 178, {
      fontSize: 61,
      bold: true,
      color: COLORS.white,
      lineSpacing: 0.92,
    });
    addText(slide, "\"한 시간 뒤에 그친다\"길래요.", 76, 352, 560, 48, {
      fontSize: 27,
      color: "#D8E4F4",
    });
    addBox(slide, 790, 92, 380, 536, "#09131DB8", { line: "#FFFFFF4A", lineWidth: 1, radius: "rounded-3xl" });
    addImage(slide, mascot, "비옷을 입은 CashWeather 마스코트 - 셀카 또는 AI 영상으로 교체 가능", 808, 162, 344, 344, { fit: "contain" });
    addBox(slide, 938, 466, 84, 84, COLORS.white, { geometry: "ellipse", radius: 0 });
    addText(slide, "▶", 939, 467, 84, 82, { fontSize: 38, color: COLORS.blue, align: "center", valign: "middle" });
    addPill(slide, "AI 밈 영상 · 8초", 894, 562, 172, "#FFFFFF24", COLORS.white, { line: "#FFFFFF42", lineWidth: 1 });
    addText(slide, "CashWeather", 72, 646, 220, 30, { fontSize: 18, bold: true, color: "#FFFFFFCC" });
    addNotes(slide, [
      "[0:00-0:35] 발표자가 먼저 말하지 말고 8초 영상을 재생한다.",
      "AI 영상 대사: '여러분, 저 오늘 날씨 앱을 믿었어요. 한 시간 뒤에 그친다길래 우산 없이 나갔고요… 결과는 이렇습니다.'",
      "영상 프롬프트: 사용자의 비에 젖은 셀카를 참조한 9:16, 8초, 한국어 립싱크, 무표정한 다큐 톤, 마지막 1초에 젖은 머리 클로즈업, 자막 없음.",
      "영상이 없으면 현재 마스코트 썸네일을 보여주고 같은 대사를 직접 연기한다.",
    ], [
      "Project-owned asset: public/assets/cashweather/jeju-rain-lockscreen.png",
      "Project-owned asset: public/assets/cashweather/cloud-coin-mascot.png",
      "Pitch inspiration: https://endohealth.ai/",
    ]);
  }

  // 2. Promise reveal.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addText(slide, "날씨 앱이 틀렸는데,", 84, 92, 800, 58, { fontSize: 31, color: COLORS.muted });
    addText(slide, "누가 책임지죠?", 84, 142, 700, 74, { fontSize: 54, bold: true, color: COLORS.ink });
    addText(slide, "아무도요.", 84, 214, 420, 70, { fontSize: 54, bold: true, color: COLORS.coral });
    addBox(slide, 72, 336, 1136, 230, COLORS.blue, { radius: "rounded-3xl" });
    addText(slide, "우리 날씨 예측이 틀리면", 112, 374, 860, 64, { fontSize: 43, bold: true, color: COLORS.white });
    addText(slide, "포인트를 드립니다.", 112, 438, 820, 82, { fontSize: 58, bold: true, color: COLORS.yellow });
    addImage(slide, mascot, "CashWeather 마스코트", 930, 296, 265, 265, { fit: "contain" });
    addText(slide, "CashWeather", 82, 618, 300, 40, { fontSize: 28, bold: true, color: COLORS.ink });
    addPill(slide, "무료 포인트 예측 챌린지", 890, 621, 310, COLORS.yellowSoft, COLORS.ink, { h: 40, fontSize: 16 });
    addNotes(slide, [
      "[0:35-1:02] '예보가 틀리면 지금까지는 사용자만 손해였습니다. 저희는 그 오차에 가격을 붙였습니다.'",
      "첫 번째 반복개그: '마음에 드셨다면 캐시웨더 지금 바로 다운로드… 아, 아직 스토어에는 없습니다.' 하고 바로 넘어간다.",
    ], [
      "User-provided project brief PDF, pages 1, 4, 6-8",
      "Project implementation: src/markets.ts settleTicket guaranteeBonus",
    ]);
  }

  // 3. Evidence of Jeju bias.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.white;
    addHeader(slide, "제주의 80%는, 실제로는 43%였습니다.", 3);
    addText(slide, "과거 예보와 실제 강수를 1:1로 대조했습니다.", 74, 161, 800, 34, { fontSize: 22, color: COLORS.muted });
    addPill(slide, "제주 6개 생활권 · 54,864시간", 930, 158, 278, COLORS.yellowSoft, COLORS.ink, { h: 38, fontSize: 16 });

    const rows = [
      { band: "90-99%", actual: "68.3%", delta: "-27p", width: 620 },
      { band: "80-89%", actual: "43.3%", delta: "-42p", width: 430 },
      { band: "70-79%", actual: "29.2%", delta: "-46p", width: 292 },
    ];
    rows.forEach((row, i) => {
      const y = 245 + i * 112;
      addText(slide, `AI ${row.band}`, 80, y, 168, 48, { fontSize: 28, bold: true, color: COLORS.ink, valign: "middle" });
      addBox(slide, 250, y + 8, 700, 34, "#EEF2F7", { radius: "rounded-full" });
      addBox(slide, 250, y + 8, row.width, 34, i === 0 ? COLORS.coral : "#FF957F", { radius: "rounded-full" });
      addText(slide, `실제 ${row.actual}`, 972, y - 1, 170, 52, { fontSize: 30, bold: true, color: COLORS.blue, align: "right", valign: "middle" });
      addPill(slide, row.delta, 1148, y + 6, 66, COLORS.coralSoft, COLORS.coral, { h: 36, fontSize: 15 });
    });
    addBox(slide, 72, 596, 1136, 72, COLORS.navy, { radius: "rounded-2xl" });
    addText(slide, "문제는 AI가 나빠서가 아니라, 제주를 ‘글로벌 평균’으로 본다는 것입니다.", 104, 607, 1070, 50, { fontSize: 27, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    addNotes(slide, [
      "[1:02-1:48] '저는 이 문제를 선택지로 만들기 전에 먼저 실측했습니다.'",
      "'80-89% 구간은 실제 강수가 43.3%였습니다. 제주에서는 예보 확률이 구조적으로 과대했습니다.'",
      "수치를 전부 읽지 말고 80% -> 43.3%에서 1초 멈춘다.",
    ], [
      "User-provided project brief PDF, pages 3-7 and 15",
      "Project implementation: src/calibration.ts CALIBRATION_META and RELIABILITY",
    ]);
  }

  // 4. Utility layer.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addHeader(slide, "날씨는 유틸리티로 들어옵니다.", 4);
    addText(slide, "잠금화면부터 외출 결정을 끝냅니다.", 74, 157, 650, 38, { fontSize: 23, color: COLORS.muted });
    addImage(slide, lock, "CashWeather 잠금화면 시연", 40, 190, 575, 470, { fit: "contain" });
    addImage(slide, home, "CashWeather 외출 브리핑 홈 화면", 512, 190, 620, 470, { fit: "contain" });
    addPill(slide, "75분 뒤 비", 170, 586, 156, COLORS.blue, COLORS.white, { h: 42, fontSize: 19 });
    addPill(slide, "옷차림", 660, 586, 126, COLORS.yellow, COLORS.ink, { h: 42, fontSize: 19 });
    addPill(slide, "우산 · 대기질", 806, 586, 176, COLORS.blueSoft, COLORS.blue, { h: 42, fontSize: 19 });
    addText(slide, "앱을 열기 전에 실용적이고, 열고 나서는 재미있게.", 72, 636, 1136, 30, { fontSize: 19, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addNotes(slide, [
      "[1:48-2:30] '첫 번째는 실용성입니다. 다음 비 시점, 우산, 옷차림, 대기질을 잠금화면에서 바로 보여줍니다.'",
      "'날씨는 유틸리티로 들어오고, 이제 예측 게임으로 머물게 합니다.' 라고 다음 슬라이드를 예고한다.",
    ], [
      "Project-owned screenshots: qa/final-lock.png, qa/final-home-pixel.png",
      "User-provided project brief PDF, pages 8 and 12",
    ]);
  }

  // 5. Prediction game.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.white;
    addHeader(slide, "그리고 예측 게임으로 머물게 합니다.", 5);
    addBox(slide, 72, 176, 680, 454, COLORS.cream, { line: COLORS.line, lineWidth: 1, radius: "rounded-3xl" });
    addPill(slide, "LIVE · 아라동", 104, 204, 150, COLORS.coralSoft, COLORS.coral, { h: 34, fontSize: 15 });
    addText(slide, "오늘 오후 3-4시\n아라동에 비가 올까요?", 104, 254, 590, 122, { fontSize: 39, bold: true, color: COLORS.ink });
    addText(slide, "AI 원본 95%", 106, 400, 220, 34, { fontSize: 21, bold: true, color: COLORS.muted });
    addText(slide, "→", 316, 393, 58, 44, { fontSize: 34, bold: true, color: COLORS.yellow, align: "center" });
    addText(slide, "제주 보정 66%", 382, 397, 276, 38, { fontSize: 27, bold: true, color: COLORS.blue });
    addBox(slide, 104, 462, 286, 92, COLORS.blue, { radius: "rounded-2xl" });
    addText(slide, "YES\n1.45배", 104, 468, 286, 80, { fontSize: 26, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    addBox(slide, 408, 462, 286, 92, COLORS.coralSoft, { line: "#FFC5BA", lineWidth: 1, radius: "rounded-2xl" });
    addText(slide, "NO\n2.80배", 408, 468, 286, 80, { fontSize: 26, bold: true, color: COLORS.coral, align: "center", valign: "middle" });
    addText(slide, "현금 없이 무료 포인트로만 참여", 105, 580, 588, 30, { fontSize: 18, color: COLORS.muted, align: "center" });

    addImage(slide, reward, "CashWeather 예측 성공 보상과 현장 제보 화면", 875, 166, 240, 410, {
      fit: "cover",
      crop: { left: 0.28, top: 0.01, right: 0.28, bottom: 0.01 },
    });
    addPill(slide, "예측 → 정산 → 포인트 → 랭킹", 806, 580, 374, COLORS.yellow, COLORS.ink, { h: 46, fontSize: 18 });
    addNotes(slide, [
      "[2:30-3:20] 관객 참여 구간. '지금 5초 드리겠습니다. AI를 믿으면 YES, 제주를 믿으면 NO입니다.'",
      "손을 들게 한 뒤: '돈은 걸지 않습니다. 오늘의 판단만 겁니다.'",
      "'적중하면 배율 포인트, 우리 모델이 틀리면 사용자의 선택과 관계없이 보상 포인트가 추가로 나갑니다.'",
    ], [
      "User-provided project brief PDF, pages 6-8 and 12-14",
      "Project implementation: src/markets.ts, src/Prototype.tsx",
      "Project-owned screenshot: qa/reward-success-browser.png",
    ]);
  }

  // 6. Calibration model.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addHeader(slide, "우리는 새 AI를 만들지 않았습니다. 제주에 맞게 고쳤습니다.", 6, { fontSize: 39 });
    addPill(slide, "JCM-1 · Jeju Calibration Model", 73, 162, 316, COLORS.blueSoft, COLORS.blue, { h: 40, fontSize: 17 });
    addText(slide, "95%", 84, 244, 280, 126, { fontSize: 92, bold: true, color: COLORS.coral, align: "center", valign: "middle" });
    addText(slide, "AI 원본 확률", 84, 366, 280, 36, { fontSize: 22, color: COLORS.muted, align: "center" });
    addText(slide, "→", 389, 270, 110, 90, { fontSize: 70, bold: true, color: COLORS.yellow, align: "center", valign: "middle" });
    addText(slide, "66%", 518, 244, 300, 126, { fontSize: 92, bold: true, color: COLORS.blue, align: "center", valign: "middle" });
    addText(slide, "제주 실측 보정", 518, 366, 300, 36, { fontSize: 22, color: COLORS.muted, align: "center" });
    addBox(slide, 852, 224, 342, 214, COLORS.navy, { radius: "rounded-3xl" });
    addText(slide, "54,864", 882, 255, 282, 80, { fontSize: 56, bold: true, color: COLORS.yellow, align: "center", valign: "middle" });
    addText(slide, "제주 6개 지점 시간 데이터", 876, 334, 294, 52, { fontSize: 20, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    addText(slide, "미사용 미래 구간 11,088시간 검증", 872, 390, 302, 28, { fontSize: 15, color: "#BFD0E4", align: "center" });

    addBox(slide, 72, 482, 1136, 142, COLORS.white, { line: COLORS.line, lineWidth: 1, radius: "rounded-3xl" });
    addText(slide, "Brier score", 104, 510, 190, 30, { fontSize: 20, bold: true, color: COLORS.muted });
    addText(slide, "0.1300", 102, 542, 220, 54, { fontSize: 42, bold: true, color: COLORS.coral });
    addText(slide, "→", 328, 544, 72, 50, { fontSize: 38, bold: true, color: COLORS.yellow, align: "center" });
    addText(slide, "0.0832", 414, 542, 220, 54, { fontSize: 42, bold: true, color: COLORS.blue });
    addBox(slide, 676, 506, 190, 86, COLORS.yellow, { radius: "rounded-2xl" });
    addText(slide, "36.0%\n개선", 676, 510, 190, 78, { fontSize: 28, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addText(slide, "10구간 히스토그램 보정\n시간 순서 분리 · 미래 정보 유입 방지", 904, 511, 260, 84, { fontSize: 20, color: COLORS.ink, valign: "middle" });
    addText(slide, "예보를 새로 만든 것이 아니라, 예보의 ‘자신감’을 제주 현실에 맞춴습니다.", 73, 649, 1136, 28, { fontSize: 20, bold: true, color: COLORS.ink, align: "center" });
    addNotes(slide, [
      "[3:20-4:10] '핵심은 거대한 신경망이 아닙니다. 잘 맞힌 글로벌 AI의 확률을 제주 실측에 맞게 재조정하는 해석 가능한 모델입니다.'",
      "'AI 95%가 제주에서는 실제로 약 66%였다는 것을 보여줍니다.'",
      "'11,088시간은 학습에 전혀 쓰지 않았고, Brier score는 0.1300에서 0.0832로 36% 개선됐습니다.'",
    ], [
      "User-provided project brief PDF, pages 6-7 and 15",
      "Project implementation: src/calibration.ts",
    ]);
  }

  // 7. Technical flow.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.white;
    addHeader(slide, "예보와 실측을 분리해, 틀린 순간까지 자동 채점합니다.", 7, { fontSize: 39 });
    const nodes = [
      { x: 66, w: 202, title: "WeatherNext 2", sub: "64개 앙상블\n원본 확률", fill: COLORS.navy, color: COLORS.white },
      { x: 316, w: 196, title: "JCM-1", sub: "제주 실측\n확률 보정", fill: COLORS.blue, color: COLORS.white },
      { x: 562, w: 196, title: "Market", sub: "확률 스냅샷\nYES / NO", fill: COLORS.yellow, color: COLORS.ink },
      { x: 808, w: 196, title: "Observation", sub: "대상 시각\n관측값", fill: COLORS.coralSoft, color: COLORS.coral },
      { x: 1054, w: 160, title: "Settle", sub: "정산\n+보상", fill: COLORS.green, color: COLORS.white },
    ];
    nodes.forEach((n, i) => {
      addBox(slide, n.x, 244, n.w, 186, n.fill, { radius: "rounded-3xl", line: n.fill === COLORS.coralSoft ? "#FFC6BC" : "none", lineWidth: n.fill === COLORS.coralSoft ? 1 : 0 });
      addText(slide, n.title, n.x + 14, 270, n.w - 28, 46, { fontSize: i === 0 ? 22 : 26, bold: true, color: n.color, align: "center", valign: "middle" });
      addText(slide, n.sub, n.x + 14, 326, n.w - 28, 70, { fontSize: 18, color: n.color, align: "center", valign: "middle", lineSpacing: 0.92 });
      if (i < nodes.length - 1) addText(slide, "→", n.x + n.w + 6, 302, 36, 54, { fontSize: 32, bold: true, color: COLORS.muted, align: "center", valign: "middle" });
    });
    addPill(slide, "LIVE API", 92, 458, 140, COLORS.blueSoft, COLORS.blue, { h: 36, fontSize: 15 });
    addText(slide, "WeatherNext 2 via Open-Meteo · 예보/관측 API", 250, 460, 460, 32, { fontSize: 18, color: COLORS.ink, valign: "middle" });
    addPill(slide, "LOCAL MVP", 92, 510, 140, COLORS.yellowSoft, COLORS.ink, { h: 36, fontSize: 15 });
    addText(slide, "예측 원장 · 포인트 · 정산 · 랭킹은 기기 내 저장", 250, 512, 600, 32, { fontSize: 18, color: COLORS.ink, valign: "middle" });
    addPill(slide, "READY", 92, 562, 140, "#E8F7F1", COLORS.green, { h: 36, fontSize: 15 });
    addText(slide, "기상청 단기예보 어댑터 · 서비스키 발급 시 활성화", 250, 564, 620, 32, { fontSize: 18, color: COLORS.ink, valign: "middle" });
    addImage(slide, ensemble, "WeatherNext 2 64개 앙상블 멤버 화면", 888, 452, 320, 170, { fit: "contain" });
    addText(slide, "예보로 가격을 만들고, 같은 페이로드로 정산하지 않습니다.", 72, 650, 1136, 28, { fontSize: 20, bold: true, color: COLORS.coral, align: "center" });
    addNotes(slide, [
      "[4:10-5:05] '이 분리가 기술의 핵심입니다. 예보로 마켓을 만들고, 대상 시각이 지난 뒤에는 별도의 관측 시리즈로 채점합니다.'",
      "'WeatherNext 2는 64개 시나리오의 합의도를 제공하고, JCM-1이 제주 확률로 보정합니다.'",
      "'현재 원장과 포인트는 로컬 MVP이며, 상용화 시 서버 스냅샷 DB와 포인트 원장으로 옮깁니다.'",
    ], [
      "User-provided project brief PDF, pages 7-8, 10-11, 15-16",
      "Project implementation: src/weather.ts, src/markets.ts, src/verification.ts, src/publicdata.ts",
      "https://developers.google.com/weathernext/guides/models",
      "https://open-meteo.com/en/docs/google-weathernext-api",
    ]);
  }

  // 8. Flywheel / why it wins.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addHeader(slide, "모델은 빌릴 수 있어도, 제주 오차 데이터는 복제하기 어렵습니다.", 8, { fontSize: 39 });
    const items = [
      { x: 85, y: 244, title: "더 정확한 확률", sub: "JCM-1 보정", fill: COLORS.blue, color: COLORS.white },
      { x: 365, y: 244, title: "더 높은 신뢰", sub: "적중률·오차 공개", fill: COLORS.navy, color: COLORS.white },
      { x: 645, y: 244, title: "더 많은 참여", sub: "예측·랭킹·보상", fill: COLORS.yellow, color: COLORS.ink },
      { x: 925, y: 244, title: "더 촬촬한 실황", sub: "시간·위치·현장 제보", fill: COLORS.coral, color: COLORS.white },
    ];
    items.forEach((item, i) => {
      addBox(slide, item.x, item.y, 245, 154, item.fill, { radius: "rounded-3xl" });
      addText(slide, item.title, item.x + 20, item.y + 32, 205, 50, { fontSize: 23, bold: true, color: item.color, align: "center", valign: "middle" });
      addText(slide, item.sub, item.x + 20, item.y + 91, 205, 38, { fontSize: 17, color: item.color, align: "center", valign: "middle" });
      if (i < items.length - 1) addText(slide, "→", item.x + 246, item.y + 52, 34, 50, { fontSize: 28, bold: true, color: COLORS.muted, align: "center", valign: "middle" });
    });
    addText(slide, "↶", 1118, 404, 72, 64, { fontSize: 54, bold: true, color: COLORS.blue, align: "center", valign: "middle" });
    addBox(slide, 85, 468, 1085, 130, COLORS.white, { line: COLORS.line, lineWidth: 1, radius: "rounded-3xl" });
    addText(slide, "사용자", 118, 495, 120, 32, { fontSize: 20, bold: true, color: COLORS.blue });
    addText(slide, "우산·옷차림 결정 + 재미 + 포인트", 252, 493, 430, 36, { fontSize: 21, color: COLORS.ink });
    addText(slide, "지역 상권", 118, 546, 120, 32, { fontSize: 20, bold: true, color: COLORS.coral });
    addText(slide, "날씨 미션 후원 + 제주 제휴 쿠폰", 252, 544, 430, 36, { fontSize: 21, color: COLORS.ink });
    addText(slide, "캐시웨더", 736, 495, 136, 32, { fontSize: 20, bold: true, color: COLORS.green });
    addText(slide, "예보 ↔ 결과 ↔ 행동이 연결된 지역 데이터", 876, 493, 262, 66, { fontSize: 21, bold: true, color: COLORS.ink, valign: "middle" });
    addNotes(slide, [
      "[5:05-5:55] '이 서비스가 잘될 이유는 정확도와 재미가 서로를 키우기 때문입니다.'",
      "'날씨는 유틸리티로 들어오고, 게임으로 머물고, 데이터로 남습니다.'",
      "'포인트는 무제한 현금 보상이 아니라 후원 풀과 제한을 두고 지역 쿠폰으로 연결합니다.'",
    ], [
      "User-provided project brief PDF, pages 8-11",
      "Project product logic and future operating model; commercial integrations are roadmap, not current live data",
    ]);
  }

  // 9. Feasibility.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.white;
    addHeader(slide, "이미 돌아갑니다.", 9);
    addImage(slide, home, "실행 중인 CashWeather MVP", 40, 148, 650, 510, { fit: "contain" });
    addText(slide, "8/8", 732, 182, 250, 96, { fontSize: 78, bold: true, color: COLORS.blue });
    addText(slide, "인터랙션 자동화 테스트 통과", 736, 278, 430, 44, { fontSize: 24, bold: true, color: COLORS.ink });
    addBox(slide, 730, 348, 220, 114, COLORS.cream, { line: COLORS.line, lineWidth: 1, radius: "rounded-2xl" });
    addText(slide, "6개", 748, 364, 184, 54, { fontSize: 42, bold: true, color: COLORS.coral, align: "center" });
    addText(slide, "제주 생활권", 748, 416, 184, 30, { fontSize: 18, color: COLORS.muted, align: "center" });
    addBox(slide, 972, 348, 220, 114, COLORS.cream, { line: COLORS.line, lineWidth: 1, radius: "rounded-2xl" });
    addText(slide, "4개", 990, 364, 184, 54, { fontSize: 42, bold: true, color: COLORS.green, align: "center" });
    addText(slide, "기상 변수 마켓", 990, 416, 184, 30, { fontSize: 18, color: COLORS.muted, align: "center" });
    addText(slide, "React 19 · TypeScript · Vite · Python 3", 734, 503, 454, 34, { fontSize: 21, bold: true, color: COLORS.ink });
    addText(slide, "Open-Meteo · WeatherNext 2 · OpenStreetMap", 734, 545, 454, 34, { fontSize: 20, color: COLORS.muted });
    addText(slide, "GPU 추론 서버 없이 정적 보정 모델 배포", 734, 587, 454, 34, { fontSize: 20, color: COLORS.muted });
    addPill(slide, "LIVE DEMO", 1010, 648, 182, COLORS.yellow, COLORS.ink, { h: 42, fontSize: 17 });
    addNotes(slide, [
      "[5:55-6:25] '이건 기획서 속 모형이 아닙니다. 제주 실제 데이터로 작동하고, 8개 자동화 테스트를 모두 통과한 웹 MVP입니다.'",
      "두 번째 반복개그: '캐시웨더 지금 바로 다운로드… 이번엔 로컬 주소만 있습니다.'",
      "시간이 부족하면 실제 데모는 잠금화면 -> 마켓 -> 복기 마켓 즉시 정산만 보여준다.",
    ], [
      "Project-owned screenshot: qa/final-home-pixel.png",
      "Project package.json and implementation",
      "Verified 2026-08-18: npm run check:runtime passed; npm run test:runtime -- --reporter=line passed 8/8",
      "User-provided project brief PDF, pages 10 and 16",
    ]);
  }

  // 10. Close and running gag payoff.
  {
    const slide = deck.slides.add();
    addImage(slide, rain, "비 내리는 제주 도로", 0, 0, W, H, { fit: "cover" });
    addBox(slide, 0, 0, W, H, "linear(90deg, #07111FD9 0%, #0A1A2CC4 55%, #0A1A2C6E 100%)", { geometry: "rect" });
    addText(slide, "오늘의 오차를", 76, 86, 700, 74, { fontSize: 54, bold: true, color: COLORS.white });
    addText(slide, "내일의 정확도로.", 76, 154, 790, 92, { fontSize: 68, bold: true, color: COLORS.yellow });
    addText(slide, "글로벌 AI가 틀리는 순간,\n사용자는 포인트를 얻고\n제주는 더 좋은 데이터를 얻습니다.", 80, 278, 680, 178, { fontSize: 30, color: "#E4EDF8", lineSpacing: 1.02 });
    addImage(slide, mascot, "CashWeather 마스코트", 836, 164, 372, 372, { fit: "contain" });
    addText(slide, "캐시워크 지금 바로 다운로드", 82, 532, 600, 34, { fontSize: 20, color: "#FFFFFF55" });
    addText(slide, "아니고,", 82, 568, 180, 38, { fontSize: 26, bold: true, color: COLORS.coral });
    addText(slide, "CashWeather", 82, 610, 420, 60, { fontSize: 46, bold: true, color: COLORS.white });
    addPill(slide, "지금 바로 다운로드", 828, 586, 380, COLORS.yellow, COLORS.ink, { h: 62, fontSize: 26 });
    addNotes(slide, [
      "[6:25-7:00] '오늘의 오차를 내일의 정확도로 바꾸겠습니다.'",
      "'날씨는 유틸리티로 들어오고, 게임으로 머물고, 데이터로 남습니다.'",
      "마지막 반복개그는 호흡을 놓고: '캐시워크 지금 바로 다운로드… 아니고, 캐시웨더. 이제는 진짜 지금 바로 다운로드.'",
      "웃음이 나오면 '감사합니다' 하고 즉시 끝낸다. 기술 설명을 더 붙이지 않는다.",
    ], [
      "User-provided project brief PDF, pages 1 and 9",
      "Project-owned assets: jeju-rain-lockscreen.png, cloud-coin-mascot.png",
    ]);
  }

  // 11. Q&A backup - gambling.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addHeader(slide, "Q. 이거, 도박 아닌가요?", 11, { eyebrow: "Q&A BACKUP" });
    addText(slide, "아닙니다.", 74, 184, 420, 72, { fontSize: 58, bold: true, color: COLORS.blue });
    addBox(slide, 72, 294, 344, 210, COLORS.white, { line: COLORS.line, lineWidth: 1, radius: "rounded-3xl" });
    addText(slide, "0원", 92, 324, 304, 72, { fontSize: 54, bold: true, color: COLORS.coral, align: "center" });
    addText(slide, "현금 예치·충전 없음", 92, 412, 304, 46, { fontSize: 22, color: COLORS.ink, align: "center" });
    addBox(slide, 468, 294, 344, 210, COLORS.white, { line: COLORS.line, lineWidth: 1, radius: "rounded-3xl" });
    addText(slide, "0원", 488, 324, 304, 72, { fontSize: 54, bold: true, color: COLORS.coral, align: "center" });
    addText(slide, "현금 환전·출금 없음", 488, 412, 304, 46, { fontSize: 22, color: COLORS.ink, align: "center" });
    addBox(slide, 864, 294, 344, 210, COLORS.navy, { radius: "rounded-3xl" });
    addText(slide, "FREE", 884, 324, 304, 72, { fontSize: 48, bold: true, color: COLORS.yellow, align: "center" });
    addText(slide, "무료 포인트\n예측 챌린지", 884, 402, 304, 70, { fontSize: 22, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    addText(slide, "상용화 전에는 쿠폰 교환·확률형 보상을 포함한 법률·플랫폼 정책 검토를 진행합니다.", 84, 566, 1112, 54, { fontSize: 24, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addNotes(slide, [
      "[Q&A] 15초 답변: '사용자가 돈을 걸거나 현금으로 빼는 경로가 없는 무료 포인트 챌린지입니다. 다만 상용화 전에 쿠폰과 보상 구조는 법률 검토하겠습니다.'",
      "법적 안전을 단정하지 말고 '오인 위험을 낮춘다 + 출시 전 검토'로 답한다.",
    ], [
      "User-provided project brief PDF, pages 7 and 10-11",
      "Project AGENTS.md prediction market boundary",
    ]);
  }

  // 12. Q&A backup - hyperlocal.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.white;
    addHeader(slide, "Q. WeatherNext 2가 정말 초지역 날씨인가요?", 12, { eyebrow: "Q&A BACKUP", fontSize: 39 });
    addText(slide, "아직은 아닙니다.", 76, 177, 470, 72, { fontSize: 54, bold: true, color: COLORS.coral });
    addText(slide, "WeatherNext 2는 ‘기본 신호’입니다.", 76, 250, 620, 44, { fontSize: 27, color: COLORS.ink });
    const stages = [
      { title: "글로벌 앙상블", sub: "WeatherNext 2\n0.25° 기반", fill: COLORS.navy, color: COLORS.white },
      { title: "제주 보정", sub: "JCM-1\n6개 생활권", fill: COLORS.blue, color: COLORS.white },
      { title: "관측 교차검증", sub: "기상청 AWS/ASOS\n향후 연동", fill: COLORS.yellow, color: COLORS.ink },
      { title: "현장 맥락", sub: "비·안개·노면\n검증된 제보", fill: COLORS.green, color: COLORS.white },
    ];
    stages.forEach((s, i) => {
      const x = 76 + i * 292;
      addBox(slide, x, 354, 246, 186, s.fill, { radius: "rounded-3xl" });
      addText(slide, s.title, x + 16, 382, 214, 44, { fontSize: 22, bold: true, color: s.color, align: "center", valign: "middle" });
      addText(slide, s.sub, x + 16, 444, 214, 66, { fontSize: 18, color: s.color, align: "center", valign: "middle" });
      if (i < stages.length - 1) addText(slide, "+", x + 252, 414, 34, 48, { fontSize: 32, bold: true, color: COLORS.muted, align: "center", valign: "middle" });
    });
    addText(slide, "초지역화는 거대 모델의 격자가 아니라, ‘지역별 오차’를 계속 학습하는 운영 능력에서 만들어집니다.", 78, 594, 1126, 60, { fontSize: 25, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addNotes(slide, [
      "[Q&A] 20초 답변: 'WeatherNext 2 그 자체를 초지역이라고 주장하지 않습니다. 현재는 제주 6개 생활권 보정이고, 향후 기상청 지점 관측과 검증된 현장 제보로 세분화합니다.'",
      "현장 제보는 정밀 기온·습도 대체가 아니라 비, 안개, 노면 상태 같은 이벤트 맥락 데이터로 정의한다.",
    ], [
      "https://developers.google.com/weathernext/guides/models",
      "https://open-meteo.com/en/docs/google-weathernext-api",
      "User-provided project brief PDF, pages 9-11 and 15-16",
      "Project AGENTS.md reporting and WeatherNext boundaries",
    ]);
  }

  // 13. Q&A backup - evidence.
  {
    const slide = deck.slides.add();
    slide.background.fill = COLORS.cream;
    addHeader(slide, "Q. 36% 개선, 진짜 검증한 건가요?", 13, { eyebrow: "Q&A BACKUP" });
    addText(slide, "시간을 썩지 않았습니다.", 76, 178, 720, 64, { fontSize: 48, bold: true, color: COLORS.blue });
    addBox(slide, 76, 294, 336, 198, COLORS.navy, { radius: "rounded-3xl" });
    addText(slide, "43,776시간", 96, 326, 296, 58, { fontSize: 38, bold: true, color: COLORS.yellow, align: "center" });
    addText(slide, "2025.08 - 2026.05\n학습 구간", 96, 400, 296, 62, { fontSize: 20, color: COLORS.white, align: "center", valign: "middle" });
    addText(slide, "→", 427, 356, 58, 52, { fontSize: 38, bold: true, color: COLORS.muted, align: "center", valign: "middle" });
    addBox(slide, 500, 294, 336, 198, COLORS.blue, { radius: "rounded-3xl" });
    addText(slide, "11,088시간", 520, 326, 296, 58, { fontSize: 38, bold: true, color: COLORS.white, align: "center" });
    addText(slide, "2026.06 - 2026.08\n미사용 검증 구간", 520, 400, 296, 62, { fontSize: 20, color: COLORS.white, align: "center", valign: "middle" });
    addBox(slide, 876, 294, 332, 198, COLORS.yellow, { radius: "rounded-3xl" });
    addText(slide, "0.1300 → 0.0832", 896, 330, 292, 54, { fontSize: 34, bold: true, color: COLORS.ink, align: "center" });
    addText(slide, "Brier score\n36.0% 개선", 896, 402, 292, 62, { fontSize: 21, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addText(slide, "재현: scripts/fit-calibration.py  ·  판정: 시간당 강수 0.1mm 이상 = 비", 92, 548, 1096, 42, { fontSize: 22, bold: true, color: COLORS.ink, align: "center", valign: "middle" });
    addText(slide, "현재 보정은 강수확률에만 적용됩니다. 기온·바람·운량은 원본 앙상블 확률을 사용합니다.", 92, 612, 1096, 48, { fontSize: 21, color: COLORS.coral, align: "center", valign: "middle" });
    addNotes(slide, [
      "[Q&A] 20초 답변: '무작위 분할이 아니라 과거 10개월로 보정하고 뒤 2.5개월로 검증해 미래 데이터 유입을 막았습니다. 스크립트도 저장소에 포함해 수치를 재현할 수 있습니다.'",
      "한계도 먼저 말한다: '현재 JCM-1은 강수확률만 보정합니다.'",
    ], [
      "User-provided project brief PDF, pages 7, 10, and 15",
      "Project implementation: src/calibration.ts and scripts/fit-calibration.py",
    ]);
  }

  // Export slide previews, layouts, montage, and final PPTX.
  for (const [i, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(BUILD, "rendered", `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(BUILD, "rendered", `${stem}.layout.json`), await layout.text());
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(BUILD, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
