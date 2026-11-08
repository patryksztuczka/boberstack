# The mobile app is a native Expo client of the central api

**Status:** accepted, 2026-11-08; its consequence that React Query hooks stay per app is replaced by root ADR 0012.

We wanted phone apps without a second api. The desktop app could wrap the SPA because a window can take the place of the deployed origin (root ADR 0010). A phone app has no such origin: its pages would come from a custom scheme or from the network, and better-auth's browser client and cookies assume an `http(s)` origin. A WebView shell would also feel like a website in a frame and could not use the keychain or native navigation.

`apps/mobile` is an Expo / React Native app with native screens, and it calls the same api as the web app. The Effect clients for the api live in `packages/client-runtime` (`TodosClient`, `SignInMethodsClient`, `ApiOrigin`), and each app gives them its platform: the web app the browser's `fetch` on `location.origin`, the mobile app a `fetch` on `EXPO_PUBLIC_API_URL` that adds the session cookie. Sign-in goes through better-auth's Expo plugin: `expo()` on the server, `expoClient` with `expo-secure-store` in the app. The plugin keeps the session cookie in the keychain and sends the app's scheme as the origin, and the api lists the three app schemes as trusted origins in code. The api's cookie-based authentication does not change.

The native projects are generated (`expo prebuild`, continuous native generation) and Git ignores `apps/mobile/ios` and `android`. `APP_VARIANT` picks the development, preview or production build, each with its own bundle id and scheme. EAS builds them, and `expo-updates` ships JavaScript to every build whose native fingerprint matches.

This refines root ADR 0009: `apps/web` and `apps/mobile` depend on `domain` and `client-runtime`, not on `domain` alone. `client-runtime` depends on `domain` and Effect only, so neither app reaches `core` or an adapter.

## Consequences

- An endpoint the mobile app needs gets its client in `packages/client-runtime`, not in the app. React Query hooks, the better-auth client and the UI stay per app.
- A native dependency or an app config change needs a new build in the stores. A JavaScript change can go out as an update.
- Social sign-in needs a redirect back to the app's scheme and a provider setup for it; it is not built yet.
- A new variant or a renamed app needs its scheme added to the api's trusted origins.

## Considered options

- A WebView shell around the SPA, like the desktop app: no origin for the SPA and its cookies, and no native screens.
- Copying the api clients into the mobile app: two implementations of one contract that drift apart.
- better-auth's bearer plugin with a token in `Authorization`: a second way to authenticate on the api, when the Expo plugin keeps the existing cookie path working.
