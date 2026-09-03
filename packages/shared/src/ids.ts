// Ids are plain strings. Callers generate them and pass them into operations,
// so recipes stay deterministic and never need to return a value, which matters
// because a value returned from an Immer recipe replaces the whole state.
export const newId = (): string => crypto.randomUUID();
