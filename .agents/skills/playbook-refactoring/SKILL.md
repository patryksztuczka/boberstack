---
name: playbook-refactoring
description: Change the structure of code without changing its behaviour. Pin the current behaviour first, name the missing structure, subtract, move in small steps that keep the pin green, prove nothing changed, and keep the change only if the code got easier to read. Use for a refactor, a cleanup, a restructure, a rename across modules, or "make this simpler".
---

# Refactoring

You own the contract. The structure changes; the behaviour does not. If the cleanup turns up a missing feature or a real bug, split it out: land the structural change first against the pinned behaviour, then the fix with the `playbook-bug-fix` skill or the feature with the `playbook-feature` skill.

Open a todo list with the eight steps.

1. **Pin the behaviour.** Read the code to learn its contract, then write what holds it: a characterization test through the public seam, a snapshot of a response, or a script that compares old and new outputs. Where the area has no tests, write the pin before moving anything. A green typecheck and lint are not a pin.
2. **Name the missing structure** with the `principle-model-the-domain` skill. Keep boring code that is already clear and local. The reshape must delete branches or invalid states, not add indirection.
3. **Name the target shape**: the module layout, types and call graph you would build today. If it crosses a module boundary, run the `architect` skill.
4. **Subtract first** (the `principle-subtract-before-you-add` skill): dead code, one-caller wrappers, redundant validators, orphan references.
5. **Move in small steps**, each keeping the pin green. For an API reshape, move every caller and delete the old API in the same change (the `principle-no-shims` skill). Check every rename against the files, including strings, docs, lint messages and skill links that a type check cannot see.
6. **Prove nothing changed** on the real thing, not "it compiles": rerun the pin, and for a larger reshape run the comparison script or drive the feature with the `verify-web` skill.
7. **Keep it only if it reads better** (the `principle-minimize-reader-load` skill). If the diff does not cut layers or state somewhere, revert it.
8. **Order the commits**: the subtraction, then the reshape, then any follow-up, each green on its own. Open the pull request with the `file-pr` skill.

**Reply:** the structure that changed, the pin you held it against, the proof that behaviour is unchanged, what got easier to read, and what you reverted. No new behaviour.
