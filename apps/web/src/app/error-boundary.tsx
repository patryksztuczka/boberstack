import { Component } from "react";
import type { ReactNode } from "react";

import { AppErrorPage } from "./app-error-page.tsx";

export class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? <AppErrorPage /> : this.props.children;
  }
}
