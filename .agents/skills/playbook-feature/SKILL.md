---
name: playbook-feature
description: Build new or changed behaviour from a named data shape. Ground in the code, settle the shape with the architect skill, plan who does what, implement through a delegate, verify on the real surface and land small ordered commits. Use when the user asks for a new feature, an endpoint, a screen, a table, or a change to what the product does.
---

# Feature

You own the design: plan, review, verify. Delegate the typing, not the judgement.

Open a todo list with the eight steps.

1. **Ground.** Read `CONTEXT-MAP.md`, the context's `GLOSSARY.md` and ADRs, and the code the feature touches. Spawn read-only Explore subagents when it spans several modules or apps. Write down what exists and what must not break.
2. **Settle the shape.** Run the `architect` skill. Skip it only when the feature copies an existing pattern on purpose, and say which one.
3. **Plan the work.** Write four todo items, and keep each one with `n/a: <reason>` when it does not apply:
   - **Blocking first steps**: what must exist before anything runs in parallel, usually the schema in `packages/domain`, the contract and the migration.
   - **Independent workstreams**: slices that touch disjoint files, such as the api module and the web feature.
   - **Shared state**: anything two workers would both write. Give each its own file or slice; serialise only when one writer is a real rule.
   - **Smallest safe split**: if one worker is best, say why.
4. **Implement through a delegate.** Hand the code to a subagent with a precise scope: the files it may write, the data shape and its structure (the `principle-model-the-domain` skill), the success check. The review separation is the point, so do this even for a small feature. Follow the `effect-best-practices` skill and the "Where things go" table in AGENTS.md.
5. **Verify on the matching surface** (the `principle-prove-it-works` skill): the `verify-web` skill for anything a user can see or hit, `pnpm test:integration` for SQL, migrations, auth or an endpoint. "Inconclusive" is not a pass.
6. **Order the commits.** Small units that each build and pass, scaffold before feature (the `principle-sequence-verifiable-units` skill).
7. **Challenge a contested design.** When the shape was a close call, run the `code-review` skill on the branch before opening the pull request.
8. **Open the pull request** with the `file-pr` skill. A user-facing feature also updates `docs/user/<feature>.md`.

**Reply:** what you built, what you chose and why (a table when there were real alternatives), the step 3 plan, how you verified it, and the decisions still open.
