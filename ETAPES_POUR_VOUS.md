# Les seules étapes où j’ai besoin de vous

Tout le reste est déjà prêt dans le projet. Voici **exactement** quoi faire, dans l’ordre.

---

## Étape 1 — Créer la base de données MariaDB sur Infomaniak (une seule fois)

Sur votre serveur cloud managé Infomaniak, la base disponible est **MariaDB** (compatible MySQL). L’application est déjà configurée pour MariaDB.

1. Connectez-vous à **Manager Infomaniak** : https://www.infomaniak.com/fr/login  
2. Ouvrez votre **serveur cloud managé** (ex. « Finalyn - Server »).  
3. Dans le menu de **gauche**, cliquez sur **MariaDB**.  
4. Vous arrivez sur la page de configuration MariaDB. Il faut **créer une base et un utilisateur**.  
   - Cherchez un bouton ou un onglet du type **« Bases de données »**, **« Gestion des bases »** ou **« phpMyAdmin »** (souvent dans un sous-menu ou un autre écran du Manager).  
   - Si vous voyez **phpMyAdmin** ou **« Gestion des bases »** : ouvrez-le, créez une **nouvelle base** (ex. `bfc_commande`) et un **utilisateur** avec un mot de passe (ex. `bfc_user` / mot de passe fort). Notez : **nom de la base**, **utilisateur**, **mot de passe**, **hôte** (souvent `localhost` si l’app tourne sur le même serveur) et **port** (souvent `3306`).  
5. Si vous ne trouvez pas où créer la base : dans le Manager, regardez les onglets en haut de la page MariaDB (ex. « INFORMATIONS », « UTILISATEURS ») ou le lien **« Hébergements Web »** : parfois la base est liée à un hébergement. Créez un hébergement web si besoin, puis associez-y une base MariaDB.  
6. **Notez** dans un bloc-notes : **hôte** (ex. `localhost` ou l’adresse indiquée), **port** (souvent `3306`), **nom de la base**, **utilisateur**, **mot de passe**.

**À faire :** une fois la base et l’utilisateur créés, gardez ces infos pour l’étape 2.

Si après avoir cherché vous ne trouvez toujours pas où créer une base MariaDB, décrivez-moi ce que vous voyez dans le menu (les noms des liens/onglets) et je vous dirai exactement où cliquer.

---

## Étape 2 — Créer le fichier `.env` (sur votre PC, dans le dossier du projet)

1. Ouvrez le dossier du projet : `C:\Users\switc\Desktop\BFC-COMMANDE`  
2. Copiez le fichier **`.env.example`** et renommez la copie en **`.env`**  
   - Clic droit sur `.env.example` → Copier → Coller → Renommer la copie en `.env`  
3. Ouvrez **`.env`** avec Bloc-notes (clic droit → Ouvrir avec → Bloc-notes).  
4. Remplissez **au minimum** cette ligne (une seule ligne, sans espace avant/après le `=`) :

```env
DATABASE_URL=mysql://VOTRE_UTILISATEUR:VOTRE_MOT_DE_PASSE@VOTRE_HOTE:3306/VOTRE_NOM_DE_BASE
```

Remplacez :
- `VOTRE_UTILISATEUR` → l’utilisateur de l’étape 1 (ex. `bfc_user`)
- `VOTRE_MOT_DE_PASSE` → le mot de passe (attention : si le mot de passe contient `@` ou `#`, remplacez par `%40` pour `@` ou `%23` pour `#`)
- `VOTRE_HOTE` → l’hôte (souvent `localhost` ou `127.0.0.1` si l’app est sur le même serveur que MariaDB)
- `VOTRE_NOM_DE_BASE` → le nom de la base (ex. `bfc_commande`)
- Le port est en général **3306** pour MariaDB/MySQL

Exemple (fictif) :

```env
DATABASE_URL=mysql://bfc_user:MonMotDePasse123@localhost:3306/bfc_commande
```

5. Ajoutez aussi (pour que l’app fonctionne correctement) :

```env
PORT=5000
SESSION_SECRET=une-longue-chaine-aleatoire-ici-au-moins-32-caracteres
```

Pour `SESSION_SECRET`, vous pouvez inventer une longue phrase (ex. `ma-super-phrase-secrete-bfc-2025-tres-longue`).  
6. Enregistrez et fermez le fichier.

**Important :** ne partagez jamais votre fichier `.env` et ne le mettez pas sur internet (il est déjà ignoré par Git).

---

## Étape 3 — Envoyer le projet sur le serveur Infomaniak

Infomaniak vous donne un accès au serveur (SSH ou interface type “Fichiers”). Il faut que le contenu du dossier **BFC-COMMANDE** (avec le `.env` dedans) se retrouve sur le serveur.

- **Si Infomaniak vous a donné un accès “Fichiers” (SFTP / gestionnaire de fichiers) :**
  1. Connectez-vous à ce gestionnaire.
  2. Allez dans le dossier où doit vivre l’app (ex. `home/bfc-app` ou le chemin indiqué par Infomaniak).
  3. Envoyez **tout** le contenu du dossier `BFC-COMMANDE` (dont le fichier `.env` que vous venez de créer).

- **Si Infomaniak vous a donné un accès SSH :**
  - Vous devrez vous connecter en SSH depuis votre PC (avec PuTTY ou l’outil fourni par Infomaniak), puis soit :
    - copier le projet avec un outil comme FileZilla (SFTP) vers ce serveur,  
    soit  
    - utiliser `git clone` si le projet est sur un dépôt Git, puis créer le `.env` sur le serveur (même contenu qu’à l’étape 2).

Une fois que le projet (avec `.env`) est sur le serveur, passez à l’étape 4.

**Important :** La base MariaDB Infomaniak n’accepte les connexions **que depuis l’infrastructure Infomaniak** (hébergement ou serveur lié). Depuis votre PC, `npm run db:push` ou `npm run dev` ne pourra pas se connecter à la base (erreur « ETIMEDOUT »). C’est normal. Il faut déployer le projet sur Infomaniak puis lancer `db:push` et `npm run start` **sur le serveur**.

---

## Étape 4 — Lancer l’app sur le serveur (une fois connecté au serveur)

Vous devez être **connecté au serveur** (SSH ou terminal dans l’interface Infomaniak), dans le dossier du projet (celui qui contient `package.json` et `.env`).

Collez et exécutez **les commandes une par une** (ou tout le bloc si votre interface le permet) :

```bash
npm ci
```

(puis Entrée, attendre la fin)

```bash
npm run build
```

(puis Entrée, attendre la fin)

```bash
npm run db:push
```

(Quand on vous demande de confirmer, tapez `y` puis Entrée. Cela crée les tables dans la base Infomaniak.)

```bash
npm run start
```

L’app est alors démarrée. Vous devriez voir un message du type “serving on port 5000”.

Pour que l’app reste démarrée après avoir fermé la fenêtre, Infomaniak peut proposer “PM2” ou un outil similaire. Si vous voulez, on pourra détailler ça après (dites-le moi et je vous donnerai les commandes exactes).

---

## Récapitulatif : ce que vous faites vs ce que j’ai préparé

| Vous | Moi (déjà fait) |
|------|------------------|
| Créer la base MariaDB sur Infomaniak | Code sans Replit, base en MariaDB pour Infomaniak |
| Remplir le fichier `.env` avec vos infos | Fichier `.env.example` et doc |
| Envoyer le projet + `.env` sur le serveur | Build qui fonctionne, scripts `build` / `start` / `db:push` |
| Lancer `npm ci`, `npm run build`, `npm run db:push`, `npm run start` sur le serveur | Guide et commandes prêtes |

Dès que vous avez fait l’étape 1 (base créée) et l’étape 2 (`.env` rempli), vous pouvez me renvoyer **un message sans coller votre mot de passe** du type : “J’ai créé la base et le .env, tout est rempli.” Si quelque chose bloque (par ex. vous ne trouvez pas PostgreSQL dans le Manager, ou une commande affiche une erreur), copiez-collez le message d’erreur ou décrivez où vous en êtes et je vous dirai exactement quoi faire à la ligne.
