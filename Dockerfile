# EwapEvents frontpage — static nginx image for Portainer / Docker.

FROM nginx:1.27-alpine

RUN apk upgrade --no-cache

COPY default.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
