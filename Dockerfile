FROM node:20-alpine

WORKDIR /app/apps/api

# Copy package files
COPY apps/api/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma
COPY apps/api/tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
