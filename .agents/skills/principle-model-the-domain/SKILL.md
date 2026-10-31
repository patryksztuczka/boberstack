---
name: principle-model-the-domain
description: Apply when writing stateful logic, adding a case to existing branching, or repeating the same shape assumption in several files. Encode the domain in a type or structure instead of scattered conditionals.
disable-model-invocation: true
---

# Model the domain

A structure that matches the domain makes invalid states impossible to write and deletes branches. Choosing it while writing is cheap. Recovering it later looks like a refactor and gets put off.

## Reach for

- A `Schema.TaggedUnion` with `match` (`schema.unions`) instead of a record with optional fields that are "set together", or two booleans that must agree.
- A branded `Schema.Class` record (`schema.records`) instead of loose parameters passed around in the same group.
- A state machine when a lifecycle has real transitions. The starter has none; add one when a lifecycle appears.
- One module that owns one piece of domain knowledge, named in the glossary, instead of modules split by step (load, validate, save) that repeat the same rules.
- A lookup table or a map instead of an `if` chain spread across files.

## Signs you skipped it

- A new feature adds one more branch to an existing `if` or `switch`.
- A second boolean has to stay in sync with the first.
- Two files make the same assumption about a shape.
- A name in code does not match the context's `GLOSSARY.md`.

Do not force it. Boring code is fine when the current shape is clear, local and unlikely to grow. Distrust an abstraction that adds indirection without removing a branch, a duplicated rule or an invalid state.

Naming and boundaries follow the `domain-modeling` skill.
