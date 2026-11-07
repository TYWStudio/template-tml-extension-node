<p align="right">
  <b>English</b> · <a href="README-CN.md">简体中文</a>
</p>

# TML Extension Template · Node.js

A **Node.js** extension template for the **TYW Launcher (TML)** extension API v1.
Extensions run outside the launcher process and talk to it over **NDJSON on stdin/stdout**
(one JSON object per line), calling only allow-listed methods.

> This repository is a GitHub **template repository** — click "Use this template" to
> scaffold your own extension project.
>
> Part of the **TML** ecosystem · launcher repository: <https://github.com/TYWStudio/TML>

## Layout

```
manifest.json   Extension manifest (id / name / entry / permissions / subscribed events …)
main.js         Extension entry point (target of `entry`)
tml.js          Minimal host SDK: handshake, method calls, event handling
build.js        Packaging script: produces a .tmlext (zero dependencies)
package.json    Declares scripts and license only; no third-party runtime deps
LICENSE         CC BY-NC 4.0
```

## Protocol essentials

- When the host starts the extension it sends an `initialize` request first; the extension must reply `{"ready": true}` to complete the handshake.
- To call a host capability (e.g. `log`, `host.info`) the extension writes one line of JSON-RPC request to stdout, and the host replies with the result.
- The host broadcasts events (e.g. `launcher.started`, `game.launched`) to the extension as `event` lines.
- When the host sends `shutdown` the extension should exit cleanly.

Available capabilities (must be declared in the manifest's `permissions`):

| Method | Permission | Description |
| --- | --- | --- |
| `log` | `log` | Write to the launcher log |
| `toast` | `toast` | Show a toast in the bottom-left corner |
| `host.info` | `host.info` | Get host platform / version / language |
| `instances.list` | `instances.list` | List game instances (redacted) |
| `event.subscribe` | `events` | Subscribe to events (also declare them in `subscribe`) |
| `storage.get/set` | `storage` | Extension-private key-value storage |
| `settings.get/set` | `settings` | Read/write launcher settings (namespace `ext.<id>.*`) |

## Local preview

```bash
node main.js        # It will block waiting for the handshake — that's expected; the launcher must start it.
```

## Packaging & install

```bash
node build.js                 # produces com.tywstudio.example.node.tmlext
# or: npm run pack
```

Import the generated `.tmlext` via **Settings → Other → Extensions → Import** in the launcher,
review the requested permissions and enable it. The first enable asks you to confirm the permissions.

## Notes

- `platforms` in `manifest.json` must currently include `windows` (the Windows host is implemented; other platforms will follow).
- Extensions are disabled by default and can only access allow-listed capabilities; no capability for arbitrary file / network / credential access exists.
- Do not hard-code secrets; persist data via `storage` / `settings`.

## License

[CC BY-NC 4.0](./LICENSE) — Attribution-NonCommercial. You may study, modify and redistribute freely, but not for commercial use.
