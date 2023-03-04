FROM node:16.15.1 as builder

ENV WORKDIR /app

COPY ./ $WORKDIR

WORKDIR $WORKDIR

RUN ls

RUN npm i pnpm --location=global

RUN pnpm install

RUN pnpm build

CMD node ./dist/src/main.js --name nestAdminTs

EXPOSE 521
