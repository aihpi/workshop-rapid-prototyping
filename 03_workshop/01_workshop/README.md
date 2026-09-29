# Workshop 1: Build a drum machine by asking for it

Part 1 of the series *Rapid Prototyping via Vibe Coding*.

This session is deliberately light. You will not install anything, you will not open a terminal, and you will not write a line of code. You will describe a piece of software to a chatbot, save what it gives you, and click on it. By the end you will have a working drum machine in your browser, and a first feel for where this way of working is quick and where it quietly falls apart.

## What you need

- A browser.

## How it works

1. Open the `00_beat_machine_prompt.txt` file in this folder and copy the whole text.
2. Paste it into your chatbot (e.g., Gemini, ChatGPT; account required for Mistral or Claude) and send it.
3. The reply contains one long block of HTML. Copy it and save it as a file ending in `.html`, for example `beat_machine.html`.
4. Double-click the file. It opens in your browser and it is your drum machine.
5. Click something first, then press play. Browsers refuse to make a sound until you have interacted with the page.
6. Play with it. Then ask for changes in your own words and save the new version.

Work through the prompts in order. Prompts 2 to 4 build on the file you created with prompt 1, so paste your current HTML into the chat underneath the prompt text, where the file says to.

Prompt 4 works differently from the other three. It does not tell the assistant what to build, it makes the assistant ask you until the two of you agree, and then gives you a prompt to take somewhere else. That is the part of today that carries over to the rest of the series: the specifying is the work.

## The prompts

| File | What you get |
| --- | --- |
| `00_beat_machine_prompt.txt` | A sequencer. Its features are randomly decided by the assistant. |
| `01_beat_machine_prompt.txt` | A 16-step sequencer with eight drum sounds, play and stop, loop, tempo, mute and volume per instrument. |
| `02_sound_design_prompt.txt` | Controls to shape each sound: tune, decay, filters, distortion, delay, reverb, plus a master bus. |
| `03_database_prompt.txt` | Five genre presets, named patterns saved in the browser, and export and import as a JSON file. |
| `04_feature_prompt.txt` | Different from the others. You fill in a feature you want, the assistant interviews you about it instead of coding, and hands back a prompt you paste into a fresh chat to get it built. |

Nothing here is sacred. Change the prompts, take instruments out, put a cowbell in, ask for a different look. The prompts are a starting point, not an exam.

## Reference results

The `*.html` files in this folder are results generated ahead of the workshop, so you can see what to aim for. The naming is `model/model-NN_topic.html`, for example `claude/claude-01_beat_machine.html`. The same prompt gives different results from different models and on different days, so yours will not match, and that is the interesting part.

## What this does not give you

You just built something usable without reading the code. Notice what you also gave up. You cannot say whether the code is any good, whether it will still work after the next change, or what it would take for a second person to work on it. Everything lives in one file that no one has reviewed, and the only test is whether it sounds right to you.

That is a reasonable trade for a drum machine. It is a bad trade for anything with a login, a payment, or someone else's data in it.
