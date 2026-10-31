import { Schema } from "effect";

export const UserId = Schema.String.pipe(Schema.brand("UserId"));

export type UserId = typeof UserId.Type;

export class User extends Schema.Class<User, { readonly brand: unique symbol }>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}
