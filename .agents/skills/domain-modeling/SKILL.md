---
name: domain-modeling
description: Build and sharpen the project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, CONTEXT-MAP.md or a module file under docs/internals, adding a bounded context, or recording or editing an ADR.
---

# Domain modeling

Build and sharpen the project's domain model while you design. This skill is the active part: challenge terms, invent edge-case scenarios, and write the glossary and decisions down the moment they settle. Reading a `GLOSSARY.md` for vocabulary is a habit any task has; use this skill when you change the model.

## File structure

`CONTEXT-MAP.md` at the root lists the bounded contexts. Each one keeps its documents in its own folder under `docs/internals/`:

```
/
├── CONTEXT-MAP.md
└── docs/internals/
    ├── adr-template.md
    ├── system/
    │   └── adr/              ← decisions that belong to no single context
    ├── todos/
    │   ├── GLOSSARY.md       ← what each term means
    │   ├── adr/              ← the decisions, in the order they were made
    │   └── <module>.md       ← a module file: decisions and traps the code does not show
    └── identity/
```

A context folder mirrors a context folder in code: `apps/api/src/modules/<context>/` and `packages/domain/src/<context>/`. Create files lazily, only when you have something to write. A context with no `adr/` folder gets one with its first ADR.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the context's `GLOSSARY.md`, say so at once. "Your glossary defines 'done' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses a vague or overloaded term, propose a precise one. "You're saying 'account'. Do you mean the User or the Session? Those are different things."

### Discuss concrete scenarios

When relationships between concepts come up, test them with specific scenarios. Invent ones that probe edge cases and force the user to be precise about where one concept ends and the next begins.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If it does not, say so: "The code deletes the todo, but you just said a removed todo can be restored. Which is right?"

### Update GLOSSARY.md inline

When a term is resolved, update `docs/internals/<context>/GLOSSARY.md` right there. Don't batch these up. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

`GLOSSARY.md` holds no implementation details. It is not a spec, a scratch pad or a place for implementation decisions. It is a glossary and nothing else.

A glossary entry says what a term is, in one or two sentences, and may link to the module file that uses it. How a module treats the term, what it refuses and in which order, is not glossary material; the entry links instead of restating it.

### What a GLOSSARY.md must not carry

These are read from the code and change faster than prose, so a copy in the glossary is stale by the next PR:

- file paths and package names
- table, column and index names
- issue and pull request numbers
- endpoint, route and RPC lists
- config values: limits, timeouts, sizes, environment variable names

ADR numbers are allowed. An ADR records a decision, and a term may say which decision shaped it.

If a definition needs one of the forbidden items to make sense, it describes the implementation, not the concept. Rewrite it, or move the detail into the code or an ADR and link there.

### A term shared by two contexts has one owner

When two contexts use a term, one owns it and carries the full definition. The other keeps one sentence on how it frames the term, plus a link to the owner's entry. Two full definitions in different words are a defect: the day they disagree, nobody can say which is right.

Pick the owner by asking which context would have to change if the term's meaning changed. The context that produces the thing usually owns the word. In this starter, Identity owns User; Todos says a todo belongs to a User and links to Identity's entry.

One home per piece of knowledge is the general rule, in [docs/README.md](../../../docs/README.md#where-a-sentence-belongs); what a comment may say is root ADR 0005. This skill covers `GLOSSARY.md`, `CONTEXT-MAP.md`, module files and ADRs.

### Module files

A module file, such as `docs/internals/todos/todos.md`, records what a maintainer would get wrong from the code alone: the decisions behind the module and their reasons, the constraints it shares with other modules or contexts, and the traps the source does not show. Before writing a paragraph, ask what a maintainer would break without it. If reading the code answers the question, leave the paragraph out.

It is not a specification. Do not restate every rule, list values, states or limits, or narrate the order of steps; the code and its tests record those. A number belongs only when the number is the decision, and then with its reason. Cite an ADR where its decision is the point, not on every sentence. Link glossary terms rather than redefining them.

A module file may link to the source a decision lives in, by relative path. It carries no table or column names, issue or pull request numbers, or endpoint lists. Most fit in a few hundred words; one past about eight hundred is probably restating the code.

Write a module file whole, covering the module, not a fragment for one rule. When a decision changes, rewrite or remove the affected text; do not append a second account of the new behaviour.

### Adding a context

A new bounded context gets, in one change: a line in `CONTEXT-MAP.md` with its relationships, `docs/internals/<context>/GLOSSARY.md`, `apps/api/src/modules/<context>/index.ts`, and `packages/domain/src/<context>/` if anything crosses the wire. Its service ids start `boberstack/<context>/` (the `effect-best-practices` skill, `05-project-structure.md`).

### Recording a decision

An ADR goes in the owning context's `docs/internals/<context>/adr/`, or in `docs/internals/system/adr/` when it belongs to no single context. Number it one past the highest number in that folder; numbering is per folder, and it is cited as "Todos ADR 0001" or "root ADR 0005". Never renumber an existing ADR. Start from [`docs/internals/adr-template.md`](../../../docs/internals/adr-template.md).

In the same change, update the module file the decision affects, so the current state and the history never disagree. If the decision changes a term's meaning, update the glossary entry too. When an ADR replaces an older one, set the older one's status to `superseded by <context> ADR NNNN` and leave its text alone.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse.** Changing your mind later costs something real.
2. **Surprising without context.** A future reader will wonder why it was done this way.
3. **The result of a real trade-off.** There were genuine alternatives and you picked one for specific reasons.

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
