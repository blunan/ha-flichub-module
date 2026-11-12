# Configuration

All settings live in `config.js`, which you edit in the Flic Hub IDE. This is the file as shipped:

```js title="config.js"
--8<-- "flic_hub_module/config.js"
```

Values are standard JavaScript: unquoted numbers, quoted strings, and boolean `true`/`false`. Restart the module after modifying configuration.

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

The reachable Home Assistant URL without a trailing slash (e.g. `https://192.168.1.20:8123` or `http://192.168.1.20:8123`).

- Use an address the hub can reach on your network. `localhost` and `127.0.0.1` point at the hub itself, not at Home Assistant.
- Include the port. Home Assistant listens on `8123` unless you changed it or serve it through a reverse proxy.
- Don't add a path: the module adds `/api/…` itself.

Both `http://` and `https://` work. Which certificate settings you need depends on how Home Assistant is served; see [HTTPS and certificates](https.md).

### `SERVER_AUTH_TOKEN` { #server-auth-token }

A [Long-Lived Access Token](installation.md#before-you-start) from an administrator account, pasted between quotes. Administrator permissions are required to set entity states and fire events via the API.

The token is sent in request headers and is never logged to the console. Keep `config.js` secure and revoke the token if exposed.

## Click filtering

### `MIN_EVENTS_OFFSET` { #min-events-offset }

Minimum time, in milliseconds, between two click events of the same button (default: `600`).

This setting debounces rapid duplicate or phantom clicks (such as spurious single clicks emitted after a hold or double click):

- Clicks arriving faster than this offset after the previous accepted event are ignored.
- Presses starting within this offset after hold activity are treated as part of the hold, ignoring subsequent clicks.

**Tuning:**

- Raise it (e.g. to `800`) if phantom clicks still reach your automations.
- Lower it gradually if deliberate quick clicks get dropped.

See [How the module behaves](behavior.md#one-event-per-press) for the full gesture state machine.

## Updates

### `SYNC_TIME` { #sync-time }

How often, in milliseconds, the module re-sends the battery and connectivity status of every button to Home Assistant (default: `60000`, written as `1 * 60 * 1000` for 1 minute).

Each sync cycle sends two requests per button. A shorter interval restores battery and connectivity sensors sooner after Home Assistant restarts; a longer interval reduces background network requests. See [Regular updates](behavior.md#regular-updates).

### `WARNING_BATTERY_LEVEL` { #warning-battery-level }

Battery percentage at or below which the battery sensor displays a warning icon (`mdi:battery-alert`). Default: `10`.

The warning icon applies from 5% up to this threshold (levels below 5% always show `mdi:battery-outline`). Setting it below 5 disables the warning icon. This affects only the icon; the numeric state reports the actual battery percentage. See [battery icons](entities.md#battery).

## Logging

### `LOG_LEVEL` { #log-level }

Controls logging verbosity in the **Console** tab of the Flic Hub IDE. Each level includes all output from levels above it:

| Value | What gets written |
|---|---|
| `C.LOG_LEVEL_NONE` | Nothing |
| `C.LOG_LEVEL_ERROR` | Failed requests to Home Assistant with reasons |
| `C.LOG_LEVEL_WARNING` | Ignored clicks with reasons, and button disconnections |
| `C.LOG_LEVEL_INFO` | Every button down/up, verified connection, and click event sent |
| `C.LOG_LEVEL_DEBUG` | Full JSON request payloads and HTTP responses |

Use `C.LOG_LEVEL_WARNING` (default) during initial setup. Once operational, switch to `C.LOG_LEVEL_ERROR` for minimal logging. Use `INFO` or `DEBUG` when diagnosing issues (see [Troubleshooting](troubleshooting.md#logs)).

## Certificates

These options configure HTTPS security when `SERVER_HOST` uses `https://`. For step-by-step guides and certificate export commands, see [HTTPS and certificates](https.md).

### `USE_CUSTOM_CERTIFICATE` { #use-custom-certificate }

When `true`, the hub trusts only the certificates specified in `CUSTOM_CERTIFICATES` rather than its built-in list of certificate authorities (default: `false`). Enable this for self-signed certificates or private CA setups.

### `VERIFY_CERTIFICATE` { #verify-certificate }

When using custom certificates, checks that the address in `SERVER_HOST` matches a Subject Alternative Name (SAN) in the server's certificate (default: `false`).

Enable this if your certificate includes your Home Assistant hostname/IP, and always enable it when `CUSTOM_CERTIFICATES` holds a CA certificate.

### `CUSTOM_CERTIFICATES` { #custom-certificates }

One or more PEM-formatted certificates to trust (server or CA certificate). Multiple certificates can be concatenated. Extraneous whitespace is ignored.

Because PEM certificates span multiple lines, paste them between backticks (`` `...` ``) in `config.js` rather than single or double quotes. See [Paste it into config.js](https.md#paste-the-certificate).
