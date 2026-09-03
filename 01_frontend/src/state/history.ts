import { applyPatches, enablePatches, produceWithPatches } from "immer";
import type { Draft, Objectish, Patch } from "immer";

enablePatches();

type Entry = { label: string; redo: Patch[]; undo: Patch[] };

/**
 * Undo history as Immer patches. Each entry costs as much as the edit it
 * records, not as much as the document, and undo is just applying the inverse
 * patches to produce a new document like any other edit would.
 *
 * A transaction (`begin` … `commit`) folds any number of edits into one entry,
 * which is how a fader drag becomes a single undo step.
 */
export class History<T extends Objectish> {
  private past: Entry[] = [];
  private future: Entry[] = [];
  private open: Entry | null = null;

  constructor(private readonly limit = 200) {}

  apply(state: T, label: string, recipe: (draft: Draft<T>) => void): T {
    const [next, redo, undo] = produceWithPatches(state, recipe);
    if (redo.length === 0) return state;

    if (this.open) {
      this.open.redo.push(...redo);
      // Inverse patches must run newest first, so each step's inverses go to
      // the front. `push` here produces silently wrong undos.
      this.open.undo.unshift(...undo);
    } else {
      this.push({ label, redo, undo });
    }
    this.future = [];
    return next;
  }

  begin(label: string): void {
    if (this.open) this.commit();
    this.open = { label, redo: [], undo: [] };
  }

  commit(): void {
    if (this.open && this.open.redo.length > 0) this.push(this.open);
    this.open = null;
  }

  /** Discards the open transaction and returns the state from before it began. */
  abort(state: T): T {
    const entry = this.open;
    this.open = null;
    return entry ? applyPatches(state, entry.undo) : state;
  }

  undo(state: T): T {
    if (this.open) this.commit();
    const entry = this.past.pop();
    if (!entry) return state;
    this.future.push(entry);
    return applyPatches(state, entry.undo);
  }

  redo(state: T): T {
    const entry = this.future.pop();
    if (!entry) return state;
    this.past.push(entry);
    return applyPatches(state, entry.redo);
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.open = null;
  }

  get canUndo(): boolean {
    return this.past.length > 0 || (this.open?.redo.length ?? 0) > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get undoLabel(): string | undefined {
    return this.open?.redo.length ? this.open.label : this.past.at(-1)?.label;
  }

  get redoLabel(): string | undefined {
    return this.future.at(-1)?.label;
  }

  private push(entry: Entry): void {
    this.past.push(entry);
    if (this.past.length > this.limit) this.past.shift();
  }
}
