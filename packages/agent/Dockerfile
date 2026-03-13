FROM oven/bun:1-debian

RUN bun i prisma -g --registry https://registry.npmmirror.com/

# https://github.com/prisma/prisma/issues/19994#issuecomment-1612750257
RUN prisma -v

COPY prisma/ /app/prisma
COPY dist entrypoint.sh prisma.config.ts /app/

ENV DATABASE_URL="file:/data/prod.db"

EXPOSE 8080

VOLUME [ "/data" ]

WORKDIR /workspace

ENTRYPOINT [ "sh", "/app/entrypoint.sh" ]
