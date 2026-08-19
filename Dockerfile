FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

RUN cd apps/api && npm install

COPY apps/api ./apps/api

WORKDIR /app/apps/api

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
