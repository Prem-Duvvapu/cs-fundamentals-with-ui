# Stage 1: Build React static assets
FROM node:26-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY content/ /app/content/
COPY scripts/render-diagrams.mjs /app/scripts/render-diagrams.mjs
RUN npm run build

# Stage 2: Nginx Web Server
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
