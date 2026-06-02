---
name: package-manager
description: Select the correct package manager for a project across JavaScript/TypeScript, Python, Java, and Rust. Detect the active manager from lock files, manifests, and config, and prompt the user when none can be determined.
---

## Package Manager Selection

Always use the project's existing package manager. Never introduce a new one or
mix managers in the same project. Detect the language first, then apply that
language's detection order below. Stop at the first match.

### No Manager Detected (applies to all languages)

If none of a language's signals resolve a manager, do not guess and do not pick
a default silently. Use the `question` tool to ask the user which to use. Offer
that language's common options and recommend one if the surrounding ecosystem
hints at a preference.

### Conflicts (applies to all languages)

If multiple lock files or manifests for competing managers exist, this is a
misconfiguration. Prefer an explicit pin (e.g. `packageManager` field,
`[tool.poetry]` table, Gradle wrapper) if present; otherwise prompt the user to
confirm which to use and flag the stray files.

---

## JavaScript / TypeScript

### Detection Order

1. **Lock file** (strongest signal):

   | Lock file             | Package manager |
   | --------------------- | --------------- |
   | `bun.lockb`           | bun             |
   | `bun.lock`            | bun             |
   | `pnpm-lock.yaml`      | pnpm            |
   | `yarn.lock`           | yarn            |
   | `package-lock.json`   | npm             |
   | `npm-shrinkwrap.json` | npm             |

2. **`packageManager` field** in `package.json` (e.g.
   `"packageManager": "pnpm@9.1.0"`). Corepack honors this.

3. **Manager-specific config files**:

   | File                                   | Package manager |
   | -------------------------------------- | --------------- |
   | `.npmrc`                               | npm             |
   | `.yarnrc`, `.yarnrc.yml`, `.yarn/`     | yarn            |
   | `pnpm-workspace.yaml`, `.pnpmfile.cjs` | pnpm            |
   | `bunfig.toml`                          | bun             |

4. **`engines` field** in `package.json` (e.g. `"engines": { "pnpm": ">=9" }`).

5. **CI / scripts**: check `.github/workflows/`, `Makefile`, `Dockerfile`, or
   `README` for invocations like `pnpm install`, `yarn build`, `bun run`.

### Command Mapping

| Action          | npm                    | pnpm                | yarn                | bun                |
| --------------- | ---------------------- | ------------------- | ------------------- | ------------------ |
| Install all     | `npm install`          | `pnpm install`      | `yarn install`      | `bun install`      |
| Add dep         | `npm install <pkg>`    | `pnpm add <pkg>`    | `yarn add <pkg>`    | `bun add <pkg>`    |
| Add dev dep     | `npm install -D <pkg>` | `pnpm add -D <pkg>` | `yarn add -D <pkg>` | `bun add -d <pkg>` |
| Remove dep      | `npm uninstall <pkg>`  | `pnpm remove <pkg>` | `yarn remove <pkg>` | `bun remove <pkg>` |
| Run script      | `npm run <script>`     | `pnpm <script>`     | `yarn <script>`     | `bun run <script>` |
| Execute package | `npx <pkg>`            | `pnpm dlx <pkg>`    | `yarn dlx <pkg>`    | `bunx <pkg>`       |

### Rules

- Never commit a lock file from a different manager than the project uses.
- Do not run `npm install` in a pnpm/yarn/bun project (it generates a conflicting
  `package-lock.json`).
- Respect the pinned version in the `packageManager` field; do not upgrade it
  unless asked.

---

## Python

### Detection Order

1. **Lock file** (strongest signal):

   | Lock file        | Manager |
   | ---------------- | ------- |
   | `uv.lock`        | uv      |
   | `poetry.lock`    | poetry  |
   | `pdm.lock`       | pdm     |
   | `Pipfile.lock`   | pipenv  |
   | `conda-lock.yml` | conda   |

2. **`pyproject.toml` tool table** — inspect which build/dependency tool owns it:

   | Marker in `pyproject.toml` | Manager |
   | -------------------------- | ------- |
   | `[tool.uv]`                | uv      |
   | `[tool.poetry]`            | poetry  |
   | `[tool.pdm]`               | pdm     |
   | `[tool.hatch]`             | hatch   |

3. **Other manifests / config**:

   | File                                  | Manager |
   | ------------------------------------- | ------- |
   | `Pipfile`                             | pipenv  |
   | `environment.yml`, `environment.yaml` | conda   |
   | `requirements*.txt` (only)            | pip     |

4. **CI / scripts**: check `.github/workflows/`, `Makefile`, `tox.ini`,
   `Dockerfile`, or `README` for invocations like `uv sync`, `poetry install`,
   `pdm install`, `pipenv install`, `pip install -r`.

### Command Mapping

| Action      | pip                               | poetry                | uv                | pdm                | pipenv                   |
| ----------- | --------------------------------- | --------------------- | ----------------- | ------------------ | ------------------------ |
| Install all | `pip install -r requirements.txt` | `poetry install`      | `uv sync`         | `pdm install`      | `pipenv install`         |
| Add dep     | `pip install <pkg>`               | `poetry add <pkg>`    | `uv add <pkg>`    | `pdm add <pkg>`    | `pipenv install <pkg>`   |
| Remove dep  | `pip uninstall <pkg>`             | `poetry remove <pkg>` | `uv remove <pkg>` | `pdm remove <pkg>` | `pipenv uninstall <pkg>` |
| Run script  | `python <file>`                   | `poetry run <cmd>`    | `uv run <cmd>`    | `pdm run <cmd>`    | `pipenv run <cmd>`       |

### Rules

- Prefer the manager that owns `pyproject.toml`; a bare `requirements.txt`
  alongside a `[tool.*]` table usually means the txt is generated/exported, not
  the source of truth.
- Do not mix `pip install` into a poetry/uv/pdm/pipenv-managed environment.
- Respect the project's virtual environment; do not install into system Python.

---

## Java

### Detection Order

1. **Build file** (strongest signal):

   | File                                     | Manager / build tool |
   | ---------------------------------------- | -------------------- |
   | `build.gradle`, `build.gradle.kts`       | Gradle               |
   | `settings.gradle`, `settings.gradle.kts` | Gradle               |
   | `pom.xml`                                | Maven                |

2. **Wrapper scripts** (use these over a globally installed tool):

   | File                     | Manager |
   | ------------------------ | ------- |
   | `gradlew`, `gradlew.bat` | Gradle  |
   | `mvnw`, `mvnw.cmd`       | Maven   |

3. **CI / scripts**: check `.github/workflows/`, `Makefile`, `Dockerfile`, or
   `README` for invocations like `./gradlew build` or `./mvnw package`.

### Command Mapping

| Action         | Maven                              | Gradle                                   |
| -------------- | ---------------------------------- | ---------------------------------------- |
| Build          | `./mvnw package`                   | `./gradlew build`                        |
| Compile        | `./mvnw compile`                   | `./gradlew assemble`                     |
| Run tests      | `./mvnw test`                      | `./gradlew test`                         |
| Clean          | `./mvnw clean`                     | `./gradlew clean`                        |
| Add dependency | edit `<dependencies>` in `pom.xml` | edit `dependencies {}` in `build.gradle` |

### Rules

- Always prefer the project wrapper (`./gradlew`, `./mvnw`) over a system-wide
  `gradle`/`mvn` to match the project's pinned version.
- Dependencies are declared in the build file; there is no separate add/remove
  CLI. Edit `pom.xml` or `build.gradle(.kts)` directly.
- Do not convert a Maven project to Gradle (or vice versa) unless asked.

---

## Rust

### Detection Order

1. **`Cargo.toml`** present → Cargo (effectively the only manager). `Cargo.lock`
   confirms it; for workspaces, a root `Cargo.toml` with a `[workspace]` table
   coordinates member crates.
2. **CI / scripts**: check `.github/workflows/`, `Makefile`, `Dockerfile`, or
   `README` for `cargo build`, `cargo test`, etc.

### Command Mapping

| Action     | Cargo                  |
| ---------- | ---------------------- |
| Build      | `cargo build`          |
| Run        | `cargo run`            |
| Test       | `cargo test`           |
| Add dep    | `cargo add <crate>`    |
| Remove dep | `cargo remove <crate>` |
| Check      | `cargo check`          |

### Rules

- Commit `Cargo.lock` for binaries; for libraries follow the project's existing
  convention (do not add or remove it unless asked).
- Prefer `cargo add`/`cargo remove` over hand-editing `Cargo.toml` dependency
  entries.
- In a workspace, run commands from the workspace root unless targeting a
  specific member with `-p <crate>`.
