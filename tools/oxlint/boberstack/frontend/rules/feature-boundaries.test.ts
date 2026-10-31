import { tester } from "../../../rule-tester.ts";
import { featureBoundariesRule } from "./feature-boundaries.ts";

const todosPage = "apps/web/src/features/todos/components/todos-page.tsx";

const router = "apps/web/src/app/router.tsx";

const queryClient = "apps/web/src/shared/query-client.ts";

const upward = { messageId: "upward" };

const feature = { messageId: "feature" };

tester.run("@boberstack/frontend/feature-boundaries", featureBoundariesRule, {
  valid: [
    { code: 'import { todosQuery } from "../api/todos.queries.ts";', filename: todosPage },
    { code: 'import { NewTodoForm } from "../forms/new-todo-form.tsx";', filename: todosPage },
    { code: 'import { authClient } from "../../auth/index.ts";', filename: todosPage },
    { code: 'import { authClient } from "../../auth";', filename: todosPage },
    { code: 'import { queryClient } from "../../../shared/query-client.ts";', filename: todosPage },
    { code: 'import { runPromise } from "../../../runtime.ts";', filename: todosPage },
    { code: 'import { TodosPage } from "../features/todos/index.ts";', filename: router },
    { code: 'import { queryClient } from "../shared/query-client.ts";', filename: router },
    { code: 'import { Button } from "@boberstack/ui/components/button";', filename: queryClient },
    { code: 'import { cn } from "./cn.ts";', filename: queryClient },
    { code: 'import { router } from "./app/router.tsx";', filename: "apps/web/src/main.tsx" },
    {
      code: 'import { TodosHttpClientLayer } from "./features/todos/api/todos-http-client.ts";',
      filename: "apps/web/src/runtime.ts",
    },
    {
      code: 'import { x } from "../features/todos/api/todos.queries.ts";',
      filename: "apps/api/src/app.layer.ts",
    },
  ],
  invalid: [
    {
      code: 'import { SignInPage } from "../../auth/forms/sign-in-form.tsx";',
      filename: todosPage,
      errors: [feature],
    },
    {
      code: 'export { authClient } from "../../auth/api/auth-client.ts";',
      filename: todosPage,
      errors: [feature],
    },
    {
      code: 'import { TodosPage } from "../features/todos/components/todos-page.tsx";',
      filename: router,
      errors: [feature],
    },
    {
      code: 'import { todosQuery } from "./features/todos/api/todos.queries.ts";',
      filename: "apps/web/src/main.tsx",
      errors: [feature],
    },
    {
      code: 'import { router } from "../../../app/router.tsx";',
      filename: todosPage,
      errors: [upward],
    },
    {
      code: 'import { TodosPage } from "../features/todos/index.ts";',
      filename: queryClient,
      errors: [upward],
    },
    {
      code: 'import { AppLayout } from "../../app/app-layout.tsx";',
      filename: "apps/web/src/shared/i18n/language-switcher.tsx",
      errors: [upward],
    },
    {
      code: 'const page = await import("../../auth/forms/sign-in-form.tsx");',
      filename: todosPage,
      errors: [feature],
    },
  ],
});
