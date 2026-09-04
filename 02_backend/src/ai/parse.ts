/**
 * Pulls the one JSON object out of whatever a model wrote around it: qwen's
 * `<think>` blocks, markdown fences, a trailing sentence. Returns null when
 * no balanced object is found; the caller decides whether to ask again.
 */
export function extractJson(text: string): string | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return cleaned.slice(start, i + 1);
  }
  return null;
}
