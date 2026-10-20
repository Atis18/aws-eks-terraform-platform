FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite replaces import.meta.env.VITE_* values during the build.
# These are Firebase *web-app* settings (public client configuration), not secrets.
ARG VITE_FB_apiKey
ARG VITE_FB_authDomain
ARG VITE_FB_projectId
ARG VITE_FB_storageBucket
ARG VITE_FB_messagingSenderId
ARG VITE_FB_appId
ARG VITE_FB_DATABASE_URL

ENV VITE_FB_apiKey=${VITE_FB_apiKey} \
    VITE_FB_authDomain=${VITE_FB_authDomain} \
    VITE_FB_projectId=${VITE_FB_projectId} \
    VITE_FB_storageBucket=${VITE_FB_storageBucket} \
    VITE_FB_messagingSenderId=${VITE_FB_messagingSenderId} \
    VITE_FB_appId=${VITE_FB_appId} \
    VITE_FB_DATABASE_URL=${VITE_FB_DATABASE_URL}

RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]