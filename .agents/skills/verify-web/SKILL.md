---
name: verify-web
description: Prove a change works in the running app, not only in tests. Use after any change a user could see or hit in apps/web, apps/api, packages/domain, packages/ui, auth or migrations, before you say it is done, and whenever the user asks to check, click through, smoke test or screenshot the app.
---

# Verify web

Green tests are not proof. In this repo the todo form passed typecheck, lint and every unit test while the second add after a reset did nothing under the React Compiler. A person clicking twice found it in ten seconds. This skill is that person.

Run the five steps in order. A step that fails is the result; do not skip to the next one and report success.

## 1. Launch

```sh
pnpm -s dev:status
```

If it prints a state, reuse that server. Otherwise start one in the background and wait for the line `dev: ready`:

```sh
pnpm dev    # runs until stopped, so start it as a background task
```

`pnpm dev` derives its ports from this worktree's path, so two worktrees never share a port or a database. Never assume 5173 or 1337. Read the URLs from `.dev/state.json`:

```json
{ "status": "ready", "urls": { "web": "http://localhost:20040", "api": "http://localhost:20041" } }
```

`node scripts/dev.mjs ports` prints them without starting anything. `DEV_WEB_PORT`, `DEV_API_PORT` and `DEV_POSTGRES_PORT` override them.

## 2. Doctor

```sh
pnpm dev:doctor
```

It checks the launcher and its children, Postgres, that every file in `apps/api/migrations` is applied, `/api/health` on the api and through the web proxy, the HTML shell, the demo user, and an authenticated `GET /api/todos`. It creates the demo user when it is missing:

```
demo@example.com / demo12345
```

Every line must say `OK`. A `FAIL` names the log to read. Fix the environment before you touch the browser, or you will debug the wrong thing.

## 3. Drive

Open the feature file for what you changed and follow its "Drive" steps:

- [features/auth.md](features/auth.md): sign up, sign in, sign out, redirects
- [features/errors.md](features/errors.md): missing URLs, render crashes and recovery
- [features/todos.md](features/todos.md): list, add, toggle, remove, HTTP and RPC transports

Use the browser you have, in this order:

1. The host's browser tools (in-app preview, Claude in Chrome). Open a new tab on `urls.web`.
2. If they time out or are missing, headless Chrome through [headless-chrome.mjs](headless-chrome.mjs). It needs Chrome on the machine and nothing from npm. Write the script under `.scratch/verify/` and run it with `node`:

```js
import { readFileSync } from "node:fs";

import { openBrowser } from "../../.agents/skills/verify-web/headless-chrome.mjs";

const { urls } = JSON.parse(readFileSync(".dev/state.json", "utf8"));
const browser = await openBrowser(".scratch/evidence");

try {
  await browser.goto(`${urls.web}/sign-in`);
  await browser.type("#email", "demo@example.com");
  await browser.type("#password", "demo12345");
  await browser.click("form button[type=submit]");
  await browser.waitFor("location.pathname === '/todos'", "redirect to /todos");
  console.log(await browser.screenshot("todos"));
  console.log(browser.console);
} finally {
  browser.close();
}
```

Each run gets a fresh profile, so you start signed out. `browser.console` collects page errors and warnings.

Drive it like a user, not like a test. Type into the field, click the button, wait for what a person would see. Do the thing twice when the feature file says so. Change one thing at a time and look at the screen after each step.

## 4. Evidence

Save screenshots to `.scratch/evidence/` (gitignored). In your final message, quote:

- the doctor output,
- each step you drove and what you saw, in one line each,
- the screenshot paths, embedded as images when the host renders them,
- the lines from `.dev/logs/api.log` or `.dev/logs/web.log` that cover your requests, and any error or warning there or in `browser.console`.

If you could not drive a step, say which and why. "Verified" without this evidence is a claim, not a result.

## 5. Cleanup

- Stop a `pnpm dev` you started: `pnpm dev:stop`. Leave one you reused running.
- The Postgres container stays up between runs. Stop it with `node scripts/dev.mjs db:down`; its volume and the demo user survive.
- Close browser tabs you opened. `headless-chrome.mjs` deletes its profile on `close()`.
- Remove your test todos only when the feature file asks for a clean list.

## When the app lies

Each feature file ends with "What usually lies". Read it before you call a step good. When you find a new one, add it there in one line with how to see it.
