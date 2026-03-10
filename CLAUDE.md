# CLAUDE.md — Speech Pace Assessment

This file provides context and conventions for AI assistants (Claude and others) working on the **speech-pace-assessment** repository.

---

## Project Overview

**speech-pace-assessment** is a tool for analyzing and evaluating the pace/speed of spoken audio. The project aims to measure speaking rate (words per minute, syllables per minute, or similar metrics), detect pacing issues, and provide actionable feedback to users.

> **Status:** Repository initialized. No source files have been committed yet. This CLAUDE.md will be updated as the project takes shape.

---

## Repository Layout

> To be populated once source files are added. The expected structure is:

```
speech-pace-assessment/
├── CLAUDE.md               # This file
├── README.md               # User-facing documentation
├── .gitignore
├── package.json            # (if Node/TS project)
│   or requirements.txt     # (if Python project)
├── src/                    # Primary source code
│   ├── index.*             # Entry point
│   ├── analysis/           # Core pace analysis logic
│   ├── audio/              # Audio I/O, preprocessing
│   ├── transcription/      # Speech-to-text integration
│   └── utils/              # Shared helpers
├── tests/                  # Automated tests
├── docs/                   # Extended documentation
└── .github/
    └── workflows/          # CI/CD pipelines
```

---

## Development Workflow

### Branching Strategy

- **`main`** — stable, production-ready code. Never push directly.
- **`dev`** or **`develop`** — integration branch for completed features.
- **Feature branches** — `feature/<short-description>` (e.g., `feature/wpm-calculator`).
- **Bug fixes** — `fix/<short-description>`.
- **AI-assisted work** — branches prefixed with `claude/` (e.g., `claude/claude-md-mmklpy48q0xed56r-5n9X5`).

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

Common types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`.

Examples:
```
feat(analysis): add syllable-per-minute detection
fix(audio): handle mono vs stereo channel normalization
docs: update CLAUDE.md with project structure
test(transcription): add mock for Whisper API responses
```

### Pull Requests

- Target `main` (or `dev` if present) — never merge directly into `main` without review.
- Include a clear description and link to any related issue.
- All CI checks must pass before merging.
- Keep PRs focused; one logical change per PR.

---

## Tech Stack

> Update this section once the stack is finalized.

| Layer | Technology |
|---|---|
| Language | TBD (likely Python or TypeScript) |
| Audio processing | TBD (e.g., `librosa`, `ffmpeg`, `Web Audio API`) |
| Transcription | TBD (e.g., OpenAI Whisper, AssemblyAI, Deepgram) |
| Testing | TBD (e.g., `pytest`, `jest`) |
| CI/CD | GitHub Actions |

---

## Key Conventions

### Code Style

- Follow the linter/formatter configured in the project (ESLint + Prettier for TS; `ruff` + `black` for Python).
- Run the formatter before committing; CI will reject unformatted code.
- Prefer explicit types/annotations over implicit inference.
- Keep functions small and single-purpose.

### Testing

- Write tests for all non-trivial logic, especially the core analysis algorithms.
- Tests live in `tests/` mirroring `src/` directory structure.
- Aim for meaningful coverage, not just a coverage number.
- Use mocks/stubs for external services (audio APIs, transcription APIs).

### Environment Variables

- Never commit secrets, API keys, or credentials.
- Use a `.env` file locally (listed in `.gitignore`).
- Document all required environment variables in `.env.example`.

### Audio / ML-specific

- Document expected input formats (sample rate, bit depth, mono/stereo, file format).
- Validate audio inputs early and fail with clear error messages.
- Keep model weights and large binary assets out of the repository; document download instructions instead.

---

## Running the Project

> Commands will be added here once `package.json` / `Makefile` / `pyproject.toml` is established.

```bash
# Install dependencies
# <command TBD>

# Run tests
# <command TBD>

# Start development server / run CLI
# <command TBD>

# Lint and format
# <command TBD>
```

---

## AI Assistant Guidelines

When working in this repository, Claude should:

1. **Read before editing** — Always read a file fully before proposing edits.
2. **Minimal changes** — Make only the changes necessary to fulfill the task; avoid unrelated refactors or style fixes.
3. **No secrets** — Never generate, commit, or log API keys, credentials, or tokens.
4. **Tests first** — Prefer test-driven approaches; add or update tests when changing logic.
5. **Ask before deleting** — Confirm with the user before removing files or large blocks of code.
6. **Document assumptions** — If the task is ambiguous, state assumptions clearly before implementing.
7. **Branch discipline** — All AI-initiated commits go to the designated `claude/` branch; never force-push to `main`.
8. **Environment variables** — Reference env vars by name (e.g., `process.env.WHISPER_API_KEY`); never hardcode values.
9. **Audio domain awareness** — Be aware that audio processing tasks may involve large files or long-running jobs; design for async/streaming where appropriate.
10. **Update this file** — When project structure, stack, or conventions change, update CLAUDE.md to reflect the current state.

---

## Useful References

> Add links as relevant tools/docs are identified:
- [Conventional Commits](https://www.conventionalcommits.org/)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [librosa documentation](https://librosa.org/doc/latest/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

*Last updated: 2026-03-10. Update this file whenever the project structure or conventions change.*
