# Staffing Co. — full-stack (Vite frontend + Express/SQLite backend)
FROM node:22-bookworm-slim

# Build tools for the better-sqlite3 native module
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (dev deps needed to build the frontend)
COPY package*.json ./
RUN npm install

# Build the frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Persistent data (SQLite DB + uploaded résumés) lives here — mount a volume at /app/persist
VOLUME ["/app/persist"]

# Hosts inject PORT; the server reads process.env.PORT
EXPOSE 3001
CMD ["node", "server/index.js"]
