# CLAUDE.md

# ------------------------------------------------------------
# Example CLAUDE.md for a small TypeScript/Node project.
# Every line that follows is annotated with "# keep" or "# cut"
# so you can see which rules pay rent and which just bloat the
# context window. Trim to your project.
# ------------------------------------------------------------

# Code style
- Use ES modules (import/export), not CommonJS (require).   # keep -- differs from many templates
- Destructure imports when possible: `import { foo } from 'bar'`.   # keep -- team convention

# Commands (Claude can't guess these)
- Run a single test file: `npm test -- path/to/file.test.ts`   # keep -- non-obvious
- Full test suite:         `npm test`                           # keep -- used often
- Typecheck:               `npm run typecheck`                  # keep -- referenced by workflow below
- Lint:                    `npm run lint`                       # keep

# Workflow
- Typecheck before finishing a series of code changes.   # keep -- enforces correctness
- Prefer running single tests over the full suite for speed.   # keep

# Don't touch
- Do not edit files under `dist/` -- they're generated.   # keep -- prevents costly mistakes

# Imports (pull richer context on demand)
- Git workflow: @docs/git-instructions.md
- Personal overrides: @~/.claude/my-project-instructions.md

# ------------------------------------------------------------
# Would-be entries we CUT (and why):
#
#   "Write clean, readable code."          # cut -- self-evident
#   "We use TypeScript."                   # cut -- visible from package.json
#   "Always add error handling."           # cut -- context-dependent
#   "Files are at src/foo.ts, src/bar.ts"  # cut -- findable by Claude
# ------------------------------------------------------------
