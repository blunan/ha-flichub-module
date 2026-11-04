# Configuration

All settings live in `config.js`, which you edit in the Flic Hub IDE. This is the file as shipped:

```js title="config.js"
--8<-- "flic_hub_module/config.js"
```

Values are plain JavaScript: numbers as they are, text between quotes, and `true` or `false` for on/off settings. After changing a value, stop and start the module so it picks up the change.

| Option | Type | Default | What it does |
|---|---|---|---|
| [`MIN_EVENTS_OFFSET`](#min-events-offset) | Integer (ms) | `600` | Minimum time between two click events |
| [`SYNC_TIME`](#sync-time) | Integer (ms) | `60000` (1 minute) | How often battery and connectivity are sent again |
| [`WARNING_BATTERY_LEVEL`](#warning-battery-level) | Integer (%) | `10` | Battery level at or below which the icon shows a warning |
| [`LOG_LEVEL`](#log-level) | Constant | `C.LOG_LEVEL_WARNING` | How much the module writes to the IDE console |
| [`SERVER_HOST`](#server-host) | String | Placeholder | The Home Assistant URL |
| [`SERVER_AUTH_TOKEN`](#server-auth-token) | String | Placeholder | The Long-Lived Access Token |
| [`USE_CUSTOM_CERTIFICATE`](#use-custom-certificate) | Boolean | `false` | Trust only the certificates in `CUSTOM_CERTIFICATES` |
| [`VERIFY_CERTIFICATE`](#verify-certificate) | Boolean | `false` | Also check that the certificate matches the address in `SERVER_HOST` |
| [`CUSTOM_CERTIFICATES`](#custom-certificates) | String | Placeholder | The certificates to trust, in PEM format |

## Home Assistant connection

### `SERVER_HOST` { #server-host }

The URL where Home Assistant is running, as the hub sees it, without a trailing `/`. For example, `https://192.168.1.20:8123` or `http://192.168.1.20:8123`.

- Use an address the hub can reach on your network. `localhost` and `127.0.0.1` point at the hub itself, not at Home Assistant.
- Include the port. Home Assistant listens on `8123` unless you changed it or serve it through a reverse proxy.
- Don't add a path: the module adds `/api/…` itself.

Both `http://` and `https://` work. Which certificate settings you need depends on how Home Assistant is served; see [HTTPS and certificates](https.md).

### `SERVER_AUTH_TOKEN` { #server-auth-token }

A [Long-Lived Access Token](installation.md#before-you-start) created from your Home Assistant profile, pasted between the quotes. It must belong to an administrator, since Home Assistant only lets administrators set states and fire events through the API.

The module sends the token with every request and never writes it to the console. Anyone who has it can act as that user in Home Assistant, so keep `config.js` private, and revoke the token from your profile if it leaks.

## Click filtering

### `MIN_EVENTS_OFFSET` { #min-events-offset }

Minimum time, in milliseconds, between two click events of the same button. Default: `600`.

- A click event that arrives less than this long after the button's previous one is ignored.
- A press that starts less than this long after the last hold activity counts as part of that hold, and its clicks are ignored.

Raise it if phantom clicks still reach your automations; lower it gradually if deliberate quick clicks get dropped. [How the module behaves](behavior.md#one-event-per-press) explains the rules in detail.

## Updates

### `SYNC_TIME` { #sync-time }

How often, in milliseconds, the module sends the battery and connectivity of every button to Home Assistant again, even when nothing changed. Default: `60000`, written as `1 * 60 * 1000` (one minute).

Each update takes two requests per button. A shorter interval brings the sensors back sooner after Home Assistant restarts; a longer one means less traffic. See [Regular updates](behavior.md#regular-updates).

### `WARNING_BATTERY_LEVEL` { #warning-battery-level }

Battery percentage at or below which the battery sensor shows a warning icon (`mdi:battery-alert`). Default: `10`.

The warning applies from 5% up to this level, because below 5% the sensor always shows the empty-battery icon. Setting it lower than 5 turns the warning icon off. It only changes the icon; the sensor's state is always the level itself. See the [icon table](entities.md#battery).

## Logging

### `LOG_LEVEL` { #log-level }

How much the module writes to the **Console** tab of the Flic Hub IDE. Each level includes everything from the levels above it:

| Value | What gets written |
|---|---|
| `C.LOG_LEVEL_NONE` | Nothing |
| `C.LOG_LEVEL_ERROR` | Requests to Home Assistant that failed, with the reason |
| `C.LOG_LEVEL_WARNING` | Ignored clicks with the reason, and button disconnections |
| `C.LOG_LEVEL_INFO` | Every press and release, every verified connection, and every click sent |
| `C.LOG_LEVEL_DEBUG` | Every request to Home Assistant and its response |

Use `C.LOG_LEVEL_WARNING`, the default, while setting up and tweaking the configuration. Once everything works, switch to `C.LOG_LEVEL_ERROR` for long-term use so only real problems are logged. `C.LOG_LEVEL_INFO` and `C.LOG_LEVEL_DEBUG` add detail for [troubleshooting](troubleshooting.md#logs).

## Certificates

These three options matter only when `SERVER_HOST` starts with `https://`. [HTTPS and certificates](https.md) walks through each setup.

### `USE_CUSTOM_CERTIFICATE` { #use-custom-certificate }

When `true`, the hub trusts only the certificates in `CUSTOM_CERTIFICATES` instead of its built-in list of certificate authorities. Turn it on for self-signed certificates or certificates from your own certificate authority. Default: `false`.

### `VERIFY_CERTIFICATE` { #verify-certificate }

When a custom certificate is used, whether to also check that the address in `SERVER_HOST` matches one in the server's certificate (its Subject Alternative Name). The certificate itself is always checked against `CUSTOM_CERTIFICATES`; this setting only adds the address check. Default: `false`.

Turn it on if your certificate includes your Home Assistant address, and always if `CUSTOM_CERTIFICATES` holds a CA certificate rather than the server's own.

### `CUSTOM_CERTIFICATES` { #custom-certificates }

From the [Flic Hub documentation](https://hubsdk.flic.io/static/documentation/#43_makerequest): one or more certificates to trust, in PEM format. They can be end-entity certificates or CA certificates; to trust several, concatenate them. Extraneous whitespace is allowed.

A PEM certificate spans several lines, so paste it between backticks rather than quotes. See [Paste it into config.js](https.md#paste-the-certificate).
