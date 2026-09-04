import { describe, expect, it } from "vitest";

import { extractJson } from "./parse.ts";

describe("extractJson", () => {
  it("takes a bare object", () => {
    expect(extractJson('{"message":"hi","ops":[]}')).toBe('{"message":"hi","ops":[]}');
  });

  it("strips fences, think blocks and trailing prose", () => {
    const text = '<think>let me plan {not json}</think>\nSure!\n```json\n{"message":"a {brace} in \\"quotes\\"","ops":[{"op":"setBpm","bpm":120}]}\n```\nDone.';
    expect(JSON.parse(extractJson(text)!)).toEqual({ message: 'a {brace} in "quotes"', ops: [{ op: "setBpm", bpm: 120 }] });
  });

  it("returns null when nothing balanced is there", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson('{"message": "unterminated')).toBeNull();
  });
});
