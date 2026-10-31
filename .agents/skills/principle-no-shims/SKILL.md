---
name: principle-no-shims
description: Replace old code instead of keeping it beside the new code. Use when a change introduces a new version of a function, component, endpoint, table or module ("V2", "new", "legacy", "deprecated", a re-export kept "for compatibility"), when you are about to keep an old path "just in case", or when the user asks to migrate, rename or replace something.
---

# No shims

Two versions of the same thing in one repo make every later reader guess which one is right, and the next agent tends to add a third. This repo has no external consumers of its code, so there is nothing to stay compatible with: the new version replaces the old one in the same change.

The only exceptions are things outside the code that someone else holds: the public HTTP API and RPC contract once a client you do not deploy uses it, database columns while a migration is running, and stored data. For those, write an ADR with the removal date before you add the second version.

## Steps

1. **Prove the replacement.** Tests for the new path pass, and they cover what callers of the old path rely on. Copy the old path's tests to the new one before you delete them.
2. **Move every caller.** Find them with a search for the old name, then let `pnpm typecheck` find the rest.
3. **Delete the old path in the same change:** the function, its tests, its exports, its re-exports, its feature flag, and any dependency only it used.
4. **Let the tools confirm.** `pnpm check:knip` reports nothing unused, `pnpm typecheck` and `pnpm test` pass. Paste the output.

## Names that mean a shim was left behind

`V2`, `New`, `Old`, `Legacy`, `Deprecated`, `Compat`, `Temp`, a function that only forwards to another, a re-export from a module's old location, a `@deprecated` JSDoc tag. When you see one in your own diff, finish the steps above. When you see one already in the repo, report it; removing it is a separate change.
