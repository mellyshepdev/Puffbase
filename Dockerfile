# syntax=docker/dockerfile:1

# ---- deps (full, incl. devDependencies, for building) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build client + server bundle ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---- production-only node_modules (better-sqlite3 needs a native build here too) ----
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Embedded gitea: git for repo ops, openssh for git-over-ssh. The node
# image's uid-1000 `node` user is renamed to `git` — gitea's volume data is
# already owned by 1000 from the official image.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git openssh-server ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && usermod -l git -d /data/git -s /bin/sh node \
    && groupmod -n git node \
    && mkdir -p /data
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# gitea binary lifted from the official image (static Go binary — the musl
# build runs fine on glibc). /usr/local/bin/* in that image are wrappers;
# the real binary is /app/gitea/gitea.
COPY --from=gitea/gitea:latest /app/gitea/gitea /usr/local/bin/gitea
COPY docker/sshd_config /etc/ssh/sshd_config
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000 3000 22
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
