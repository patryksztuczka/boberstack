---
name: principle-subtract-before-you-add
description: Apply when planning an addition, refactor or rewrite, or when weighing a diff's size. Remove dead code and needless parts first, then build the smallest change that solves the problem on the simpler base.
---

# Subtract before you add

Remove before you build. The smallest change that solves the problem beats a larger one that looks more complete.

## Order

1. Delete what the change makes dead or what is already dead: unused exports (`pnpm check:knip` lists them), stubs, a validator that checks what the edge already decoded, an option nobody passes.
2. Then build on the simpler base.

A diff that first subtracts and then adds is easier to review, and the addition is often smaller than planned.

## Keep the change small

- Make the smallest change that solves the problem. Fewer lines beat tidy boilerplate.
- Design for the use you can see, not the case you imagine. No speculative parameter, option, hook or generic type.
- Put a decision in one place and pass its result, instead of making the same choice in several places.
- Three similar lines are better than an abstraction built before the third real use.

Leave the code a little simpler than you found it, with the same or a smaller public surface. When the old thing is replaced, delete it in the same change (the `principle-no-shims` skill).
