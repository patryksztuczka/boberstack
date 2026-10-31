---
name: playbook-prototype
description: Build a throwaway prototype to settle one design or behaviour decision cheaply, compare variants side by side, and hand the chosen direction to the real build. Use for "prototype", "mock it up", "try this layout", "sketch it to decide", or a fork you could settle by watching it run instead of asking.
---

# Prototype

You own the decision, not the code. The prototype is an instrument you throw away; the real build follows the `playbook-feature` skill. Here speed beats polish and code quality does not matter. The rigour is in choosing the right design cheaply: propose variants the user did not ask for, and drop an approach to try another.

1. **Name the decision** the prototype exists to make: which layout, which interaction, which density, or for a behaviour question which timing or approach. No decision, no prototype; go to the `playbook-feature` skill.
2. **Gather references** when the design space is open: prior art and a short list of directions for the user to pick from before you build. Skip it when the direction is set.
3. **Build it outside the product**, in `.scratch/prototype/<slug>/` (gitignored). For a visual decision, plain HTML, CSS and JS, or the lightest thing that renders the idea; `packages/ui` primitives only when the decision depends on them. For a behaviour or timing decision, the smallest script that exercises the question. No tests, no abstractions, nothing in `apps/` or `packages/`.
4. **Put the variants behind one switcher**, buttons or a key, each labelled, so they compare side by side.
5. **Look at it.** For a visual decision, open it in the host's preview or browser, screenshot each variant into `.scratch/evidence/` and drive the interaction. For a behaviour decision, log the timing or print the output. The observation is the test.
6. **Recommend.** Present the variants, the tradeoffs and your pick. Hand the chosen direction to the `playbook-feature` skill, or to the `architect` skill when the open question is the code's shape.

**Reply:** the variants, the evidence (screenshots, or the observed output or timing), the tradeoffs, your recommendation and the scratch path. Say plainly that the prototype is throwaway.
