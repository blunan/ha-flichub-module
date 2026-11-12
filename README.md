# 🔘 Flic Hub Module for Home Assistant

[![Tests](https://img.shields.io/github/actions/workflow/status/blunan/ha-flichub-module/test.yml?branch=main&label=tests)](https://github.com/blunan/ha-flichub-module/actions/workflows/test.yml)
[![Docs](https://img.shields.io/badge/docs-ha--flichub--module.blunan.com-526CFE?logo=materialformkdocs&logoColor=white)](https://ha-flichub-module.blunan.com/)
[![Version](https://img.shields.io/github/v/release/blunan/ha-flichub-module?label=version)](https://github.com/blunan/ha-flichub-module/releases/latest)
[![License](https://img.shields.io/github/license/blunan/ha-flichub-module)](LICENSE)
[![Flic Hub SDK](https://img.shields.io/badge/flic--hub--sdk-compatible-f4a51c)](https://flic.io/flic-hub-sdk)
[![Home Assistant](https://img.shields.io/badge/home--assistant-REST%20API-41BDF5)](https://developers.home-assistant.io/docs/api/rest)
[![Tested with Jest](https://img.shields.io/badge/tested%20with-Jest-C21325)](https://jestjs.io)

This module uses the [Flic Hub SDK](https://flic.io/flic-hub-sdk) to send your Flic Button events and states to the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest). No cloud, no bridge, no extra hardware — the hub talks to Home Assistant directly.

> 📖 **Full documentation at [ha-flichub-module.blunan.com](https://ha-flichub-module.blunan.com/):** HTTPS certificates, how clicks are filtered, every entity in detail, more automation examples, and troubleshooting.

> Automations using [pschmitt's flicd add-on](https://github.com/pschmitt/home-assistant-addons) continue to work after pairing buttons to the Flic Hub: this module emits the same event [type and data](https://www.home-assistant.io/integrations/flic) (`button_name`, `button_address`, and `click_type`; only `queued_time` is omitted).

## ✨ Features

* 🖱️ **Click events** — `single`, `double` and `hold` gestures fire a `flic_click` event in Home Assistant, ready to trigger automations.
* 🔋 **Battery tracking** — a sensor per button with a level-accurate icon (`mdi:battery-outline` → `mdi:battery`), including a configurable low-battery warning.
* 📶 **Connectivity status** — know at a glance whether a button is reachable from the hub.
* 🧹 **No phantom clicks** — built-in filtering drops the duplicate/spurious events some Flic buttons emit after a hold or double click.
* 🎚️ **Configurable logging** — from silent to verbose, straight in the Flic Hub IDE console.

## 📋 Table of contents

* [Set up](#-set-up)
* [Run automations with your Flics](#-run-automations-with-your-flics)
* [Flic button card](#-flic-button-card)
* [Documentation](#-documentation)
* [Contributing](#-contributing)
* [License](#-license)

## 🔧 Set up

Create a module on your Flic Hub in the [Online IDE](https://hubsdk.flic.io) and copy the files from the `flic_hub_module` folder:
* `config.js`
* `constants.js`
* `ha.js`
* `logger.js`
* `main.js`
* `module.json`
* `utils.js`

It should look something like this:

![Flic Hub Online IDE](./docs/assets/FlicHubOnlineIDE.png?raw=true "Flic Hub Online IDE")

Then edit `config.js` to connect the Flic Hub to your Home Assistant instance.

| Param                    | Default | Description |
| :----------------------- | :-----: | :---------- |
| `MIN_EVENTS_OFFSET`      | `600`   | Minimum milliseconds between button events; faster duplicate clicks are ignored to suppress phantom clicks. |
| `SYNC_TIME`              | `60000` | Interval in milliseconds to re-sync battery and connectivity states to Home Assistant. |
| `WARNING_BATTERY_LEVEL`  | `10`    | Battery percentage (5–100%) at or below which the sensor displays a warning icon (`mdi:battery-alert`). Set `< 5` to disable. |
| `LOG_LEVEL`              | `C.LOG_LEVEL_WARNING` | Console verbosity in the Flic Hub IDE (`ERROR` for normal use, `WARNING` during setup, `INFO`/`DEBUG` for troubleshooting, `NONE` for silence). |
| `SERVER_HOST`            | `''`    | Home Assistant URL without a trailing slash (e.g. `http://192.168.1.20:8123` or `https://...`). |
| `SERVER_AUTH_TOKEN`      | `''`    | Long-Lived Access Token created from your Home Assistant profile. |
| `USE_CUSTOM_CERTIFICATE` | `false` | Enable to trust custom certificates in `CUSTOM_CERTIFICATES` (for self-signed or private CA setups). |
| `VERIFY_CERTIFICATE`     | `false` | When using custom certificates, checks that `SERVER_HOST` matches the certificate's SAN hostname. |
| `CUSTOM_CERTIFICATES`    | `''`    | One or more PEM certificates to trust when `USE_CUSTOM_CERTIFICATE` is `true`. |

> ⚠️ Home Assistant requires the **API** integration (enabled by default). See the [Home Assistant API documentation](https://www.home-assistant.io/integrations/api) if needed.

For self-signed certificates or private CAs, see [HTTPS and certificates](https://ha-flichub-module.blunan.com/https/). See the [configuration guide](https://ha-flichub-module.blunan.com/configuration/) for parameter details and the [installation guide](https://ha-flichub-module.blunan.com/installation/) for verification and update steps.

## 🤖 Run automations with your Flics

Example automation triggered by `flic_click` events:

```yaml
automation:
  - alias: "Turn on lights in the living room on single flic click"
    triggers:
      - trigger: event
        event_type: flic_click
        event_data:
          button_name: flic_80e4da779fc7
          click_type: single
    actions:
      - action: homeassistant.turn_on
        target:
          entity_id: group.lights_living_room
```

Supported `click_type` values are `single`, `double`, and `hold`. Each event also includes `button_address`, the button's Bluetooth address (e.g. `80:e4:da:77:9f:c7`).

Each physical press fires at most one event; duplicate clicks after holds or double clicks are filtered out. After starting the module or reconnecting a button, press it once to initialize click processing — see [How the module behaves](https://ha-flichub-module.blunan.com/behavior/).

Or import the [blueprint](flic-button.yaml) (requires Home Assistant 2024.10+):

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fblunan%2Fha-flichub-module%2Fblob%2Fmain%2Fflic-button.yaml)

See [automation examples](https://ha-flichub-module.blunan.com/examples/) for multi-action automations, press-and-hold dimming, and manual event testing.

## 📇 Flic button card

Add an entities card to check button **state**, **battery**, and **connectivity**:

![Flic Button Card](./docs/assets/FlicButtonCard.png?raw=true "Flic Button Card")

```yaml
type: entities
title: Flic gamer
entities:
  - entity: binary_sensor.flic_80e4da779fc7
  - entity: sensor.flic_80e4da779fc7_battery
  - entity: binary_sensor.flic_80e4da779fc7_connectivity
```

See [Entities](https://ha-flichub-module.blunan.com/entities/) for states, attributes, icons, and UI renaming limitations.

## 📖 Documentation

| Page | What's in it |
| :--- | :--- |
| 📦 [Installation](https://ha-flichub-module.blunan.com/installation/) | Creating the module in the Flic Hub IDE, checking that it works, and updating it |
| ⚙️ [Configuration](https://ha-flichub-module.blunan.com/configuration/) | Every option in `config.js`, with its default and when to change it |
| 🔒 [HTTPS and certificates](https://ha-flichub-module.blunan.com/https/) | Plain HTTP, trusted certificates, and self-signed or private-CA setups |
| 🔋 [Entities](https://ha-flichub-module.blunan.com/entities/) | The three entities per button: states, attributes, icons, and naming |
| 🤖 [Automations and dashboards](https://ha-flichub-module.blunan.com/examples/) | `flic_click` automations, the blueprint, testing, and a dashboard card |
| 🧠 [How the module behaves](https://ha-flichub-module.blunan.com/behavior/) | Phantom-click filtering, regular updates, reconnects, and restarts |
| 🩺 [Troubleshooting](https://ha-flichub-module.blunan.com/troubleshooting/) | Reading the console, failed requests, ignored clicks, and reporting issues |
| 🛠️ [Development](https://ha-flichub-module.blunan.com/development/) | Dev container, code style, how it works, tests, CI, documentation, and releases |

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! The [development guide](https://ha-flichub-module.blunan.com/development/) covers the dev container, code style, CI, and releases; [How it works](https://ha-flichub-module.blunan.com/architecture/) explains the code, and the [testing guide](https://ha-flichub-module.blunan.com/testing/) covers running and writing tests.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
