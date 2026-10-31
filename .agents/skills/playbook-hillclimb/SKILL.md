---
name: playbook-hillclimb
description: Improve one measurable thing against a target over many attempts. One change, one measurement, keep or revert, with a frozen harness, a regression gate and a decision log. Use for "make X N% faster", "get the bundle under Y", "keep improving Z until", or any loop of measured attempts at one metric.
---

# Hillclimb

You own the metric and the integrity of the experiment. Supervise and review; delegate the attempts. A one-off fix is the `playbook-bug-fix` or `playbook-perf-issue` skill. This is the loop.

The rule: one change, one measurement, keep or revert. Never stack untested changes, and never claim a win from reading the code (the `principle-prove-it-works` skill).

## Set up

1. **Ground the workload before choosing the metric.** Read the code on the path, name what moves the result (data size, number of rows, concurrency, cold or warm), and pick a case that reproduces the user's complaint. If no case reproduces it, fix the repro first. Then fix one metric, its direction, and a stop condition that pairs a target with a minimum number of attempts, such as "at least 50% better than baseline and at least 10 attempts", so a lucky early win does not end the run. Use the user's numbers when given.
2. **Build the harness, prove it can tell cases apart, then freeze it.** A script in `.scratch/hillclimb/<slug>/` (commit it when the work outlives the session). Run contrasting workloads and confirm the target case shows the problem while easier cases separate. Vet it with the `benchmark-checklist` skill (read `.agents/skills/benchmark-checklist/SKILL.md`), and make it print its error count and a count of the work done. Once frozen, one command prints the metric as the median of several runs. Record the baseline and a green run of the regression gate: `pnpm check:changed` plus the tests that cover the path.
3. **Open the decision log**, `.scratch/hillclimb/<slug>/decisions.tsv`, one row per attempt: id, hypothesis, change, before, after, delta, gate, verdict (kept or reverted), note. Read it before each attempt.

## Loop

4. **Ground each hypothesis in a mechanism**: "move the session lookup off the todo list query because it runs once per row", not "try caching something". For a speed metric, order them by the list in step 2 of the `playbook-perf-issue` skill.
5. **One hypothesis per attempt:**
   - Hand the change to a subagent with a tight scope and review its diff. Run independent hypotheses in parallel, each in its own worktree.
   - Measure before and after with the frozen harness, and run the gate.
   - Keep it only when the metric moves past the noise and the gate stays green. Otherwise revert it completely.
   - One commit per kept change, staging only its files. Log the row either way.
6. **Push past the first plateau.** After several rejects in a row, change category, combine near-misses, reread the code, or try something bolder. Correctness and simplicity outrank the number: revert a win that breaks behaviour, and keep a simplification that holds the number.
7. **Stop** when the condition is met, or when the remaining ideas cost more than they would gain. Do not loosen the condition to meet it, and do not quit while cheap untried ideas remain. If you are stuck, say so instead of looping.
8. **Open the pull request** with the `file-pr` skill, the kept commits in the order they landed.

**Reply:** the metric and target, baseline to final with the percent change, attempts run (kept and reverted), each kept change in one line, the path to `decisions.tsv`, and the next idea you would try.
