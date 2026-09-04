import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Every colour in the app comes from hpi.css. This test is the rule's teeth:
// a hex literal anywhere else in src/ fails the build.
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("brand", () => {
  it("declares hex colours only in hpi.css", () => {
    const src = path.resolve(__dirname, "..");
    const offenders = walk(src)
      .filter((f) => !f.endsWith("hpi.css"))
      .flatMap((f) => {
        const hits = readFileSync(f, "utf8").match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g) ?? [];
        return hits.filter((h) => !/^#(root|\d)/.test(h)).map((h) => `${path.relative(src, f)}: ${h}`);
      });
    expect(offenders).toEqual([]);
  });

  it("uses at most one secondary colour as the accent", () => {
    const css = readFileSync(path.resolve(__dirname, "hpi.css"), "utf8");
    const secondaries = ["--hpi-purple", "--hpi-petrol", "--hpi-green", "--hpi-dark-green"];
    const used = secondaries.filter((token) => css.split(`${token}:`).length - 1 < css.split(`var(${token})`).length);
    expect(used.length).toBeLessThanOrEqual(1);
  });
});
