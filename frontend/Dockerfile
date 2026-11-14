# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they are build args. Declared
# without a default (and not ENV) so an unset one stays unset instead of becoming an empty string.
ARG NEXT_PUBLIC_BLINK_PROJECT_ID
ARG NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_BASMY_TOKEN
ARG NEXT_PUBLIC_OTP_URL
ARG NEXT_PUBLIC_ORCHESTRATION_API_URL
ARG NEXT_PUBLIC_PREDICT_DELAYS_URL
ARG NEXT_PUBLIC_PREDICT_CROWD_URL
ARG NEXT_PUBLIC_KL_EVENTS_URL
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# `output: "standalone"` emits a flat, self-contained server (.next/standalone/server.js) with only the traced dependencies.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
