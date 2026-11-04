# How the module behaves

## One event per press { #one-event-per-press }

Flic Buttons sometimes report an extra `single` click when you release the button after a **hold** or a **double** click. The module makes sure each press sends at most one `flic_click` event to Home Assistant, so those phantom clicks never trigger your automations.

### What the hub reports

The Flic Hub decides the gesture and reports it next to the raw presses and releases:

```text
single   press ─ release ─────── 0.5 s, no second press ───────► single
double   press ─ release ─ press ─ release ────────────────────► double
hold     press ───────── 1 s ─────────► hold ─── release
```

A phantom click is an extra `single` after one of these gestures, without a new press of its own.

### The rules

A click reaches Home Assistant only when it passes these rules:

1. **A fresh press cycle is required:** Single and double clicks require a fresh button down and up cycle observed by the module. Clicks arriving before an initial physical press (after module start or reconnect), or extra clicks without a new press (such as a phantom single after a hold or double click), are ignored. Holds fire while pressed and do not require a prior release.
2. **Debounce window (`MIN_EVENTS_OFFSET`):** Any click arriving less than [`MIN_EVENTS_OFFSET`](configuration.md#min-events-offset) milliseconds (default: `600`) after the previous accepted event is ignored.
3. **Hold micro-movement absorption:** Tiny finger movements during a hold can cause some buttons (notably Flic 2) to report rapid down/up pairs. Any press starting within `MIN_EVENTS_OFFSET` of hold activity (the hold itself or its release) is treated as part of that hold, and its clicks are ignored.

Two guarantees remain in effect regardless of filtering decisions:

- **The physical button sensor always tracks presses:** `binary_sensor.flic_<address>` turns `on` when pressed and `off` when released, even when a click event is ignored.
- **Ignored clicks are logged:** With [`LOG_LEVEL`](configuration.md#log-level) at `C.LOG_LEVEL_WARNING` or higher, the module logs the specific reason to the Flic Hub IDE console (see [Troubleshooting](troubleshooting.md#ignored-clicks)).

### Tuning `MIN_EVENTS_OFFSET` { #tuning }

- **Phantom clicks still reach your automations:** raise it, for example to `800`.
- **Deliberate clicks get dropped**, such as a quick click right after a hold: lower it gradually.

## Regular updates { #regular-updates }

Every [`SYNC_TIME`](configuration.md#sync-time) milliseconds (one minute by default), the module sends the battery and connectivity of all your buttons to Home Assistant again, so Home Assistant stays up to date even when no one presses anything. Each update takes two requests per button.

## When the module starts { #module-start }

Whenever the module starts, for example when you start it in the IDE or when **Restart after crash** brings it back, it does this for every button the hub knows about:

1. Clears the button's click tracking, so the first click needs a fresh press (rule 1).
2. Sends the button state as `off`, the battery level, and the connectivity.

The regular updates begin after the first `SYNC_TIME` interval.

## Connections and disconnections { #connections }

The hub reports three connection events for each button, and the module reacts to each:

| The hub reports | When | The module |
|---|---|---|
| Connected | The button made a physical connection, not yet verified | Clears the click tracking and sends the button state (`off`), battery, and connectivity |
| Ready | The connection is verified; presses can be delivered from now on | Sends connectivity, now `on` |
| Disconnected | The signal is too weak, the hub lost sync with the button, or the button went to sleep | Sends connectivity as `off` |

A press made while the button is disconnected reaches the hub if the button reconnects within 15 seconds; otherwise the hub drops it.

## When Home Assistant restarts { #home-assistant-restarts }

Home Assistant doesn't remember the module's entities across its own restarts. The battery and connectivity entities come back with the next [regular update](#regular-updates); the button's on/off entity comes back the next time the button is pressed or reconnects to the hub. Click events aren't affected: the next click fires as usual.

## Removing a button { #removing-a-button }

When you remove a button from the Flic Hub, the module deletes its three entities from Home Assistant. If an entity is already gone, for example after Home Assistant restarted, the module carries on without an error.
