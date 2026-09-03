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
| [`demo.py`](03_workshop/01_workshop/demo.py) | A marimo app that shows the finished results side by side with the code hidden |

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

Future parts will cover session management, automation and scaling, team workflows, and putting a real backend, database and LLM behind the prototype.

## Setup

### Prerequisites

Part 1 needs a browser and an account for a chatbot. Nothing else. Everything below is for part 2 onwards.

- Terminal on macOS or Linux (Windows works via WSL2).
- **Node.js &ge; 18** for Claude Code and `context-mode` (22+ recommended on Linux).
- **Python 3.11+** with `uv` for Docling, GEPA and the marimo app.
- **Git**, and a project directory under version control so you can see what Claude changes.
- An **Anthropic account** for logging into Claude Code.
- *(optional)* the **`gh` CLI** for GitHub workflows.

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

To view the part 1 results as an app, with the code hidden:

```bash
uv run marimo run 03_workshop/01_workshop/demo.py
```

Each notebook is self-contained and safe to read top-to-bottom. The copy-paste blocks are meant to be run in a separate terminal running `claude`, not in the notebook itself.

## User guide

### Part 1

Read [`03_workshop/01_workshop/README.md`](03_workshop/01_workshop/README.md) and work through the four prompts in order. Save every version that works before asking for the next change.

### Part 2

1. Open `00_overview.ipynb` and skim the series map.
2. Work through `01_claude_code` &rarr; `02_configure_your_environment` in order, they establish the mental model.
3. The tool-specific notebooks (`03` through `06`) can be read in any order, but `03` pairs nicely with `05`.

### Recommendations

- Keep a Claude Code terminal open next to the notebook. Read a section, paste a prompt, compare the output.
- The companion files in [`03_workshop/02_workshop/assets/`](03_workshop/02_workshop/assets/) are meant to be opened and read, not just referenced.

## Limitations

- **No test suite.** The material is for teaching; there is nothing to run with `pytest`.
- **Scope.** Part 2 covers sections 1&ndash;6 of the [Claude Code best-practices guide](https://code.claude.com/docs/en/best-practices). Sections 7&ndash;11 (session management, automation, scaling, failure patterns, intuition) are deferred to future parts.
- **Chatbots are not reproducible.** The same part 1 prompt gives a different result on a different model, or on the same model tomorrow. The saved `.html` results are examples, not expected output.
- **Tool versions move fast.** If a slash command has been renamed or a flag removed since writing, check the upstream docs.

## References

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) &middot; [marimo](https://marimo.io)
- [Docling](https://github.com/docling-project/docling) &middot; [docling-toolkit plugin](https://github.com/docling-project/docling)
- [GEPA](https://github.com/gepa-ai/gepa)
- [context-mode](https://github.com/mksglu/context-mode)
- [caveman](https://github.com/JuliusBrussee/caveman)

## License

MIT. See [`LICENSE`](LICENSE).

---

## Acknowledgements

<img src="00_aisc/img/logo_bmftr_de.png" alt="drawing" style="width:170px;"/>

The [AI Service Centre Berlin-Brandenburg](http://hpi.de/kisz) is funded by the [Federal Ministry of Research, Technology and Space](https://www.bmbf.de/) under the funding code 16IS22092.
