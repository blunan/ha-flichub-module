# Flic Hub Module for Home Assistant

Send your Flic Button clicks, battery levels, and connection status to Home Assistant straight from your Flic Hub. The module runs on the hub itself and talks to the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest) directly: no cloud, no bridge, no extra hardware.

Paste seven small files into the hub's [Online IDE](https://hubsdk.flic.io), fill in your Home Assistant address and an access token, and every button paired with the hub shows up in Home Assistant, ready to trigger automations.

## Highlights

- **Click events:** Single, double, and hold gestures fire a `flic_click` event in Home Assistant, ready to trigger your automations or the [blueprint](examples.md#blueprint).
- **Battery tracking:** A battery sensor per button, with an icon that follows the level and a configurable low-battery warning.
- **Connectivity status:** See at a glance whether each button is connected to the hub.
- **No phantom clicks:** Built-in filtering drops the extra events some buttons report after a hold or a double click, so each press fires at most one event. See [How the module behaves](behavior.md).
- **Drop-in for flicd:** Events keep the type and data of the flicd add-on, so existing automations keep working. See [Coming from the flicd add-on](examples.md#coming-from-flicd).
- **Configurable logging:** From silent to verbose, in the Flic Hub IDE console.

## How it maps

```text
Flic Button 80:e4:da:77:9f:c7 ("Gamer")   → Home Assistant
├── pressed / released                    → binary_sensor.flic_80e4da779fc7
├── battery level                         → sensor.flic_80e4da779fc7_battery
├── connected / disconnected              → binary_sensor.flic_80e4da779fc7_connectivity
└── single / double / hold                → flic_click event
```

## Requirements & scope

- **Flic Hub:** A Flic Hub with access to the [Flic Hub SDK](https://flic.io/flic-hub-sdk) and its [Online IDE](https://hubsdk.flic.io). Pair your buttons with the hub as usual.
- **Home Assistant:** The [API integration](https://www.home-assistant.io/integrations/api), enabled by default, and a Long-Lived Access Token from an administrator account. The blueprint needs Home Assistant 2024.10 or newer.
- **Network:** The hub must reach Home Assistant over HTTP or HTTPS. Self-signed certificates are supported; see [HTTPS and certificates](https.md).
- **Not included:** The entities are plain states set through the REST API, not registered devices, so they can't be renamed or assigned to areas from the Home Assistant UI. See [Entities](entities.md#no-unique-id).

## Documentation overview

| Guide | Description |
|---|---|
| [Installation](installation.md) | Create the module in the Flic Hub IDE, check that it works, and update it |
| [Configuration](configuration.md) | Every option in `config.js`, with its default and when to change it |
| [HTTPS and certificates](https.md) | Plain HTTP, trusted certificates, and self-signed or private-CA setups |
| [Entities](entities.md) | The three entities per button, their states, attributes, and icons |
| [Automations and dashboards](examples.md) | `flic_click` automations, the blueprint, testing, and a dashboard card |
| [How the module behaves](behavior.md) | Phantom-click filtering, regular updates, reconnects, and restarts |
| [Troubleshooting](troubleshooting.md) | Reading the console, failed requests, ignored clicks, and reporting issues |
| [How it works](architecture.md) | Code map, event handling, click state, and the Home Assistant requests |
| [Testing](testing.md) | Running the Jest suite, the SDK mocks, and the test-writing conventions |
| [Contributing & releases](development.md) | Dev container, code style, CI, documentation, and releases |

## License

MIT License. This project is independent and not affiliated with or endorsed by Shortcut Labs (Flic) or the Home Assistant project.
