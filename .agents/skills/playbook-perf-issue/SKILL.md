---
name: playbook-perf-issue
description: Fix a measured slowness against a baseline. Capture and vet a baseline, ground hypotheses in a profile, try the cheapest kind of fix first, measure after, and cite the numbers in the pull request. Use when something is slow, a page or request takes too long, a query is heavy, or the user asks to make something faster.
---

# Perf issue

You own the measurement. Tie every fix to a number; do not read the source instead of measuring. For sustained work on one metric over many attempts, use the `playbook-hillclimb` skill instead.

1. **Capture a baseline** on the surface where the slowness shows, and vet it with the `benchmark-checklist` skill (read `.agents/skills/benchmark-checklist/SKILL.md`):
   - the web app: a performance recording in the browser on the dev stack, or the Network panel timings;
   - a request: timings of repeated calls to the api URL in `.dev/state.json`;
   - SQL: `EXPLAIN (ANALYZE, BUFFERS)` on a database with realistic row counts;
   - the CLI: `node --cpu-prof`.

   Local numbers come from `alchemy dev` and Docker Postgres, not from Workers and Neon. They rank fixes well, but they do not predict production latency; say so next to any absolute number.

2. **Ground the hypotheses** in the profile and the code, not in a guess. Try the fixes in this order and stop at the first that meets the target:
   1. Don't do it: drop work whose result nothing uses.
   2. Do it, but not again: reuse a result.
   3. Do less: fewer rows, columns, round trips.
   4. Do it later: off the path the user waits on.
   5. Do it when they are not looking: prefetch, background.
   6. Do it concurrently, with a named, small concurrency (`conc.parallel`).
   7. Do it cheaper: a faster algorithm, an index.
3. **Plan the fix** from the profile. If it crosses a module boundary, run the `architect` skill. For a fix larger than a few lines, hand it to a subagent with the scope and the measurement command, and review its diff. Verify each attempt before the next (the `principle-sequence-verifiable-units` skill).
4. **Measure after** with the same command and conditions. Compare the runs, not impressions. "Inconclusive" is a valid result; say it.
5. **Open the pull request** with the `file-pr` skill, with one primary number in the description and the runs, spread and limiter in a linked note.

**Reply:** the baseline number, the number after, the delta, the limiter, and where the runs are.
