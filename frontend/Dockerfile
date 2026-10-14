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

COPY . .
RUN npm run build

FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
