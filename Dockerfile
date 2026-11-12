# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
# Toolchain only needed if better-sqlite3 has no prebuilt binary for this platform.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-alpine
RUN apk add --no-cache su-exec tini tzdata
WORKDIR /app

ENV NODE_ENV=production \
    DATA_DIR=/config \
    PORT=8080 \
    PUID=99 \
    PGID=100 \
    UMASK=022 \
    TZ=Europe/London \
    BODY_SIZE_LIMIT=25M

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG VERSION=dev
LABEL org.opencontainers.image.title="Glovebox" \
      org.opencontainers.image.description="Self-hosted vehicle tracker for MOT, tax, insurance, servicing and more" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"

EXPOSE 8080
VOLUME /config
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
CMD ["node", "build"]
