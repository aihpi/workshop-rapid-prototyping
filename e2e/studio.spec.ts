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

  // record through the fake microphone
  await page.getByRole("button", { name: "Samples" }).click();
  await page.getByRole("button", { name: /Record/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Stop/ }).click();
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
