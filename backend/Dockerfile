FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install && npx prisma generate
COPY . .
EXPOSE 3002
CMD ["npm", "run", "dev"]
