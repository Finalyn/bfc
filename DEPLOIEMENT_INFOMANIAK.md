# Déploiement BFC APP sur Infomaniak

**→ Si vous voulez juste savoir quoi faire étape par étape : ouvrez [ETAPES_POUR_VOUS.md](./ETAPES_POUR_VOUS.md).**

Ce document décrit en détail comment héberger l'application et lier la base **MariaDB** sur un serveur cloud managé Infomaniak.

## 1. Base de données MariaDB (Infomaniak)

L’offre cloud managé Infomaniak fournit **MariaDB** (compatible MySQL). L’application est configurée pour MariaDB.

### Créer la base sur Infomaniak

1. Dans le **Manager Infomaniak**, ouvrez votre **serveur cloud managé**.
2. Cliquez sur **MariaDB** dans le menu de gauche.
3. Créez une base et un utilisateur (via l’interface ou phpMyAdmin si disponible). Notez :
   - **Hôte** (souvent `localhost` si l’app est sur le même serveur)
   - **Port** (souvent `3306`)
   - **Nom de la base**
   - **Utilisateur** et **Mot de passe**

### Format DATABASE_URL

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Exemple :

```bash
DATABASE_URL=mysql://bfc_user:VotreMotDePasse@localhost:3306/bfc_commande
```

### Migrer les données depuis l’ancienne base

1. **Créer le schéma** sur la base Infomaniak : `npm run db:push`
2. Si vous aviez des données en **PostgreSQL** (ex-Replit/Neon) : exportez-les (pg_dump ou export CSV), puis importez-les dans MariaDB (phpMyAdmin, ou scripts d’import). Le fichier `production_data_import.sql` du projet est en syntaxe PostgreSQL ; pour MariaDB il faudrait un export adapté ou une réimport manuelle des données après `db:push`.

## 2. Variables d’environnement sur le serveur

Sur le serveur Infomaniak (SSH ou panneau), créez un fichier `.env` à la racine du projet avec au minimum :

- `DATABASE_URL` : chaîne de connexion PostgreSQL Infomaniak (voir ci-dessus).
- `PORT` : port d’écoute (ex. `5000`), selon la config réseau Infomaniak.
- `SESSION_SECRET` : chaîne aléatoire sécurisée pour les sessions.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` : si l’envoi d’emails est utilisé.

Référez-vous à `.env.example` pour la liste complète.

## 3. Build et démarrage sur le serveur

```bash
# Installer les dépendances
npm ci

# Build front + serveur
npm run build

# Appliquer le schéma Drizzle à la base Infomaniak (si pas déjà fait)
npm run db:push

# Démarrer en production
npm run start
```

Le serveur écoute sur le port défini par `PORT` (défaut `5000`). Configurez le reverse proxy (Nginx/Apache) ou le gestionnaire de processus (PM2, systemd) selon ce que propose Infomaniak pour votre offre.

## 4. Processus persistant (PM2 recommandé)

Pour garder l’app lancée après déconnexion :

```bash
npm install -g pm2
pm2 start dist/index.js --name bfc-app
pm2 save
pm2 startup
```

Ajustez le nom et le fichier si votre point d’entrée diffère.

## 5. Résumé

| Étape | Action |
|-------|--------|
| 1 | Créer la base PostgreSQL dans le Manager Infomaniak |
| 2 | Renseigner `DATABASE_URL` (et autres variables) dans `.env` |
| 3 | `npm ci && npm run build && npm run db:push` |
| 4 | Importer l’ancienne donnée si besoin (`production_data_import.sql` ou dump) |
| 5 | Lancer avec `npm run start` ou PM2 et configurer le reverse proxy / domaine |

L’application ne dépend plus de Replit ; la base est entièrement gérée par PostgreSQL sur Infomaniak.
