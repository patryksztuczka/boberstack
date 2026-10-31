create table "todo" (
  "id" uuid primary key default gen_random_uuid(),
  "ownerId" text not null references "user" ("id") on delete cascade,
  "title" text not null check (char_length("title") between 1 and 200),
  "completed" boolean not null default false,
  "createdAt" timestamptz not null
);

create index "todo_ownerId_createdAt_idx" on "todo" ("ownerId", "createdAt");
