---
name: principle-explain-the-number
description: Apply before you measure, and before you trust, report or act on a number you measured, such as a speedup, a regression, a latency, a throughput or a bundle size. Find what limits it and rule out that it measured something other than the work.
---

# Explain the number

A number without an explanation is a guess with a unit.

- **Write the decision before you run.** Name the result that would change what you do, and the run-to-run noise. Stop when the noise is larger than the effect.
- **Ask "why not twice as good?"** Name what bounds the result: a CPU core, the database, the network, a lock, the Worker's limits, or the load generator itself. Take it from a profile or from counters during a run, then map it to source. A guess from reading the code does not name a limiter.
- **List what else the number could be measuring and rule each one out.** Errors and rejected requests (often fast), cached or skipped work, code that never ran, a side left on default settings, noise, and a part too small to matter end to end.
- **Keep the evidence with the number.** The run count, the spread and the limiter go next to it, in the pull request or a linked note.

For a performance claim, run the full procedure in the `benchmark-checklist` skill.

You skipped this when a run started without the result that would change a decision, or when a reported number has no run count, no spread or no named limiter.
