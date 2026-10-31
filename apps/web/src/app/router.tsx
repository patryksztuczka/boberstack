import { createBrowserRouter } from "react-router";

import {
  redirectSignedIn,
  requireSession,
  SignInPage,
  SignUpPage,
} from "../features/auth/index.ts";
import { todosQuery, TodosPage } from "../features/todos/index.ts";
import { WelcomePage } from "../features/welcome/index.ts";
import { m } from "../paraglide/messages.js";
import { queryClient } from "../shared/query-client.ts";
import { AppLayout } from "./app-layout.tsx";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    hydrateFallbackElement: <div className="min-h-svh" />,
    errorElement: <p className="p-8 text-destructive">{m.todos_load_failed()}</p>,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: "sign-in", loader: redirectSignedIn, element: <SignInPage /> },
      { path: "sign-up", loader: redirectSignedIn, element: <SignUpPage /> },
      {
        path: "todos",
        loader: async () => {
          await requireSession();

          return queryClient.ensureQueryData(todosQuery);
        },
        element: <TodosPage />,
      },
    ],
  },
]);
