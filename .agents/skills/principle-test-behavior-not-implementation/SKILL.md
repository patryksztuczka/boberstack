---
name: principle-test-behavior-not-implementation
description: Apply when you write, change, review or keep a test. Assert what the code's users can observe, so the test fails when that behavior breaks and keeps passing when only the internals change.
---

# Test behavior, not implementation

A test is a claim about what the code does for its users: a caller of a service method, a client of an endpoint, a person in the browser. Behavior is what they can observe: the returned value, the typed error and its tag, a row they can read back, a mail in Mailpit, a response status. Implementation is what they cannot: private helpers, the order of internal calls, which store method did the work.

## Two imagined edits

Judge every test against both:

- **Break the behavior.** Return a wrong value, skip the write, write twice. If the test still passes, it proves nothing. Usual causes: an assertion looser than the contract, an expected value computed by the code under test, an assertion on data the test built itself.
- **Change the internals.** Keep every observable result and restructure the code underneath. If the test now fails, it is pinned to the implementation and catches no bug.

Keep a test that catches the first edit and survives the second. Rewrite or delete the rest.

## In this repo

- Drive the code through its public seam (`test.seams`): the service method, the endpoint, the store port. Derive the expected value from the requirement, not from a run of the code.
- Assert the error tag callers branch on (`test.errors`), not the message text no caller reads.
- A store's contract runs on real Postgres (`tl.postgres`, root ADR 0004). A `Layer.mock` stands in only for what the code under test does not own (`tl.mocks`). The payload a mocked external service receives is behavior, because that service observes it.
- When the promise is "never does X", pair the test with a case where X happens, so the test shows it can see X.

The rules for writing the test itself are in the `effect-best-practices` skill, references 11 and 12.
