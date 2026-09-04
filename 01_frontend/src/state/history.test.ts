import { describe, expect, it } from "vitest";

import { History } from "./history.ts";

type Doc = { items: string[]; title: string };
const base = (): Doc => ({ items: [], title: "a" });

describe("History", () => {
  it("undoes and redoes a single edit", () => {
    const h = new History<Doc>();
    const s1 = h.apply(base(), "add", (d) => void d.items.push("x"));
    expect(s1.items).toEqual(["x"]);
    expect(h.canUndo).toBe(true);

    const s0 = h.undo(s1);
    expect(s0).toEqual(base());
    expect(h.canRedo).toBe(true);
    expect(h.redoLabel).toBe("add");

    expect(h.redo(s0)).toEqual(s1);
  });

  it("a recipe that changes nothing leaves no trace", () => {
    const h = new History<Doc>();
    const s = base();
    const same = h.apply(s, "noop", () => {});
    expect(same).toBe(s);
    expect(h.canUndo).toBe(false);
  });

  it("a new edit after undo clears the redo stack", () => {
    const h = new History<Doc>();
    const s1 = h.apply(base(), "one", (d) => void (d.title = "b"));
    const s0 = h.undo(s1);
    h.apply(s0, "two", (d) => void (d.title = "c"));
    expect(h.canRedo).toBe(false);
  });

  it("a transaction with dependent edits undoes as one step, in the right order", () => {
    const h = new History<Doc>();
    h.begin("drag");
    let s = base();
    s = h.apply(s, "drag", (d) => void d.items.push("1"));
    s = h.apply(s, "drag", (d) => void d.items.push("2"));
    s = h.apply(s, "drag", (d) => void d.items.push("3"));
    h.commit();
    expect(s.items).toEqual(["1", "2", "3"]);

    // Three array pushes are index-dependent: undo them in the wrong order and
    // Immer either throws or leaves garbage behind. One undo must give [].
    const back = h.undo(s);
    expect(back.items).toEqual([]);
    expect(h.canUndo).toBe(false);

    const again = h.redo(back);
    expect(again.items).toEqual(["1", "2", "3"]);
  });

  it("abort discards the open transaction and touches nothing else", () => {
    const h = new History<Doc>();
    let s = h.apply(base(), "keep", (d) => void (d.title = "kept"));
    h.begin("drag");
    s = h.apply(s, "drag", (d) => void (d.title = "dragging"));
    s = h.apply(s, "drag", (d) => void d.items.push("x"));
    s = h.abort(s);
    expect(s).toEqual({ items: [], title: "kept" });
    expect(h.undoLabel).toBe("keep");
  });

  it("an empty transaction does not enter history", () => {
    const h = new History<Doc>();
    h.begin("nothing");
    h.commit();
    expect(h.canUndo).toBe(false);
  });

  it("undo during an open transaction commits it first", () => {
    const h = new History<Doc>();
    h.begin("drag");
    const s1 = h.apply(base(), "drag", (d) => void (d.title = "z"));
    const s0 = h.undo(s1);
    expect(s0.title).toBe("a");
    expect(h.canRedo).toBe(true);
  });

  it("forgets the oldest entries beyond the limit", () => {
    const h = new History<Doc>(3);
    let s = base();
    for (let i = 0; i < 5; i++) s = h.apply(s, `edit ${i}`, (d) => void d.items.push(String(i)));
    for (let i = 0; i < 3; i++) s = h.undo(s);
    expect(h.canUndo).toBe(false);
    expect(s.items).toEqual(["0", "1"]);
  });
});
