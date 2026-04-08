# Deploying Paperclip to Render

Paperclip ships with a [Render Blueprint](https://render.com/docs/infrastructure-as-code)
at the repository root (`render.yaml`) that provisions everything you need:

- a managed **PostgreSQL 17** database
- a **Docker web service** built from the repo's `Dockerfile`
- a **10 GB persistent disk** mounted at `/paperclip` for uploads, local
  secrets keys, and agent workspace data
- auto-generated `BETTER_AUTH_SECRET` and `PAPERCLIP_AGENT_JWT_SECRET`
- a `/api/health` health check

## Prerequisites

- A Render account
- This repository pushed to a Git host Render can reach (GitHub, GitLab, etc.)

## One-click deploy

1. In the Render dashboard, click **New +** → **Blueprint**.
2. Connect the repository containing this `render.yaml`.
3. Render will show the resources it is about to create — a database and a
   web service. Click **Apply**.
4. Wait for the first build to finish. The Dockerfile does a full
   `pnpm install` and workspace build, so the initial build takes several
   minutes. Subsequent deploys are faster thanks to layer caching.
5. When the service goes **Live**, open its URL and complete the first-run
   bootstrap to create your instance admin user. The first user that signs
   up is automatically promoted to `instance_admin` by
   `scripts/docker-entrypoint.sh`.

That's it. `PAPERCLIP_PUBLIC_URL` is derived automatically from
`RENDER_EXTERNAL_URL` on first boot so auth callbacks, Better Auth URLs,
and the hostname allowlist all point at the correct HTTPS origin.

## Plan sizing

The blueprint defaults to sizes that actually work for Paperclip:

| Resource      | Default plan     | Why                                                        |
| ------------- | ---------------- | ---------------------------------------------------------- |
| Web service   | `standard`       | Docker build + Node server need ~2 GB RAM during startup.  |
| Postgres      | `basic-256mb`    | Smallest plan that supports point-in-time restore.         |
| Disk          | 10 GB            | Holds uploads, local secrets key, and agent workspaces.    |

You can drop the web service to `starter` if you don't plan to run the
bundled local adapters (Claude Code, Codex, OpenCode) or hold many
uploads, but `free` is **not** an option because Render free web services
do not support persistent disks, and Paperclip needs one.

## Environment variables

The blueprint wires the essentials. You may want to set the following in
the Render dashboard (**Environment** tab) after the first deploy:

| Variable               | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | Enable the bundled Claude Code local adapter.                       |
| `OPENAI_API_KEY`       | Enable the bundled Codex / OpenAI local adapter.                    |
| `PAPERCLIP_PUBLIC_URL` | Override the auto-derived URL when you attach a custom domain.      |

All three are listed (commented or `sync: false`) in `render.yaml`, so
Render will prompt you for them or accept dashboard-only values.

## Custom domains

1. In the Render dashboard, open the `paperclip` service and add your
   custom domain under **Settings** → **Custom Domains**.
2. Once DNS is validated, set `PAPERCLIP_PUBLIC_URL` to the full
   `https://your.domain` URL in the **Environment** tab and redeploy.
3. Paperclip will pick up the new public URL, update Better Auth's trusted
   origins, and allow the new hostname.

## Data and backups

- **Postgres** — Render's managed Postgres supports daily backups and
  point-in-time restore on `basic-256mb` and above. Use the Render
  dashboard to manage them.
- **Disk** — The `/paperclip` disk holds uploads, the local secrets key
  used to encrypt inline secrets, and agent workspace data. Losing it
  invalidates any inline secrets that were encrypted with the local key.
  Render disks are snapshotted on a schedule; see Render's docs for the
  retention policy.

## Troubleshooting

**The service is live but the UI returns 502 / "No open ports detected".**
Render routes HTTPS traffic to the port set by `PORT`. The blueprint sets
`PORT=3100` and the Dockerfile exposes 3100. If you override `PORT`,
make sure the server (which reads `PORT` via `server/src/config.ts`) picks
up the new value.

**`BETTER_AUTH_SECRET` keeps regenerating.**
`BETTER_AUTH_SECRET` is declared with `generateValue: true` in the
blueprint, so Render stores a single generated value and reuses it on
every deploy. If you delete and re-create the service via Blueprint,
Render will generate a new secret and invalidate existing sessions — set
the value manually beforehand to preserve it.

**Bootstrap didn't promote my user to `instance_admin`.**
`scripts/docker-entrypoint.sh` only auto-promotes the first user when the
`instance_user_roles` table has zero admins. If you need to rerun the
bootstrap, exec into the service shell and run:

```sh
pnpm paperclipai auth bootstrap-ceo
```

**Build fails with out-of-memory.**
Bump the web service to a larger plan temporarily (`pro` or `pro-plus`).
Once the image is built and cached, you can drop back to `standard`.
