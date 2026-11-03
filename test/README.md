# Testing Guide

The deployable module source in `flic_hub_module/` targets the [Flic Hub SDK](https://hubsdk.flic.io/static/documentation/) QuickJS runtime, not Node.js. Hub APIs like `require("buttons")` and `http.makeRequest` do not exist in Node.js.

To test this module on development workstations and in CI:
- The Flic Hub `buttons` module is mapped to [mocks/buttons.js](mocks/buttons.js) via Jest's `moduleNameMapper`.
- The Flic Hub `http` client is mocked virtually (`jest.mock("http", …, { virtual: true })`).
- All module files under `flic_hub_module/` execute directly without modifications or Node.js runtime abstractions.

---

## Running the Suite

### In the Devcontainer (Recommended)

Open the repository in the devcontainer (VS Code: **Reopen in Container**). The container environment provides Node.js 26, tmux, and installs all dependencies automatically.

From the repository root:

```sh
# Run the Jest test suite
npm test

# Run tests with coverage (enforces 100% thresholds)
npm run test:coverage

# Run ESLint (enforces QuickJS global restrictions and style)
npm run lint
```

### Running Targeted Tests

You can pass arguments to Jest through `npm test` or `npx jest`:

```sh
# Run a single test file
npm test -- test/main.test.js

# Run tests matching a specific test name pattern
npm test -- -t "Home Assistant contract"

# Run tests in watch mode during development
npx jest --watch
```

### With Docker

If the devcontainer is unavailable, run commands in the official devcontainer image with Docker. The `--user` flag keeps `node_modules/` and coverage artifacts owned by your host user:

```sh
# Install dependencies and run tests
docker run --rm -v "$PWD":/work -w /work --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/devcontainers/javascript-node:26-trixie bash -c "npm ci && npm test"

# Run tests with coverage
docker run --rm -v "$PWD":/work -w /work --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/devcontainers/javascript-node:26-trixie bash -c "npm run test:coverage"

# Run linter
docker run --rm -v "$PWD":/work -w /work --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/devcontainers/javascript-node:26-trixie bash -c "npm run lint"
```

CI ([.github/workflows/test.yml](../.github/workflows/test.yml)) runs `npm run lint` and `npm run test:coverage` on every push and pull request.

---

## Test Suite Layout

| Test File | Target Source | Key Coverage & Responsibilities |
| :--- | :--- | :--- |
| [`main.test.js`](main.test.js) | `flic_hub_module/main.js` | Button lifecycle handlers (`load`, `connected`, `ready`, `disconnected`, `deleted`), periodic background sync (`SYNC_TIME`), gesture arming and state transitions, phantom/duplicate click suppression, and Home Assistant contract assertions. |
| [`ha.test.js`](ha.test.js) | `flic_hub_module/ha.js` | REST API request structures (`POST`, `DELETE`), URL path formatting, payload attributes, authentication headers (`Bearer` token), custom TLS certificates/hostname verification, and HTTP response logging & token redaction. |
| [`utils.test.js`](utils.test.js) | `flic_hub_module/utils.js` | Button entity naming (`flic_<bdaddr>`), friendly names with suffixes, battery icon calculation with configurable threshold (`WARNING_BATTERY_LEVEL`), connectivity icons, and per-button event state isolation. |
| [`logger.test.js`](logger.test.js) | `flic_hub_module/logger.js` | Log-level filtering (`NONE`, `ERROR`, `WARNING`, `INFO`, `DEBUG`) and console message formatting (`<timestamp> : <prefix> : <message>`). Spies on `console.log`. |
| [`blueprint.test.js`](blueprint.test.js) | `flic-button.yaml` | Validates that the Home Assistant automation blueprint triggers on `flic_click` and contains branch conditions for all supported click types (`single`, `double`, `hold`). |
| [`mocks/buttons.js`](mocks/buttons.js) | Flic Hub SDK `buttons` | Mock button manager. Records event handlers, provides safe shallow copies of button objects (matching SDK behavior), and exposes test helpers (`__setButtons`, `__addButton`, `__fire`). |

---

## Mocking & Runtime Simulation

### 1. Flic Hub `buttons` Module
Jest maps `require("buttons")` directly to `test/mocks/buttons.js` via `package.json`'s `jest.moduleNameMapper`.
- **Button Isolation**: `getButtons()` and `getButton(bdaddr)` return shallow copies (`{ ...button }`), ensuring that changes inside the module under test do not corrupt test fixtures.
- **`__setButtons(list)`**: Replaces the list of buttons known to the mock button manager.
- **`__addButton(button)`**: Adds a button to the existing list.
- **`__fire(event, eventObj)`**: Invokes the registered handler for `buttonDown`, `buttonUp`, `buttonSingleOrDoubleClickOrHold`, `buttonConnected`, `buttonReady`, `buttonDisconnected`, or `buttonDeleted`. Throws if no handler was registered.

### 2. Virtual `http` Module
Because `flic_hub_module/ha.js` requires the host SDK's `http` module, `test/ha.test.js` declares a virtual mock:

```javascript
jest.mock("http", () => ({ makeRequest: jest.fn() }), { virtual: true });
```

- Inspect outgoing requests via `http.makeRequest.mock.calls[i][0]`.
- Simulate responses by triggering the callback: `http.makeRequest.mock.calls[i][1](error, result)`.

---

## Conventions & Rules for Writing Tests

### 1. Never Assert Against Raw `config.js` Values
`flic_hub_module/config.js` is a user-edited deployment file. Tests must never assume or assert against default values.
- Pin configuration values at module scope:
  ```javascript
  jest.mock("../flic_hub_module/config", () => ({
  	...jest.requireActual("../flic_hub_module/config"),
  	MIN_EVENTS_OFFSET: 600,
  	SYNC_TIME: 60_000,
  	LOG_LEVEL: jest.requireActual("../flic_hub_module/constants").LOG_LEVEL_NONE,
  }));
  ```
- Override specific properties per test using `jest.replaceProperty`:
  ```javascript
  jest.replaceProperty(CFG, "WARNING_BATTERY_LEVEL", 15);
  ```
- Restore mocks in `afterEach()` with `jest.restoreAllMocks()`.

### 2. Use Literal Values for Home Assistant Contract Tests
Comparing test expectations against `constants.js` can hide accidental contract mutations if a constant value changes. Always use string and object literals for values consumed by Home Assistant:
- **Click types**: `"single"`, `"double"`, `"hold"`
- **Binary sensor states**: `"on"`, `"off"`
- **Battery state / icon**: `"unknown"`, `"mdi:battery-unknown"`, `50`, `"mdi:battery-50"`
- **Event types & payloads**: `event_type: "flic_click"`, payload keys `button_name`, `button_address`, `click_type`
- **Entity IDs**: `binary_sensor.flic_<address>`, `sensor.flic_<address>_battery`, `binary_sensor.flic_<address>_connectivity`
- **HTTP endpoints & methods**: `POST`, `DELETE`, `/api/states/...`, `/api/events/flic_click`

### 3. Isolate Per-Button State with Unique `bdaddr`
`flic_hub_module/utils.js` maintains module-level state keyed by the button's Bluetooth address (`bdaddr`).
- Give every test case a unique `bdaddr` (e.g., `"aa:aa:aa:00:00:01"`, `"aa:aa:aa:00:00:02"`) so event state (`pressedTimestamp`, `eventTimestamp`, `eventEmitted`) cannot leak between tests.
- Use a helper function like `mkButton(bdaddr, extra)` to generate consistent button objects.

### 4. Manage `main.js` Require-Time Side Effects
Requiring `flic_hub_module/main.js` immediately executes `initButtons()`, starts a background `setInterval` for periodic synchronization, and registers event listeners with `buttonManager.on()`.
- Set up fake timers (`jest.useFakeTimers()`), mock `ha.js`, mock/pin `config.js`, and seed initial buttons with `buttonManager.__setButtons()` *before* requiring `main.js`.
- Require `main.js` **only once** per test file inside `beforeAll()`.
- Capture require-time calls (like `initButtons` HA requests) in `beforeAll()` before `beforeEach()` clears mocks.

### 5. Simulate SDK Gestures in Documented Order
The Flic Hub SDK fires gestures with specific event ordering and payloads:
- **Single / Double Click**:
  1. `buttonDown` (`{ bdaddr }`)
  2. `buttonUp` (`{ bdaddr }`) — this release arms the click cycle (setting `eventEmitted` to `"waiting"`).
  3. `buttonSingleOrDoubleClickOrHold` (`{ bdaddr, isSingleClick: true }` or `{ bdaddr, isDoubleClick: true }`).
- **Hold**:
  1. `buttonDown` (`{ bdaddr }`)
  2. `buttonSingleOrDoubleClickOrHold` (`{ bdaddr, isHold: true }`) — fires while the button is still pressed.
  3. `buttonUp` (`{ bdaddr }`) — release re-anchors the timestamp to filter trailing spurious single clicks.

> [!IMPORTANT]
> SDK event objects are **not** complete button objects. They contain `{ bdaddr }` and boolean click flags (`isSingleClick`, `isDoubleClick`, `isHold`). `getButton(bdaddr)` is used by the module to look up full button metadata.

### 6. Control Fake Timers & Reset Clocks
- Call `jest.setSystemTime(BASE_TIME)` in `beforeEach()` to avoid tests inheriting mutated clock times from previous tests.
- Use `jest.setSystemTime(Date.now() + ms)` when advancing time for gesture and offset tests (`MIN_EVENTS_OFFSET`).
- Be careful with `jest.advanceTimersByTime()`: it triggers recurring intervals like `SYNC_TIME`. Only use `advanceTimersByTime` when deliberately testing interval execution.

### 7. Assert Observable Behavior, Never Volatile Log Text
- Do not assert on exact log message text; log wording is internal and volatile.
- Never spy on `console.log` outside `test/logger.test.js`.
- For `flic_hub_module/ha.js`, spy on `logger` methods (`logger.error`, `logger.debug`) to verify which log severity is chosen for different HTTP response codes.
- **Security Check**: Always verify that sensitive credentials (`SERVER_AUTH_TOKEN`) never appear in logged messages or error callbacks.

### 8. Ensure Tests Bite (Avoid False Positives)
- An unknown button queries as `INITIAL_STATE` by default. Testing that an operation resets or deletes button state requires seeding non-default state first (`utils.setButtonPressedTimestamp`, `utils.setButtonEventEmitted`, etc.), then verifying the reset.
- When adding new test cases, temporarily invert the condition in production code to confirm the test fails before trusting a green result.

### 9. Maintain 100% Code Coverage & Linting
`package.json` enforces 100% threshold across all files under `flic_hub_module/`:

```json
"coverageThreshold": {
	"global": {
		"lines": 100,
		"branches": 100,
		"functions": 100,
		"statements": 100
	}
}
```

- Any change that drops coverage below 100% will fail CI. Do not lower or disable coverage thresholds.
- ESLint checks enforce that no Node.js globals (`process`, `Buffer`, `__dirname`, `fs`, etc.) or browser globals are introduced into `flic_hub_module/`, ensuring full compatibility with the Flic Hub QuickJS runtime.
