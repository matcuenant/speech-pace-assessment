# CLAUDE.md — Speech Pace Assessment

This file provides context and conventions for AI assistants (Claude and others) working on the **speech-pace-assessment** repository.

---

## Project Overview

**speech-pace-assessment** is a browser-based tool for measuring a presenter's speaking pace during dry-runs. It captures live microphone audio, transcribes it in real time using the browser's built-in Web Speech API, and displays the current **words-per-minute (WPM)** over a configurable sliding window (default: 30 seconds). It is intended to be opened directly in a browser — no server or build step required.

---

## Repository Layout

```
speech-pace-assessment/
├── CLAUDE.md       # This file — AI assistant context
├── index.html      # App entry point (open directly in Chrome/Edge)
├── style.css       # All styling (dark theme, responsive)
└── app.js          # Core application logic
```

No build system, no package manager, no external dependencies. The app is purely static HTML/CSS/JS.

---

## How the App Works

### Core data flow

1. **Microphone capture** — `navigator.mediaDevices` / `SpeechRecognition` (Web Speech API, Chrome/Edge).
2. **Word timestamping** — every finalised word from the recogniser is pushed into `wordBuffer` as `{ word, ts }`.
3. **Sliding-window WPM** — on each 1-second tick, words where `now - ts <= windowSize * 1000` are counted:
   ```
   currentWpm = Math.round((wordsInWindow / effectiveWindowSec) * 60)
   ```
   `effectiveWindowSec = min(windowSize, elapsedSeconds)` prevents inflated WPM at start-up.
4. **Chart** — `chartData[]` accumulates one `{ ts, wpm }` point per second. Drawn on a `<canvas>` using the 2D Context API — no charting library.
5. **Session WPM** — total words / total elapsed seconds × 60, displayed separately from the sliding-window WPM.

### Key files

| File | Responsibility |
|---|---|
| `index.html` | DOM structure, semantic markup, ARIA attributes |
| `style.css` | All visual styling; CSS custom properties for theming |
| `app.js` | SpeechRecognition lifecycle, sliding-window logic, canvas chart, transcript rendering |

### Key variables in `app.js`

| Variable | Type | Purpose |
|---|---|---|
| `wordBuffer` | `{ word, ts }[]` | All recognised words with timestamps |
| `chartData` | `{ ts, wpm }[]` | One data point per second (max 600 = 10 min) |
| `finalTranscript` | `string` | Accumulated final transcript text |
| `windowSize` | `number` (seconds) | Sliding window size (10–120 s, default 30) |
| `targetWpm` | `number` | User-configured target pace (80–200, default 130) |
| `elapsedSeconds` | `number` | Seconds since recording started |

---

## Development Workflow

### Running locally

Open `index.html` directly in **Google Chrome** or **Microsoft Edge**. The Web Speech API is not available in Firefox or Safari (as of 2026). Microphone permission will be requested on first use.

```bash
# Quick local server (optional, some browsers restrict file:// microphone access)
python3 -m http.server 8080
# Then open http://localhost:8080
```

### Branching Strategy

- **`main`** — stable, production-ready code. Never push directly.
- **Feature branches** — `feature/<short-description>`.
- **Bug fixes** — `fix/<short-description>`.
- **AI-assisted work** — branches prefixed with `claude/` (e.g., `claude/claude-md-mmklpy48q0xed56r-5n9X5`).

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

Common types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `style`.

Examples:
```
feat(app): add language selector for non-English presenters
fix(chart): correct x-axis label alignment on narrow screens
style(css): adjust gauge colour thresholds
docs: update CLAUDE.md with actual project structure
```

### Pull Requests

- Target `main` — never merge without review.
- Include a description and any browser testing notes (Chrome version, OS).
- Keep PRs focused on one logical change.

---

## Key Conventions

### Code style

- Vanilla JavaScript (`'use strict'`). No TypeScript, no transpiler.
- DOM queries are cached in module-level `const` at the top of `app.js`; do not query the DOM inside hot paths (recognition callbacks, `onTick`).
- Prefer `const` / `let`; never `var`.
- Functions are named in `camelCase`, short and single-purpose.
- Keep all CSS in `style.css`; no inline styles in HTML or JS.
- CSS custom properties (variables) are defined in `:root`; use them everywhere instead of hardcoded colours.

### Canvas chart

- The chart is redrawn from scratch on every tick (`redrawChart()`). This is acceptable because the dataset is small (≤600 points) and the canvas is small.
- Physical pixel density is handled with `devicePixelRatio` to keep the chart crisp on HiDPI displays.
- Do **not** import an external charting library — keep the project dependency-free.

### Speech recognition lifecycle

- `recognition.continuous = true` and `recognition.interimResults = true`.
- The `onend` handler auto-restarts recognition if `isRecording` is still `true` (browsers stop after silence).
- `recognition.onerror` distinguishes `no-speech` (benign, ignored) from real errors.
- Always set `recognition.onend = null` before calling `recognition.stop()` to prevent the auto-restart loop after the user stops recording.

### No external dependencies

- No npm, no CDN links, no build step.
- If a future feature genuinely requires a library, discuss it first and prefer a single self-contained file that can be committed to the repo (e.g., a vendored UMD build).

### No secrets / no network calls

- The app runs entirely in the browser with no backend.
- Do not add any API calls, telemetry, or analytics without explicit approval.

---

## AI Assistant Guidelines

When working in this repository, Claude should:

1. **Read before editing** — always read the full file before proposing any edits.
2. **Minimal changes** — make only what is needed; do not refactor unrelated code.
3. **No secrets** — never generate or commit API keys, credentials, or tokens.
4. **No build system** — do not introduce npm, a bundler, or a framework without explicit user approval.
5. **Browser compatibility** — test mentally against Chrome/Edge; the Web Speech API is Chrome/Edge-only.
6. **Canvas redraws** — `redrawChart()` is already called on every tick and on `resize`; do not add extra calls elsewhere.
7. **Transcript rendering** — always go through `renderTranscript()`; never manipulate `transcriptEl.innerHTML` directly elsewhere.
8. **Branch discipline** — all AI-initiated commits go to the designated `claude/` branch; never force-push to `main`.
9. **Update this file** — when the project structure, stack, or conventions change, update CLAUDE.md accordingly.

---

## Useful References

- [Web Speech API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition — MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Canvas 2D API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

*Last updated: 2026-03-10. Update this file whenever the project structure or conventions change.*
