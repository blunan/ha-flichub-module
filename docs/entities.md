# Entities

The module creates three entities for every button the hub knows about. Their IDs come from the button's Bluetooth address with the colons removed, so a button with the address `80:e4:da:77:9f:c7` gets:

| Entity | Shows | States |
|---|---|---|
| `binary_sensor.flic_80e4da779fc7` | Whether the button is pressed right now | `on` (pressed), `off` (released) |
| `sensor.flic_80e4da779fc7_battery` | The battery level | `0`–`100` (%), or `unknown` |
| `binary_sensor.flic_80e4da779fc7_connectivity` | Whether the button is connected to the hub | `on` (connected), `off` (disconnected) |

Clicks don't have an entity: they fire a [`flic_click` event](examples.md#flic-click) instead.

## Names and entity IDs { #names-and-entity-ids }

- **Entity IDs** always derive from the button's Bluetooth address without colons (`flic_<address>`) and never change, even if you rename the button.
- **Display names** use the name assigned in the Flic app (e.g. *Gamer*, *Gamer Battery*, *Gamer Connectivity*). Unnamed buttons default to `flic_<address>`.
- **Renaming** the button in the Flic app updates display names on the next entity state update.
- **Event identifier:** In `flic_click` events, `button_name` always uses the `flic_<address>` format, not the display name.

## Button state { #button-state }

`binary_sensor.flic_<address>` turns `on` the moment you press the button and `off` when you release it. It always follows the physical button, even when the module [ignores a click](behavior.md#one-event-per-press). It's set to `off` when the module starts and whenever the button connects to the hub.

| Attribute | Value |
|---|---|
| `friendly_name` | The display name |

## Battery { #battery }

`sensor.flic_<address>_battery` holds the battery level in percent, as the button reports it, or `unknown` until the hub knows it.

| Attribute | Value |
|---|---|
| `device_class` | `battery` |
| `unit_of_measurement` | `%` |
| `icon` | Follows the level, as in the table below |
| `friendly_name` | The display name followed by *Battery* |

| Battery level | Icon |
|---|---|
| Not reported yet | `mdi:battery-unknown` |
| Below 5% | `mdi:battery-outline` |
| From 5% up to [`WARNING_BATTERY_LEVEL`](configuration.md#warning-battery-level) (default 10%) | `mdi:battery-alert` |
| Above the warning level and below 95% | The closest tenth: `mdi:battery-10` to `mdi:battery-90` |
| 95% and up | `mdi:battery` |

Setting `WARNING_BATTERY_LEVEL` lower than 5 turns the warning icon off.

## Connectivity { #connectivity }

`binary_sensor.flic_<address>_connectivity` is `on` while the hub has a verified connection to the button and `off` otherwise. The hub reports a disconnection when the signal is too weak, when it loses sync with the button, or when the button goes to sleep, so an `off` now and then is normal.

| Attribute | Value |
|---|---|
| `device_class` | `connectivity` |
| `icon` | `mdi:bluetooth` when connected, `mdi:bluetooth-off` when not |
| `friendly_name` | The display name followed by *Connectivity* |

## When the entities update { #updates }

| Entity | Sent when |
|---|---|
| Button state | The module starts, the button connects, and on every press and release |
| Battery | The module starts, the button connects, and every [`SYNC_TIME`](configuration.md#sync-time) |
| Connectivity | The module starts, the button connects or disconnects, the connection is verified, and every `SYNC_TIME` |

Home Assistant doesn't keep these entities across its own restarts. The battery and connectivity entities come back at the next regular update; the button state comes back the next time the button is pressed or reconnects. See [When Home Assistant restarts](behavior.md#home-assistant-restarts).

## No unique ID { #no-unique-id }

The module creates entities via the Home Assistant REST API rather than an integration registry, so Home Assistant reports that they have no unique ID. You cannot rename them, customize their icons, or assign them to areas through the Home Assistant UI.

- To change display names, rename the button in the Flic app.
- To customize titles, labels, or icons on your dashboard, configure them directly in your dashboard card (see [Automations and dashboards](examples.md#dashboard)):

```yaml
type: entities
title: Flic Gamer
entities:
  - entity: binary_sensor.flic_80e4da779fc7
    name: Pressed
  - entity: sensor.flic_80e4da779fc7_battery
  - entity: binary_sensor.flic_80e4da779fc7_connectivity
```
