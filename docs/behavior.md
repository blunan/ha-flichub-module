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

1. **A fresh press is needed.** A `single` or `double` counts only after a press and release the module saw itself. After the module starts or a button reconnects, a click that arrives before any press is ignored. After each event, the next `single` or `double` needs a new press and release. This rule is what drops the phantom `single` after a hold or a double click. A `hold` is reported while the button is still down, so it doesn't need a release first.
2. **Not too soon.** Any click, including a `hold`, is ignored if it arrives less than [`MIN_EVENTS_OFFSET`](configuration.md#min-events-offset) milliseconds (default 600) after the button's previous accepted event.
3. **A hold absorbs quick re-presses.** While you hold a button, tiny finger movements can make some buttons, notably the Flic 2, report extra quick presses. Any press that starts within `MIN_EVENTS_OFFSET` of the last hold activity (the hold itself, or the release that ends it) is treated as part of that same hold, and its clicks are ignored. Fully release the button and pause briefly before clicking again.

Two things stay true whatever the rules decide:

- **The button sensor always follows the button.** `binary_sensor.flic_<address>` turns `on` when you press and `off` when you release, even when a click is ignored. Ignoring a click only means no `flic_click` event is fired.
- **Every ignored click is explained.** With [`LOG_LEVEL`](configuration.md#log-level) at `C.LOG_LEVEL_WARNING` or higher, the module writes the reason to the Flic Hub IDE console. [Troubleshooting](troubleshooting.md#ignored-clicks) lists each reason and what to do about it.

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
