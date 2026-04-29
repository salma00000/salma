FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm install --omit=dev

# Copier le reste du code source
COPY . .

# Utiliser un utilisateur non-root pour la sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
