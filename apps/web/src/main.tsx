import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/jetbrains-mono";
import "@boberstack/ui/globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { ErrorBoundary } from "./app/error-boundary.tsx";
import { router } from "./app/router.tsx";
import { watchSessionExpiry } from "./app/session-expiry.ts";
import { queryClient } from "./shared/query-client.ts";

watchSessionExpiry(router, queryClient);

const container = document.querySelector("#root");

if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
