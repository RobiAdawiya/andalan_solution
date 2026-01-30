FROM node:22-alpine

# Library sistem untuk kompatibilitas binary di Linux Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Menghapus package-lock lama jika ada untuk menghindari konflik arsitektur
COPY package*.json ./
RUN rm -f package-lock.json

# Instalasi bersih
RUN npm install --legacy-peer-deps

# Khusus untuk mengatasi error rollup di Docker Desktop/WSL
RUN npm install @rollup/rollup-linux-x64-musl

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]