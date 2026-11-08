alter table "user" rename to "users";

alter table "session" rename to "sessions";

alter table "account" rename to "accounts";

alter table "verification" rename to "verifications";

alter table "todo" rename to "todos";

alter index "session_userId_idx" rename to "sessions_userId_idx";

alter index "account_userId_idx" rename to "accounts_userId_idx";

alter index "verification_identifier_idx" rename to "verifications_identifier_idx";

alter index "todo_ownerId_createdAt_idx" rename to "todos_ownerId_createdAt_idx";
