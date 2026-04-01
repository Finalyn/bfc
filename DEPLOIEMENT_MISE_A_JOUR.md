# Mise à jour BFC APP - Guide de déploiement et tests

## Résumé des changements

- **PDF Bon de commande** : header image uniquement pour BDIS, nom en gros texte pour les autres fournisseurs
- **PDF Signature** : suppression du cadre "Pour la société", seul "Le Magasin" reste (pleine largeur)
- **Notifications push** : correction du scheduler (normalisation dates, catch-up au démarrage, logs détaillés)
- **Mode hors ligne** : service worker amélioré, auto-sync global, correction logique de sync, auth offline
- **Page Profil** : nouvelle page avec prénom/nom, email modifiable, notifications, aide, support
- **Export Analyse** : boutons Excel et PDF dans la page Analyse des Clients
- **Backup BDD** : backup automatique quotidien (02h00) + bouton manuel dans l'admin dashboard
- **Sécurité** : helmet, rate limiting login, hash bcrypt des mots de passe, nettoyage mémoire, index BDD

---

## Étape 1 : Envoyer les fichiers sur le serveur

Transférer le projet mis à jour sur le serveur Infomaniak (SFTP, git pull, ou file manager).

Fichiers modifiés :
```
shared/schema.ts                      (nouveau champ email commerciaux)
server/routes.ts                       (endpoint PATCH /api/user/email + email au login)
server/notificationScheduler.ts        (scheduler corrigé)
server/utils/notificationSender.ts     (logs ajoutés)
server/utils/pdfGenerator.ts           (header PDF conditionnel)
client/src/lib/pdfGenerator.ts         (header PDF conditionnel côté client)
client/src/lib/offlineSync.ts          (logique sync corrigée)
client/src/pages/OrderPage.tsx         (auth offline)
client/src/pages/ProfilePage.tsx       (page refaite)
client/src/pages/HubPage.tsx           (nom cliquable → profil)
client/src/pages/LoginPage.tsx         (stocke email + userId)
client/src/App.tsx                     (route /profile + initAutoSync global)
client/public/sw.js                    (service worker v5)
client/src/pages/AnalyticsPage.tsx     (boutons export Excel/PDF)
client/src/pages/AdminDashboard.tsx    (bouton backup BDD)
server/backupScheduler.ts              (NOUVEAU - backup automatique quotidien)
server/index.ts                        (démarrage backup scheduler + helmet)
.gitignore                             (ajout backups/)
```

**Nouveaux packages à installer** (fait automatiquement par `npm ci`) :
- `helmet` — headers de sécurité
- `express-rate-limit` — protection brute force
- `bcrypt` — hashage mots de passe

## Étape 2 : Build + Migration base de données

Se connecter en SSH au serveur et exécuter :

```bash
cd /chemin/vers/bfc

# Installer les dépendances
npm ci

# Build frontend + backend
npm run build

# Migrer la base de données (ajoute la colonne email à commerciaux)
npm run db:push
```

**Important** : `db:push` va ajouter la colonne `email` à la table `commerciaux`. Aucune donnée existante n'est perdue.

## Étape 3 : Vérifier les variables d'environnement

Dans le fichier `.env` sur le serveur, vérifier que ces variables sont présentes :

```env
DATABASE_URL=mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>
ADMIN_PASSWORD=<MOT_DE_PASSE_ADMIN_FORT>
SESSION_SECRET=<GENERE_AVEC_openssl_rand_-hex_32>

# Notifications push (OBLIGATOIRE pour que les notifications marchent)
VAPID_PUBLIC_KEY=<VOTRE_CLE_PUBLIQUE_VAPID>
VAPID_PRIVATE_KEY=<VOTRE_CLE_PRIVEE_VAPID>

# Pour générer des clés VAPID :
# npx web-push generate-vapid-keys
```

## Étape 4 : Redémarrer le serveur

```bash
# Avec PM2
pm2 restart bfc-app

# OU sans PM2
npm run start
```

## Étape 5 : Vérifier les logs au démarrage

Dans les logs du serveur, vous devez voir :

```
[PUSH] Web Push configured successfully          ← VAPID OK
[NOTIF] notification_logs table ready             ← Table OK
[NOTIF] Running startup catch-up check...         ← Catch-up OK
[NOTIF] Scheduler started (veille 18:00, jour_meme 07:30, cleanup 03:00)  ← Cron OK
[BACKUP] Backup initial au démarrage...           ← Backup OK
[BACKUP] Sauvegarde créée: backup_bfc_...xlsx     ← Fichier créé
[BACKUP] Scheduler démarré (backup quotidien à 02:00, max 30 fichiers)    ← Cron backup OK
```

Si vous voyez `[PUSH] VAPID keys not configured` → les notifications ne marcheront pas. Vérifiez les variables VAPID dans `.env`.

---

## Tests à effectuer

### Test 1 : PDF Bon de commande

1. Créer un bon de commande pour **BDIS** → vérifier que l'image header est bien présente en haut
2. Créer un bon de commande pour **SIROCO** (ou autre fournisseur) → vérifier que le nom "SIROCO" apparait en gros texte au lieu de l'image
3. Sur les deux PDF, vérifier qu'il n'y a **qu'un seul cadre signature** ("Le Magasin") et plus de cadre "Pour la société"

### Test 2 : Page Profil

1. Sur le Hub, **cliquer sur votre nom** en haut à gauche → doit ouvrir la page Profil
2. Vérifier que le **prénom et nom** sont affichés et non modifiables
3. Entrer un **email**, cliquer sur le bouton sauvegarder → vérifier le toast "Email mis à jour"
4. Se déconnecter et reconnecter → l'email doit être conservé
5. Vérifier la section **Aide** avec le contact support@finalyn.app

### Test 3 : Notifications push

1. Sur la page Profil, activer les **notifications push** (toggle)
2. Vérifier dans les logs serveur qu'un utilisateur apparait dans les subscribed users
3. **Test rapide** : envoyer une requête de test (depuis le navigateur ou curl) :
   ```bash
   curl -X POST https://votre-domaine.com/api/notifications/test-send \
     -H "Content-Type: application/json" \
     -d '{"userName": "Prénom Nom"}'
   ```
   → Vous devez recevoir une notification sur votre téléphone
4. **Test réel** : créer une commande avec une date de livraison à demain, puis vérifier :
   - À 18h00 → notification "Rappel : Livraison demain"
   - Le lendemain à 7h30 → notification "Livraison aujourd'hui"

### Test 4 : Mode hors ligne

1. Ouvrir l'app en ligne, naviguer un peu (pour que le service worker cache les assets)
2. **Activer le mode avion** sur le téléphone
3. Fermer complètement l'app
4. **Rouvrir l'app** → elle doit se charger normalement
5. Aller dans **Bon de commande** → le formulaire doit fonctionner (clients et thèmes chargés depuis le cache)
6. **Remplir et valider** un bon de commande complet → doit afficher "Commande sauvegardée hors-ligne"
7. **Désactiver le mode avion** → attendre quelques secondes
8. Vérifier qu'une notification apparait "X commande(s) synchronisée(s)"
9. Vérifier dans le tableau de bord admin que la commande est bien apparue
10. Vérifier que les emails ont bien été envoyés au client

### Test 5 : Vérification rapide

| Élément | Attendu |
|---------|---------|
| PDF BDIS | Image header en haut |
| PDF Siroco/VDH/etc | Nom du fournisseur en gros |
| PDF Signature | 1 seul cadre "Le Magasin" (pleine largeur) |
| Hub → clic nom | Ouvre la page Profil |
| Profil → email | Modifiable et sauvegardable |
| Profil → notifications | Toggle push fonctionne |
| Profil → aide | Affiche support@finalyn.app |
| Notifications push | Reçues la veille à 18h et le jour même à 7h30 |
| Mode offline | App se charge, commande possible, sync auto au retour réseau |
| Analyse → Export Excel | Télécharge un fichier .xlsx avec les stats |
| Analyse → Export PDF | Télécharge un fichier .pdf avec les stats |
| Admin → Backup | Télécharge un backup complet de la BDD |

---

### Test 6 : Export Analyse

1. Aller sur la page **Analyse des Clients** (depuis le Hub ou le dashboard)
2. Cliquer sur le bouton **Excel** en haut à droite → un fichier `.xlsx` se télécharge avec les stats (résumé, par fournisseur, thèmes, clients, par mois)
3. Cliquer sur le bouton **PDF** → un fichier `.pdf` se télécharge avec le rapport

### Test 7 : Backup Base de Données

1. Aller sur le **Dashboard Admin** (Base de données)
2. Cliquer sur le menu **Exporter** (icône download en haut)
3. Cliquer sur **Backup complet (sauvegarde)** → un fichier `backup_bfc_YYYY-MM-DD.xlsx` se télécharge
4. Ouvrir le fichier et vérifier qu'il contient les onglets : Clients, Commandes, Commerciaux, Fournisseurs, Thèmes, Backup Info
5. Vérifier que l'onglet **Backup Info** affiche la date et les compteurs corrects

**Backup automatique (côté serveur - pour le dev)** :
- Un dump SQL complet de la base est créé automatiquement **tous les jours à 02h00** dans `backups/` sur le serveur
- Un backup est aussi créé à **chaque démarrage/redémarrage** du serveur
- Les **30 derniers backups** sont conservés, les plus anciens sont supprimés automatiquement
- Format : fichier `.sql` importable directement dans MariaDB/MySQL en cas de besoin
- Pour restaurer : `mysql -u USER -p DATABASE < backups/backup_bfc_YYYY-MM-DD_HH-mm.sql`

**Backup manuel (côté admin - export Excel)** :
- Bouton "Backup complet" dans le menu Exporter du dashboard admin
- Télécharge un fichier Excel avec toutes les données (pour archivage externe)

---

## En cas de problème

- **Notifications ne marchent pas** : vérifier `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` dans `.env`, puis redémarrer
- **Page blanche offline** : ouvrir l'app une fois en ligne après le déploiement pour mettre à jour le service worker
- **Erreur db:push** : vérifier que `DATABASE_URL` est correct dans `.env`
- **Email non sauvegardé** : vérifier que `db:push` a bien été exécuté (colonne `email` ajoutée)
