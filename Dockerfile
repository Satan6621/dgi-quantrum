FROM node:20-alpine

WORKDIR /app

# Copy API package files
COPY apps/api/package*.json ./apps/api/

# Install dependencies
WORKDIR /app/apps/api
RUN npm install

# Copy API source
COPY apps/api .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
