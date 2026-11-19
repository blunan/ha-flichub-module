# For AI agents

## Project overview

This repository contains a Flic Hub module that forwards Flic Button events and state to the Home Assistant REST API. The deployable source lives in `flic_hub_module/` and runs inside the Flic Hub SDK's QuickJS runtime. The Node.js environment is for development, linting, and Jest tests only.

Keep the existing public behavior and Home Assistant contracts stable unless a change explicitly intends to alter them.

## Repository map

- `flic_hub_module/`: deployable Flic Hub module.
  - `main.js`: button lifecycle handlers, event filtering, initialization, and periodic synchronization.
  - `ha.js`: Home Assistant REST API requests and response handling.
  - `utils.js`: button naming, sensor icons, and per-button event state.
  - `constants.js`: click/state/logging constants and initial event state.
  - `config.js`: user-edited runtime configuration. Treat as deployment configuration, not a test fixture.
  - `logger.js`: log-level filtering and console formatting.
  - `module.json`: Flic Hub module metadata.
- `test/`: Jest tests and the Flic Hub SDK mocks.
- `docs/`: documentation site source (Material for MkDocs), published at <https://ha-flichub-module.blunan.com/>. `docs/requirements.in` and `docs/requirements.txt` lock its build tool.
- `mkdocs.yml`: documentation site configuration.
- `flic-button.yaml`: Home Assistant automation blueprint; its event contract must stay aligned with the module.
- `.github/workflows/`: CI workflows: `test.yml` (lint and coverage), `docs.yml` (docs build and GitHub Pages deploy), and `release.yml` (release-please).
- `release-please-config.json`, `.release-please-manifest.json`, `CHANGELOG.md`: release automation; see [Versions and releases](#versions-and-releases).
- `package.json`: development scripts and Jest configuration.
- `eslint.config.js`: lint rules, including runtime-global restrictions.
- `.devcontainer/`: supported development environment.

## Development environment

Use the first option that works. Agents follow the same order: on a host with Docker, run checks in a throwaway container instead of installing tools.

1. **Dev container (recommended):** needs Docker and VS Code with the Dev Containers extension (plus Remote - SSH for a remote host). It ships every tool the quality gates need.
2. **Throwaway container:** Docker without the dev container, such as another editor or an agent on the host. Run one-off checks with `docker run --rm` in the dev container's image. The checkout is mounted read-only and copied inside, so nothing on the host changes.
3. **Local toolchain:** only without Docker. Install the versions the dev container pins.

### Dev container

VS Code: **Reopen in Container**. It provides Node.js 26 and Python 3.14 (for the docs) and installs the development dependencies.

### Throwaway container

Lint and coverage tests in the dev container's image (`docs/testing.md` has targeted runs):

```sh
docker run --rm -v "$PWD:/src:ro" -w /work mcr.microsoft.com/devcontainers/javascript-node:26-trixie sh -c '
  tar -C /src --exclude=node_modules --exclude=.git -cf - . | tar -xf - &&
  npm ci && npm run lint && npm run test:coverage'
```

### Local toolchain

Node.js 26, then `npm ci`.

## Commands and quality gates

Run these commands from the repository root:

```sh
npm ci
npm test
npm run test:coverage
npm run lint
```

- `npm test` runs the Jest suite.
- `npm run test:coverage` runs Jest with coverage and enforces 100% statements, branches, functions, and lines for `flic_hub_module/**/*.js`.
- `npm run lint` runs ESLint across the repository.

CI runs lint and coverage tests on pushes and pull requests. Run both before considering a change complete. For documentation changes, also run `mkdocs build --strict` (see [Docs site](#docs-site)).

## Runtime constraints: Flic Hub QuickJS

Treat every file under `flic_hub_module/` as code that executes on the Flic Hub, not in Node.js.

- Use only JavaScript language features supported by the Flic Hub's QuickJS version and the APIs documented by the Flic Hub SDK.
- Do not introduce Node.js globals or built-in modules such as `process`, `Buffer`, `__dirname`, `fs`, `path`, or Node networking APIs.
- Do not assume browser APIs, `window`, or `document` exist.
- The module relies on host-provided APIs, including the existing Flic Hub modules (notably `buttons` and `http`) and the globals explicitly allowed in `eslint.config.js` (`console`, timer functions, and JavaScript built-ins).
- Preserve the existing CommonJS module style (`require` and `exports`).
- Keep platform-specific behavior behind the existing SDK interfaces. Tests should mock those interfaces rather than replacing production code with Node-specific abstractions.
- If an API or language feature's QuickJS compatibility is uncertain, verify it against the Flic Hub SDK/runtime documentation before using it.

The ESLint configuration intentionally flags Node-only globals in `flic_hub_module/**/*.js`. Do not weaken or bypass that restriction to make production code lint.

## Architecture and behavior

### Button lifecycle and state

`main.js` registers handlers with the Flic Hub `buttons` module and initializes buttons already known to the hub. Preserve the existing lifecycle responsibilities:

- Initialization creates the per-button event state and publishes the initial off, battery, and connectivity states to Home Assistant.
- A connection initializes the button again; readiness and disconnection update connectivity.
- Button down/up events maintain physical on/off state independently of whether a click event is accepted.
- Button deletion clears the in-memory state and removes all three corresponding Home Assistant entities.
- Battery and connectivity states are periodically re-published using `SYNC_TIME`.

Per-button event state in `utils.js` is keyed by the button's Bluetooth address (`bdaddr`). Avoid sharing mutable state between buttons. Return copies where the existing API returns snapshots, and preserve the frozen initial-state template.

### Click filtering

The module is designed to emit at most one useful `flic_click` event per physical press cycle and suppress phantom/duplicate events. Important behavior to preserve:

- Supported click types are `single`, `double`, and `hold`.
- A single- or double-click event is accepted only after a valid button-down/button-up cycle has armed the event.
- A hold is reported while the button is pressed; subsequent presses occurring shortly after a hold event are filtered using `MIN_EVENTS_OFFSET`.
- Events arriving too soon after the prior accepted event are ignored.
- After initialization or reconnection, click gestures without a fresh physical press are ignored.
- Ignoring a click must not prevent the physical button sensor from reflecting the actual pressed/released state.

When changing event handling, reason through event ordering and timestamps, including equal timestamps, reconnects, holds, double clicks, and release events. Keep tests aligned with the SDK's actual event sequence (documented in `docs/testing.md`).

### Home Assistant API contract

`ha.js` publishes state through Home Assistant's REST API and emits `flic_click` events. Treat these details as compatibility-sensitive:

- Event type: `flic_click`.
- Event data: `button_name`, `button_address`, and `click_type`.
- `click_type` values: `single`, `double`, and `hold`.
- Button state entity: `binary_sensor.flic_<address-without-colons>`.
- Battery entity: `sensor.flic_<address-without-colons>_battery`.
- Connectivity entity: `binary_sensor.flic_<address-without-colons>_connectivity`.
- Button and connectivity binary sensor states use `on` and `off`; unknown battery state is `unknown`.
- Button removal deletes all three entities.
- Requests use a bearer token and JSON content type.
- A `404` response to a DELETE is tolerated because the entity may already be absent.

Do not casually rename entities, change event keys, alter click values, or change payload semantics. If a compatibility change is intentional, update the README, the docs site (`docs/entities.md`, `docs/examples.md`, and `docs/architecture.md`), the blueprint where applicable, and contract tests in the same change.

### Configuration and secrets

`flic_hub_module/config.js` is edited by users when deploying the module.

- Do not put real Home Assistant URLs, access tokens, private keys, or personal certificates in committed files, tests, fixtures, or logs.
- Do not assert directly against the default values in `config.js`; mock the config in tests (see `docs/testing.md`).
- Keep configuration defaults and descriptions synchronized between `README.md` and `docs/configuration.md`.
- Preserve the distinction between trusting a custom certificate and validating the server hostname (`USE_CUSTOM_CERTIFICATE` and `VERIFY_CERTIFICATE`).
- Never log the bearer token. When modifying request diagnostics, retain the existing guarantee that credentials do not appear in log output.

## Testing

- Add or update tests for every behavior change.
- Maintain 100% statement, branch, function, and line coverage for all files under `flic_hub_module/`. Do not lower or remove coverage thresholds to make a change pass.
- Test externally observable Home Assistant behavior using literal contract values (`single`, `double`, `hold`, `on`, `off`, entity paths, request methods, and payload keys). Comparing only against production constants can allow accidental contract changes to pass unnoticed.
- Mock user-edited configuration at module scope and replace individual config properties per test as described in `docs/testing.md`. Restore mocks after each test.
- Give each test using `utils.js` a distinct `bdaddr` so module-level state does not leak between cases.
- `main.js` performs initialization, starts an interval, and registers event handlers as soon as it is required. Configure mocks and fake timers before requiring it, and require it only once per test module.
- Use fake timers for timestamp and synchronization behavior. Reset the fake clock in `beforeEach` to prevent order-dependent tests.
- Simulate SDK gestures in the documented order:
  - Single/double: `buttonDown`, then `buttonUp`, then the click event.
  - Hold: `buttonDown`, then the hold event, then `buttonUp`.
- SDK event objects carry `bdaddr` and click flags; they are not complete button objects. Follow the existing test helpers and button mock.
- Assert on state, calls to Home Assistant, and other stable observable behavior. Do not assert on ordinary log message text or spy on `console.log` outside `logger.test.js`.
- For HTTP response handling, drive the callback supplied to the mocked `http.makeRequest` and verify the appropriate logger severity. Include a check that credentials never appear in logged output.
- Ensure tests would fail if the implementation were broken. Avoid assertions that merely confirm a default/initial value; seed state first when testing reset or deletion behavior.

See `docs/testing.md` for the authoritative test layout, mock helpers, and detailed conventions.

## Code style

- Follow the existing formatting and CommonJS patterns in neighboring files.
- Keep functions focused and avoid unnecessary dependencies or abstractions.
- Use strict equality (`===` / `!==`). The configured exception is `== null` when intentionally checking both `null` and `undefined`.
- Prefer the existing constants and helper functions when they express established domain behavior.
- Keep logs useful and appropriately leveled, but do not make tests depend on volatile log wording.
- Avoid unrelated refactors in behavior-sensitive event handling or API code.
- **Module stays comment-free:** keep `flic_hub_module/*` 100% comment-free. End users paste these files into the Flic Hub IDE, where clean, minimal code is essential. Document module behavior in `docs/` instead.
- **Comments elsewhere:** in tests and build files, comments explain non-obvious intent, timing considerations, or domain constraints rather than describing self-evident code.

## Agent workflow

Before finishing a change:

1. Confirm production code remains compatible with the Flic Hub QuickJS runtime.
2. Run `npm run lint`.
3. Run `npm run test:coverage` and confirm all coverage thresholds pass.
4. Verify Home Assistant event names, payload keys, entity IDs, and states remain compatible, or document and test any intentional change.
5. Confirm no credentials or private certificate material were added to the diff or exposed in logs.
6. Update the relevant README, docs site pages, blueprint, and testing documentation.
7. If documentation changed, run `mkdocs build --strict` (see [Docs site](#docs-site)) or confirm the `docs` CI job passes.

## Documentation

### Writing style

Applies to README.md, AGENTS.md, docs and code comments.

- **Concise and direct:** no filler, conversational prose or over-explaining.
- **Scannable:** bullets, short tables and short paragraphs; essential commands and facts first.
- **Why, not what:** explain non-obvious choices, constraints and security rules; never narrate self-evident code.
- **Correct first:** never drop a constraint, error condition, edge case or exact command for brevity.
- **Voice:** plain second person, steps as commands, present tense; contractions are fine. No filler words (please, simply, just, easy, easily) and no wordplay.
- **Headings and bold labels:** sentence case; capitalize only the first word, proper nouns and acronyms. A README's title and each `##` heading start with an emoji (or the project's icon in the title); deeper headings don't.
- **Markdown:** `-` bullets, `**Term:** text` for definitions, no horizontal rules, GitHub alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`) for callouts outside `docs/`.
- **Code fences:** always name the language, one name each: `sh`, `js`, `ts`, `yaml`, `python`, `json`, and `text` for output, trees and diagrams. Never `bash`, `shell`, `javascript`, `typescript`, `yml`, `txt` or `py`.
- **Characters:** ASCII trees (`|--`, `` `-- ``, `|`) and flows (`->`); no box-drawing or arrow characters. Menu paths read **Settings** > **Devices & services**; name icons in words ("the three-dots menu").
- **English** only; no phase labels, scratch notes, obsolete comments or commented-out code.

### README

`README.md` is the landing page on GitHub and anywhere else it's shown (HACS, GHCR). It says what the project does and gets a user started; the docs site covers the rest.

- **Outline:** icon and name; badges; a summary paragraph; the docs pointer (`> 📖 **Full documentation at [host](url):** what's there.`); `✨ Features`; getting started; project-specific sections, each ending with a link to its docs page; `📖 Documentation`, a table with one row per docs page in nav order; `🤝 Contributing`; `📄 License`.
- **Features:** `- <emoji> **Name** — what it does.`
- **Badges:** one per line, in this order: CI status of each required check, latest release, docs site, license, then compatibility and stack. shields.io, lowercase labels (acronyms excepted), the product's logo where shields has one, ranges or majors rather than exact versions.
- **Links:** absolute URLs for docs pages, repository files and images, so the README works wherever it's shown.
- **Sync:** when a README section changes, update the docs page it summarizes in the same change.

### Change scope

- `README.md` (written for non-programmers) covers setup, configuration, automations, and the dashboard card. Update it when changing those or the Home Assistant event contract.
- The documentation site in `docs/` covers everything in depth. Update the matching pages in the same change:
  - configuration options: `docs/configuration.md`, and `docs/https.md` for certificates;
  - click filtering, synchronization, or lifecycle behavior: `docs/behavior.md` and `docs/architecture.md`;
  - entities, their states, attributes, or icons: `docs/entities.md`;
  - events and automations: `docs/examples.md`;
  - log output or request error handling: `docs/troubleshooting.md`;
  - development workflow, CI, dependencies, or releases: `docs/development.md`.
- Update `flic-button.yaml` and its tests when changing the click event contract or automation behavior.
- Update `docs/testing.md` when changing test helpers, mocks, test layout, or testing conventions.
- Keep `module.json` consistent with the deployable module.

### Docs site

- Material for MkDocs, from `docs/` and `mkdocs.yml`, published at <https://ha-flichub-module.blunan.com/>. Docs must build with `mkdocs build --strict`; the `docs` workflow runs it on pull requests and deploys the site from `main`.
- `docs/stylesheets/blunan-brand.css` is the vendored brand theme; never edit it by hand.
- The docs build tool is locked in `docs/requirements.txt`. Regenerate it with the command in `docs/requirements.in`, which Renovate ignores, and keep `python-version` in `.github/workflows/docs.yml` equal to the lock's Python version.
- Link to repository files outside `docs/` with absolute GitHub URLs. Give headings that the README links to an explicit `{ #id }`.
- Embed real files with snippets (`--8<-- "path"`) instead of copying them, and add each embedded file to the `paths` filter in `.github/workflows/docs.yml`.
- Preview and build it in the dev container, then a throwaway `python:3.14-slim-trixie` container, then a local venv, as documented in `docs/development.md`.

### Docs formatting

Follow these rules on every edit under `docs/`, including files embedded with `--8<--`. They keep pages consistent and inside fonts' character set.

- **Characters:** Latin letters, digits, common punctuation, typographic quotes and dashes only. No box drawing (`├──`), arrows (`→`, `►`) or symbols (`⋮`, `✔`): the brand fonts lack them, so they render in a fallback font and break code-block alignment.
- **Diagrams:** ASCII in a `text` fence. Trees use `|--`, `` `-- `` and `|`; flows use `->`.
- **Menu paths:** write **Settings** > **Devices & services**. Name icons in words ("the three-dots menu").
- **Program output:** keep it ASCII, or paraphrase it.
- **Code fences:** always name the language, using one name per language: `sh`, `js`, `yaml`, `python`, `json`, and `text` for output and diagrams. Never `bash`, `shell`, `javascript`, `yml`, `txt` or `py`.
- **Callouts:** only `note`, `abstract`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example` and `quote`.
- **Emphasis:** bold or italic, never both at once.
- **Headings:** sentence case. Capitalize only the first word, proper nouns and acronyms. Proper nouns here: Flic Hub, Flic Button, Home Assistant and QuickJS.
- **Page outline:** each page has one `#` title that equals its nav label (the home page uses the project name), a summary paragraph before the first `##`, and heading levels that never skip.
- **Voice:** plain second person ("you"), steps as commands, present tense; contractions are fine. No filler words (please, simply, just, easy, easily) and no wordplay.

## Git and commits

- Always use the Conventional Commits specification.
- Never commit secrets, credentials, environment files, personal configuration or build artifacts.
- Keep pull requests focused and document intentional compatibility changes.
- Generated coverage output counts as a build artifact: never commit it.
- The version is specified in `flic_hub_module/module.json`, `package.json`, and `package-lock.json`. release-please updates them together; do not bump them by hand.
- Real-hardware verification must be performed manually: paste the module into the Flic Online IDE, press the buttons, and monitor the console and corresponding Home Assistant entities (`binary_sensor.flic_<addr>`, `sensor.flic_<addr>_battery`, `binary_sensor.flic_<addr>_connectivity`).

### Versions and releases

`main` takes squash merges only, so a PR's title becomes its commit on `main`, and release-please reads that title to pick the next version. A new version means what users install (the module or the blueprint) changed:

- `feat:`: new or changed behavior. Minor version.
- `fix:`, `perf:`, `revert:`: a bug fix, a performance improvement, or a reverted change. Patch version.
- `feat!:` / `fix!:`, or a `BREAKING CHANGE:` footer: a change that breaks existing setups, including any intentional change to the Home Assistant contract. Major version.
- `docs:`, `ci:`, `chore:`, `refactor:`, `test:`, `build:`, `style:`: no version. Use these when what users install stays the same.

Renovate titles its updates `chore(deps):`, because the module has no dependencies, so they release nothing.

The `release` workflow (`.github/workflows/release.yml`) runs release-please on every push to `main`. It keeps a release PR open (`chore(main): release X.Y.Z`) with the next version and its `CHANGELOG.md` entry. Merging that PR by hand, when the version should go out, tags `vX.Y.Z` and publishes the GitHub release. The workflow uses a GitHub App token (`RELEASE_APP_CLIENT_ID` variable, `RELEASE_APP_PRIVATE_KEY` secret), not `GITHUB_TOKEN`, because a PR opened with `GITHUB_TOKEN` runs no workflows and the required checks (`test`, `Docs build`) would never report.

- Don't edit `CHANGELOG.md` or `.release-please-manifest.json` by hand; release-please updates them in its release PR.
- To correct a merged PR's type before its release, add the corrected message to that PR's description between a `BEGIN_COMMIT_OVERRIDE` line and an `END_COMMIT_OVERRIDE` line; release-please reads it instead of the commit. To force a version, end that message with a `Release-As: X.Y.Z` footer.
- Don't start a paragraph in a commit body with `feat:`, `fix:` or another type: release-please reads it as another commit.

## Security guardrails

- Never commit secrets, credentials, tokens, or private keys.
- Always validate untrusted input at appropriate boundaries.
- Always use parameterized queries and safe APIs for external input.
- Avoid logging sensitive information.
- Always follow least-privilege principles.
- Never disable security controls to bypass errors.
