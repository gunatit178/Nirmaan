# The Nirmaan OS (app/) for Fly.io: the web app and the campaign worker in one
# machine, with the database and project files on a persistent volume (/data).
# Build and deploy with `fly deploy` from the repo root (see fly.toml and
# docs/engineering/deployment.md). The public website is not in this image.

FROM node:22-bookworm-slim AS build
WORKDIR /srv/app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY app/package.json app/package-lock.json ./
COPY app/prisma ./prisma
RUN npm ci
COPY app/ ./
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# The claude CLI: the OS's default model provider, signed in with CLAUDE_CODE_OAUTH_TOKEN
# (from `claude setup-token`, billed to the Claude subscription, not the metered API).
RUN npm install -g @anthropic-ai/claude-code@latest && claude --version
WORKDIR /srv/app
COPY --from=build /srv/app ./
COPY agents /srv/agents
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/nirmaan.db \
    PROJECTS_ROOT=/data/projects \
    AGENTS_ROOT=/srv/agents \
    CLAUDE_CODE_EXECPATH=claude \
    NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
