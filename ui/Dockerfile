# Next.js production image with enhanced security
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk update && apk upgrade && apk add --no-cache libc6-compat
COPY package*.json .
RUN npm install --legacy-peer-deps --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
RUN apk update && apk upgrade && apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk update && apk upgrade && apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
# Copy only needed files
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
# (public directory not present in repo; skip copy)
EXPOSE 3000
USER nextjs
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm","run","start"]
