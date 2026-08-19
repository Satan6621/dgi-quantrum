FROM node:20-alpine

WORKDIR /app

# Copy API package files first (for caching)
COPY apps/api/package*.json ./

# Install ALL dependencies (including dev for prisma)
RUN npm install

# Copy API source and prisma
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma
COPY apps/api/tsconfig.json ./
COPY apps/api/scripts ./scripts

# Generate Prisma client
RUN npx prisma generate

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
