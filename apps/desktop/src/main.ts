import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Config, Deferred, Effect, Exit, Option, Path, Predicate } from "effect";
import { app, BrowserWindow, net, protocol, session, shell } from "electron";
import type { Event, WebContents } from "electron";

import { BundleReadError, RendererLoadError } from "./desktop.errors.ts";
import { NavigationVerdict, navigationVerdict } from "./navigation.ts";
import {
  appUrl,
  RendererSource,
  Resolution,
  resolveBundleRequest,
  withAppOrigin,
} from "./renderer-source.ts";
import type { Bundle } from "./renderer-source.ts";

const reasonOf = (cause: unknown) => (Predicate.isError(cause) ? cause.message : String(cause));

const notFound = () => new Response(null, { status: 404 });

const rendererSource = Effect.gen(function* () {
  const devServer = yield* Config.URL("DESKTOP_RENDERER_URL").pipe(Config.option);

  if (Option.isSome(devServer))
    return RendererSource.cases.DevServer.make({ url: devServer.value });

  const path = yield* Path.Path;
  const origin = yield* Config.URL("DESKTOP_APP_URL");

  return RendererSource.cases.Bundle.make({
    directory: path.resolve(app.getAppPath(), "..", "web", "dist"),
    origin,
  });
});

const throughNetwork = (request: Request) =>
  Effect.promise(() => net.fetch(request, { bypassCustomProtocolHandlers: true }));

const serveFile = Effect.fn("Desktop.serveFile")(function* (
  directory: string,
  relativePath: string,
) {
  const path = yield* Path.Path;
  const file = path.resolveWithin(directory, relativePath);

  if (Option.isNone(file)) return notFound();

  const url = yield* path.toFileUrl(file.value).pipe(Effect.option);

  if (Option.isNone(url)) return notFound();

  return yield* Effect.tryPromise({
    try: () => net.fetch(url.value.href),
    catch: (cause) => new BundleReadError({ file: file.value, reason: reasonOf(cause) }),
  }).pipe(Effect.catchTag("BundleReadError", () => Effect.succeed(notFound())));
});

const respond = (bundle: Bundle, request: Request) =>
  Resolution.match(resolveBundleRequest(bundle, new URL(request.url)), {
    File: (resolution) => serveFile(resolution.directory, resolution.relativePath),
    NotFound: () => Effect.succeed(notFound()),
    Api: () =>
      throughNetwork(
        new Request(request, { headers: withAppOrigin(request.headers, bundle.origin) }),
      ),
    Network: () => throughNetwork(request),
  });

const serveBundle = (bundle: Bundle) =>
  Effect.gen(function* () {
    const scheme = bundle.origin.protocol.replace(/:$/, "");
    const context = yield* Effect.context<Path.Path>();

    yield* Effect.acquireRelease(
      Effect.sync(() =>
        protocol.handle(scheme, (request) =>
          // BRIDGE: Electron's protocol.handle awaits a Promise<Response> for every request on the app's scheme
          Effect.runPromiseWith(context)(respond(bundle, request)),
        ),
      ),
      () => Effect.sync(() => protocol.unhandle(scheme)),
    );
  });

const denyPermissions = Effect.acquireRelease(
  Effect.sync(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
  }),
  () =>
    Effect.sync(() => {
      session.defaultSession.setPermissionRequestHandler(null);
      session.defaultSession.setPermissionCheckHandler(null);
    }),
);

const openExternally = (verdict: NavigationVerdict) =>
  NavigationVerdict.match(verdict, {
    Stay: () => undefined,
    OpenExternal: (external) => void shell.openExternal(external.url.href),
    Block: () => undefined,
  });

const guardNavigation = (contents: WebContents, home: URL) => {
  contents.setWindowOpenHandler((details) => {
    openExternally(navigationVerdict(home, details.url));

    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    const verdict = navigationVerdict(home, url);

    if (NavigationVerdict.guards.Stay(verdict)) return;

    event.preventDefault();
    openExternally(verdict);
  });

  contents.on("will-attach-webview", (event) => event.preventDefault());
};

const openMainWindow = Effect.fn("Desktop.openMainWindow")(function* (home: URL, icon: string) {
  const window = yield* Effect.sync(
    () =>
      new BrowserWindow({
        width: 1200,
        height: 800,
        icon,
        show: false,
        webPreferences: {
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          webviewTag: false,
        },
      }),
  );

  guardNavigation(window.webContents, home);
  window.once("ready-to-show", () => window.show());

  yield* Effect.tryPromise({
    try: () => window.loadURL(home.href),
    catch: (cause) => new RendererLoadError({ url: home.href, reason: reasonOf(cause) }),
  });
});

const focusMainWindow = () => {
  const [window] = BrowserWindow.getAllWindows();

  if (window === undefined) return;

  if (window.isMinimized()) window.restore();

  window.focus();
};

const reopenOnActivate = (home: URL, icon: string) =>
  Effect.gen(function* () {
    const context = yield* Effect.context<never>();

    const onActivate = () => {
      if (BrowserWindow.getAllWindows().length > 0) return;

      // BRIDGE: Electron emits activate as a plain event; the new window loads in its own fiber
      Effect.runForkWith(context)(
        openMainWindow(home, icon).pipe(
          Effect.catchTag("RendererLoadError", (error) =>
            Effect.logError("window not reopened").pipe(
              Effect.annotateLogs({ reason: error.reason }),
            ),
          ),
        ),
      );
    };

    yield* Effect.acquireRelease(
      Effect.sync(() => app.on("activate", onActivate)),
      () => Effect.sync(() => app.removeListener("activate", onActivate)),
    );
  });

const focusOnSecondInstance = Effect.acquireRelease(
  Effect.sync(() => app.on("second-instance", focusMainWindow)),
  () => Effect.sync(() => app.removeListener("second-instance", focusMainWindow)),
);

const listenForQuit = Effect.gen(function* () {
  const requested = yield* Deferred.make<void>();

  const onBeforeQuit = (event: Event) => {
    event.preventDefault();
    Deferred.doneUnsafe(requested, Exit.void);
  };

  const onAllWindowsClosed = () => {
    if (process.platform !== "darwin") Deferred.doneUnsafe(requested, Exit.void);
  };

  yield* Effect.acquireRelease(
    Effect.sync(() => {
      app.on("before-quit", onBeforeQuit);
      app.on("window-all-closed", onAllWindowsClosed);
    }),
    () =>
      Effect.sync(() => {
        app.removeListener("before-quit", onBeforeQuit);
        app.removeListener("window-all-closed", onAllWindowsClosed);
      }),
  );

  return requested;
});

const showIcon = (icon: string) =>
  Effect.sync(() => {
    if (process.platform === "darwin") app.dock?.setIcon(icon);
  });

const runShell = (source: RendererSource, icon: string) =>
  Effect.gen(function* () {
    const home = appUrl(source);
    const quitRequested = yield* listenForQuit;

    yield* focusOnSecondInstance;
    yield* Effect.promise(() => app.whenReady());
    yield* showIcon(icon);
    yield* denyPermissions;

    if (RendererSource.guards.Bundle(source)) yield* serveBundle(source);
    yield* reopenOnActivate(home, icon);
    yield* openMainWindow(home, icon);
    yield* Deferred.await(quitRequested);
  }).pipe(Effect.scoped);

const APP_NAME = "boberstack";

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const source = yield* rendererSource;
  const userData = yield* Config.String("DESKTOP_USER_DATA_DIR").pipe(Config.option);
  const icon = path.resolve(app.getAppPath(), "resources", "icon.png");

  yield* Effect.sync(() => app.setName(APP_NAME));

  if (Option.isSome(userData)) yield* Effect.sync(() => app.setPath("userData", userData.value));

  const isPrimary = yield* Effect.sync(() => app.requestSingleInstanceLock());

  if (isPrimary) yield* runShell(source, icon);

  yield* Effect.sync(() => app.quit());
});

program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
