# How it works

The module is CommonJS JavaScript running in the Flic Hub's QuickJS environment (supporting most of ES2023). It listens for button events via `buttons` and communicates with the Home Assistant REST API via `http`, as documented in the [Flic Hub SDK](https://hubsdk.flic.io/static/documentation/).

## Code map

```text
flic_hub_module/
├── main.js        Entry point: initial sync, periodic sync, and the button event handlers
├── ha.js          Home Assistant REST requests and response logging
├── utils.js       Entity names, display names, icons, and the per-button click state
├── logger.js      Log-level filtering and console formatting
├── constants.js   Click types, states, log levels, and the initial click state
├── config.js      User settings, edited in the Flic Hub IDE
└── module.json    Module metadata: name, version, author, and license
```

```text
main.js ──► ha.js ─────► http        (hub)
   │          ├──► utils.js ──► config.js, constants.js
   │          └──► logger.js ─► config.js, constants.js
   ├──► utils.js
   ├──► logger.js
   └──► buttons                       (hub)
```

## Lifecycle overview { #lifecycle }

`main.js` does its work as soon as the hub loads it:

1. **Initial sync:** for every button from `getButtons()`, it resets the button's click state and sends the button state (`off`), battery, and connectivity.
2. **Periodic sync:** `setInterval` sends the battery and connectivity of every button again every `SYNC_TIME` milliseconds.
3. **Event handlers:** it registers a handler for each button event below.

## Button events { #button-events }

SDK events include only `bdaddr` and click flags; handlers look up the full button object using `getButton(bdaddr)`. `buttonDeleted` requires only `bdaddr`.

| SDK event | Click state | Sent to Home Assistant |
|---|---|---|
| `buttonConnected` | Reset | Button state `off`, battery, connectivity |
| `buttonReady` | — | Connectivity |
| `buttonDisconnected` | — | Connectivity |
| `buttonDown` | `pressedTimestamp` = now | Button state `on` |
| `buttonUp` | Armed, or the hold window restarts ([see below](#button-up)) | Button state `off` |
| `buttonSingleOrDoubleClickOrHold` | Updated when the click is accepted ([see below](#click-decision)) | A `flic_click` event, if accepted |
| `buttonDeleted` | Deleted | Deletes the three entities |

## Click filtering { #click-filtering }

### Per-button state

`utils.js` keeps a `Map` from `bdaddr` to each button's click state, so buttons never share state. Each entry starts as a copy of the frozen `C.INITIAL_STATE`:

| Field | Initial | Meaning |
|---|---|---|
| `pressedTimestamp` | `0` | When the last press started; `0` means no press since the state was reset |
| `eventTimestamp` | `0` | When the last click was accepted, or when the hold window last restarted |
| `eventEmitted` | `'none'` | `'none'` after a reset, `'waiting'` once armed by a press and release, or the type of the last accepted click |

Getters for an unknown button return `C.INITIAL_STATE` without creating an entry; setters create it. `getButtonState` returns a copy.

### On `buttonUp` { #button-up }

```text
if eventEmitted is 'hold' and pressedTimestamp − eventTimestamp < MIN_EVENTS_OFFSET:
    # the release that ends a hold, or a quick re-press that belongs to it
    if pressedTimestamp >= eventTimestamp: log a warning (a new press inside the hold window)
    eventTimestamp = now                       # the hold window restarts at this release
else if pressedTimestamp is not 0:
    eventEmitted = 'waiting'                   # armed: the next single or double may pass
send button state off                          # always, whatever the click state
```

### On a click event { #click-decision }

```text
type = single, double, or hold
1. eventEmitted is 'none' and type is not hold        → ignore: no press since the reset
2. eventEmitted is not 'waiting' and type is not hold → ignore: no new press since the last event
3. now − eventTimestamp < MIN_EVENTS_OFFSET           → ignore: too soon
4. otherwise                                          → accept: eventTimestamp = now,
                                                         eventEmitted = type, send flic_click
```

The comparisons are strict, so a click that arrives exactly `MIN_EVENTS_OFFSET` after the previous one is accepted. Traced through the rules:

```text
single           down → up (armed) → single (accepted)
double           down → up (armed) → down → up → double (accepted) → single (rule 2: ignored)
hold             down → hold (accepted) → up (hold window restarts) → single (rule 2: ignored)
re-press         … hold → up → down within MIN_EVENTS_OFFSET → up (stays in the hold, not armed)
after reconnect  connected (reset) → single (rule 1: ignored)
```

## Home Assistant requests { #home-assistant-requests }

All requests route through `notifyHomeAssistant()` in `ha.js`, which attaches bearer token and JSON headers. When `USE_CUSTOM_CERTIFICATE` is enabled, it configures `customTrustStore` with `CUSTOM_CERTIFICATES` and `VERIFY_CERTIFICATE`.

`<address>` below is the button's `bdaddr` without colons:

| Function | Request | Body |
|---|---|---|
| `sendButtonState` | `POST /api/states/binary_sensor.flic_<address>` | `state`: `on` or `off`; `attributes`: `friendly_name` |
| `sendButtonBatteryState` | `POST /api/states/sensor.flic_<address>_battery` | `state`: the level, or `unknown`; `attributes`: `device_class: battery`, `unit_of_measurement: %`, `icon`, `friendly_name` |
| `sendButtonConnectivityState` | `POST /api/states/binary_sensor.flic_<address>_connectivity` | `state`: `on` or `off`, from the button's `ready` flag; `attributes`: `device_class: connectivity`, `icon`, `friendly_name` |
| `sendButtonEvent` | `POST /api/events/flic_click` | `button_name`, `button_address`, `click_type` |
| `sendRemovedState` | `DELETE` each of the three state paths | — |

These entity IDs, event names, payload keys, and values are a compatibility contract with users' automations, the [blueprint](examples.md#blueprint), and the flicd add-on. Change them only on purpose, together with the README, these docs, the blueprint, and the contract tests.

The response callback picks the log level:

| Outcome | Logged at |
|---|---|
| `makeRequest` reports an error: the request couldn't be completed | `error`: the request and the error |
| HTTP status of 400 or more, except `404` for a `DELETE` | `error`: the request and the response |
| Anything else | `debug`: the request and the response |

Logged requests reconstruct only the method, URL, and body, ensuring bearer tokens in headers are never logged.

## Architectural principles { #principles }

- **Hub runtime only:** QuickJS language features, CommonJS `require` and `exports`, and only the globals the hub provides (`console` and the timer functions). ESLint rejects Node.js globals in `flic_hub_module/`.
- **No comments in the module:** users paste these files into the IDE, and many aren't programmers. Explanations live in these docs.
- **SDK interfaces stay in place:** production code calls `buttons` and `http` directly, and the tests [mock those modules](testing.md#mocking) instead of swapping in Node.js abstractions.
- **One event per press:** a click is accepted at most once per physical press, and the press sensor always mirrors the physical button.
- **Never log credentials.**
