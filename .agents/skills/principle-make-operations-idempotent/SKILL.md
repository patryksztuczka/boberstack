---
name: principle-make-operations-idempotent
description: Apply when writing anything that mutates state and can be retried, re-run or interrupted, such as a migration, a CLI command, a job, a mail send, a webhook handler or a deploy step. It must reach the same end state no matter how often it runs or where the last run stopped.
---

# Make operations idempotent

Requests get retried, Workers get evicted, a deploy stops halfway, a person runs the command twice. If what a half-finished run left behind changes what the next run does, every restart is a debugging session.

## The idea

Derive each step from the state that exists, not from what the previous run meant to do. Read the current state, compare it with the goal, apply only the difference. A step written that way finds nothing to do when it runs again.

## In this repo

- A job claims `<job>/<period>` before it works (`jobs.idempotency`).
- A write the client may retry carries a key the server recognises, or is an upsert on a natural key, so a double submit does not create two rows.
- Send mail after the state change it reports is committed, keyed so a retry does not send it twice.
- The migrator records each migration it applied. Write a data migration so it is safe on a database where it already ran partly.
- A CLI or deploy step checks what exists before it creates anything.

Anything a run leaves behind, such as a claim, a half-written row or a temporary object, must be recognisable as stale by the next run, wherever the previous run stopped.

## Three questions

1. What happens if this runs twice in a row?
2. What happens if the previous run stopped at each possible point?
3. Does the next run reach the same end state?

If any answer is "it depends on what was left behind", add the step that reads the current state and reconciles it.
