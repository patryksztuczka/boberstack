import { Context } from "effect";

import type { User } from "./user.ts";

export class CurrentUser extends Context.Service<CurrentUser, User>()(
  "boberstack/domain/identity/CurrentUser",
) {}
