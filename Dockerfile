FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --chown=nestjs:nodejs package*.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY --chown=nestjs:nodejs . .

RUN pnpm run db:generate && pnpm run build

COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

RUN mkdir /app/uploads && \
    chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 8081

ENTRYPOINT ["/usr/local/bin/init.sh"]
CMD ["node", "dist/src/main"]