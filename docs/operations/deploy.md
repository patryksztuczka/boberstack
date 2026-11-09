# Deploy

The api is a Node server in a container image that also serves the built web app (root ADR 0013). Alchemy builds the image and runs it on a Docker host: this machine, or a server you reach over SSH. The database is any Postgres the container can reach. The stack does not create it.

The template also ships a Cloudflare host. A project keeps one of the two; the `keep-or-cut` skill deletes the other.

## Container

### Point it at a database

Create a Postgres database and put its connection string in `.env.production.local`, which is gitignored:

```sh
DATABASE_URL=postgres://user:password@host:5432/app
```

The container connects to that URL, so the host must be reachable from the Docker host. In CI, set `DATABASE_URL` as a secret instead. `pnpm env:check` with `APP_ENV=production` fails while it is missing.

Alchemy keeps its state in the `alchemy_*` tables of the same database, so a deploy from your laptop and one from CI see the same resources.

### Choose the Docker host

Without `DEPLOY_DOCKER_HOST`, the deploy runs the container on the local Docker engine. To deploy to a server, install Docker there, make sure `ssh deploy@example.com docker info` works without a password prompt, and set:

```sh
DEPLOY_DOCKER_HOST=ssh://deploy@example.com
API_PORT=3000
```

The image is built on that server, so a laptop on a different CPU architecture needs no cross-build. The container publishes `API_PORT` (3000 by default) and has no TLS: put Caddy, Traefik or a load balancer in front of it, and set `AUTH_BASE_URL` to the public origin.

### Deploy

```sh
pnpm run deploy      # plain `pnpm deploy` is a pnpm built-in
```

The deploy builds every package, applies `packages/database/migrations/` to `DATABASE_URL` with `cli db migrate` (root ADR 0011), then runs `alchemy deploy` on `apps/infra/alchemy.run.ts`. The stack generates better-auth's signing secret, builds `apps/infra/api.Dockerfile` and starts the container with `restart: unless-stopped`. It passes the container `DATABASE_URL`, the generated `AUTH_SECRET`, and the `AUTH_*`, `MAIL_*`, `GITHUB_*` and `GOOGLE_*` variables that are set. No secret goes in a committed file.

`pnpm --filter @boberstack/infra run destroy` removes the container and the image.

### Another cloud

The image runs anywhere containers run. To deploy it to a cloud, replace `Docker.Container` in `apps/infra/alchemy.run.ts` with that cloud's resource and keep the image: `GCP.Run.Service` from `@alchemy.run/gcp`, `AWS.ECS.Service` from `@alchemy.run/aws`, or the Fly, Hetzner and Kubernetes packages. Push the image to the cloud's registry with the `registry` option of `Docker.Image`. Azure has no Alchemy provider: run the image in Azure Container Apps yourself, or on AKS through `@alchemy.run/kubernetes`.

## Cloudflare

`apps/infra/cloudflare.run.ts` deploys the same api as one Cloudflare Worker, `apps/infra/src/worker.ts`, which serves `apps/web/dist` as static assets and reaches Postgres through Hyperdrive.

Once per machine, add the provider to an Alchemy profile:

```sh
pnpm --filter @boberstack/infra exec alchemy profile edit --add Cloudflare
```

In CI, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` instead. Set `DATABASE_URL` as for the container. Then:

```sh
pnpm --filter @boberstack/infra run deploy:cloudflare
```

`pnpm --filter @boberstack/infra run dev:cloudflare` runs the Worker locally with `alchemy dev`, in place of the Node server `pnpm dev` starts. When a project keeps only the Cloudflare host, `keep-or-cut` makes these the plain `dev`, `deploy` and `destroy` scripts, so `pnpm dev` and `pnpm run deploy` use them.

## Before a deploy

A deploy to a shared stage, `alchemy destroy`, and a deploy whose plan replaces or deletes a resource need the owner's approval before you run them ([AGENTS.md](../../AGENTS.md#ask-first)).

## Mail transport

Sign-up sends a confirmation link, so a deployed api needs a way to send mail. Only Mailpit exists today, and without a real transport the api refuses to start. Root ADR 0006 describes how to add one and set `MAIL_TRANSPORT`.
