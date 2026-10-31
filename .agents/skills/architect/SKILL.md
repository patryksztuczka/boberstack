---
name: architect
description: Settle the shape of new code before writing it. Write the caller's usage, sketch at least two structurally different designs (types, contracts, service and store signatures), screen them against design red flags, pick one, then implement against it. Use for /architect, "architect this", "design this", a new feature that adds an endpoint, a service or a table, or any change that crosses a module boundary.
---

# Architect

Sketch the types, contracts and module shape before the code, compare more than one shape, then fill in the code against the chosen sketch. The sketch is cheap to throw away. Code built on the wrong shape is not.

Skip it for a change that stays inside one function, or when the shape is already forced by an existing pattern you are copying on purpose.

Open a todo list with the five phases: ground, sketch, pick, implement, scrap.

## 1. Ground

Know every part of the system the new code touches before you design anything. Naming a file is not knowing it.

- Read `CONTEXT-MAP.md`, the context's `GLOSSARY.md` and its ADRs. They are the reasons behind the current shape, so treat them as constraints, not suggestions.
- For a change inside one module, read the module yourself.
- For a change across several modules or apps, spawn two to four read-only Explore subagents in one message, one slice each (for example: the domain contract, the service and store, the web feature). Each returns the components with file paths, the flow step by step, the edges where the slice meets the rest, the non-obvious parts, and the questions it could not answer.

Write the grounding down in a few lines: what exists, what must not break, which names the glossary already uses.

## 2. Sketch

Produce at least two candidates that differ in shape, not in detail: a different owner for the state, a different contract, a different split between modules. Two flavours of one shape count as one.

Run the candidates in parallel. In T3 Code, start one with `delegate_task` on another provider when `orchestrator_capabilities` lists one, the same way the `code-review` skill starts its adversary; start the other as a subagent. Outside T3, use two subagents. Give each the task, the grounding and this brief:

> Produce one candidate design. Write the caller's usage first: two or three real call sites (the handler, the web query hook, a test). Derive the types from that usage, and when they disagree, change the types. Then sketch, in files under `.scratch/architect/<candidate>/`: the records, ids and errors for `packages/domain`, the `HttpApi` or `RpcGroup` contract, the service as `Context.Service<Self, Api>` with its methods, the store port, and the migration as SQL. Leave bodies unimplemented. Get the data structures right first and trace each main access pattern through them. Keep the public surface small and the decisions behind it. Validate at the edge and trust types inside. Say what happens if each write runs twice. Do not hedge toward a safe middle; the differences between candidates are the point. Return the usage, the sketch files and a half-page rationale.

Screen every candidate against [references/design-red-flags.md](references/design-red-flags.md). A red flag is a reason to revise or drop the candidate.

## 3. Pick

Choose the base by interface depth: the candidate that hides more decisions behind a smaller public surface, where a change that looks right from one file is right for the whole repo. Take the best parts of the other candidate into it. Write the synthesis in the rationale (below).

Go straight on to implementing. Stop for the owner's approval only when the user asked for a checkpoint ("architect with checkpoint", "show me before you implement"). If the design needs something under "Needs owner sign-off" in AGENTS.md, such as a dependency, build it and flag it as that section says. A new bounded context goes through the `domain-modeling` skill first.

## 4. Implement against the sketch

The sketch is the contract. A deviation is a signal to report, not friction to absorb. If a method needs a parameter the sketch did not have, decide whether the sketch was wrong, a requirement was missed, or the implementation is doing too much, and say which. The sketch can land as its own first commit (the `principle-sequence-verifiable-units` skill).

## 5. Scrap when the shape is wrong

When the friction forms a pattern, throw the sketch away instead of patching it:

- the same workaround in unrelated places;
- several unrelated cases that each need a special branch;
- types that need `as`, optional fields that are always set, or a cast to compile;
- callers that must know the abstraction's internal rules;
- the same deviation from the sketch appearing twice.

A few edge cases do not condemn a design; complexity in the data is not complexity in the design. To scrap: read what has been built, remove before adding (the `principle-subtract-before-you-add` skill), and go back to step 2 with the new constraints as if they had been there from the start.

## Rationale

One page, kept with the sketch in `.scratch/architect/`. Sections:

- **Problem**: what we are doing and the constraints from grounding.
- **Usage**: the call sites, written before the types.
- **Shape**: data structures first, then the flow through the signatures; what the public surface hides and why it is no larger.
- **Synthesis**: which candidate became the base, what came from the other, what was dropped and why.
- **Tradeoffs**: "we accept X in exchange for Y", one line each.
- **Open questions**: what the owner should weigh in on, phrased as questions.

When the decision is worth remembering after the code lands, turn the rationale into an ADR with the `domain-modeling` skill.
