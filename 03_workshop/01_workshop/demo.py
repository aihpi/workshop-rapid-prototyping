import marimo

__generated_with = "0.24.0"
app = marimo.App(width="full")


@app.cell(hide_code=True)
def _():
    from pathlib import Path

    import marimo as mo

    return Path, mo


@app.cell(hide_code=True)
def _(Path, mo):
    def label(path: Path) -> str:
        """Turn 01_simple_beat_machine_gpt into '01 Simple Beat Machine (GPT)'."""
        number, *topic, model = path.stem.split("_")
        pretty = {"gpt": "GPT", "chatgpt": "ChatGPT"}.get(model, model.title())
        return f"{number} {' '.join(topic).title()} ({pretty})"

    results = sorted(Path(__file__).parent.glob("*.html"))
    tabs = {label(p): mo.iframe(p.read_text(), height="900px") for p in results}

    mo.ui.tabs(tabs) if tabs else mo.md(
        "No results yet. Save a drum machine as `NN_topic_model.html` next to this notebook."
    )


if __name__ == "__main__":
    app.run()
