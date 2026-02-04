#!/bin/bash
# À lancer sur le serveur Infomaniak, dans le dossier du projet (celui où il y a package.json).
# Donnez les droits d'exécution une fois : chmod +x sur-le-serveur.sh
# Puis lancez : ./sur-le-serveur.sh

set -e
echo "=== Installation des dépendances ==="
npm ci
echo "=== Build de l'application ==="
npm run build
echo "=== Création des tables en base (db:push) ==="
npm run db:push
echo "=== Démarrage de l'application ==="
echo "L'app écoute sur le port défini dans .env (défaut 5000)."
echo "Pour lancer en arrière-plan avec PM2 : pm2 start dist/index.js --name bfc-app"
npm run start
