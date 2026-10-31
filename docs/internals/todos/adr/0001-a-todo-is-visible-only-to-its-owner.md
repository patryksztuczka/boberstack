# A Todo is visible only to its owner

**Status:** accepted, 2026-10-30.

Every Todo belongs to one User, and every Todos operation takes the Current User from Identity's authentication middleware and acts only on that User's Todos. There is no sharing, no admin view and no unauthenticated read. A Todo that exists but belongs to someone else answers exactly as one that does not exist, `TodoNotFoundError`, so ids leak nothing.

We chose this because it is the smallest ownership rule that still shows the whole pattern a real product needs: the contract declares the auth middleware, the handler reads the Current User, and the store's queries filter by owner. Sharing would add a second context's worth of rules to an example meant to be deleted.

## Consequences

- Every store operation takes the owner. A query without it is a bug, and the repository's integration suite has a case proving another User's Todo is not returned.
- Adding sharing later means a new ADR that supersedes this one, and a new term in this glossary.
