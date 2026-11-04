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

> If you have any automations running with the **flicd add-on** from [pschmitt's addon](https://github.com/pschmitt/home-assistant-addons) they will continue to work after pairing the same Flic Button to the Flic Hub, as the events sent by the module keep the same [type and data](https://www.home-assistant.io/integrations/flic) (`button_name`, `button_address` and `click_type`; only `queued_time` is not sent).

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

First you need to create a module on your Flic Hub using their [Online IDE](https://hubsdk.flic.io) and copy-paste the files under `flic_hub_module` folder:
* `config.js`
* `constants.js`
* `ha.js`
* `logger.js`
* `main.js`
* `module.json`
* `utils.js`

It should look something like this:

![Flic Hub Online IDE](./docs/assets/FlicHubOnlineIDE.png?raw=true "Flic Hub Online IDE")

Then edit the `config.js` file so the Flic Hub can connect to your Home Assistant REST API.

| Param                    | Value   | Description |
| :----------------------- | :-----: | :---------- |
| `MIN_EVENTS_OFFSET`      | Integer | Minimum time (in milliseconds) between two button events. Events arriving faster than this are ignored — see [How the module behaves](https://ha-flichub-module.blunan.com/behavior/#one-event-per-press). |
| `SYNC_TIME`              | Integer | How often (in milliseconds) the battery and connectivity status of all your buttons is re-sent to Home Assistant — see [Regular updates](https://ha-flichub-module.blunan.com/behavior/#regular-updates). |
| `WARNING_BATTERY_LEVEL`  | Integer | Battery percentage at or below which the battery sensor shows a warning icon — see [Battery](https://ha-flichub-module.blunan.com/entities/#battery). |
| `LOG_LEVEL`              | Constant | How much the module writes to the Flic Hub IDE console. Use `C.LOG_LEVEL_WARNING` while setting up and tweaking the config. Once everything works, switch to `C.LOG_LEVEL_ERROR` for long-term use so only real problems are logged. `C.LOG_LEVEL_INFO` and `C.LOG_LEVEL_DEBUG` add detail for troubleshooting; `C.LOG_LEVEL_NONE` silences everything. |
| `SERVER_HOST`            | String  | The URL where your Home Assistant instance is running, without a trailing `/`. Example: `https://192.168.XXX.YYY:8123`. |
| `SERVER_AUTH_TOKEN`      | String  | A **Long-Lived Access Token** obtained from [your profile](https://www.home-assistant.io/docs/authentication/#your-account-profile) `https://192.168.XXX.YYY:8123/profile`. |
| `USE_CUSTOM_CERTIFICATE` | Boolean | Enables the use of a custom certificate for HTTPS, ideal for self signed certificates. |
| `VERIFY_CERTIFICATE`     | Boolean | If a custom certificate is used, whether to also check that the address in `SERVER_HOST` matches the one in the server's certificate (its Subject Alternative Name). The certificate itself is always checked against `CUSTOM_CERTIFICATES`; this setting only adds the address check. Turn it on if your certificate includes your Home Assistant address, and always if `CUSTOM_CERTIFICATES` holds a CA certificate rather than the server's own. |
| `CUSTOM_CERTIFICATES`    | String  | (From [Flic Hub Documentation](https://hubsdk.flic.io/static/documentation/#43_makerequest)) One or more certificates to trust in PEM format. Can be both end entity certificates or CA certificates. If multiple certificates, concatenate them. Extraneous whitespace is allowed. |

> ⚠️ Be sure you have the **API** component enabled in your Home Assistant instance (enabled by default). In case you have any troubles see their [documentation](https://www.home-assistant.io/integrations/api) to know how to enable it.

Using HTTPS with a self-signed certificate or your own certificate authority? See [HTTPS and certificates](https://ha-flichub-module.blunan.com/https/). The [configuration guide](https://ha-flichub-module.blunan.com/configuration/) describes every option in detail, and the [installation guide](https://ha-flichub-module.blunan.com/installation/) also covers checking that it works and updating the module.

## 🤖 Run automations with your Flics

To run automations using `flic_click` events your scripts should look like this:

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

Where the possible values for **click_type** are: `single`, `double` and `hold`. Each event also carries `button_address`, the button's Bluetooth address (e.g. `80:e4:da:77:9f:c7`).

Each press fires at most one event: the module drops the phantom clicks some buttons report after a hold or a double click. After the module starts or a button reconnects, press the button once before clicks flow — see [How the module behaves](https://ha-flichub-module.blunan.com/behavior/).

Alternatively import and use the [blueprint](flic-button.yaml) (requires Home Assistant 2024.10 or newer):

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fblunan%2Fha-flichub-module%2Fblob%2Fmain%2Fflic-button.yaml)

More [automation examples](https://ha-flichub-module.blunan.com/examples/): every click type in one automation, acting while a button is held, and testing without pressing a button.

## 📇 Flic button card

It is possible to add a card to your dashboard to check **state**, **battery** and **connectivity** status for your flics:

![Flic Button Card](./docs/assets/FlicButtonCard.png?raw=true "Flic Button Card")

```yaml
type: entities
title: Flic gamer
entities:
  - entity: binary_sensor.flic_80e4da779fc7
  - entity: sensor.flic_80e4da779fc7_battery
  - entity: binary_sensor.flic_80e4da779fc7_connectivity
```

See [Entities](https://ha-flichub-module.blunan.com/entities/) for every state, attribute, and icon, and why the entities can't be renamed from the Home Assistant UI.

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
