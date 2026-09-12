# Expo web → статика для nginx
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL=http://127.0.0.1
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

RUN npx expo export -p web

# Артефакты для volume/copy
FROM alpine:3.20
COPY --from=build /app/dist /web
CMD ["true"]
