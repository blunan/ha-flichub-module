# HTTPS and certificates

Configuration depends on your Home Assistant network and TLS setup:

| Home Assistant is served over | `SERVER_HOST` | `USE_CUSTOM_CERTIFICATE` | `VERIFY_CERTIFICATE` | `CUSTOM_CERTIFICATES` |
|---|---|---|---|---|
| [Plain HTTP](#plain-http) | `http://…` | `false` | Not used | Not used |
| [HTTPS with a publicly trusted certificate](#publicly-trusted) | `https://…` | `false` | Not used | Not used |
| [HTTPS with a self-signed certificate](#self-signed) | `https://…` | `true` | Optional | The server's certificate |
| [HTTPS with a certificate from your own CA](#own-ca) | `https://…` | `true` | `true` | The CA certificate |

With `USE_CUSTOM_CERTIFICATE` on, the hub trusts only the certificates in `CUSTOM_CERTIFICATES`, instead of its built-in list of certificate authorities:

| `USE_CUSTOM_CERTIFICATE` | `VERIFY_CERTIFICATE` | The hub accepts Home Assistant's certificate when |
|---|---|---|
| `false` | Not used | It passes the hub's standard checks against its built-in list of authorities |
| `true` | `false` | It is, or was signed by, a certificate in `CUSTOM_CERTIFICATES` |
| `true` | `true` | As above, and the address in `SERVER_HOST` appears in its Subject Alternative Name |

## Plain HTTP { #plain-http }

Set `SERVER_HOST` to the `http://` address and set `USE_CUSTOM_CERTIFICATE` to `false`. Traffic is unencrypted, meaning the access token is sent in plaintext. Use this only on trusted local networks.

## Publicly trusted certificate { #publicly-trusted }

When Home Assistant uses a public CA (e.g. Let's Encrypt), the hub validates it automatically. Set `SERVER_HOST` to the HTTPS domain name (not an IP address) and leave `USE_CUSTOM_CERTIFICATE` as `false`.

## Self-signed certificate { #self-signed }

1. Set `USE_CUSTOM_CERTIFICATE` to `true`.
2. [Get the server's certificate](#get-the-certificate) in PEM format and [paste it](#paste-the-certificate) into `CUSTOM_CERTIFICATES`.
3. `VERIFY_CERTIFICATE` is optional here since the hub trusts only this specific certificate. Enable it if the certificate's Subject Alternative Name matches `SERVER_HOST`.

When you renew the certificate, paste the new one into `CUSTOM_CERTIFICATES` as well.

## Certificate from your own CA { #own-ca }

1. Set `USE_CUSTOM_CERTIFICATE` to `true`.
2. Paste your CA's certificate, not the server's, into `CUSTOM_CERTIFICATES`.
3. Set `VERIFY_CERTIFICATE` to `true`.

!!! warning "Always verify with a CA certificate"
    Without `VERIFY_CERTIFICATE`, the hub accepts any certificate signed by this CA for any host. Verification ensures the request reaches Home Assistant.

The server's certificate must list the address in `SERVER_HOST` in its Subject Alternative Name: the domain name, or the IP address if you connect by IP.

## Get the certificate in PEM format { #get-the-certificate }

A PEM certificate is text that looks like this:

```text
-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUGu...
...
-----END CERTIFICATE-----
```

=== "From Home Assistant's files"

    Home Assistant reads its certificate from the file set in `ssl_certificate` under `http:` in `configuration.yaml`. Open that file, for example `/ssl/fullchain.pem`, and copy the certificate from it.

=== "From the network"

    On a computer that can reach Home Assistant, with OpenSSL installed, ask the server for its certificate:

    ```sh
    openssl s_client -connect 192.168.1.20:8123 </dev/null 2>/dev/null | openssl x509
    ```

    It prints the server's certificate in PEM format. To check which addresses it covers, save it to a file and run:

    ```sh
    openssl x509 -in server.pem -noout -ext subjectAltName
    ```

For a [certificate from your own CA](#own-ca), export the CA certificate from wherever you keep your CA; the server usually doesn't send it.

## Paste it into `config.js` { #paste-the-certificate }

A PEM certificate spans several lines, which a string between quotes can't hold. Paste it between backticks instead, keeping its lines as they are:

```js
exports.CUSTOM_CERTIFICATES = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUGu...
...
-----END CERTIFICATE-----`;
```

To trust several certificates, paste them one after another inside the same backticks.

## When the connection fails { #certificate-errors }

If every request fails and the console shows a certificate or handshake error, check that:

- `SERVER_HOST` starts with `https://` and uses the address that appears in the certificate.
- `USE_CUSTOM_CERTIFICATE` is `true` for a self-signed or private-CA certificate.
- `CUSTOM_CERTIFICATES` holds the right certificate: the server's own for self-signed, the CA's for a private CA. Make sure it's complete and still valid.
- With `VERIFY_CERTIFICATE` on, the certificate's Subject Alternative Name includes the address in `SERVER_HOST`.

If the module fails to start after editing `config.js`, verify certificate string syntax (multi-line PEM certificates require backticks, not quotes). See [Troubleshooting](troubleshooting.md#failed-requests) for request error details.
