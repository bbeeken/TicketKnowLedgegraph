FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
# Security updates for base image
RUN apk update && apk upgrade && apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Security updates for runtime image  
RUN apk update && apk upgrade && apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER nextjs
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
