# 0005 — v1 ships light-only

**Context.** Dark mode is close to expected in a modern web app, but the primary contexts for this one are classroom projectors, printed handouts, and screenshots pasted into slides and messages, all of which assume a light surface.

**Decision.** v1 ships light-only, with the design tokens structured as semantic CSS custom properties (`--paper`, `--ink`, `--cost`, `--gain`) so a dark theme is a later addition of one token block rather than a refactor.

**Consequence.** Some users on a dark-mode phone will see a bright page, which is a real cost accepted knowingly; the mitigation is that no component may reference a raw hex value, so nothing has to be hunted down when the second theme arrives.
