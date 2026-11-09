# The api is a Node server in a container, deployed with Alchemy

**Status:** accepted, 2026-11-09. Supersedes root ADR 0013.

boberstack is a template, and the people who start from it host on a VPS, on AWS, GCP or Azure, on Fly, or on Cloudflare. A template whose api only runs as a Cloudflare Worker makes that vendor its first decision and the first thing to rip out.

The api is one Effect program in `apps/api`: `app.layer.ts` composes the routes, the modules, better-auth and the mailer, and takes the SQL client and better-auth's database as layers. `apps/api/src/server.ts` serves it on Node with `NodeHttpServer`, next to the built SPA from `WEB_ROOT`, so browser and api share one origin. `apps/infra/api.Dockerfile` puts that server and `apps/web/dist` in one image. A container image runs on every host on the list, so it is the default.

Alchemy declares the infrastructure. The default stack, `apps/infra/alchemy.run.ts`, builds the image with `Docker.Image`, runs it with `Docker.Container` on the local engine or on the Docker host `DEPLOY_DOCKER_HOST` names (`ssh://deploy@example.com`), generates better-auth's signing secret with `Alchemy.Random` and keeps its state in the app's Postgres. `apps/infra/cloudflare.run.ts` is the other host: the same program as a Cloudflare Worker in `apps/infra/src/worker.ts`, reaching Postgres through Hyperdrive. A project keeps one host and deletes the other (the `keep-or-cut` skill).

## Consequences

- The api, the CLI and the tests run on the same Node. `pnpm dev` runs `server.ts` with `node --watch`; nothing in the dev loop is a container or a Worker.
- Code in `apps/api` and the packages it uses must also run on workerd while the Cloudflare host exists: web-standard APIs, no `node:` modules outside `server.ts`.
- The container has no TLS. Put Caddy, Traefik or the cloud's load balancer in front of `API_PORT`.
- Moving to another cloud replaces `Docker.Container` with that cloud's container resource for the same image: `GCP.Run.Service`, `AWS.ECS.Service`, Fly or Hetzner in Alchemy. Azure has no Alchemy provider; run the image in Container Apps or on AKS through `@alchemy.run/kubernetes`.
- The deploy builds the image on the target engine, so an Apple Silicon laptop deploying to an amd64 VPS needs no cross-build.
- Alchemy state lives in the `alchemy_*` tables of the database `DATABASE_URL` names. Resetting that database forgets what the stack created.

## Considered options

- Cloudflare Workers as the only host (root ADR 0013): global deploys in seconds, but every other host means rewriting the entry point.
- `Docker.Service`, Alchemy's inline program platform: no Dockerfile, but it runs on bun instead of Node, needs Docker Swarm, replaces the service on every change and has no dev mode, so local work would rebuild an image per edit.
- A Dockerfile without Alchemy: portable, but the deploy would be a shell script next to the stack, and the template would lose its single infrastructure program.
