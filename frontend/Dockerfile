# syntax=docker/dockerfile:1

# ---- dependencies (bun) -------------------------------------------------------------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# ---- build ----------------------------------------------------------------------------
FROM deps AS build
COPY . .
# Public origin baked into the build (kit.paths.origin): CSRF checks and secure cookies.
ARG ORIGIN=http://localhost:3000
ENV ORIGIN=${ORIGIN}
RUN bun run build

# ---- runtime (node) -------------------------------------------------------------------
# adapter-node bundles every devDependency, so the runtime image only needs the output.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	API_URL=http://backend:8080
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
	CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "build"]
