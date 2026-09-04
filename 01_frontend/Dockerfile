# Stage 1: build the Vite app inside the npm workspace.
FROM node:22-alpine AS build
WORKDIR /app

# Copy every workspace manifest before `npm ci`, or Docker cannot cache the
# install layer and reinstalls on every source change.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY 01_frontend/package.json 01_frontend/
COPY 02_backend/package.json 02_backend/
RUN npm ci -w packages/shared -w 01_frontend

COPY packages/shared packages/shared
COPY 01_frontend 01_frontend
RUN npm run build -w 01_frontend

# Stage 2: serve it. nginx also proxies /api and serves /uploads.
FROM nginx:1.27-alpine
COPY 01_frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/01_frontend/dist /usr/share/nginx/html
EXPOSE 80
