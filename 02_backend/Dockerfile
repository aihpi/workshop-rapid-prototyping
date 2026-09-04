FROM node:22-alpine
WORKDIR /app

# Copy every workspace manifest before `npm ci`, or Docker cannot cache the
# install layer and reinstalls on every source change.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY 01_frontend/package.json 01_frontend/
COPY 02_backend/package.json 02_backend/
RUN npm ci --omit=dev -w packages/shared -w 02_backend

COPY packages/shared packages/shared
COPY 02_backend 02_backend

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "02_backend"]
