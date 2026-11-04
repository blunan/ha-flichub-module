# Changelog

## [1.3.0](https://github.com/blunan/ha-flichub-module/compare/v1.2.6...v1.3.0) (2026-10-14)

- Fix: ignore spurious events after releasing a hold ([#9](https://github.com/blunan/ha-flichub-module/issues/9), [#15](https://github.com/blunan/ha-flichub-module/pull/15)). Per-button state is now tracked by `bdaddr`.
- Add a logger and `LOG_LEVEL` config. Ignored events are logged with the reason.
- Battery: unknown battery is now reported as `unknown` instead of `0`, with safer icons and a warning threshold of 10%.
- Add a Home Assistant blueprint, `flic-button.yaml` (requires Home Assistant 2024.10+), contributed by [abjugard](https://github.com/abjugard) in [#12](https://github.com/blunan/ha-flichub-module/pull/12).
- Log HTTP errors and guard the rapid-press warning.
- Dev: test suite with coverage, CI workflow, ESLint, devcontainer and an expanded README.

## [1.2.6](https://github.com/blunan/ha-flichub-module/compare/v1.2.4...v1.2.6) (2026-07-10)

- Adds `USE_CUSTOM_CERTIFICATE`, `CUSTOM_CERTIFICATES` and `VERIFY_CERTIFICATE` options so the hub can trust self-signed certificates when reaching Home Assistant over HTTPS

## [1.2.4](https://github.com/blunan/ha-flichub-module/compare/v1.2.3...v1.2.4) (2023-08-22)

- Handle null battery status gracefully
- Correct battery-level icon selection
- Raised `WARNING_BATTERY_LEVEL` to 8%

## [1.2.3](https://github.com/blunan/ha-flichub-module/compare/v1.2.1...v1.2.3) (2022-01-31)

- `MIN_EVENTS_OFFSET` debounce is now tracked independently per button, preventing a stray `single` event after a `double` or `hold`
- Split the module into `constants.js`, `utils.js`, and `ha.js` (all Home Assistant requests centralised in `ha.js`)
- Fixed a `getButtonName` crash

## [1.2.1](https://github.com/blunan/ha-flichub-module/compare/v1.2.0...v1.2.1) (2021-12-23)

- Deletes a button's Home Assistant entities (state, battery, connectivity) when the Flic is removed from the hub

## [1.2.0](https://github.com/blunan/ha-flichub-module/compare/v1.1.0...v1.2.0) (2021-12-23)

- Button pressed state now tracks physical button up/down actions
- Exposes Bluetooth connectivity as its own `binary_sensor`
- Documented a dashboard entities card for state / battery / connectivity
- All buttons initialise to `off` at startup; added request logging

## [1.1.0](https://github.com/blunan/ha-flichub-module/compare/v1.0.1...v1.1.0) (2021-09-27)

- Exposes battery level as its own `sensor` (percentage) with a dynamic `mdi:battery-*` icon
- `WARNING_BATTERY_LEVEL` threshold shows an alert icon when the battery runs low
- Sync interval reduced to 1 minute
- Added REST API error handling

## [1.0.1](https://github.com/blunan/ha-flichub-module/releases/tag/v1.0.1) (2021-09-10)

First release of the Flic Hub Module for Home Assistant.

- Forwards Flic button events (single / double / hold) to the Home Assistant REST API as `flic_click` events
- Reports each button's pressed state as a `binary_sensor`
- Configurable host, auth token, and sync interval via a config file
- Syncs button state on startup and on a fixed interval
