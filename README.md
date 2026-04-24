<div style="background-color: #ffffff; color: #000000; padding: 10px;">
<img src="00_aisc/img/logo_aisc_bmftr.jpg">
<h1> Rapid Prototyping via Vibe Coding</h1>
</div>

An AISC workshop series that teaches [Claude Code](https://claude.com/claude-code) as the foundational tool for rapid prototyping, and a curated ecosystem of plugins and libraries that compose around it.

## Overview

"Vibe coding" is the practice of *describing what you want* and letting an agentic coding environment figure out *how to build it*. This workshop teaches how to drive that environment well: keeping it focused, giving it verification hooks, and stopping it before it goes off the rails.

The material is organized into parts. Each part ships as a set of Jupyter notebooks prefixed `wN_` where `N` is the part number.

## Features

- **Hands-on notebook walkthrough** of the official Claude Code best practices.
- **Copy-paste prompts** you run in your own Claude Code terminal while reading.
- **Companion assets** (example `CLAUDE.md`, `settings.json`, skill, subagent) referenced from the notebooks.
- **Ecosystem tour**: the [`docling-toolkit`](https://github.com/docling-project/docling) plugin for document extraction, [`GEPA`](https://github.com/gepa-ai/gepa) for prompt optimization, [`context-mode`](https://github.com/mksglu/context-mode) for tool-output sandboxing, and [`caveman`](https://github.com/JuliusBrussee/caveman) for output-token compression.

## Part 1 &mdash; Claude Code Foundations

| Notebook | Topic |
|----------|-------|
| [`03_notebooks/w1_00_overview.ipynb`](03_notebooks/w1_00_overview.ipynb) | Orientation and prerequisites |
| [`03_notebooks/w1_01_claude_code.ipynb`](03_notebooks/w1_01_claude_code.ipynb) | Install, context window, verification, Plan Mode, prompt specificity |
| [`03_notebooks/w1_02_configure_your_environment.ipynb`](03_notebooks/w1_02_configure_your_environment.ipynb) | `CLAUDE.md`, permissions, CLI tools, MCP, hooks, skills, subagents, plugins |
| [`03_notebooks/w1_03_docling_toolkit.ipynb`](03_notebooks/w1_03_docling_toolkit.ipynb) | Document extraction with the Docling plugin |
| [`03_notebooks/w1_04_gepa.ipynb`](03_notebooks/w1_04_gepa.ipynb) | Automated prompt / agent-config optimization |
| [`03_notebooks/w1_05_context_mode.ipynb`](03_notebooks/w1_05_context_mode.ipynb) | Tool-output sandboxing to save context-window tokens |
| [`03_notebooks/w1_06_caveman.ipynb`](03_notebooks/w1_06_caveman.ipynb) | Output-token compression via a terse-style skill |

Future parts (`w2_*`, `w3_*`) will cover session management, automation and scaling, and team workflows.

## Setup

### Prerequisites

- Terminal on macOS or Linux (Windows works via WSL2).
- **Node.js &ge; 18** for Claude Code and `context-mode` (22+ recommended on Linux).
- **Python 3.11+** with `uv` or `pip` for Docling and GEPA.
- **Git**, and a project directory under version control so you can see what Claude changes.
- An **Anthropic account** for logging into Claude Code.
- *(optional)* the **`gh` CLI** for GitHub workflows.

### Quick start

```bash
# 1) Install Claude Code.
npm install -g @anthropic-ai/claude-code

# 2) Clone this workshop.
git clone git@github.com:aihpi/workshop-rapid-prototyping.git
cd workshop-rapid-prototyping

# 3) Open the first notebook in Jupyter or VS Code.
jupyter lab 03_notebooks/w1_00_overview.ipynb
```

Each notebook is self-contained and safe to read top-to-bottom. The copy-paste blocks are meant to be run in a separate terminal running `claude`, not in the notebook itself.

## User guide

### Using the notebooks

1. Open `w1_00_overview.ipynb` and skim the series map.
2. Work through `w1_01` &rarr; `w1_02` in order &mdash; they establish the mental model.
3. The tool-specific notebooks (`w1_03` through `w1_06`) can be read in any order, but `w1_03` pairs nicely with `w1_05`.

### Recommendations

- Keep a Claude Code terminal open next to the notebook. Read a section, paste a prompt, compare the output.
- The companion files in `03_notebooks/assets/` are meant to be opened and read, not just referenced.

## Limitations

- **No test suite.** The notebooks are teaching material; there is nothing to run with `pytest`.
- **Scope.** Part 1 covers sections 1&ndash;6 of the [Claude Code best-practices guide](https://code.claude.com/docs/en/best-practices). Sections 7&ndash;11 (session management, automation, scaling, failure patterns, intuition) are deferred to future parts.
- **Tool versions move fast.** If a slash command has been renamed or a flag removed since writing, check the upstream docs.

## References

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
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
