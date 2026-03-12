FROM oven/bun:1-debian

WORKDIR /app

COPY .npmrc prisma src package.json  prisma.config.ts tsconfig.json /app/

ENV DATABASE_URL="file:./prod.db"

RUN npm i --omit dev

RUN npm run db:migrate && npm run db:generate

ENTRYPOINT [ "npm", "run", "start" ]
