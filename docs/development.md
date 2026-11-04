# Contributing & releases

Guidelines for setting up a development environment, checking your changes, working on the documentation, and releasing new versions.

## Development setup

### Dev container (recommended)

The dev container provides Node.js 26 and installs the development dependencies when it's created. You need [Docker](https://www.docker.com/) and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.

1. Open the repository in VS Code.
2. Select **Reopen in Container** when prompted.

### Docker

Without the dev container, run the same commands in the dev container's image; see [With Docker](testing.md#with-docker).

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Runs the Jest suite |
| `npm run test:coverage` | Runs the suite with coverage, and fails if coverage of `flic_hub_module/` drops below 100% |
| `npm run lint` | Runs ESLint, which also flags Node.js-only globals (`process`, `Buffer`, …) in `flic_hub_module/` |

Run both `npm run lint` and `npm run test:coverage` before opening a pull request; CI runs them too.

## Project structure

```text
.
├── .devcontainer/        Dev container configuration
├── .github/workflows/    CI: tests, and the documentation site
├── docs/                 Documentation site source and its locked build tool
├── flic_hub_module/      The module users paste into the Flic Hub IDE
├── test/                 Jest tests and the Flic Hub SDK mocks
├── AGENTS.md             Instructions for AI coding agents
├── eslint.config.js      Lint rules, including the hub's runtime globals
├── flic-button.yaml      Home Assistant automation blueprint
├── mkdocs.yml            Documentation site configuration
├── package.json          Scripts, development dependencies, and Jest configuration
└── renovate.json         Automated dependency update policy
```

## Code style

- **Hub runtime, not Node.js:** `flic_hub_module/` runs on the Flic Hub's QuickJS engine. Use only language features it supports and the globals it provides: `console` and the timer functions. Node.js globals and built-in modules, and browser APIs, aren't available. [How it works](architecture.md#principles) has the details.
- **CommonJS:** `require` and `exports`, as in the existing files.
- **Strict equality:** `===` and `!==`, except `== null` to check for both `null` and `undefined`.
- **No comments in `flic_hub_module/`:** users paste these files into the Flic Hub IDE, and many aren't programmers. Explain changes in the docs instead.
- **Formatting:** tabs, LF line endings, and a final newline, as `.editorconfig` sets; YAML uses two spaces.
- **Home Assistant contract:** entity IDs, the `flic_click` event, its data, and its values are relied on by users' automations. Change them only on purpose, together with the README, these docs, the blueprint, and the contract tests. See [Home Assistant requests](architecture.md#home-assistant-requests).
- **Credentials:** never log the access token.
- **Commits:** use [Conventional Commits](https://www.conventionalcommits.org/), such as `fix: …`, `docs: …`, or `chore(deps): …`.

## Testing

The Jest suite mocks the hub's `buttons` and `http` modules, so the module's files run unchanged in Node.js. Add or update tests for every behavior change and keep coverage at 100%. [Testing](testing.md) covers running the suite, the mocks, and the conventions for writing tests.

## Working on documentation { #documentation }

The documentation is built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) from `docs/` and `mkdocs.yml`, and published at [ha-flichub-module.blunan.com](https://ha-flichub-module.blunan.com/). The README stays the place for setup, configuration, and usage, written for non-programmers; this site covers everything in depth.

To preview it locally:

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r docs/requirements.txt
.venv/bin/mkdocs serve
```

Without a local Python, preview it in a throwaway container on the same Python version as CI (`python-version` in `.github/workflows/docs.yml`):

```sh
docker run --rm -it -p 127.0.0.1:8000:8000 -v "$PWD:/work:ro" -w /work python:3.15-slim-trixie \
  sh -c 'pip install -q --root-user-action=ignore --require-hashes -r docs/requirements.txt && mkdocs serve -a 0.0.0.0:8000'
```

Browse to `http://127.0.0.1:8000`. `mkdocs build --strict` verifies links and anchors, matching the CI check. In the container, add `--site-dir /tmp/site`, since the checkout is mounted read-only.

### Writing the docs

- **Links to repository files** outside `docs/` use absolute GitHub URLs: the strict build rejects relative links that leave `docs/`.
- **Real files are embedded, not copied:** `config.js` and the blueprint appear through [snippets](https://facelessuser.github.io/pymdown-extensions/extensions/snippets/) (`--8<-- "path"`). When you embed another file, add it to the `paths` in `docs.yml` so changes to it redeploy the site.
- **The README links to the site** with absolute URLs. Give headings it links to an explicit `{ #id }`, so rewording a heading doesn't break the link.

### Updating documentation dependencies { #docs-dependencies }

The build tool is pinned with hashes in `docs/requirements.txt`, which is generated from `docs/requirements.in`. To upgrade, change the version in `docs/requirements.in` and run the command at the top of that file, which only accepts releases at least 14 days old. Renovate doesn't update these files.

The lock is resolved on the Python version that `.github/workflows/docs.yml` installs; change both together.

??? example "`docs/requirements.in`"

    ```text
    --8<-- "docs/requirements.in"
    ```

## CI workflows

| Workflow | Trigger | Description |
|---|---|---|
| **test** (`test.yml`) | Pull requests, pushes to `main`, manual | Runs `npm run lint` and `npm run test:coverage` in a Node.js 26 container |
| **docs** (`docs.yml`) | Pull requests, pushes to `main` that change the docs, manual | Runs `mkdocs build --strict`; pushes to `main` also deploy the site to GitHub Pages |

## Dependency updates

[Renovate](https://docs.renovatebot.com/) manages dependency updates according to `renovate.json`:

- It checks weekly, on Mondays.
- Minor and patch updates are grouped into a single pull request.
- GitHub Actions are pinned to immutable commit digests and grouped in their own pull request.
- Only releases at least 14 days old are proposed.
- Every dependency pull request needs manual review and passing CI before merging.
- The documentation's locked dependencies are [updated by hand](#docs-dependencies).

## Release process { #releases }

1. Bump the `version` in both `flic_hub_module/module.json` and `package.json` in a pull request. The README's version badge follows the latest GitHub release.
2. Before releasing, check the module on real hardware: paste it into the Flic Hub IDE, press your buttons, and watch the console and the button's entities in Home Assistant (`binary_sensor.flic_<address>`, `sensor.flic_<address>_battery`, and `binary_sensor.flic_<address>_connectivity`).
3. After merging, publish a GitHub release with a new `vX.Y.Z` tag on `main`, titled `vX.Y.Z — <summary>` and listing the changes.
