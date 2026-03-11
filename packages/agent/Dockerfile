FROM node:lts-trixie-slim as base

WORKDIR /app

COPY prisma src package.json  prisma.config.ts tsconfig.json /app/

ENV DATABASE_URL="file:./prod.db"

RUN pnpm i --prod

RUN pnpm run db:migrate && pnpm run db:generate

ENTRYPOINT [ "pnpm", "run", "start" ]
