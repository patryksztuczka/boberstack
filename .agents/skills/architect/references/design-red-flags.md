# Design red flags

Screen every candidate before picking one. Assume the next contributor is an agent that sees only the files it opened, copies the nearest example and takes the shortest path that compiles. Prefer the design where that path is the right one.

Some flags are already enforced by lint in this repo. A candidate that would need a suppression to pass them is the wrong candidate.

## Shallow module

A large interface that hides little. Callers coordinate several methods to finish one operation, options expose internal stages, and learning the interface does not save the caller from learning the implementation. Prefer a small interface with real behaviour behind it. A deep module is not a deep call chain: the chain spreads understanding across layers, the module concentrates it.

## Information leakage

Several modules depend on the same internal decision, so changing it means coordinated edits. Putting a transport, storage or framework type on a public signature is leakage: a SQL row, a better-auth object, a Cloudflare binding. Decode into domain types behind the interface (the `principle-boundary-discipline` skill).

## Split by step instead of by knowledge

Modules named after when they run (load, validate, transform, save) repeat one representation and its rules at every boundary. Group code by the knowledge it owns. Methods that run at different times belong together when they protect the same rules.

## Pass-through method

A method that forwards the same arguments to another method of the same shape. Remove it, or move the work to the module that can finish it. A port in a module with its adapter in `platform/` is not a pass-through: it keeps SQL and network out of the module.

## Split ownership

More than one module writes the same state or keeps its own copy. An agent that edits one writer cannot see the others. Give each piece of state one owner; others read it or ask the owner to change it. In this repo a table has one store port.

## Two ways to do one task

An agent copies whichever way it finds first, so both ways keep gaining callers. Keep one, move the callers and delete the other in the same change (the `principle-no-shims` skill).

## Importable internals

If a caller can import a module's internals, an agent will. Modules and contexts are imported through their `index.ts`, and a web feature exports from its `index.ts`; `@boberstack/effect/module-boundaries` refuses the rest. Do not design around a deep import.

## Hand-synced list

Two places list the same items, and adding one means editing both. Keep one list and derive the others. If a list cannot be derived, make the build fail when they disagree. A type derived from a `Schema` instead of declared next to it is the usual fix here.
