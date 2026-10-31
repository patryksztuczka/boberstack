# ADR format

ADRs live in the owning context's `docs/internals/<context>/adr/`, or in `docs/internals/system/adr/` when the decision belongs to no single context. Each folder numbers its ADRs in sequence: `0001-slug.md`, `0002-slug.md`. The slug is the decision in kebab-case, phrased as what we do: `0004-sql-only-in-repositories-and-stores-tested-on-real-postgres`.

Create a context's `adr/` folder when its first ADR is needed, not before.

## Template

The copyable file is [`docs/internals/adr-template.md`](../../../docs/internals/adr-template.md). Its shape:

```md
# {The decision, as a sentence in the imperative or present tense}

**Status:** accepted, {YYYY-MM-DD}.

{1-3 short paragraphs: the situation that forced a choice, what we decided, and why.
Name the force that made the obvious option wrong.}

## Consequences

{Optional. What gets easier, what gets harder, what a maintainer must now do.
Only the effects a reader would not guess.}

## Considered options

{Optional. Each rejected option in one line, with the reason it lost.}
```

An ADR can be a title, a status line and one paragraph. The value is in recording that a decision was made and why, not in filling sections.

## Status

`proposed`, `accepted`, `deprecated`, or `superseded by <context> ADR NNNN`. Add the date the status changed. When a decision is replaced, change only the status line of the old ADR and write a new one.

## Numbering

Scan the target `adr/` folder for the highest number and add one. Numbers are per folder, so the same number in two contexts is not a collision. Cite as "Todos ADR 0001", "Identity ADR 0001" or "root ADR 0005".

## When to offer an ADR

All three must be true:

1. **Hard to reverse.** The cost of changing your mind later is real.
2. **Surprising without context.** A future reader will look at the code and wonder why on earth it was done this way.
3. **The result of a real trade-off.** There were genuine alternatives and you picked one for specific reasons.

If a decision is easy to reverse, skip it; you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "We use a monorepo." "HttpApi and RPC are projected from one contract package."
- **Integration patterns between contexts.** "Todos reads the current User from Identity's middleware, never from a session table."
- **Technology choices that carry lock-in.** Database, auth provider, deployment target. Not every library, just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Identity owns users; other contexts reference them by id only." The explicit no's are as valuable as the yes's.
- **Deliberate deviations from the obvious path.** "Stores have no in-memory fake; their contract runs on real Postgres." These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "The api runs on Cloudflare Workers, so there is no long-lived process and no filesystem."
- **Rejected alternatives when the rejection is non-obvious.** If you considered an ORM and chose SQL in repositories for subtle reasons, record it, or someone will propose the ORM again in six months.
