# ==============================================================================
# Hardened Isolated Node / TypeScript Test Execution Sandbox Image
# ==============================================================================
FROM node:20-alpine

# Set non-writeable production environment
ENV NODE_ENV=test \
    CI=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /workspace

# Install minimal test runner tooling
RUN npm install -g vitest@1.4.0 typescript@5.4.5 @types/node@20.11.0

# Create unprivileged sandbox user and group (UID/GID 10001)
RUN addgroup -g 10001 -S sandboxgroup && \
    adduser -u 10001 -S sandboxuser -G sandboxgroup -h /workspace -s /sbin/nologin

RUN chown -R 10001:10001 /workspace && \
    chmod 755 /workspace

USER 10001:10001

CMD ["vitest", "run", "--reporter=json", "--outputFile=/tmp/report.json"]
