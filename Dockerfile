FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ARG NEXT_PUBLIC_OIDC_AUTHORITY=http://localhost:8080
ARG NEXT_PUBLIC_OIDC_CLIENT_ID=staff-app
ARG NEXT_PUBLIC_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
ARG NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
ARG NEXT_PUBLIC_OIDC_SCOPES="openid profile email offline_access banking.staff"

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_OIDC_AUTHORITY=$NEXT_PUBLIC_OIDC_AUTHORITY
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID
ENV NEXT_PUBLIC_OIDC_REDIRECT_URI=$NEXT_PUBLIC_OIDC_REDIRECT_URI
ENV NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI=$NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI
ENV NEXT_PUBLIC_OIDC_SCOPES=$NEXT_PUBLIC_OIDC_SCOPES

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
