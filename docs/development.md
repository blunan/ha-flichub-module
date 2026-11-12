# Contributing & releases

Guidelines for setting up a development environment, checking your changes, working on the documentation, and releasing new versions.

## Development setup

### Dev container (recommended)

The dev container provides Node.js 26 with all dependencies pre-installed. Requires [Docker](https://www.docker.com/) and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.

1. Open the repository in VS Code.
2. Select **Reopen in Container** when prompted.

### Docker

Without the dev container, run tests and linting in the devcontainer image:

```sh
docker run --rm -v "$PWD":/work -w /work --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/devcontainers/javascript-node:26-trixie bash -c "npm test && npm run test:coverage && npm run lint"
```

For targeted test arguments and watch mode, see [Testing with Docker](testing.md#with-docker).

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
├── .devcontainer/                 Dev container configuration
├── .github/workflows/             CI: tests, the documentation site, and releases
├── docs/                          Documentation site source and its locked build tool
├── flic_hub_module/               The module users paste into the Flic Hub IDE
├── test/                          Jest tests and the Flic Hub SDK mocks
├── .release-please-manifest.json  The last released version, kept by release-please
├── AGENTS.md                      Instructions for AI coding agents
├── CHANGELOG.md                   What changed in each version, kept by release-please
├── eslint.config.js               Lint rules, including the hub's runtime globals
├── flic-button.yaml               Home Assistant automation blueprint
├── mkdocs.yml                     Documentation site configuration
├── package.json                   Scripts, development dependencies, and Jest configuration
├── release-please-config.json     Release settings: changelog sections and version files
└── renovate.json                  Automated dependency update policy
```

## Code style

- **Hub runtime, not Node.js:** `flic_hub_module/` executes in QuickJS on the Flic Hub. Use only supported language features and provided globals (`console`, timers). Node.js and browser APIs are unavailable. See [Architectural principles](architecture.md#principles).
- **CommonJS:** `require` and `exports`, as in the existing files.
- **Strict equality:** `===` and `!==`, except `== null` to check for both `null` and `undefined`.
- **No comments in `flic_hub_module/`:** users paste these files into the Flic Hub IDE, and many aren't programmers. Explain changes in the docs instead.
- **Formatting:** tabs, LF line endings, and a final newline, as `.editorconfig` sets; YAML uses two spaces.
- **Home Assistant contract:** entity IDs, the `flic_click` event, its data, and its values are relied on by users' automations. Change them only on purpose, together with the README, these docs, the blueprint, and the contract tests. See [Home Assistant requests](architecture.md#home-assistant-requests).
- **Credentials:** never log the access token.
- **Commits:** use [Conventional Commits](https://www.conventionalcommits.org/), such as `fix: …`, `docs: …`, or `chore(deps): …`. A pull request's title decides the next version; see the [release process](#releases).

## Testing

The Jest suite mocks the hub's `buttons` and `http` modules, so the module's files run unchanged in Node.js. Add or update tests for every behavior change and keep coverage at 100%. [Testing](testing.md) covers running the suite, the mocks, and the conventions for writing tests.

## Working on documentation { #documentation }

Documentation is built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) from `docs/` and `mkdocs.yml`, published at [ha-flichub-module.blunan.com](https://ha-flichub-module.blunan.com/). The README covers quick setup and usage for end users; the docs site provides comprehensive reference.

To preview it locally:

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r docs/requirements.txt
.venv/bin/mkdocs serve
```

Without a local Python, preview it in a throwaway container on the same Python version as CI (`python-version` in `.github/workflows/docs.yml`):

```sh
docker run --rm -it -p 127.0.0.1:8000:8000 -v "$PWD:/work:ro" -w /work python:3.14-slim-trixie \
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
| **release** (`release.yml`) | Pushes to `main` | Runs release-please, which keeps the release pull request up to date and, once it's merged, tags the version and publishes the GitHub release |

## Dependency updates

[Renovate](https://docs.renovatebot.com/) manages dependency updates according to `renovate.json`:

- It checks weekly, on Mondays.
- Minor and patch updates are grouped into a single pull request.
- GitHub Actions are pinned to immutable commit digests and grouped in their own pull request.
- Only releases at least 14 days old are proposed.
- Every dependency pull request needs manual review and passing CI before merging.
- Updates are titled `chore(deps):` and release nothing: the module has no dependencies, so they only change development tooling.
- The documentation's locked dependencies are [updated by hand](#docs-dependencies).

## Release process { #releases }

Versions come from `.github/workflows/release.yml`, which runs [release-please](https://github.com/googleapis/release-please) on every push to `main`. Pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/), and since `main` takes squash merges only, each title becomes the commit release-please reads:

- `feat:` (new or changed behavior) proposes a minor version, and `fix:`, `perf:`, or `revert:` a patch. `feat!:` or a `BREAKING CHANGE:` footer proposes a major.
- Other types (`docs:`, `ci:`, `chore:`, `refactor:`, `test:`, `build:`, `style:`) propose none.

release-please keeps a release pull request open with the next version and its `CHANGELOG.md` entry. That pull request also bumps the version in `flic_hub_module/module.json`, `package.json`, and `package-lock.json`, so don't change them by hand. When a version should go out:

1. Check the module on real hardware: paste it into the Flic Hub IDE, press your buttons, and watch the console and the button's entities in Home Assistant (`binary_sensor.flic_<address>`, `sensor.flic_<address>_battery`, and `binary_sensor.flic_<address>_connectivity`).
2. Merge the release pull request. That tags `vX.Y.Z` and publishes the [GitHub release](https://github.com/blunan/ha-flichub-module/releases). The README's version badge follows the latest release.

The workflow uses a GitHub App token (the `RELEASE_APP_CLIENT_ID` variable and the `RELEASE_APP_PRIVATE_KEY` secret), not `GITHUB_TOKEN`, because a pull request opened with `GITHUB_TOKEN` runs no workflows, so the required checks would never report on it.
