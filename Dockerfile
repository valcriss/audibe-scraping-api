FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm run prisma:generate
RUN npm run build

FROM node:20-bullseye-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
