# Documentation

Find what you need by who you are.

## I want to run or deploy the starter

The [README](../README.md): quickstart, deploy with Alchemy, and what to keep or cut.

## I work on this repository

Start with [AGENTS.md](../AGENTS.md) for the pins, commands, layout and stop rules, and [CODING_STANDARDS.md](../CODING_STANDARDS.md) for where each coding rule lives.

Then the [Context Map](../CONTEXT-MAP.md): it names the bounded contexts, how they relate, and links each one's folder under `internals/`. Each folder holds the context's glossary (`GLOSSARY.md`), its decisions (`adr/`) and, once written, one file per module recording the decisions and traps the code does not show.

- [Todos](internals/todos/GLOSSARY.md) and its [ADRs](internals/todos/adr)
- [Identity](internals/identity/GLOSSARY.md) and its [ADRs](internals/identity/adr)
- [System-wide ADRs](internals/system/adr): the monorepo, Effect, Cloudflare and Neon, SQL and tests, comments, migrations, the shared contract
- [ADR template](internals/adr-template.md)

How Effect code is written is in the [`effect-v4` skill](../.agents/skills/effect-v4/SKILL.md). Code carries no comments except `VENDOR:` notes about defects in software we do not own ([root ADR 0005](internals/system/adr/0005-keep-only-comments-about-other-peoples-defects.md)).

## I am an agent

[AGENTS.md](../AGENTS.md) is the law. Skills live in [`.agents/skills/`](../.agents/skills); `.claude/skills/` links to the same folders.

## Where a sentence belongs

Every piece of knowledge has one home, and every other mention links to it. If the home already says it, link; if it says it differently, fix the home.

| Kind of knowledge                                   | Home                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| What a term means inside a bounded context          | `internals/<context>/GLOSSARY.md`                                |
| Which contexts exist and how they relate            | [`CONTEXT-MAP.md`](../CONTEXT-MAP.md)                            |
| A module's decisions and traps the code cannot show | its module file, `internals/<context>/<module>.md`               |
| Why a decision was made and what it cost            | an ADR in `internals/<context>/adr/`, or `internals/system/adr/` |
| How Effect code is written                          | the [`effect-v4` skill](../.agents/skills/effect-v4/SKILL.md)    |
| Pins, commands, layout, what needs sign-off         | [`AGENTS.md`](../AGENTS.md)                                      |
| How to run, deploy, keep or cut the starter         | [`README.md`](../README.md)                                      |
| What a package is and how to build, run and test it | that package's README, when it needs more than `AGENTS.md` says  |
| A workaround for a defect in software we do not own | a `VENDOR:` comment at the workaround                            |
| What the code does, and what a test proves          | the code: its names, types and tests                             |
| Why a change was made                               | the commit message and the pull request                          |
