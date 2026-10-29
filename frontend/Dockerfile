# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

ENV PNPM_HOME="" \
    NPM_CONFIG_FUND=0 \
    NPM_CONFIG_AUDIT=0

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---------- Target de desarrollo (hot reload) ----------
FROM base AS dev

ENV CHOKIDAR_USEPOLLING=true

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- Target de producción (build estático + nginx) ----------
FROM base AS build

# Vite incrusta la URL de la API en el bundle al compilar: cambiarla exige
# reconstruir la imagen. Sin ella el bundle apuntaría a localhost.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "Falta el build arg VITE_API_URL" >&2 && exit 1)
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# nginx sin root: escucha en 8080 y corre como el usuario nginx (uid 101).
FROM nginxinc/nginx-unprivileged:1.29-alpine AS prod

ARG VITE_API_URL
# La plantilla de nginx la usa en connect-src de la CSP; el entrypoint de la
# imagen la sustituye al arrancar (envsubst sobre /etc/nginx/templates).
ENV API_ORIGIN=$VITE_API_URL

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 8080
