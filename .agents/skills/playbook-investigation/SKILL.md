---
name: playbook-investigation
description: Answer a read-only question about the code with a cited explanation or a recommendation, and change nothing. Use for "how does X work", "why is Y built this way", "where should this live", "are we sure", or a choice between alternatives before any code is written.
---

# Investigation

You own the answer. Investigations change no code and open no pull request.

1. **Explore.** For a question about one module, read it yourself. For a subsystem across several files or apps, split the question into two to four angles and spawn one read-only Explore subagent per angle in a single message. Each returns the components with file paths, the flow step by step, where the slice meets the rest, what surprised it, and what it could not trace. Reconcile contradictions by reading the code yourself.
2. **For a "why" question, read the history**: `git log -L` or `git blame` on the lines, `gh pr view` on the pull requests that introduced them, linked issues, the context's ADRs and `GLOSSARY.md`. Keep what the sources say apart from what you infer from them, and say which is which.
3. **Write the answer** in these sections, dropping any that do not apply:
   - **Overview**: what it is and why it exists, in one or two paragraphs.
   - **Key concepts**: the types and services needed to follow the rest, in the glossary's words.
   - **How it works**: the flow from trigger to result, with `file:line` references and a mermaid diagram when components talk to each other.
   - **Where things live**: the files someone would open first.
   - **Gotchas**: what is easy to get wrong.

   For a decision between alternatives, give a recommendation and a tradeoff table instead.

4. Write it with the `unslop` skill.

If the investigation leads to a change, stop and hand back: the change goes through the `playbook-bug-fix` or `playbook-feature` skill.

**Reply:** the answer. For "are we sure?", give your real judgement with reasons, and say so when the premise of the question is wrong.
