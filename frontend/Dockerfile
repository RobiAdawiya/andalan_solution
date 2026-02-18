# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app

# Copy package json
COPY package*.json ./

# Install dependencies utama
RUN npm install --force

# --- PERBAIKAN DI SINI ---
# Kita tambahkan jspdf ke daftar install manual
RUN npm install lucide-react qrcode jspdf react-router-dom @mui/x-date-pickers @mui/material @emotion/react @emotion/styled dayjs sweetalert2

# Copy seluruh source code
COPY . .

# Set API URL
ENV VITE_API_URL=/api

# Build
RUN npm run build

# Stage 2: Serve dengan Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Config Nginx Internal
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]