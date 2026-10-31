---
name: benchmark-checklist
description: Vet a performance measurement before you report or act on it, by naming the limiter, checking both sides were set up like production, checking limits, errors, repeatability, end-to-end relevance and that the work happened. Use when you run a benchmark, or report a speedup, a regression, a latency, a throughput or a bundle size you measured.
---

# Benchmark checklist

Use this when you produce a performance number: a pull request's before and after, a regression claim, or a choice between libraries or settings. Answer each question with evidence from a run, not a guess about the code. The reasoning behind it is the `principle-explain-the-number` skill.

For a quick ballpark the user asked for, one run is enough. Still answer questions 4 and 7, and say it was one run. A choice between options is never a ballpark.

## Before you run

- Write the claim you expect to make, in the words you would ship: "listing todos is 30% faster at p50 with 5,000 rows". The questions test that sentence.
- Read the measurement script. Note what it times, what it counts and what it ignores.
- Check that the machine is quiet (`uptime`). If you cannot stop what is running, alternate the two sides so both see the same noise, and say so.

## The questions

1. **Why not twice as good?** Name the limiter. Profile in a run you do not report, because profilers slow the work: `node --cpu-prof` for the CLI, the browser's performance panel for the web app, `EXPLAIN ANALYZE` for a query, CPU per process for the rest. Watch the load generator too. If it saturates first, you measured the load generator. If a change did not move the number, the limiter explains why.
2. **Was each side set up like production?** Production build, production flags, the same data, the same versions, connection settings as deployed, caches as warm or cold as users see them. If one side runs on defaults, you compared configurations. A limiter that is a setting (a missing index, a commit per row, a dev build) means that side is untuned: tune it and measure again before picking a winner.
3. **Does it break a limit?** Do the arithmetic. Removing a part that takes 10% of a request can make it at most about 11% faster. A result past a limit measured something else: a cache, a no-op or a bug.
4. **Did it error?** Count failures and non-2xx responses, and check that the outputs are right, not just present. Rejections are often fast; timeouts and retries are slow. If the script does not count errors, add the count.
5. **Does it reproduce?** Run each side at least five times, alternating A, B, A, B, so warm-up and drift favour neither. Report the median and the range. A gap smaller than the run-to-run spread is no measurable difference.
6. **Does it matter?** Next to a micro result, measure the path a user waits on, with realistic data and concurrency, and report the micro result as a share of it.
7. **Did the work happen?** Confirm the work ran inside the timed part: the request reached the Worker, the rows were written, the result was used. An Effect nobody ran, a promise nobody awaited and a request that timed out all produce fast numbers.

## Report

- Lead with the verdict: faster, slower, no measurable difference, or inconclusive.
- Give the number with its unit, the run count, the range and the limiter: "p50 41 ms to 33 ms, median of 7 runs per side, range 32 to 35 ms after, bound by JSON encoding on one core".
- Call it inconclusive when you cannot name the limiter, when a side ran untuned, or when you could not answer questions 4 and 7, and name the gap.
- Keep one primary number in the pull request description. Put the runs, the range and the limiter evidence in a linked note.
