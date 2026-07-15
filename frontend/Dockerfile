FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=https://crm.sportmax.fit
ARG NEXT_PUBLIC_COMPANY_SLUG=sportmax
ARG NEXT_PUBLIC_APP_URL=https://crm.sportmax.fit
ARG NEXT_PUBLIC_SCHEDULE_HOST=schedule.sportmax.fit
ARG NEXT_PUBLIC_SCHEDULE_URL=https://schedule.sportmax.fit
ARG NEXT_PUBLIC_CLIENT_LK_HOST=lk.sportmax.fit
ARG NEXT_PUBLIC_CLIENT_LK_URL=https://lk.sportmax.fit
ARG NEXT_PUBLIC_CRM_HOST=crm.sportmax.fit
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_COMPANY_SLUG=$NEXT_PUBLIC_COMPANY_SLUG
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SCHEDULE_HOST=$NEXT_PUBLIC_SCHEDULE_HOST
ENV NEXT_PUBLIC_SCHEDULE_URL=$NEXT_PUBLIC_SCHEDULE_URL
ENV NEXT_PUBLIC_CLIENT_LK_HOST=$NEXT_PUBLIC_CLIENT_LK_HOST
ENV NEXT_PUBLIC_CLIENT_LK_URL=$NEXT_PUBLIC_CLIENT_LK_URL
ENV NEXT_PUBLIC_CRM_HOST=$NEXT_PUBLIC_CRM_HOST
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build:raw

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]
