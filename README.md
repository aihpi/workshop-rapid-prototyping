<div style="background-color: #ffffff; color: #000000; padding: 10px;">
<img src="00_aisc/img/logo_aisc_bmftr.jpg">
<h1> Rapid Prototyping via Vibe Coding</h1>
</div>

An AISC workshop series on building software with coding assistants, from a first prototype pasted out of a chat window to a dockerised application with a frontend, a backend and an LLM behind it.

## Overview

"Vibe coding" is the practice of *describing what you want* and letting a coding assistant figure out *how to build it*. The series starts with a browser and a chatbot, then moves to [Claude Code](https://claude.com/claude-code) in your own repository, and teaches how to drive that environment well: keeping it focused, giving it verification hooks, and stopping it before it goes off the rails.

The material is organised into parts. Each part is a numbered folder under [`03_workshop/`](03_workshop/).

## Features

- **A working prototype in the first hour**, built without installing anything.
- **Copy-paste prompts** you run in a chatbot or in your own Claude Code terminal while reading.
- **Companion assets** (example `CLAUDE.md`, `settings.json`, skill, subagent) referenced from the notebooks.
- **Ecosystem tour**: the [`docling-toolkit`](https://github.com/docling-project/docling) plugin for document extraction, [`GEPA`](https://github.com/gepa-ai/gepa) for prompt optimisation, [`context-mode`](https://github.com/mksglu/context-mode) for tool-output sandboxing, and [`caveman`](https://github.com/JuliusBrussee/caveman) for output-token compression.

![HPI Studio: the demo song on the timeline, the hook's brass pattern in the piano roll, and the AI assistant after a mix change](00_aisc/img/screenshot_app.png)

## Part 1 &mdash; Vibe Coding

[`03_workshop/01_workshop/`](03_workshop/01_workshop/)

Four prepared prompts that turn a chatbot into a drum machine you can play in your browser. No terminal, no installation, no code. It ends where chat-window prototyping ends: with something that works and that nobody has reviewed.

| File | Topic |
|------|-------|
| [`README.md`](03_workshop/01_workshop/README.md) | How to run the session, and what to do when the output does not work |
| [`01_beat_machine_prompt.txt`](03_workshop/01_workshop/01_beat_machine_prompt.txt) | A 16-step sequencer with eight drum sounds, tempo, loop, mute and volume |
| [`02_sound_design_prompt.txt`](03_workshop/01_workshop/02_sound_design_prompt.txt) | Tune, decay, filters, distortion, delay and reverb per instrument |
| [`03_database_prompt.txt`](03_workshop/01_workshop/03_database_prompt.txt) | Genre presets, saving to browser storage, export and import as JSON |
| [`04_feature_prompt.txt`](03_workshop/01_workshop/04_feature_prompt.txt) | Fill in a feature, get interviewed about it, leave with a prompt for a fresh chat |
| [`claude/`](03_workshop/01_workshop/claude/), [`gemini/`](03_workshop/01_workshop/gemini/), [`gpt/`](03_workshop/01_workshop/gpt/) | The results each model produced from the same prompts, one folder per model |

## Part 2 &mdash; Claude Code Foundations

[`03_workshop/02_workshop/`](03_workshop/02_workshop/)

| Notebook | Topic |
|----------|-------|
| [`00_overview.ipynb`](03_workshop/02_workshop/00_overview.ipynb) | Orientation and prerequisites |
| [`01_claude_code.ipynb`](03_workshop/02_workshop/01_claude_code.ipynb) | Install, context window, verification, Plan Mode, prompt specificity |
| [`02_configure_your_environment.ipynb`](03_workshop/02_workshop/02_configure_your_environment.ipynb) | `CLAUDE.md`, permissions, CLI tools, MCP, hooks, skills, subagents, plugins |
| [`03_docling_toolkit.ipynb`](03_workshop/02_workshop/03_docling_toolkit.ipynb) | Document extraction with the Docling plugin |
| [`04_gepa.ipynb`](03_workshop/02_workshop/04_gepa.ipynb) | Automated prompt and agent-config optimisation |
| [`05_context_mode.ipynb`](03_workshop/02_workshop/05_context_mode.ipynb) | Tool-output sandboxing to save context-window tokens |
| [`06_caveman.ipynb`](03_workshop/02_workshop/06_caveman.ipynb) | Output-token compression via a terse-style skill |

Future parts will cover session management, automation and scaling, team workflows, and putting an LLM behind the prototype.

### Run it

You need Docker Desktop (see [Prerequisites](#prerequisites)) and nothing else. The images are published to GitHub Container Registry on every merge to `main`, so nothing is compiled on your machine:

```bash
git clone git@github.com:aihpi/workshop-rapid-prototyping.git
cd workshop-rapid-prototyping
docker compose pull && docker compose up --no-build
```

Open http://localhost:8080. Four services come up: Postgres, a one-shot migration and seed job, the Fastify API, and nginx serving the built frontend and proxying `/api`. The demo song is seeded on first start and plays on the first click. Stop with Ctrl C, or from the Containers tab in Docker Desktop; `docker compose down -v` also deletes the database and recorded samples. The seed only runs into an empty database, so after pulling a version with a changed demo song use `docker compose down -v` to see the new one.

### What the studio does

HPI Studio is a small digital audio workstation with the features you would expect from Ableton Live, Logic Pro or GarageBand, kept to what fits in a workshop afternoon. There is an arrangement timeline with clips, sections, snap, zoom and a loop region you drag on the ruler. Drum patterns are edited in a step grid, melodic patterns in a piano roll with a velocity lane, multi-select, drag, and a quantise command. Every track has an instrument (drum kit, pluck, brass, keys or sampler), an insert chain of effects (EQ, compressor, distortion, chorus, filter, delay, reverb) that can be reordered and bypassed, a channel strip with volume, pan, mute, solo, two sends and a level meter, and automation lanes for volume, pan and both sends. The transport has play, record, loop, a metronome click, a count-in, tempo and time signature. Notes come from the mouse, from a MIDI keyboard over Web MIDI, or from the computer keyboard (turn on Keyboard piano in the top bar: A W S E D F T G Y H U J K play an octave, Z and X shift it); while record is armed they land in the open pattern as one undoable take. Samples come from the microphone or from a file on disk and play from any track. Everything is undoable, saved to the database as you work, and renders to a WAV with automation and effects included. Press ? in the app for the shortcuts.

The look follows the HPI corporate design: a white page, ink text, hairlines, HPI red as the one accent, and the four HPI primary colours as track colours.

To build the images from your checkout instead, for instance after changing the code:

```bash
docker compose up --build
```

The first build takes a few minutes and about 4 GB of memory; Docker Desktop's default allowance is enough.

### AI assistant

The AI button in the top bar (or Ctrl K) opens a drawer where you describe a change in words: "make the drums deeper", "more reverb on the keys and pan them left", "the hook should be played by three trumpets and a saxophone", or a question such as "what key is this song in?". The model answers with operations in the app's own vocabulary; the server validates them and the client applies them as a single undo step, so Ctrl Z removes a whole reply. The assistant can change tempo, time signature, tracks, instruments, effects, mix, automation, patterns, notes (including quantising them), clips and sections. It cannot touch recorded samples.

It needs a key for the [HPI AISC model hub](https://api.aisc.hpi.de), which you receive from the workshop organiser. Copy the example file, fill in the key and start (or restart) the stack:

```bash
cp .env.example .env
docker compose up --no-build
```

`.env` is gitignored and read by the API container only. Without it the drawer explains what is missing and everything else works as before.

## Setup

### Prerequisites

Part 1 needs a browser only. Part 2 needs:

- Terminal on macOS or Linux (Windows works via WSL2).
- **Docker Desktop** for the HPI Studio.
- **Node.js &ge; 18** for Claude Code and `context-mode` (22+ recommended on Linux, and 22 for developing part 2).
- **Python 3.11+** with `uv` for Docling, GEPA and the marimo app.
- **Git**, and a project directory under version control so you can see what Claude changes.
- An **Anthropic account** for logging into Claude Code.
- *(optional)* the **`gh` CLI** for GitHub workflows.

#### Install Docker Desktop

Docker Desktop bundles the Docker engine, the `docker compose` command and a small GUI for starting and stopping containers. Follow our [Getting Started Guide](https://github.com/aihpi/workshop-getting-started) for more details. Then:

```bash
docker compose version
```

Any version 2.x is fine. If the command is not found, Docker Desktop is not running or your terminal was opened before the installation finished.

### Quick start

```bash
# 1) Clone this workshop.
git clone git@github.com:aihpi/workshop-rapid-prototyping.git
cd workshop-rapid-prototyping

# 2) Part 1 needs nothing but this file and a chatbot.
cat 03_workshop/01_workshop/README.md

# 3) Part 2: install Claude Code, then open the first notebook.
npm install -g @anthropic-ai/claude-code
uv sync
uv run jupyter lab 03_workshop/02_workshop/00_overview.ipynb
```

Each notebook is self-contained and safe to read top-to-bottom. The copy-paste blocks are meant to be run in a separate terminal running `claude`, not in the notebook itself.

## User guide

### Part 1

Read [`03_workshop/01_workshop/README.md`](03_workshop/01_workshop/README.md) and work through the five prompts in order. Save every version that works before asking for the next change.

### Part 2

1. Open `00_overview.ipynb` and skim the series map.
2. Work through `01_claude_code` &rarr; `02_configure_your_environment` in order, they establish the mental model.
3. The tool-specific notebooks (`03` through `06`) can be read in any order, but `03` pairs nicely with `05`.

### Recommendations

- Keep a Claude Code terminal open next to the notebook. Read a section, paste a prompt, compare the output.
- The companion files in [`03_workshop/02_workshop/assets/`](03_workshop/02_workshop/assets/) are meant to be opened and read, not just referenced.

## License

MIT. See [`LICENSE`](LICENSE).

---

## Acknowledgements

<img src="00_aisc/img/logo_bmftr_de.png" alt="drawing" style="width:170px;"/>

The [AI Service Centre Berlin-Brandenburg](http://hpi.de/kisz) is funded by the [Federal Ministry of Research, Technology and Space](https://www.bmbf.de/) under the funding code 16IS22092.
