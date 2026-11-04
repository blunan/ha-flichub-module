# Entities

The module creates three entities for every button the hub knows about. Their IDs come from the button's Bluetooth address with the colons removed, so a button with the address `80:e4:da:77:9f:c7` gets:

| Entity | Shows | States |
|---|---|---|
| `binary_sensor.flic_80e4da779fc7` | Whether the button is pressed right now | `on` (pressed), `off` (released) |
| `sensor.flic_80e4da779fc7_battery` | The battery level | `0`–`100` (%), or `unknown` |
| `binary_sensor.flic_80e4da779fc7_connectivity` | Whether the button is connected to the hub | `on` (connected), `off` (disconnected) |

Clicks don't have an entity: they fire a [`flic_click` event](examples.md#flic-click) instead.

## Names and entity IDs { #names-and-entity-ids }

- **Entity IDs** always come from the Bluetooth address, so they never change, even if you rename the button.
- **Display names** use the name you gave the button in the Flic app: a button named *Gamer* shows up as *Gamer*, *Gamer Battery*, and *Gamer Connectivity*. A button without a name shows as `flic_80e4da779fc7` instead, with the same suffixes.
- **Renaming** the button in the Flic app updates the display names with the next update of each entity.

The `button_name` in each `flic_click` event is the `flic_80e4da779fc7` form, not the name from the Flic app.

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

The module creates these entities by setting their states through the Home Assistant REST API, so they aren't in Home Assistant's entity registry. Home Assistant says they have no unique ID, and you can't rename them, change their icon, or assign them to an area from the UI.

- To change the display name, rename the button in the Flic app.
- On a dashboard, set a `name` or `icon` per entity in the card instead; see the [dashboard card](examples.md#dashboard).
