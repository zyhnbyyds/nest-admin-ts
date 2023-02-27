FROM centos:7.9 as builder

ENV WORKDIR /app

WORKDIR $WORKDIR

COPY ../../nest-admin-ts $WORKDIR

RUN npm i -g pnpm:7.5.0

RUN npm i -g pm2:

RUN pnpm install

RUN pnpm build

RUN mkdir /nestAdminTs

COPY --from=builder /soybean-admin/dist /soybean-admin

EXPOSE 80
