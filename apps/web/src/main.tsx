import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/jetbrains-mono";
import "@boberstack/ui/globals.css";
import { RegistryProvider } from "@effect/atom-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { ErrorBoundary } from "./app/error-boundary.tsx";
import { router } from "./app/router.tsx";
import { clientAtoms } from "./runtime.ts";

const container = document.querySelector("#root");

if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <RegistryProvider initialValues={clientAtoms}>
          <RouterProvider router={router} />
        </RegistryProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
