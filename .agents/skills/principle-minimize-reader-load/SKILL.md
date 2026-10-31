---
name: principle-minimize-reader-load
description: Apply when code is hard to trace, when you are about to add a layer, wrapper or piece of state, or when reviewing a design. Count the layers between a question and its answer and the state a reader must hold, and cut both.
---

# Minimize reader load

Maintainability is the work a reader, human or agent, does to understand the code. Two things make that work grow, and they are independent:

- **Layers to trace**: the hops between "where does this value come from?" and the answer.
- **State to hold**: hidden or mutable context the reader must keep in mind while reading.

Line counts and "clean architecture" are proxies. These two are the thing.

## Cut layers

- Inline a wrapper with one caller and an adapter with no second implementation.
- A layer that repeats the methods and arguments of the one below adds hops and hides nothing. Remove it, or give it a decision to own.
- Prefer a small interface that hides a real decision over a wide one that makes callers learn the implementation anyway.
- A port in a module with an adapter in `platform/` is not a pass-through layer. It keeps SQL and network out of the module (`structure.adapters`) and lets the root choose.

## Cut state

- Return values instead of mutating. Locals over module state. Derive a value instead of keeping a copy in sync.
- Name an invariant once, at the boundary that enforces it, not in every consumer.

## The test

Can a new reader answer "where does X come from?" and "what can change X?" in under 30 seconds? If not, cut layers or cut state. Before adding either, ask whether it removes at least as much load somewhere else.
