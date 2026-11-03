# AGENTS.md

## Project overview

This repository contains a Flic Hub module that forwards Flic Button events and state to the Home Assistant REST API. The deployable source lives in `flic_hub_module/` and runs inside the Flic Hub SDK's QuickJS runtime. The Node.js environment is for development, linting, and Jest tests only.

Keep the existing public behavior and Home Assistant contracts stable unless a change explicitly intends to alter them.

## Repository map

-   `flic_hub_module/` --- deployable Flic Hub module.
    -   `main.js` --- button lifecycle handlers, event filtering, initialization, and periodic synchronization.
    -   `ha.js` --- Home Assistant REST API requests and response handling.
    -   `utils.js` --- button naming, sensor icons, and per-button event state.
    -   `constants.js` --- click/state/logging constants and initial event state.
    -   `config.js` --- user-edited runtime configuration. Treat as deployment configuration, not a test fixture.
    -   `logger.js` --- log-level filtering and console formatting.
    -   `module.json` --- Flic Hub module metadata.
-   `test/` --- Jest tests, mocks, and the testing guide.
-   `flic-button.yaml` --- Home Assistant automation blueprint; its event contract must stay aligned with the module.
-   `.github/workflows/` --- CI workflows.
-   `package.json` --- development scripts and Jest configuration.
-   `eslint.config.js` --- lint rules, including runtime-global restrictions.
-   `.devcontainer/` --- supported development environment.

## Runtime constraints: Flic Hub QuickJS

Treat every file under `flic_hub_module/` as code that executes on the Flic Hub, not in Node.js.

-   Use only JavaScript language features supported by the Flic Hub's QuickJS version and the APIs documented by the Flic Hub SDK.
-   Do not introduce Node.js globals or built-in modules such as `process`, `Buffer`, `__dirname`, `fs`, `path`, or Node networking APIs.
-   Do not assume browser APIs, `window`, or `document` exist.
-   The module relies on host-provided APIs, including the existing Flic Hub modules (notably `buttons` and `http`) and the globals explicitly allowed in `eslint.config.js` (`console`, timer functions, and JavaScript built-ins).
-   Preserve the existing CommonJS module style (`require` and `exports`).
-   Keep platform-specific behavior behind the existing SDK interfaces. Tests should mock those interfaces rather than replacing production code with Node-specific abstractions.
-   If an API or language feature's QuickJS compatibility is uncertain, verify it against the Flic Hub SDK/runtime documentation before using it.

The ESLint configuration intentionally flags Node-only globals in `flic_hub_module/**/*.js`. Do not weaken or bypass that restriction to make production code lint.

## Architecture and behavior

### Button lifecycle and state

`main.js` registers handlers with the Flic Hub `buttons` module and initializes buttons already known to the hub. Preserve the existing lifecycle responsibilities:

-   Initialization creates the per-button event state and publishes the initial off, battery, and connectivity states to Home Assistant.
-   A connection initializes the button again; readiness and disconnection update connectivity.
-   Button down/up events maintain physical on/off state independently of whether a click event is accepted.
-   Button deletion clears the in-memory state and removes all three corresponding Home Assistant entities.
-   Battery and connectivity states are periodically re-published using `SYNC_TIME`.

Per-button event state in `utils.js` is keyed by the button's Bluetooth address (`bdaddr`). Avoid sharing mutable state between buttons. Return copies where the existing API returns snapshots, and preserve the frozen initial-state template.

### Click filtering

The module is designed to emit at most one useful `flic_click` event per physical press cycle and suppress phantom/duplicate events. Important behavior to preserve:

-   Supported click types are `single`, `double`, and `hold`.
-   A single- or double-click event is accepted only after a valid button-down/button-up cycle has armed the event.
-   A hold is reported while the button is pressed; subsequent presses occurring shortly after a hold event are filtered using `MIN_EVENTS_OFFSET`.
-   Events arriving too soon after the prior accepted event are ignored.
-   After initialization or reconnection, click gestures without a fresh physical press are ignored.
-   Ignoring a click must not prevent the physical button sensor from reflecting the actual pressed/released state.

When changing event handling, reason through event ordering and timestamps, including equal timestamps, reconnects, holds, double clicks, and release events. Keep tests aligned with the SDK's actual event sequence (documented in `test/README.md`).

### Home Assistant API contract

`ha.js` publishes state through Home Assistant's REST API and emits `flic_click` events. Treat these details as compatibility-sensitive:

-   Event type: `flic_click`.
-   Event data: `button_name`, `button_address`, and `click_type`.
-   `click_type` values: `single`, `double`, and `hold`.
-   Button state entity: `binary_sensor.flic_<address-without-colons>`.
-   Battery entity: `sensor.flic_<address-without-colons>_battery`.
-   Connectivity entity: `binary_sensor.flic_<address-without-colons>_connectivity`.
-   Button and connectivity binary sensor states use `on` and `off`; unknown battery state is `unknown`.
-   Button removal deletes all three entities.
-   Requests use a bearer token and JSON content type.
-   A `404` response to a DELETE is tolerated because the entity may already be absent.

Do not casually rename entities, change event keys, alter click values, or change payload semantics. If a compatibility change is intentional, update the README, blueprint where applicable, and contract tests in the same change.

### Configuration and secrets

`flic_hub_module/config.js` is edited by users when deploying the module.

-   Do not put real Home Assistant URLs, access tokens, private keys, or personal certificates in committed files, tests, fixtures, or logs.
-   Do not assert directly against the default values in `config.js`; mock the config in tests (see `test/README.md`).
-   Keep configuration defaults and descriptions synchronized with the README.
-   Preserve the distinction between trusting a custom certificate and validating the server hostname (`USE_CUSTOM_CERTIFICATE` and `VERIFY_CERTIFICATE`).
-   Never log the bearer token. When modifying request diagnostics, retain the existing guarantee that credentials do not appear in log output.

## Development workflow

Use the repository's devcontainer (VS Code: ****Reopen in Container****) as the standard environment. It provides Node.js 26 and installs the development dependencies.

Run these commands from the repository root:

``` sh
npm ci
npm test
npm run test:coverage
npm run lint
```

-   `npm test` runs the Jest suite.
-   `npm run test:coverage` runs Jest with coverage and enforces 100% statements, branches, functions, and lines for `flic_hub_module/**/*.js`.
-   `npm run lint` runs ESLint across the repository.

CI runs lint and coverage tests on pushes and pull requests. Run both before considering a change complete.

If the devcontainer is unavailable, the Docker-based alternative is documented in `test/README.md`.

## Testing requirements

-   Add or update tests for every behavior change.
-   Maintain 100% statement, branch, function, and line coverage for all files under `flic_hub_module/`. Do not lower or remove coverage thresholds to make a change pass.
-   Test externally observable Home Assistant behavior using literal contract values (`single`, `double`, `hold`, `on`, `off`, entity paths, request methods, and payload keys). Comparing only against production constants can allow accidental contract changes to pass unnoticed.
-   Mock user-edited configuration at module scope and replace individual config properties per test as described in `test/README.md`. Restore mocks after each test.
-   Give each test using `utils.js` a distinct `bdaddr` so module-level state does not leak between cases.
-   `main.js` performs initialization, starts an interval, and registers event handlers as soon as it is required. Configure mocks and fake timers before requiring it, and require it only once per test module.
-   Use fake timers for timestamp and synchronization behavior. Reset the fake clock in `beforeEach` to prevent order-dependent tests.
-   Simulate SDK gestures in the documented order:
    -   Single/double: `buttonDown` → `buttonUp` → click event.
    -   Hold: `buttonDown` → hold event → `buttonUp`.
-   SDK event objects carry `bdaddr` and click flags; they are not complete button objects. Follow the existing test helpers and button mock.
-   Assert on state, calls to Home Assistant, and other stable observable behavior. Do not assert on ordinary log message text or spy on `console.log` outside `logger.test.js`.
-   For HTTP response handling, drive the callback supplied to the mocked `http.makeRequest` and verify the appropriate logger severity. Include a check that credentials never appear in logged output.
-   Ensure tests would fail if the implementation were broken. Avoid assertions that merely confirm a default/initial value; seed state first when testing reset or deletion behavior.

See `test/README.md` for the authoritative test layout, mock helpers, and detailed conventions.

## Code style

-   Follow the existing formatting and CommonJS patterns in neighboring files.
-   Keep functions focused and avoid unnecessary dependencies or abstractions.
-   Use strict equality (`===` / `!==`). The configured exception is `== null` when intentionally checking both `null` and `undefined`.
-   Prefer the existing constants and helper functions when they express established domain behavior.
-   Keep logs useful and appropriately leveled, but do not make tests depend on volatile log wording.
-   Avoid unrelated refactors in behavior-sensitive event handling or API code.

## Documentation and change scope

-   Keep `flic_hub_module/*` comment-free, users paste these files into the Flic IDE, and many are not programmers. Keep the code as lean and clean as possible. When a change needs explaining, document it outside the code.
-   Update `README.md` (written for non-programmers) when changing setup, configuration options, runtime behavior, entity naming, or the Home Assistant event contract.
-   Update `flic-button.yaml` and its tests when changing the click event contract or automation behavior.
-   Update `test/README.md` when changing test helpers, mocks, test layout, or testing conventions.
-   Keep `module.json` consistent with the deployable module.

## Completion checklist

Before finishing a change:

1.  Confirm production code remains compatible with the Flic Hub QuickJS runtime.
2.  Run `npm run lint`.
3.  Run `npm run test:coverage` and confirm all coverage thresholds pass.
4.  Verify Home Assistant event names, payload keys, entity IDs, and states remain compatible---or document and test any intentional change.
5.  Confirm no credentials or private certificate material were added to the diff or exposed in logs.
6.  Update the relevant README, blueprint, and testing documentation.

## Release & GitHub

-   The version is specified in `flic_hub_module/module.json`, `package.json`, and the version badge at the top of `README.md`; update all three together.
-   Do not commit generated coverage output, local environment files, personal configuration, or credentials.
-   Keep pull requests focused and explain any intentional compatibility impact.
-   Real-hardware verification must be performed manually: paste the module into the Flic Online IDE, press the buttons, and monitor the console and corresponding Home Assistant entities (`binary_sensor.flic_<addr>`, `sensor.flic_<addr>_battery`, `binary_sensor.flic_<addr>_connectivity`).
