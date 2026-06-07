FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

ARG API_BASE_URL=http://localhost:8080
ARG OIDC_AUTHORITY=http://localhost:8080
ARG OIDC_CLIENT_ID=staff-portal
ARG OIDC_CLIENT_SECRET=staff-portal-secret
ARG OIDC_REDIRECT_URI=http://localhost:3000/api/auth/callback
ARG OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/login
ARG OIDC_SCOPES="openid profile email banking.staff"
ARG SESSION_SECRET=local-dev-session-secret-change-me-32chars
ARG SESSION_IDLE_MS=600000
ARG NEXT_PUBLIC_IDLE_TIMEOUT_MS=900000
ARG NEXT_PUBLIC_IDLE_WARNING_MS=120000

ENV API_BASE_URL=$API_BASE_URL
ENV OIDC_AUTHORITY=$OIDC_AUTHORITY
ENV OIDC_CLIENT_ID=$OIDC_CLIENT_ID
ENV OIDC_CLIENT_SECRET=$OIDC_CLIENT_SECRET
ENV OIDC_REDIRECT_URI=$OIDC_REDIRECT_URI
ENV OIDC_POST_LOGOUT_REDIRECT_URI=$OIDC_POST_LOGOUT_REDIRECT_URI
ENV OIDC_SCOPES=$OIDC_SCOPES
ENV SESSION_SECRET=$SESSION_SECRET
ENV SESSION_IDLE_MS=$SESSION_IDLE_MS
ENV NEXT_PUBLIC_IDLE_TIMEOUT_MS=$NEXT_PUBLIC_IDLE_TIMEOUT_MS
ENV NEXT_PUBLIC_IDLE_WARNING_MS=$NEXT_PUBLIC_IDLE_WARNING_MS

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
