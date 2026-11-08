# Mobile app

`apps/mobile` is a native Expo app that talks to the same api as the web app (root ADR 0011). It signs in with email and password and manages todos. iOS is the platform we run day to day; Android builds from the same code.

## Set up once

- Xcode with an iOS simulator runtime. `xcrun simctl list devices available` should list an iPhone.
- CocoaPods. `expo run:ios` runs `pod install` and tries to install CocoaPods itself when `pod` is missing. If that fails, install it yourself (`brew install cocoapods`, or `gem install cocoapods` into a Ruby of your own) and make sure `pod` is on your `PATH`.
- For Android, Android Studio with an emulator and `ANDROID_HOME` set.

## Run it against your dev stack

Start `pnpm dev` first. Then, in a second terminal:

```sh
pnpm dev:mobile                                # builds the development variant and opens it in the default iOS simulator
pnpm dev:mobile -- --device "iPhone 17"        # pick the simulator; arguments after -- go to expo run:ios
```

The command needs the dev stack of this checkout to be ready. It sets `APP_VARIANT=development` and points `EXPO_PUBLIC_API_URL` at the web URL `pnpm dev` printed, where Vite forwards `/api` to the Worker, the same way the web app reaches it. Metro runs on a port derived from the checkout path like the other dev ports; `DEV_METRO_PORT` overrides it.

The first run generates `apps/mobile/ios` (Git ignores it), installs the pods and compiles the app, which takes several minutes. Later runs reuse the build and only start Metro. A change under `apps/mobile/src` or in a workspace package reloads in the simulator. A new native dependency or a change to `app.config.ts` needs a new native build: run `pnpm --filter @boberstack/mobile exec expo prebuild --clean` and then `pnpm dev:mobile` again.

Sign in as `demo@example.com` / `demo12345` after `pnpm dev:doctor` has created that user.

On the Android emulator `localhost` is the emulator itself. Run the app with the host machine's address instead:

```sh
cd apps/mobile
APP_VARIANT=development EXPO_PUBLIC_API_URL=http://10.0.2.2:<web port> pnpm exec expo run:android
```

## Variants

`APP_VARIANT` picks one of three builds, which can sit side by side on one device:

| `APP_VARIANT`           | Name                   | Bundle id and package        | URL scheme           |
| ----------------------- | ---------------------- | ---------------------------- | -------------------- |
| `development`           | `boberstack (dev)`     | `com.boberstack.app.dev`     | `boberstack-dev`     |
| `preview`               | `boberstack (preview)` | `com.boberstack.app.preview` | `boberstack-preview` |
| `production` (or unset) | `boberstack`           | `com.boberstack.app`         | `boberstack`         |

`app.config.ts` holds the table. The api trusts all three schemes as origins (`packages/auth/src/better-auth.ts`), so a new variant needs its scheme added there too.

`EXPO_PUBLIC_API_URL` is the api origin the app talks to, such as the deployed app's URL. Expo builds it into the app config, so set it before you start Metro or a build. The app stops at launch with a message naming the variable when it is missing.

## Styling

Screens use Tailwind classes in `className`, which Uniwind turns into React Native styles when Metro bundles the app. The colours and radii come from `packages/ui/src/styles/tokens.css`, the same file the web app imports, so `bg-primary` or `text-muted-foreground` is the same colour on both. `apps/mobile/global.css` imports Tailwind, Uniwind and those tokens. Change a token in `tokens.css` and both apps follow; restart Metro with `--clear` if the simulator keeps the old value.

`apps/mobile/uniwind-types.d.ts` adds `className` to the React Native types. `pnpm install` generates it and Metro rewrites it on start; Git ignores it.

The mobile app is light only. The dark values in `tokens.css` sit under the web's `.dark` class, which Uniwind does not treat as its dark theme.

## Welcome screen

A signed-out user lands on the welcome screen with the same beaver as the web app. The drawing lives once, as data, in `packages/ui/src/beaver/beaver-art.ts`; the web app renders it as DOM SVG and the mobile app through `react-native-svg`. The web animates it with `beaver.css`, the mobile app with Reanimated, using the keyframes in `apps/mobile/src/features/welcome/motion/keyframes.ts`. Change a keyframe in one and change it in the other.

The eyes follow the phone's tilt through the accelerometer (`expo-sensors`). The simulator has no accelerometer, so there the beaver only glances around. A tap pops the beaver and plays a haptic. With Reduce Motion on, the beaver stands still.

Reading the accelerometer needs no permission on iOS. The `expo-sensors` config plugin still writes `NSMotionUsageDescription` into the Info.plist, because the module links CoreMotion's pedometer and App Store review expects the key with it.

## How the session works

The better-auth Expo plugin keeps the session cookie in the iOS keychain or the Android keystore through `expo-secure-store`. The screens read their data from the shared atoms in `packages/client-runtime` (root ADR 0012). `apps/mobile/src/runtime.ts` seeds them with the clients over a `fetch` that sends that cookie in a `cookie` header, so the api checks it the same way it checks the browser's cookie. The Todos screen keeps its atoms in its own registry (`apps/mobile/src/app/session-atoms.tsx`): pull to refresh re-runs the list, and leaving the screen interrupts what is still running. When the api answers 401 to any call, the client reports it, the app drops the session and shows the sign-in screen with a note that the session expired. Signing out removes the Todos screen, and its registry and cached todos go with it.

## Builds and updates with EAS

`apps/mobile/eas.json` has one build profile per variant. `development` builds a development client, `preview` an internal build, and `production` a store build whose build number EAS raises on every build.

The project has no EAS project yet. Once, with an Expo account:

```sh
cd apps/mobile
npx eas-cli init               # creates the EAS project and writes extra.eas.projectId
npx eas-cli update:configure   # writes updates.url
```

Both commands write into the app config. `app.config.ts` is code, so they print the values instead: copy `extra.eas.projectId` and `updates.url` into `appConfig` in `app.config.ts`. Then add `EXPO_PUBLIC_API_URL` to each EAS environment (`npx eas-cli env:create`), and build:

```sh
npx eas-cli build --profile preview --platform ios
```

`expo-updates` ships JavaScript changes without a store release. The runtime version is a fingerprint of everything native: dependencies with native code, config plugins and the app config. `npx eas-cli update --channel preview` reaches every installed build whose fingerprint matches the update. A change that alters the fingerprint, such as a new native module, a different `EXPO_PUBLIC_API_URL` or a new icon, needs a new build first; `pnpm exec expo-updates fingerprint:generate` prints the current one.

## Icons

The icon is the beaver from `apps/desktop/resources/icon.png` on a white background. iOS refuses transparent icons, so `assets/icon.png` is that image flattened onto white. `assets/adaptive-icon.png` is the beaver alone, shrunk to fit Android's safe zone, on the white background colour from `app.config.ts`. `assets/splash-icon.png` is the beaver for the white launch screen.
