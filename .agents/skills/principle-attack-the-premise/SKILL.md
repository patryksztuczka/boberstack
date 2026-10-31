---
name: principle-attack-the-premise
description: Apply when two or more fixes that rest on the same assumption have failed the same check. Write the assumption down and test it directly before writing another fix.
---

# Attack the premise

Each failed fix is evidence against the belief it assumed. A third fix on the same belief spends effort where the evidence already says the cause is not.

## How

1. **Write the premise down.** One sentence that every failed fix assumed: "the session cookie reaches the Worker", "the migration ran before the test", "the store returns rows in insert order".
2. **Test the premise, not the next fix.** Find an observation that would come out differently if the premise were false, and make it: log the header the Worker received, read the migrations table, run the query twice and compare. Make the check a script or test you can rerun.
3. **Follow the evidence.**
   - It contradicts the premise: the cause is elsewhere. Look at what the failures have in common that the premise did not predict.
   - It confirms the premise: go one "why" deeper with the `principle-fix-root-causes` skill. The earlier fixes treated a consequence.
4. **Remove the condition instead of compensating for it.** A cleanup step, a retry or a sleep that tidies up after the cause leaves the cause in place and runs on every request.

Do not start the next fix before the premise is written down and tested.
