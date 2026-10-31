# Coding standards

The rules code in this repository is written and reviewed against. Each has one home; this file only points to it.

- **Effect code**: the [`effect-v4` skill](.agents/skills/effect-v4/SKILL.md). Each rule carries an id such as `errors.naming`; cite it in a review finding. The rules oxlint enforces are listed in [13-lint-rules.md](.agents/skills/effect-v4/references/13-lint-rules.md), so a review spends its attention on the rest.
- **Domain language and boundaries**: the [Context Map](CONTEXT-MAP.md) and each context's `GLOSSARY.md` and ADRs under [docs/internals](docs/internals). Code uses the glossary's terms and stays inside its context's boundary. Changing the model follows the [`domain-modeling` skill](.agents/skills/domain-modeling/SKILL.md).
- **Docs**: [docs/README.md](docs/README.md#where-a-sentence-belongs) says where a sentence belongs. Prose follows the [`unslop` skill](.agents/skills/unslop/SKILL.md).
- **Comments**: code keeps only `VENDOR:` comments about defects in software we do not own, plus the `SAFETY:`, `BRIDGE:`, `THROW:` and `DETACH:` markers and tool directives ([root ADR 0005](docs/internals/system/adr/0005-keep-only-comments-about-other-peoples-defects.md)), enforced by `no-comments/no-comments`.
- **Commits and pull requests**: Conventional Commit subjects from [`scripts/conventional-commit.mjs`](scripts/conventional-commit.mjs); the [`babysit-git`](.agents/skills/babysit-git/SKILL.md) and [`file-pr`](.agents/skills/file-pr/SKILL.md) skills.
- **Dependencies**: exact versions only, shared ones in the pnpm catalog ([AGENTS.md](AGENTS.md#pins)).
