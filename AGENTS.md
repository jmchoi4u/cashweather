# Mobile Prototype Agent Guide

## CashWeather MVP Decisions

- The main promise is: `우리 날씨 예측이 틀리면 포인트를 드립니다`.
- The core journey is lock screen -> minute-scale rain forecast -> free Polymarket-inspired binary prediction -> point multiplier -> optional field report.
- This is a free point experience with no cash stake, purchase, deposit, or withdrawal.
- Match the supplied CashWalk references with a bright yellow reward system, rounded white cards, immediate feedback, and an original generated cloud mascot.
- Keep the prediction surface Polymarket-inspired and bright: white market cards, thin neutral borders, crisp Roboto-led typography, blue/red binary outcomes, visible probability and volume metadata, while reserving yellow for points and reward moments.
- Current weather, hourly/daily forecast, rain probability, outfit/umbrella guidance, and air-quality summaries use live Jeju data from Open-Meteo; air-quality values are Open-Meteo/CAMS and the map is the official OpenStreetMap embed. Prediction participation/settlement, point balances, resident reports, and closet persistence remain local MVP interactions and must be labeled honestly.
- Open-Meteo's 15-minute series outside supported native regions can be interpolated from hourly model data, so the Jeju minute-scale rain copy must disclose that limitation rather than present it as radar truth.
- Google WeatherNext 2's 64-member ensemble is live through Open-Meteo's official `google_weathernext2_ensemble` endpoint. Label it as `WeatherNext 2 via Open-Meteo`, disclose that the native 6-hour fields are interpolated to hourly values, and keep Google Weather Lab itself separate as an experimental visualization rather than the app's API.
- The default user-supplied Jeju reference point is `제주시 첨단로 300` at latitude `33.446006`, longitude `126.570715`. Display the friendly label `내 위치 · 첨단로`; do not expose the exact street address in resident-report or reward copy.
- Weather-context place recommendations and Sponsored cards are static MVP examples driven by live weather conditions. They must explicitly say they are not VisitJeju, Kakao Local, or AdFit live data. Prediction sharing uses the browser Web Share API with clipboard fallback; KakaoTalk Share remains a future SDK integration.
- Secondary ideas such as outfit and closet setup should appear as believable MVP affordances without pretending the backend exists.
- Keep the home hierarchy utility-first: the live going-out brief, feels-like temperature, one-hour rain probability, air quality, and outfit preset appear before the product promise and large prediction market. Mirror the same outfit, umbrella, and air-quality essentials on the lock screen.
- Provide separate male and female outfit presets, keep the selected preset, closet-save toggle, and umbrella-reminder toggle in local device storage, and describe these as MVP personalization rather than a synced account wardrobe.
- Use the live WeatherNext 2 ensemble for distinct rain, temperature, wind, and cloud binary challenge cards. Weekly ranking, XP, nicknames, and mission banners are local/MVP engagement data and must stay explicitly labeled as such.

## Prediction Market and Verification

- The app's identity is a weather prediction market. `market` is the landing tab after unlock; `home` stays utility-first, and its prediction surface is a single CTA into the market rather than a duplicate market card.
- Navigation is 홈 / 마켓 / [제보 FAB] / 실황 / 내예측. `PointsScreen` was folded into `LedgerScreen`; do not reintroduce a separate points tab.
- Markets are generated only from forecast data (`buildMarkets`) and settled only from observed data (`fetchObservedSeries`). Never settle a market from the same payload that priced it — the separation is what makes the published hit rate meaningful.
- `JCM-1` in `src/calibration.ts` is a shipped model artifact: a 10-bin histogram calibration fitted offline on 43,776 Jeju hours and validated on a held-out 11,088 hours (Brier 0.1300 -> 0.0832). Refit only with `scripts/fit-calibration.py`, keep the time-ordered train/test split, and update `CALIBRATION_META` together with the table so the quoted numbers never drift from the data.
- Calibration currently covers rain only. Mark calibrated markets with `calibrated: true` and surface the raw-vs-corrected pair in the UI; never present a corrected number without the original beside it.
- Replay markets (`buildReplayMarkets`) intentionally accept participation after the hour resolved so settlement can be demonstrated immediately. Both the price and the outcome are real archive values — label them 복기 and never let them look like live markets.
- The guarantee ("우리 예측이 틀리면 포인트를 드립니다") is executed in `settleTicket`: whenever the priced side misses, `guaranteeBonus` pays out regardless of whether the user won. Keep it wired to the model's own call, not to the user's.
- Keep the ledger, settlements, and points in local device storage and describe them as MVP data. There is no account, server, or cash path.
- `src/publicdata.ts` holds the KMA short-term-forecast adapter including the DFS grid projection (verified against 제주시 53,38 / 서울시청 60,127 / 부산시청 98,76). It stays dormant without `VITE_KMA_SERVICE_KEY`; surface its state honestly as READY rather than implying a live 기상청 feed.

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.
