# Troubleshooting

## Read the console { #logs }

The module writes to the **Console** tab at the bottom of the Flic Hub IDE. Each line has the time (in milliseconds since 1 January 1970, UTC), the level, and the message:

```text
1762200000000 : WARNING : …
```

How much it writes depends on [`LOG_LEVEL`](configuration.md#log-level):

- `C.LOG_LEVEL_WARNING`, the default, shows failed requests, ignored clicks, and disconnections. Use it while setting up.
- `C.LOG_LEVEL_INFO` adds every press, release, and click sent; `C.LOG_LEVEL_DEBUG` adds every request and response. Use them to follow what happens.
- `C.LOG_LEVEL_ERROR` shows only failed requests. Use it once everything works.

## Nothing shows up in Home Assistant { #nothing-in-home-assistant }

Check, in this order:

1. **The module is running.** In the IDE, the button next to the module's name shows a stop square while it runs.
2. **The console shows no errors.** With `LOG_LEVEL` at `C.LOG_LEVEL_ERROR` or higher, every failed request is logged; see [Failed requests](#failed-requests).
3. **`SERVER_HOST` is right:** `http://` or `https://`, an address the hub can reach (not `localhost`), the port (usually `8123`), and no trailing `/` or path. See [`SERVER_HOST`](configuration.md#server-host).
4. **The token is right:** pasted in full between the quotes, not revoked, and from an administrator account.
5. **The API integration is loaded.** It's part of `default_config:`; if you removed that line, add `api:` to `configuration.yaml`.

Then go to **Developer tools → States** in Home Assistant and search for `flic_`.

## Failed requests { #failed-requests }

When a request fails, the module logs two lines: the request it tried to send (method, URL, and body, never the token) and what went wrong.

```text
1762200000000 : ERROR : Request: {"method":"POST","url":"https://192.168.1.20:8123/api/states/binary_sensor.flic_80e4da779fc7","content":"…"}
1762200000000 : ERROR : Request Error (401): {"statusCode":401,"statusMessage":"Unauthorized",…}
```

**Without a status code** (`Request Error: …`), the hub couldn't complete the request at all: Home Assistant is down or unreachable from the hub, `SERVER_HOST` points to the wrong address or port, or the HTTPS connection failed. For certificate and handshake errors, see [When the connection fails](https.md#certificate-errors).

**With a status code** (`Request Error (401): …`), Home Assistant, or a proxy in front of it, answered with an error:

| Status | Likely cause |
|---|---|
| `401 Unauthorized` | The token is wrong, incomplete, or revoked, or its user isn't an administrator |
| `404 Not Found` | The URL is wrong: check that `SERVER_HOST` has no path, and that the API integration is loaded |
| `502`, `503`, `504` | A reverse proxy in front of Home Assistant can't reach it |
| Any other | [Report it](#report-a-problem) with the console output |

A `404` when [removing a button](behavior.md#removing-a-button) is expected and isn't logged as an error: the entity was already gone.

## A click didn't trigger my automation { #ignored-clicks }

First, find out whether the event reached Home Assistant: in **Developer tools → Events**, listen to `flic_click` and click the button.

**If no event arrives**, the module may have ignored the click on purpose. With `LOG_LEVEL` at `C.LOG_LEVEL_WARNING` or higher, the console says why:

| The console says the click was ignored because | What happened | What to do |
|---|---|---|
| The button *has not been pressed since it was initialized* | The module started, or the button reconnected, and no press has been seen since | Press the button again |
| There was *no new press* since the last event | A phantom click after a hold or a double click | Nothing: this is the filter working |
| It came *less than MIN_EVENTS_OFFSET* after the last event | Two clicks came too close together | Click more slowly, or lower [`MIN_EVENTS_OFFSET`](configuration.md#min-events-offset) |
| The press was *treated as part of the same hold* | A press started right after a hold | Release fully and pause before clicking, or lower `MIN_EVENTS_OFFSET` |

[How the module behaves](behavior.md#one-event-per-press) explains these rules. If the console shows nothing at all for the press, check the button's connectivity entity and the [connection](#connectivity-off).

**If the event arrives but the automation doesn't run**, check that:

- `button_name` uses the `flic_<address>` form from the event (e.g. `flic_80e4da779fc7`), not the display name from the Flic app.
- `click_type` is exactly `single`, `double`, or `hold`.
- The automation is not still running: automations created from the [blueprint](examples.md#blueprint) execute in `single` mode and drop clicks while an action is in progress.

The automation's trace, under **Settings → Automations & scenes**, shows whether it triggered and where it stopped.

## Phantom clicks still trigger automations { #phantom-clicks }

Raise [`MIN_EVENTS_OFFSET`](configuration.md#min-events-offset) step by step, for example from `600` to `800`. Also check that only one automation reacts to that button and click type.

## The battery shows `unknown` { #battery-unknown }

The hub doesn't know the battery level yet. The module sends `unknown` until the hub reports a level, and the real value appears with a later [regular update](behavior.md#regular-updates).

## Connectivity is `off` but the button works { #connectivity-off }

The hub reports a disconnection when the signal is too weak, when it loses sync with the button, or when the button goes to sleep, so connectivity can turn `off` now and then. A press made while the button is disconnected still arrives if the button reconnects within 15 seconds. If disconnections are frequent and presses get lost, move the hub closer to the button.

## The entities disappeared after Home Assistant restarted { #missing-after-restart }

That's expected: Home Assistant doesn't keep them across its own restarts. Battery and connectivity come back with the next [regular update](behavior.md#regular-updates), and the button state with the next press. To bring them back sooner, lower [`SYNC_TIME`](configuration.md#sync-time).

## I can't rename an entity or assign it to an area { #no-unique-id }

The entities are set through the REST API, so they have no unique ID. Rename the button in the Flic app instead, or set a name in your dashboard card. See [No unique ID](entities.md#no-unique-id).

## Reporting issues { #report-a-problem }

[Open an issue](https://github.com/blunan/ha-flichub-module/issues) with:

- The module version, from `module.json`, and the hub's firmware version, shown at the top left of the IDE.
- Your Home Assistant version.
- What you did, what you expected, and what happened.
- The console output with `LOG_LEVEL` set to `C.LOG_LEVEL_DEBUG`.

The module never writes your access token to the console, but the output does include your Home Assistant address and your buttons' names and Bluetooth addresses. Redact them if you prefer.
