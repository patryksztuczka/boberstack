# Error screens

`apps/web/src/app/route-error.tsx` handles route failures. `ErrorBoundary` around the providers in `main.tsx` catches render failures outside the router. Both use `AppErrorPage`, which needs no session or router provider.

## Drive

1. Open a missing URL such as `/todoz`. It shows the beaver holding a map, a short message and "Back to home". Follow the link and check the welcome page appears.
2. In a browser-only harness, render a child that throws inside the real `ErrorBoundary`. It shows the beaver patching the dam, "Reload page" and "Back to home". No session navigation or exception details appear. Do not leave a crash route in the app.
3. Click "Reload page". The app loads normally again. Test the home link too.
4. Repeat the missing URL and failure screen at a phone viewport. The illustration, message and buttons must fit without horizontal scrolling.

## What usually lies

- **A fallback that depends on the failed layout.** Keep the crash screen outside `AppLayout` and use ordinary anchors for recovery. A broken session provider or router must not stop the user returning home.
- **A static error preview.** It proves the picture renders, not that a thrown exception reaches the boundary. Trigger a real render failure too.
- **A hidden details element.** Even collapsed details disclose the exception. The screen never renders the exception or stack.
