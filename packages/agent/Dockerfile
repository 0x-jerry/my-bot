FROM oven/bun:1-debian

WORKDIR /app

COPY dist /app/

ENV DATABASE_URL="file:./prod.db"

ENTRYPOINT [ "bun", "run", "/app/index.js" ]
