# Entities

The module creates three entities for each paired button. Entity IDs derive from the button's Bluetooth address without colons (`flic_<address>`):

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

`binary_sensor.flic_<address>` turns `on` while pressed and `off` when released. It tracks the physical button directly, even when a click event is [ignored](behavior.md#one-event-per-press). It initializes to `off` on module start and button reconnection.

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

`binary_sensor.flic_<address>_connectivity` is `on` when the connection is verified and `off` otherwise. Intermittent disconnections are normal when buttons sleep, lose sync, or experience weak signal.

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

Entities do not persist across Home Assistant restarts. Battery and connectivity restore on the next regular update; button state restores on the next press or reconnection. See [When Home Assistant restarts](behavior.md#home-assistant-restarts).

## No unique ID { #no-unique-id }

Entities created via the REST API do not have unique IDs in Home Assistant, preventing UI renaming, custom icons, or area assignments.

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
