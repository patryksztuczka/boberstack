---
name: verify-mobile
description: Prove a change works in the running mobile app, not only in tests. Use after any change a user could see or hit in apps/mobile, or in packages/client-runtime, packages/domain or packages/ui when the mobile app uses it, before you say it is done, and whenever the user asks to check, tap through, smoke test or screenshot the mobile app or the iOS simulator.
---

# Verify mobile

Green tests are not proof. This skill drives the Expo app in the iOS simulator the way a person would, with agent-device, and keeps the evidence. It is the mobile half of the `verify-web` skill; the web app's checks stay there.

Run the five steps in order. A step that fails is the result; do not skip to the next one and report success.

## 1. Launch

The app talks to this checkout's `pnpm dev`, so start with the web skill's launch: reuse a running stack (`pnpm -s dev:status`) or start `pnpm dev` in the background and wait for `dev: ready`.

Pick a simulator nobody else is using. One simulator runs one copy of a bundle id, and another worktree may own the booted one:

```sh
xcrun simctl list devices available | grep iPhone
```

Take a `Shutdown` iPhone, or the `Booted` one only when no other checkout runs the app on it. Then build and start the app on it in the background:

```sh
pnpm dev:mobile -- --device "iPhone 18 Pro"
```

The first run generates `apps/mobile/ios`, installs the pods and compiles for several minutes. It is ready when the log prints `Installing on` and `Opening on` the simulator. A later run only starts Metro. A new native dependency or a change to `app.config.ts` needs `pnpm --filter @boberstack/mobile exec expo prebuild --clean` first ([mobile.md](../../../docs/operations/mobile.md)).

## 2. Doctor

```sh
pnpm dev:doctor
```

Every line must say `OK`; it also creates the demo user `demo@example.com` / `demo12345`. Fix the environment before you touch the simulator.

## 3. Drive

agent-device is a devDependency; run it with `pnpm -s device`. Before the first command, read its guides for the installed version:

```sh
pnpm -s device help
pnpm -s device help react-native
```

Give the run its own session and point it at this checkout's Metro, so the app loads this worktree's bundle. `LAUNCH` is the link `expo run:ios` opens the app with; it keeps the development client's floating menu button off the header, where it covers Sign out:

```sh
METRO="$(node -p 'require("./.dev/state.json").ports.metro')"
LAUNCH="exp+boberstack://?__expo_url=http%3A%2F%2Flocalhost%3A$METRO&__expo_disable_fab=1&__expo_disable_onboarding=1"
SESSION="verify-mobile-$(basename "$PWD")"
EVIDENCE="$PWD/.scratch/evidence"

pnpm -s device open com.boberstack.app.dev --platform ios --device "iPhone 18 Pro" --session "$SESSION" --metro-port "$METRO" --launch-url "$LAUNCH" --relaunch
pnpm -s device press 'id="welcome-sign-in"' --session "$SESSION" --settle
pnpm -s device fill 'id="sign-in-email"' "demo@example.com" --session "$SESSION" --settle
pnpm -s device fill 'id="sign-in-password"' "demo12345" --session "$SESSION" --settle
pnpm -s device press 'id="sign-in-submit"' --session "$SESSION" --settle
pnpm -s device wait 'id="new-todo-title"' 10000 --session "$SESSION"
pnpm -s device screenshot "$EVIDENCE/mobile-todos.png" --session "$SESSION"
```

If the `wait` times out on "Save Password?", iOS is asking over the app: `press 'role="button" label="Not Now"'` and wait again.

Then open the feature file for what you changed and follow its steps:

- [features/todos.md](features/todos.md): sign in, add, toggle, remove, sign out

Select controls by `id="<testID>"`. Every control in `apps/mobile/src` has one (the `@boberstack/frontend/accessible-controls` lint rule, [mobile.md](../../../docs/operations/mobile.md#accessibility-and-test-ids)); read them from the screen's source or from `snapshot -i`. A ref like `@e3` comes from your own latest snapshot and goes stale after every change on the screen. Every relaunch needs the same `--metro-port` and `--launch-url`. After a JavaScript change, `pnpm -s device metro reload --session "$SESSION"` loads it without a rebuild.

Drive it like a user, not like a test. Type into the field, tap the button, wait for what a person would see (`wait 'id="..."'` or `wait text "..."`, not a sleep). Do the thing twice when the feature file says so. A red box or a LogBox warning over the app is a finding: take `screenshot --overlay-refs`, then `react-native dismiss-overlay`, and report it.

## 4. Evidence

Save screenshots and recordings to `.scratch/evidence/` (gitignored), with absolute paths. Name each screenshot of a screen your change alters `<screen>.after.png`, and take a `<screen>.before.png` of the same screen in the same state without your change: before you edit, or from the base commit in its own worktree, where `pnpm dev` gets its own ports. The pull request shows them side by side (the `file-pr` skill). For a recording, `record start "$EVIDENCE/<name>.mp4"` before the steps and `record stop` after. In your final message, quote:

- the doctor output,
- each step you drove and what you saw, in one line each,
- the screenshot and recording paths, embedded when the host renders them,
- the lines from `.dev/logs/api.log` that cover your requests, and any error in them, in `pnpm -s device logs` or on the screen.

For a pull request, upload the same files with `pnpm -s pr-evidence` (the `file-pr` skill). When that upload is not set up, the chat is the only place the user sees them, so embed them there.

If you could not drive a step, say which and why. "Verified" without this evidence is a claim, not a result.

## 5. Cleanup

- `pnpm -s device close --session "$SESSION"`. Add `--shutdown` only when you booted the simulator yourself.
- Stop the `pnpm dev:mobile` you started, and a `pnpm dev` you started (`pnpm dev:stop`). Leave ones you reused running.
- Remove your test todos only when the feature file asks for a clean list.

## When the app lies

- **Sign out does nothing.** The tap landed on the development client's floating menu button, which opens the Expo menu ("Reload", "Go home") instead. The app was opened without `--launch-url "$LAUNCH"`; close the menu with `press 'role="button" label="Close"'` and relaunch with it.
- **Sign-in seems to hang.** iOS shows "Save Password?" over the app after the first sign-in on a simulator, and `wait` times out behind it. Dismiss it with `press 'role="button" label="Not Now"'`; the plain `label="Not Now"` matches three elements.
- The simulator has no accelerometer: the beaver on the welcome screen only glances around. Tilt cannot be verified here.
- The app keeps its session in the keychain across launches, so `open --relaunch` may land on Todos, not on the welcome screen. Sign out first (`id="sign-out"`) when the flow starts signed out.
- A stale bundle from another worktree's Metro looks like your change did nothing. Check that the `--metro-port` matches `node scripts/dev.mjs ports`.
- **A 401 that looks like an empty list.** The api answers 401 when the cookie did not reach it; the app then drops the session and shows sign-in with a "Your session ended" note. Check `.dev/logs/api.log` for `401` before you believe an empty list.
- **Data that only lives in the atom.** A mutation that forgets its reactivity key looks right until a relaunch. Relaunch after every write you check.
- **The same data on two screens.** After a write on one screen, go back to the screen that shows the same data and check it moved too.

When you find a new one, add it here in one line with how to see it.
