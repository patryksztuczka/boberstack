# GLOSSARY.md format

## Structure

```md
# {Context name}

{One or two sentences: what this context is and why it exists.}

## Language

**Order**:
{One or two sentences: what the term is.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery. See [Invoicing](./invoicing.md).
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Rules

- **Be opinionated.** When several words exist for one concept, pick the best one and list the others under `_Avoid_`. Code uses the chosen word in names, types and error tags.
- **Keep definitions tight.** One or two sentences. Define what it is, not what it does. An entry may end with one link to the module file that uses the term; how the module treats it belongs there.
- **Only terms specific to this context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them a lot. Before adding a term, ask whether it is unique to this context or a general concept. Only the first kind belongs.
- **Group terms under subheadings** when natural clusters appear. A flat list is fine when they don't.
- **A borrowed term links to its owner.** One sentence on how this context frames it, then a link to the owning context's entry.

## Where glossaries live

`CONTEXT-MAP.md` at the root lists every context, links its glossary and says how the contexts relate. Each `GLOSSARY.md` lives in `docs/internals/<context>/`. The map's shape:

```md
# Context map

## Contexts

- [Ordering](./docs/internals/ordering/GLOSSARY.md): receives and tracks customer orders.
- [Billing](./docs/internals/billing/GLOSSARY.md): generates invoices and processes payments.

## Relationships

- **Ordering → Billing**: Ordering emits `OrderPlaced` events; Billing consumes them to generate invoices.
```

Infer which context the current topic belongs to from the map. If it is unclear, ask.
