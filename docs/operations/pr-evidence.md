# Screenshots and recordings in pull requests

An agent cannot drag a file into the GitHub editor, so the screenshots and recordings `verify-web` saves to `.scratch/evidence/` never reach the pull request. `pnpm -s pr-evidence <files>` uploads them to a public Cloudflare R2 bucket and prints the Markdown to paste into the Verification section:

```sh
pnpm -s pr-evidence .scratch/evidence/todos.png .scratch/evidence/sign-in.mp4
```

```md
![todos](https://pub-….r2.dev/2026-10-31/6f1c…/todos.png)
[![sign in](https://pub-….r2.dev/2026-10-31/0b9e…/sign-in.png)](https://pub-….r2.dev/2026-10-31/0b9e…/sign-in.mp4)
```

GitHub plays only videos uploaded through its own editor, so a recording becomes an H.264 MP4 behind a still of its last frame; a click opens the video.

The starter ships the script, [`.agents/skills/file-pr/scripts/pr-evidence.mjs`](../../.agents/skills/file-pr/scripts/pr-evidence.mjs), but no bucket. Until someone sets it up, `pr-evidence` fails with a pointer to this page and the evidence stays as file paths in the description.

## What it costs

- The bucket is public. Every object sits under the day and a random UUID, so nobody can list it, but anyone with a link can open it. Upload development screens with synthetic data only, never production.
- Objects are deleted 180 days after upload by a lifecycle rule that `setup` sets. A pull request older than that shows broken images.
- The `r2.dev` address is rate-limited and meant for non-production traffic, which is what pull request evidence is. R2 has no egress fees; storage fits in the free tier for a small team.

## Set it up

Once, by someone who can create buckets on the project's Cloudflare account:

```sh
pnpm dlx wrangler@4.156.0 login
pnpm -s pr-evidence setup
```

It creates the bucket `boberstack-pr-evidence`, opens its `r2.dev` address and sets the lifecycle rule, then prints the address. Running it again changes nothing. `pnpm init:project` renames the bucket with the project.

Then each person or agent that uploads:

```sh
pnpm dlx wrangler@4.156.0 login
brew install ffmpeg
```

`wrangler login` signs in to Cloudflare in the browser. Set `CLOUDFLARE_ACCOUNT_ID` when the login sees more than one account. ffmpeg is needed for recordings only.

## Take it out

To keep the drag-and-drop workflow instead, delete `.agents/skills/file-pr/scripts/`, the `pr-evidence` script in `package.json`, this page, and the `pr-evidence` lines in the `file-pr` and `verify-web` skills, `AGENTS.md`, `docs/README.md`, `docs/operations/make-it-yours.md`, `scripts/init.mjs` and `.github/pull_request_template.md`.

To delete a bucket you set up, empty and delete `boberstack-pr-evidence` in the Cloudflare dashboard under R2.
