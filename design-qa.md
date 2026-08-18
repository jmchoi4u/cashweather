# CashWeather Utility + Challenge Upgrade QA

Final result: passed

Combined comparison input: `qa/before-after-comparison.png`

## Same-state comparison

- Lock before: weather and prediction alert left the useful middle of the wallpaper empty.
- Lock after: the same iPhone viewport now includes a bright, readable outfit card with top/bottom/shoes, umbrella need, and PM2.5 grade while retaining the market alert and unlock action.
- Home before: the product promise and large rain market appeared before everyday utility.
- Home after: the same iPhone viewport starts with a going-out brief, live feels-like/rain/air data, male/female outfit preset, closet/reminder actions, and the first WeatherNext challenge cards.

## Implementation checks

- Utility hierarchy: practical weather and outfit guidance is visible before the prediction market on home and echoed on the lock screen.
- Personalization: male/female preset, closet-save, and umbrella-reminder controls work and persist after reload.
- Forecast breadth: rain, temperature, wind, and cloud binary challenges use live WeatherNext 2 ensemble probabilities.
- Engagement: each challenge selection adds 40 XP, changes the local weekly rank, and persists after reload; ranking/nicknames remain clearly labeled as MVP data.
- Retention surfaces: four horizontally draggable mission banners reflect challenge, outfit, and reminder state.
- Responsive QA: iPhone and Pixel 10 device shells were checked at the top, ranking, and mission sections with no horizontal overflow or clipped app controls.
- Regression QA: protected runtime integrity passed; all eight mobile runtime interaction tests passed.

No blocking mismatch remains for the requested practical, bright, reward-driven MVP direction.
