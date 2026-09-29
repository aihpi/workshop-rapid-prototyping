import { expect, test } from "@playwright/test";

// The one end-to-end path from the plan: load, play, edit, hear the change
// reflected in state, render to WAV. Recording goes through Chromium's fake
// microphone so it can run anywhere.
test("load, play, edit, record, render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".song-title")).toHaveValue(/Synth-pop demo|Scratch loop/);
  await expect(page.locator(".track-header")).toHaveCount(6);
  const clipsBefore = await page.locator(".clip").count();
  expect(clipsBefore).toBeGreaterThan(20);

  // play: the position readout advances
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".readout.mono")).not.toHaveText("1:1:1", { timeout: 5000 });
  await page.getByRole("button", { name: "Stop" }).click();

  // edit: double-click an empty spot (the Lead lane is empty until the second hook)
  // creates a clip and opens its editor
  const box = (await page.locator(".lanes").boundingBox())!;
  await page.mouse.dblclick(box.x + 2 * 96 + 20, box.y + 5 * 64 + 30);
  await expect(page.locator(".clip")).toHaveCount(clipsBefore + 1);
  await expect(page.locator(".piano-roll")).toBeVisible();
  const grid = (await page.locator(".piano-grid").boundingBox())!;
  await page.mouse.click(grid.x + 14, grid.y + 30 * 16 + 8);
  await expect(page.locator(".roll-note")).toHaveCount(1);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Add note");

  // undo works from the keyboard
  await page.keyboard.press("Control+z");
  await expect(page.locator(".roll-note")).toHaveCount(0);

  // record through the fake microphone (the transport has its own Record button, so scope to the recorder)
  await page.getByRole("button", { name: "Samples" }).click();
  const recorder = page.locator(".recorder");
  await recorder.getByRole("button", { name: /Record/ }).click();
  await page.waitForTimeout(800);
  await recorder.getByRole("button", { name: /Stop/ }).click();
  await expect(page.locator(".waveform canvas")).toBeVisible();

  // render: a fresh song keeps this fast (the full demo takes minutes offline
  // and is covered separately); the export must still produce a real WAV.
  await page.getByRole("button", { name: "Songs ▾" }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(page.locator(".song-title")).toHaveValue("Untitled");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export WAV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.wav$/);
  const path = await file.path();
  const { readFileSync } = await import("node:fs");
  const bytes = readFileSync(path!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
  expect(bytes.length).toBeGreaterThan(300_000);
});

// Regression for the mixer strips: the horizontal faders used to overflow
// under the next strip and were neither visible nor hit-testable.
test("mixer pan, reverb and delay are adjustable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mixer", exact: true }).click();
  const strip = page.locator(".strip:not(.master)").first();
  for (const name of ["Pan", "Reverb", "Delay"]) {
    const slider = strip.getByRole("slider", { name });
    const box = (await slider.boundingBox())!;
    expect(box.width, `${name} slider width`).toBeGreaterThan(80);
    const stripBox = (await strip.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(stripBox.x + stripBox.width + 1);
  }
  const pan = strip.getByRole("slider", { name: "Pan" });
  const before = await strip.locator(".fader-value").first().textContent();
  await pan.fill("-0.8");
  await expect(strip.locator(".fader-value").first()).not.toHaveText(before!);
});

// Transport state lives in the UI store; tempo and meter are document edits.
test("transport: loop, click, tempo and time signature", async ({ page }) => {
  await page.goto("/");
  const loop = page.getByRole("button", { name: "Loop" });
  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("l");
  await expect(loop).toHaveAttribute("aria-pressed", "false");

  const click = page.getByRole("button", { name: "Click" });
  await page.keyboard.press("m");
  await expect(click).toHaveAttribute("aria-pressed", "true");
  await click.click();
  await expect(click).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("combobox", { name: "Time signature" }).selectOption("3/4");
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Time signature");
  const tempo = page.getByRole("spinbutton", { name: "Tempo" });
  await tempo.fill("128");
  await tempo.press("Enter");
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Tempo");
  await expect(tempo).toHaveValue("128");
});

// The insert chain is driven by EFFECT_SPECS: adding a device shows its sliders.
test("effects: add, tweak and remove a device on the sound tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  const before = await page.locator(".device").count();
  await page.getByRole("combobox", { name: "Add effect" }).selectOption("filter");
  await expect(page.locator(".device")).toHaveCount(before + 1);
  const filter = page.locator(".device").last();
  await expect(filter.getByRole("slider", { name: "Frequency" })).toBeVisible();
  await filter.getByRole("slider", { name: "Resonance" }).fill("2");
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Effect");
  await filter.getByRole("button", { name: "Remove Filter" }).click();
  await expect(page.locator(".device")).toHaveCount(before);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Remove Filter");
});

// A lane opens under its track, a click adds a point, a double-click removes it.
test("automation lane on the first track", async ({ page }) => {
  await page.goto("/");
  await page.locator(".track-header").first().getByRole("button", { name: "Automation" }).click();
  const lane = page.locator(".automation-lane");
  await expect(lane).toBeVisible();
  await expect(page.locator(".automation-point")).toHaveCount(0);
  const box = (await lane.boundingBox())!;
  await page.mouse.click(box.x + 200, box.y + 20);
  await expect(page.locator(".automation-point")).toHaveCount(1);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Add automation point");
  await page.locator(".automation-point").dblclick();
  await expect(page.locator(".automation-point")).toHaveCount(0);
});

// Headless Chromium coalesces rapid moves inside a pointer capture and drops the rest, so drags are paced.
async function drag(page: import("@playwright/test").Page, from: [number, number], to: [number, number]): Promise<void> {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 4, from[1] + ((to[1] - from[1]) * i) / 4);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
}

// The pointer-capture gestures: loop handle, automation point, velocity bar, grouped note move.
test("drags: loop handle, automation point, velocity bar and grouped notes", async ({ page }) => {
  await page.goto("/");

  // loop brace: enable (first four bars), then drag the end handle two bars right
  const loop = page.getByRole("button", { name: "Loop" });
  await loop.click();
  const endBefore = Number(await loop.getAttribute("data-loop-end"));
  const ruler = (await page.locator(".ruler-canvas").boundingBox())!;
  const endX = ruler.x + (endBefore / 768) * 96;
  await drag(page, [endX - 3, ruler.y + 24], [endX + 2 * 96, ruler.y + 24]);
  await expect(loop).toHaveAttribute("data-loop-end", String(endBefore + 2 * 768));
  await expect(loop).toHaveAttribute("data-loop-start", "0");

  // automation: two points; dragging one onto the other's tick keeps both
  await page.locator(".track-header").first().getByRole("button", { name: "Automation" }).click();
  const lane = (await page.locator(".automation-lane").boundingBox())!;
  await page.mouse.click(lane.x + 96, lane.y + 10);
  await page.mouse.click(lane.x + 192, lane.y + 40);
  await expect(page.locator(".automation-point")).toHaveCount(2);
  const first = page.locator(".automation-point").first();
  const before = await first.getAttribute("style");
  const p = (await first.boundingBox())!;
  await drag(page, [p.x + 5, p.y + 5], [p.x + 5 + 96, p.y + 5 + 20]);
  await expect(page.locator(".automation-point")).toHaveCount(2);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Move automation point");
  expect(await first.getAttribute("style")).not.toBe(before);

  // notes: two notes, both selected, dragging one moves both by the same step
  const lanes = (await page.locator(".lanes").boundingBox())!;
  await page.mouse.dblclick(lanes.x + 2 * 96 + 20, lanes.y + 5 * 64 + 30);
  const grid = (await page.locator(".piano-grid").boundingBox())!;
  await page.mouse.click(grid.x + 14, grid.y + 30 * 16 + 8);
  await page.mouse.click(grid.x + 4 * 28 + 14, grid.y + 32 * 16 + 8);
  await expect(page.locator(".roll-note")).toHaveCount(2);
  const notes = page.locator(".roll-note");
  await notes.nth(0).click();
  await notes.nth(1).click({ modifiers: ["Shift"] });
  await expect(page.locator(".roll-note.selected")).toHaveCount(2);
  const xs = async () => Promise.all([0, 1].map(async (i) => (await notes.nth(i).boundingBox())!.x));
  const [x0, x1] = await xs();
  const n0 = (await notes.nth(0).boundingBox())!;
  await drag(page, [n0.x + 8, n0.y + 6], [n0.x + 8 + 2 * 28, n0.y + 6]);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Move 2 notes");
  const [y0, y1] = await xs();
  expect(y0 - x0).toBeCloseTo(2 * 28, 0);
  expect(y1 - x1).toBeCloseTo(2 * 28, 0);

  // velocity: drag the first bar down, its title changes and the drag is one undo step
  const bar = page.locator(".vel-bar").first();
  await bar.scrollIntoViewIfNeeded();
  const titleBefore = await bar.getAttribute("title");
  const b = (await bar.boundingBox())!;
  await drag(page, [b.x + 3, b.y + 2], [b.x + 3, b.y + 30]);
  expect(await bar.getAttribute("title")).not.toBe(titleBefore);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Velocity");
});

// One meter per strip, master included. Levels are written from the audio clock, not asserted here.
test("mixer has a meter on every strip", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mixer", exact: true }).click();
  const strips = await page.locator(".strip").count();
  await expect(page.locator(".meter")).toHaveCount(strips);
});

// Keyboard piano: with Keys on and record armed, a held letter lands in the open pattern as one take.
test("keyboard piano records a take into the open pattern", async ({ page }) => {
  await page.goto("/");
  const lanes = (await page.locator(".lanes").boundingBox())!;
  await page.mouse.dblclick(lanes.x + 2 * 96 + 20, lanes.y + 5 * 64 + 30);
  await expect(page.locator(".piano-roll")).toBeVisible();
  const quantise = page.getByRole("button", { name: /Quantise/ });
  await expect(quantise).toBeDisabled();

  // seek into the new clip, arm the keys and record
  await page.locator(".ruler-canvas").click({ position: { x: 2 * 96 + 30, y: 34 } });
  await page.getByRole("button", { name: "Keyboard piano" }).click();
  await page.getByRole("button", { name: "Record" }).click();
  await page.waitForTimeout(300);
  await page.keyboard.down("a");
  await page.waitForTimeout(250);
  await page.keyboard.up("a");
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator(".roll-note")).toHaveCount(1);
  await expect(page.locator(".history button").first()).toHaveAttribute("title", "Record take");

  // the take is one undo step; quantise is available now that there is a note (it already sits on the grid, so this is a no-op)
  await expect(quantise).toBeEnabled();
  await quantise.click();
  await page.getByRole("button", { name: "Keyboard piano" }).click();
  await page.keyboard.press("Control+z");
  await expect(page.locator(".roll-note")).toHaveCount(0);
});

// Importing a file from disk lands in the same trim-and-save flow as a recording.
test("samples: import a WAV from disk", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Samples" }).click();
  const rate = 44100;
  const frames = rate / 2;
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + frames * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) wav.writeInt16LE(Math.round(Math.sin(i / 20) * 12000), 44 + i * 2);
  await page.locator('input[type="file"]').setInputFiles({ name: "beep.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.locator(".waveform canvas")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Sample name" })).toHaveValue("beep");
});

// The dev server has no API behind it, so the drawer must explain how to
// configure the assistant instead of failing silently.
test("AI drawer opens and explains the missing configuration", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "AI assistant" })).toBeHidden();
  await page.keyboard.press("Control+k");
  const drawer = page.getByRole("complementary", { name: "AI assistant" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/AI is not configured/)).toBeVisible();
  await expect(drawer.getByRole("textbox", { name: "Message" })).toBeDisabled();
  await page.getByRole("button", { name: "Close assistant" }).click();
  await expect(drawer).toBeHidden();
});
