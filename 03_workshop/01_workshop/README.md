# Workshop 1: Build a drum machine by asking for it

Part 1 of the series *Rapid Prototyping via Vibe Coding*.

This session is deliberately light. You will not install anything, you will not
open a terminal, and you will not write a line of code. You will describe a piece
of software to a chatbot, save what it gives you, and click on it. By the end you
will have a working drum machine in your browser, and a first feel for where this
way of working is quick and where it quietly falls apart.

## What you need

- A browser.
- An account for a chatbot: ChatGPT, Claude, Gemini, Mistral, whatever you have.
- A folder on your machine to save files into.

That is all. No Node, no Python, no git.

## How it works

1. Open one of the `*_prompt.txt` files in this folder and copy the whole text.
2. Paste it into your chatbot and send it.
3. The reply contains one long block of HTML. Copy it and save it as a file ending
   in `.html`, for example `beat.html`.
4. Double-click the file. It opens in your browser and it is your drum machine.
5. Click something first, then press play. Browsers refuse to make a sound until
   you have interacted with the page.
6. Play with it. Then ask for changes in your own words and save the new version.

Work through the prompts in order. Prompts 2 to 4 build on the file you already
have, so paste your current HTML into the chat underneath the prompt text, where
the file says to.

Prompt 4 works differently from the other three. It does not tell the assistant
what to build, it makes the assistant ask you until the two of you agree, and then
gives you a prompt to take somewhere else. That is the part of today that carries
over to the rest of the series: the specifying is the work.

## The prompts

| File | What you get |
| --- | --- |
| `01_beat_machine_prompt.txt` | A 16-step sequencer with eight drum sounds, play and stop, loop, tempo, mute and volume per instrument. |
| `02_sound_design_prompt.txt` | Controls to shape each sound: tune, decay, filters, distortion, delay, reverb, plus a master bus. |
| `03_database_prompt.txt` | Five genre presets, named patterns saved in the browser, and export and import as a JSON file. |
| `04_feature_prompt.txt` | Different from the others. You fill in a feature you want, the assistant interviews you about it instead of coding, and hands back a prompt you paste into a fresh chat to get it built. |

Nothing here is sacred. Change the prompts, take instruments out, put a cowbell
in, ask for a different look. The prompts are a starting point, not an exam.

## Reference results

The `*.html` files in this folder are results generated ahead of the workshop, so
you can see what to aim for. The naming is `NN_topic_model.html`, for example
`01_beat_machine_claude.html`. Results from prompt 4 are named after whatever
feature you chose, so `04_swing_gpt.html` and the like. The same prompt gives
different results from
different models and on different days, so yours will not match, and that is the
interesting part.

Two ways to look at them:

- Double-click any `.html` file.
- Or run them side by side with the code hidden, from the repository root:

  ```
  uv run marimo run 03_workshop/01_workshop/demo.py
  ```

  This opens a page with one tab per result. `demo.py` picks up every `.html` file
  next to it automatically, so your own results appear there too once you save
  them into this folder.

## When it goes wrong

**The answer is split across several files, or into HTML, CSS and JS separately.**
Reply: "Please give me everything in one single self-contained HTML file, with the
CSS and JavaScript inline."

**No sound at all.** Click anywhere on the page, then press play. If it is still
silent, reply: "There is no sound. Make sure the AudioContext is created or
resumed on the first user click."

**The console complains about missing files like `kick.wav`.** The assistant has
assumed you own a sample library. Reply: "I have no audio files. Synthesise every
drum sound in code with the Web Audio API, using oscillators and noise buffers."

**The timing is sloppy or drifts.** Reply: "Schedule the notes against
AudioContext.currentTime with a lookahead scheduler instead of using setInterval."

**It worked and then a change broke it.** Go back to the last version that worked
and ask for the change again, more narrowly. Save each working version under a new
name. This is the cheapest habit in the whole workshop.

**The reply is cut off mid-file.** Reply: "Continue exactly where you stopped."

**It runs fine, then the whole browser gets sluggish after a few minutes of
playing.** This is the interesting failure of the day. Every note creates new Web
Audio nodes, and `stop()` only silences them, it does not remove them from the
audio graph. If nothing disconnects them they pile up and are processed forever,
a few more with every sixteenth note. The prompts here ask for the cleanup, but
assistants quietly drop it, so check. Reply: "Nodes created per note are never
disconnected, so the audio graph grows without limit. Disconnect the whole voice
chain on the source node's ended event, for every instrument."

To see it rather than guess at it, paste this into the browser console before you
press play, then watch the numbers:

```js
let made=0,gone=0; for (const k of Object.getOwnPropertyNames(BaseAudioContext.prototype).filter(n=>n.startsWith('create'))) { const o=BaseAudioContext.prototype[k]; if (typeof o==='function') BaseAudioContext.prototype[k]=function(){made++;return o.apply(this,arguments)}; } const d=AudioNode.prototype.disconnect; AudioNode.prototype.disconnect=function(){gone++;return d.apply(this,arguments)}; setInterval(()=>console.log('created',made,'disconnected',gone,'live',made-gone),5000)
```

`live` should climb to a small number and then sit there, however long you play.
If it keeps rising, the file leaks. Note it has to be `BaseAudioContext`, not
`AudioContext`: that is where `createGain` and the rest actually live, and patching
the wrong one silently counts nothing.

Worth pausing on when it happens to you. It sounded right, it looked right, and
it was wrong in a way you can only find by leaving it running.

## What this does not give you

You just built something usable without reading the code. Notice what you also
gave up. You cannot say whether the code is any good, whether it will still work
after the next change, or what it would take for a second person to work on it.
Everything lives in one file that no one has reviewed, and the only test is
whether it sounds right to you.

That is a reasonable trade for a drum machine. It is a bad trade for anything with
a login, a payment, or someone else's data in it.

Part 2 moves from a chat window to Claude Code in your own repository, where the
assistant can read your files, run your tests, and commit its work. Part 3 puts a
real backend and database behind it, which is what prompt 3 could not do.
