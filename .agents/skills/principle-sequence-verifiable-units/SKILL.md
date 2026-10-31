---
name: principle-sequence-verifiable-units
description: Apply to multi-step work (a migration, a sweep, a run of similar edits) and to how you order commits and pull requests. Split the work into small units that each end in a state you can check, check each before the next, and order delivery so the sequence proves itself.
---

# Sequence verifiable units

A break caught in the unit that caused it is cheap to find. A break caught after a batch is buried under the work built on top of it.

## While working

Each unit is known-good state, one change, the check, then the next unit. The check is the narrowest one that covers the change: `pnpm check:changed`, one test file, one request against the dev stack. Start from a clean `master` so every check measures against the real baseline. Run `pnpm verify` once at the end, as AGENTS.md says.

When the units are many and alike, write the script that does them, and still run the check after each.

## In the history

Order commits so a reviewer can replay the argument:

- the failing test, then the fix;
- the removal, then the reshape (the `principle-subtract-before-you-add` skill);
- the scaffold, such as a schema, a port or a migration, then the feature on it;
- a change that needs owner sign-off in its own commit (AGENTS.md).

Each commit builds and passes on its own. Commit rules are in the `babysit-git` skill.
