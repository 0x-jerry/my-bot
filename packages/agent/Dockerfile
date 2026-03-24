ARG BASE_IMAGE_NAME="my-agent:base"

FROM ${BASE_IMAGE_NAME}

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

RUN bun i dotenv prisma -g

# https://github.com/prisma/prisma/issues/19994#issuecomment-1612750257
RUN prisma version

COPY prisma/ /app/prisma
COPY dist entrypoint.sh prisma.config.ts /app/

ENV DATABASE_URL="file:/data/prod.db"

EXPOSE 8080

VOLUME [ "/data" ]

WORKDIR /workspace

ENTRYPOINT [ "sh", "/app/entrypoint.sh" ]
