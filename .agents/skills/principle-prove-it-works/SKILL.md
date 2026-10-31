---
name: principle-prove-it-works
description: Apply before saying a task is done. Check the real result directly, by running the feature, reading the actual value or inspecting the diff, not through a proxy, a self-report or "it compiles".
disable-model-invocation: true
---

# Prove it works

Unverified work has unknown correctness. Passing tests, a green typecheck or a subagent saying "done" are claims about the work, not the work.

## Check the real thing

- **A user-visible change**: run it in the app with the `verify-web` skill. `pnpm dev:doctor` checks that the stack is up before you drive it.
- **An endpoint**: send the request to the running Worker and read the response, or run `pnpm cli health`.
- **SQL or a migration**: `pnpm test:integration`, then read the rows on the local database.
- **Mail**: open it in this checkout's Mailpit inbox.
- **A subagent's work**: read its diff and rerun its command. Its summary is a claim.

When the check fails, suspect the way you observed before the system: the wrong port, another checkout's stack, a stale build, a cached page.

## Script it when you can

The strongest proof is a command a reviewer can rerun, such as a test, a script or a `curl`, with its output pasted next to the claim. A one-off look is weaker.

Report what you ran and what it printed. If a check was skipped, say which one and why.
