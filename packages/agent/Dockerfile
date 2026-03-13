FROM oven/bun:1-debian

RUN bun i prisma -g --registry https://registry.npmmirror.com/

COPY dist prisma.config.ts entrypoint.sh /app/
COPY prisma/ /app/prisma

ENV DATABASE_URL="file:/data/prod.db"

WORKDIR /app

RUN prisma migrate deploy

EXPOSE 8080

VOLUME [ "/data" ]

WORKDIR /workspace

ENTRYPOINT [ "sh", "/app/entrypoint.sh" ]
