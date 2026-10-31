import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import {
  CheckEmailPage,
  EmailVerifiedPage,
  ForgotPasswordPage,
  redirectSignedIn,
  requireSession,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
} from "../features/auth/index.ts";
import { todosQuery, TodosPage } from "../features/todos/index.ts";
import { WelcomePage } from "../features/welcome/index.ts";
import { queryClient } from "../shared/query-client.ts";
import { AppLayout } from "./app-layout.tsx";
import { NotFoundPage, RouteError } from "./route-error.tsx";

export const privateRoutes: Array<RouteObject> = [
  {
    path: "todos",
    loader: () => queryClient.ensureQueryData(todosQuery),
    element: <TodosPage />,
  },
];

export const routes: Array<RouteObject> = [
  {
    element: <AppLayout />,
    hydrateFallbackElement: <div className="min-h-svh" />,
    errorElement: <RouteError />,
    children: [
      {
        children: [
          { index: true, element: <WelcomePage /> },
          { path: "sign-in", loader: redirectSignedIn, element: <SignInPage /> },
          { path: "sign-up", loader: redirectSignedIn, element: <SignUpPage /> },
          { path: "check-email", element: <CheckEmailPage /> },
          { path: "email-verified", element: <EmailVerifiedPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
          { middleware: [requireSession], children: privateRoutes },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
