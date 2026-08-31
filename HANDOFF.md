@
# HANDOFF.md — EduPlateforme

> Document de passation complet à destination d'un agent IA reprenant le projet.
> Dernière mise à jour : 2026-08-30

---

## 1. Objectif global et état d'avancement

### Objectif
Plateforme pédagogique multi-tenant (lycée/BTS, France) avec deux rôles : **Professeur** et **Élève**. Chaque professeur est un tenant isolé qui gère ses groupes, chapitres, élèves, et documents. Les élèves interagissent avec un **chatbot IA RAG** (Retrieval-Augmented Generation) qui s'appuie exclusivement sur les documents de cours uploadés par leur professeur.

### Avancement global : ~80%

| Phase | Statut |
|:---|:---|
| Initialisation projet / dépendances | ✅ Terminé |
| Schema BDD Prisma (13 modèles) | ✅ Terminé |
| Pipeline RAG complet (embeddings, chunker, search, prompts) | ✅ Terminé |
| Authentification NextAuth + middleware | ✅ Terminé (⚠️ middleware deprecated, voir §7) |
| Design system CSS + composants UI | ✅ Terminé |
| Layouts prof/élève | ✅ Terminé |
| Toutes les pages prof (dashboard, groupes, détail groupe, élèves, EDT, quotas, rentrée) | ✅ Terminé |
| Toutes les pages élève (dashboard, cours, EDT, annonces, chat) | ✅ Terminé |
| Toutes les API routes (19 endpoints) | ✅ Terminé |
| Interface chat (composant client) | ✅ Terminé |
| API chat (RAG + LLM + quotas) | ✅ Terminé |
| Seed de données démo | ✅ Terminé |
| Migration Prisma + setup BDD | ❌ Non fait (nécessite PostgreSQL + pgvector) |
| Build réussi | ❌ Échoue (2 problèmes identifiés, voir §7) |
| Tests | ❌ Aucun test écrit |
| README | ❌ Non fait |

---

## 2. Architecture

### Stack technique

| Couche | Technologie | Version |
|:---|:---|:---|
| Framework | Next.js (App Router) | 16.3.3 |
| Langage | TypeScript | ^5 |
| Styling | Tailwind CSS v4 (via `@import "tailwindcss"`) | ^4 |
| ORM | Prisma | 6.19.3 |
| Auth | NextAuth (next-auth) | 5.0.0-beta.32 |
| BDD | PostgreSQL + pgvector | — |
| LLM | Claude (Anthropic SDK, modèle `claude-sonnet-4-20250514`) | ^0.122.0 |
| Embeddings | Voyage AI (`voyage-3-lite`, 512 dimensions) | API REST directe |
| Extraction docs | pdf-parse v2, mammoth | ^2.4.5, ^1.12.2 |
| Runtime | Node.js | v23.4.0 |

### Structure des dossiers

```
projet_cours/
├── prisma/
│   ├── schema.prisma          # 13 modèles, enums, pgvector
│   └── seed.ts                # Données de démo (1 prof, 4 élèves, 2 groupes)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Inter + JetBrains Mono via next/font)
│   │   ├── page.tsx           # Redirect → /login ou /prof|eleve/dashboard
│   │   ├── globals.css        # Design system complet (palette, animations, cards)
│   │   ├── login/page.tsx     # Login split-screen
│   │   ├── register/page.tsx  # Inscription prof
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   │   └── register/route.ts       # Inscription prof API
│   │   │   ├── chat/route.ts               # ⭐ Chat RAG (le cœur du produit)
│   │   │   ├── documents/
│   │   │   │   ├── upload/route.ts         # Upload + fire-and-forget processing
│   │   │   │   └── process/route.ts        # Trigger extraction/chunking/embedding
│   │   │   ├── export/route.ts             # Export RGPD données élève (JSON)
│   │   │   └── prof/
│   │   │       ├── groupes/route.ts
│   │   │       ├── eleves/route.ts
│   │   │       ├── eleves/[eleveId]/reset-password/route.ts
│   │   │       ├── eleves/[eleveId]/toggle/route.ts
│   │   │       ├── chapitres/route.ts
│   │   │       ├── annonces/route.ts
│   │   │       ├── cours/route.ts
│   │   │       ├── memberships/route.ts
│   │   │       ├── memberships/[membershipId]/route.ts
│   │   │       ├── dates-ds/route.ts
│   │   │       ├── quotas/route.ts
│   │   │       └── rentree/route.ts
│   │   ├── prof/
│   │   │   ├── layout.tsx              # Layout avec sidebar dark
│   │   │   ├── dashboard/page.tsx      # Stats, groupes, prochains cours
│   │   │   ├── groupes/page.tsx        # Liste groupes + création
│   │   │   ├── groupes/[groupeId]/page.tsx  # Détail groupe (5 onglets)
│   │   │   ├── eleves/page.tsx         # Gestion élèves
│   │   │   ├── edt/page.tsx            # Emploi du temps agrégé
│   │   │   ├── quotas/page.tsx         # Dashboard quotas IA
│   │   │   └── rentree/page.tsx        # Wizard transition rentrée
│   │   └── eleve/
│   │       ├── layout.tsx              # Layout avec header + bottom nav mobile
│   │       ├── dashboard/page.tsx      # Accueil élève
│   │       ├── cours/page.tsx          # Documents par chapitre
│   │       ├── edt/page.tsx            # EDT élève
│   │       ├── annonces/page.tsx       # Annonces
│   │       └── chat/page.tsx           # Page chat (server) → ChatInterface (client)
│   ├── components/
│   │   ├── ui/                         # Composants génériques
│   │   │   ├── button.tsx              # 5 variants, loading state
│   │   │   ├── input.tsx               # Input + Textarea, label/error
│   │   │   ├── badge.tsx               # Badge + StatusBadge
│   │   │   └── modal.tsx               # Modal animé
│   │   ├── layout/
│   │   │   ├── prof-sidebar.tsx        # Sidebar dark gradient, responsive
│   │   │   └── eleve-header.tsx        # Header + bottom nav mobile
│   │   ├── chat/
│   │   │   └── chat-interface.tsx      # ⭐ Interface chat complète
│   │   └── prof/
│   │       ├── groupes-list.tsx        # Liste groupes avec search/filter
│   │       ├── groupe-detail.tsx       # 5 onglets, upload, CRUD modals
│   │       ├── eleves-list.tsx         # Table élèves, reset mdp, toggle
│   │       ├── quotas-manager.tsx      # Gestion quotas par élève
│   │       └── rentree-wizard.tsx      # Wizard 2 étapes
│   ├── lib/
│   │   ├── auth.config.ts             # Config NextAuth (JWT, callbacks, credentials)
│   │   ├── auth.ts                     # Point d'entrée NextAuth
│   │   ├── db.ts                       # Prisma client singleton
│   │   ├── utils.ts                    # cn(), formatDate(), countWords(), getInitials()
│   │   ├── utils/
│   │   │   ├── tenant.ts              # Helpers isolation tenant
│   │   │   └── quota.ts               # Logic quotas chat
│   │   ├── ai/
│   │   │   ├── embeddings.ts          # Client Voyage AI (batch, query)
│   │   │   ├── llm.ts                 # Client Claude (stream + sync)
│   │   │   ├── chunker.ts             # Chunking structure-aware avec détection pages
│   │   │   ├── rag.ts                 # Recherche vectorielle pgvector + contexte
│   │   │   └── prompts.ts             # ⭐ System prompts Explique/Révise (très détaillés)
│   │   ├── documents/
│   │   │   ├── extract.ts             # Extraction PDF (pdf-parse v2), DOCX, TXT, MD
│   │   │   └── process.ts             # Pipeline complet : extract → chunk → embed → store
│   │   └── storage/
│   │       ├── interface.ts            # Abstraction StorageProvider
│   │       ├── local.ts               # Stockage filesystem local
│   │       └── s3.ts                   # Stub S3 (à implémenter en prod)
│   └── middleware.ts                   # ⚠️ Deprecated dans Next.js 16 (voir §7)
├── .env.example                        # Template config complète
├── next.config.ts                      # Config vide (pas de customization)
├── package.json                        # Scripts + seed config
└── tsconfig.json                       # Config TypeScript standard
```

### Fichiers clés (par ordre d'importance)

| Fichier | Rôle critique |
|:---|:---|
| `prisma/schema.prisma` | Définit TOUTE la structure de données. 13 modèles. Le champ `embedding` utilise `Unsupported("vector(512)")` car Prisma ne supporte pas nativement pgvector. |
| `src/lib/ai/prompts.ts` | Les system prompts du chatbot. Contient TOUTES les instructions pédagogiques (citation de sources, distinction cours/ajouts, difficulté adaptative, détection de blocage). C'est le cahier des charges du comportement IA. |
| `src/lib/ai/rag.ts` | Requêtes SQL brutes `$queryRawUnsafe` pour la recherche vectorielle pgvector (cosine similarity). |
| `src/lib/documents/process.ts` | Pipeline extract→chunk→embed→store. Utilise aussi des requêtes SQL brutes pour insérer les embeddings. |
| `src/app/api/chat/route.ts` | Orchestre tout le chat : validation quota, RAG search, prompt construction, appel LLM, parsing markers difficulté, sauvegarde messages. |
| `src/lib/auth.config.ts` | Config NextAuth complète : JWT strategy, callbacks pour injecter role/tenantId dans le token, protection des routes par rôle. |

---

## 3. Ce qui a été fait récemment (chronologique)

Du plus récent au plus ancien dans la dernière session :

1. **Correction pdf-parse v2** : L'import `import pdf from "pdf-parse"` a été remplacé par `import { PDFParse } from "pdf-parse"` et l'usage adapté (`new PDFParse().parseBuffer(buffer)`) — pdf-parse v2 n'a plus d'export default.

2. **Suppression @import Google Fonts dans CSS** : Retiré car les polices sont chargées via `next/font/google` dans `layout.tsx`. L'`@import url(...)` causait un warning CSS ("@import rules must precede all rules").

3. **Downgrade Prisma v8 → v6** : Prisma v8 (RC) avait été installé par erreur. Sa CLI est incompatible (`prisma generate` n'existe plus en v8). Downgradé à `prisma@^6.0.0` / `@prisma/client@^6.0.0`. `npx prisma generate` fonctionne maintenant.

4. **Création de tous les fichiers manquants** : chat-interface.tsx, api/chat/route.ts, toutes les pages élève (cours, EDT, annonces), toutes les pages prof (élèves, EDT, quotas, rentrée), les API correspondantes (quotas, rentree, toggle, export), et le seed.

5. **Installation dépendances** : Toutes installées avec `--legacy-peer-deps` (nécessaire à cause de conflits de peer deps avec React 19 / Next.js 16).

---

## 4. Ce qui est EN COURS (non finalisé / non testé)

### ❗ Le build échoue
Dernier `npx next build` : **échec avec 1 erreur bloquante restante**

**Erreur 1 (BLOQUANTE)** — `src/lib/documents/extract.ts:1:1` :
```
Error: Export default doesn't exist in target module
> 1 | import { PDFParse } from "pdf-parse";
```
La correction a été faite (import changé de `pdf` vers `{ PDFParse }`), **MAIS l'API de PDFParse v2 n'a pas été vérifiée à 100%**. Le build n'a pas été relancé après la correction. Il se peut que `PDFParse` ne s'utilise pas exactement avec `new PDFParse().parseBuffer(buffer)`. **À vérifier** :
```bash
node -e "const { PDFParse } = require('pdf-parse'); const p = new PDFParse(); console.log(typeof p.parseBuffer)"
```
Si `parseBuffer` n'existe pas, consulter l'API v2 de pdf-parse pour trouver la bonne méthode.

**Warning (non bloquant)** — Middleware deprecated :
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```
Next.js 16 veut `proxy.ts` au lieu de `middleware.ts`. Le middleware fonctionne encore mais est deprecated. Migration possible avec :
```bash
npx @next/codemod@canary middleware-to-proxy .
```

**Warning (non bloquant)** — Turbopack dynamic filesystem access dans `src/lib/storage/local.ts:11` (`path.resolve(UPLOAD_DIR)`). Ajouter un commentaire `/*turbopackIgnore: true*/` ou restructurer.

### ❗ Aucune migration Prisma n'a été exécutée
Le schema est complet mais aucune base n'a été créée. Étapes à suivre :
1. Avoir PostgreSQL avec pgvector
2. Configurer `DATABASE_URL` dans `.env`
3. `npx prisma migrate dev --name init`
4. Ajouter manuellement dans la migration SQL (ou via `psql`) :
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Après la migration, créer l'index HNSW :
   ```sql
   CREATE INDEX idx_chunks_embedding ON document_chunks
     USING hnsw (embedding vector_cosine_ops);
   ```
6. `npm run db:seed` pour les données de démo

---

## 5. Ce qui reste à faire (todo list priorisée)

### Priorité 1 — Bloquant pour le fonctionnement

- [ ] **Corriger le build** : Vérifier l'API de `pdf-parse` v2 dans `extract.ts` et relancer `npx next build`
- [ ] **Migration middleware → proxy** : Exécuter le codemod ou réécrire `middleware.ts` en `proxy.ts` (Next.js 16)
- [ ] **Setup BDD** : Migration Prisma + extension pgvector + index HNSW (voir §4)
- [ ] **Créer `.env`** : Copier `.env.example`, remplir les clés API et DATABASE_URL
- [ ] **Tester le seed** : `npm run db:seed` et vérifier que les données sont correctes
- [ ] **Tester le login** : Vérifier que NextAuth fonctionne end-to-end (inscription prof + login)

### Priorité 2 — Fonctionnel important

- [ ] **Tester le chat RAG end-to-end** : Upload un document → attendre indexation → poser une question → vérifier la réponse avec citations
- [ ] **Vérifier l'upload de fichiers** : Tester avec un PDF, un DOCX, un TXT
- [ ] **Vérifier le warning Turbopack** : `path.resolve` dans `local.ts` (ajouter le commentaire ignore)
- [ ] **Vérifier les quotas** : Tester que le compteur décrémente, que le blocage fonctionne, que le bonus fonctionne

### Priorité 3 — Nice to have

- [ ] **Écrire le README.md** : Instructions d'installation, configuration, lancement
- [ ] **Streaming du chat** : Actuellement le chat est synchrone (attend la réponse complète). `streamChat` existe dans `llm.ts` mais n'est pas utilisé dans `api/chat/route.ts`. Implémenter le streaming pour une meilleure UX.
- [ ] **Gestion de la pagination** : Les listes de groupes, élèves, cours ne sont pas paginées (OK pour de petits volumes, problématique à l'échelle)
- [ ] **Changement de mot de passe** : Les élèves ne peuvent pas changer leur mot de passe eux-mêmes
- [ ] **Tests unitaires** : Aucun test écrit
- [ ] **S3 storage** : Le stub `s3.ts` n'est pas implémenté (throw "Not implemented")
- [ ] **Responsive final** : Tester toutes les pages sur mobile

---

## 6. Décisions techniques importantes et justifications

### Prisma v6 (PAS v8)
**Décision** : Prisma v6.19.3, pas v8.x.
**Justification** : Prisma v8 est en RC et a une CLI totalement refondée (plus de `prisma generate`, `prisma migrate`). Les commandes sont remplacées par `prisma orm generate`, `prisma db` etc. Aucun guide de migration fiable. Rester sur v6 est stable et documenté.

### pgvector via raw SQL
**Décision** : Les colonnes `vector(512)` sont déclarées comme `Unsupported("vector(512)")` dans Prisma. Toutes les opérations vectorielles passent par `$queryRawUnsafe` / `$executeRawUnsafe`.
**Justification** : Prisma ne supporte pas nativement le type `vector` de pgvector. C'est la seule façon de faire. **NE PAS essayer de remplacer par Prisma standard, ça ne marchera pas.**

### Voyage AI pour les embeddings (pas OpenAI)
**Décision** : Voyage AI, modèle `voyage-3-lite`, 512 dimensions.
**Justification** : Choix explicite de l'utilisateur : "Je veux tout centraliser chez Anthropic (embeddings inclus via Voyage AI)". Voyage AI est le partenaire d'embeddings d'Anthropic.

### Tenant isolation par `tenantId`
**Décision** : Chaque professeur a `tenantId = son propre userId`. Chaque élève a `tenantId = userId de son prof`. Toutes les requêtes filtrent par `tenantId` ou `profId`.
**Justification** : Isolation complète des données entre professeurs. Un prof ne voit jamais les données d'un autre.

### Chat API synchrone (pas streaming)
**Décision** : L'API `/api/chat` fait un appel synchrone à Claude (`chat()`) et renvoie la réponse complète en JSON.
**Justification** : Plus simple à implémenter initialement. Le streaming est prêt dans `llm.ts` (`streamChat()`), à migrer en priorité 3.

### Limite de 50 mots par message
**Décision** : Les messages des élèves sont limités à 50 mots (validation côté client ET côté serveur).
**Justification** : Spécification explicite de l'utilisateur. Force les élèves à formuler des questions concises.

### Pas d'auth sociale
**Décision** : Email + mot de passe uniquement, via NextAuth CredentialsProvider.
**Justification** : Exigence explicite de l'utilisateur. Les professeurs créent les comptes élèves (pas d'auto-inscription élève).

### `--legacy-peer-deps` pour npm
**Décision** : Tous les `npm install` utilisent `--legacy-peer-deps`.
**Justification** : Conflits de peer deps entre React 19, Next.js 16, et certains packages (next-auth beta, etc.). Sans ce flag, npm refuse l'installation.

---

## 7. Pièges connus / Bugs identifiés / Choses à ne surtout pas casser

### 🔴 CRITIQUE

1. **pdf-parse v2 a une API différente de v1** : L'import a été corrigé mais le build n'a pas été re-vérifié. La classe `PDFParse` et sa méthode `parseBuffer()` doivent être validés. Si ça ne marche pas, options :
   - Vérifier les exports : `node -e "console.log(Object.keys(require('pdf-parse')))"`
   - Downgrader à pdf-parse v1 : `npm install pdf-parse@1.1.1`
   - Ou utiliser l'API v2 correctement

2. **middleware.ts est deprecated dans Next.js 16** : Le build affiche un warning. Le fichier fonctionne encore mais Next.js veut un `proxy.ts`. Le codemod existe : `npx @next/codemod@canary middleware-to-proxy .`

3. **SQL Injection potentielle dans rag.ts** : Les `chapitreIds` sont injectés directement dans le SQL via string interpolation (`'${id}'`). C'est acceptable car les IDs viennent de Prisma (CUID), mais c'est un risque si jamais on passe des inputs utilisateur. **Ne pas toucher sans paramétrage SQL propre.**

4. **process.ts insert chunks via raw SQL** : Même pattern — le contenu du chunk est passé via `$1` (paramètre) mais d'autres valeurs sont interpolées. Attention aux apostrophes dans les noms de sections.

### 🟡 IMPORTANT

5. **`Unsupported("vector(512)")` dans Prisma** : NE PAS retirer ce champ ni tenter de le remplacer par un type standard. C'est volontaire. Le champ n'apparaît pas dans le client Prisma TypeScript généré — toutes les opérations passent par raw SQL.

6. **La migration Prisma ne crée PAS automatiquement l'extension pgvector** : Il faut ajouter `CREATE EXTENSION IF NOT EXISTS vector;` manuellement dans le SQL de migration ou l'exécuter avant.

7. **Index HNSW requis pour la performance** : Sans `CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);`, les recherches vectorielles feront un scan séquentiel (très lent avec beaucoup de chunks).

8. **Le `document.storageUrl` en mode local** commence par `/uploads/...`. Le code dans `process.ts` fait `doc.storageUrl.replace(/^\/uploads\//, "")` pour retrouver le chemin relatif. **Ne pas changer le format du storageUrl sans adapter ce code.**

9. **Node.js v23.4.0** : Version non-LTS. Certains packages affichent des warnings `EBADENGINE`. Tout fonctionne mais une migration vers Node 22 LTS serait prudente.

### 🟢 MINEUR

10. **Le font-family CSS dit `'Inter'` mais next/font génère un CSS variable `--font-inter`** : Le `globals.css` déclare `--font-sans: 'Inter', system-ui, sans-serif` alors que next/font crée un `--font-inter`. Pas de bug visible car les deux polices sont chargées, mais c'est incohérent.

---

## 8. Commandes utiles

```bash
# Développement
npm run dev              # Lance le serveur de dev (port 3000)

# Build / Production
npm run build            # Build de production (ACTUELLEMENT EN ÉCHEC)
npm run start            # Lance le serveur de production (après build)

# Base de données
npx prisma generate      # Regénère le client Prisma depuis le schema
npx prisma migrate dev --name <name>  # Crée et applique une migration
npx prisma studio        # Interface web pour explorer la BDD
npm run db:seed           # Exécute le seed (= npx tsx prisma/seed.ts)

# Lint
npm run lint             # ESLint

# Debug
npx prisma db push       # Synchronise le schema sans créer de migration (dev rapide)

# Migration middleware → proxy (Next.js 16)
npx @next/codemod@canary middleware-to-proxy .

# Vérifier les exports d'un package
node -e "console.log(Object.keys(require('pdf-parse')))"
```

---

## 9. Variables d'environnement

Fichier `.env.example` à la racine. Copier vers `.env` et remplir :

```env
# OBLIGATOIRE
DATABASE_URL="postgresql://user:pass@localhost:5432/projet_cours"
NEXTAUTH_SECRET="<clé aléatoire longue>"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
VOYAGE_API_KEY="pa-..."

# Optionnel (valeurs par défaut OK en dev)
STORAGE_PROVIDER="local"
UPLOAD_DIR="./public/uploads"
DEFAULT_DAILY_CHAT_QUOTA=10
RAG_SIMILARITY_THRESHOLD=0.35
RAG_TOP_K=5
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Production uniquement (S3)
# S3_BUCKET=""
# S3_REGION=""
# S3_ACCESS_KEY=""
# S3_SECRET_KEY=""
# S3_ENDPOINT=""
```

**Pour PostgreSQL avec pgvector**, le plus simple en dev est Docker :
```bash
docker run -d --name projet_cours_db \
  -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=projet_cours -p 5432:5432 \
  pgvector/pgvector:pg16
```
→ `DATABASE_URL="postgresql://admin:admin@localhost:5432/projet_cours"`

---

## 10. Fichiers à NE PAS toucher ou à traiter avec prudence

### ⛔ NE PAS MODIFIER sans comprendre les implications

| Fichier | Raison |
|:---|:---|
| `prisma/schema.prisma` | Tout le projet dépend de ce schema. Toute modification nécessite une migration + potentielle adaptation du raw SQL dans `rag.ts` et `process.ts`. |
| `src/lib/ai/prompts.ts` | Prompts pédagogiques validés par le cahier des charges utilisateur. Structure de réponse imposée (citation sources, mini-question, difficulté adaptative). Ne pas simplifier. |
| `src/lib/ai/rag.ts` | Contient du SQL brut pgvector. L'opérateur `<=>` est le cosine distance. La formule `1 - distance` donne la similarité. Ne pas toucher au SQL sans tester. |
| `src/lib/documents/process.ts` | Pipeline critique : les insertions de chunks utilisent du raw SQL avec des paramètres positionnels. Le `$1` est le contenu du chunk (safe). Le reste est interpolé (IDs Prisma, embeddings). |
| `src/lib/auth.config.ts` | Callbacks JWT qui injectent `role`, `tenantId`, `firstName`, `lastName` dans le token. Si on casse ça, TOUTE l'app est cassée (chaque page lit ces champs du token). |

### ⚠️ TRAITER AVEC PRUDENCE

| Fichier | Raison |
|:---|:---|
| `src/middleware.ts` | Deprecated dans Next.js 16 mais fonctionne. Migrer vers `proxy.ts` proprement. |
| `src/lib/documents/extract.ts` | L'import pdf-parse v2 vient d'être corrigé mais pas retesté. |
| `src/lib/storage/local.ts` | Warning Turbopack sur `path.resolve`. |
| `package.json` | Ne pas upgrader Prisma vers v8. Ne pas retirer `--legacy-peer-deps` de vos habitudes d'install. La section `"prisma": { "seed": ... }` est nécessaire pour `prisma db seed`. |

### ✅ MODIFIABLE LIBREMENT

| Fichier/Dossier | Notes |
|:---|:---|
| `src/components/ui/*` | Composants UI purs, aucune logique métier |
| `src/components/layout/*` | Sidebar et header, purement visuels |
| `src/app/*/page.tsx` (pages) | Pages individuelles, peuvent être refactorisées |
| `globals.css` | Design system, modifiable à volonté |
| `next.config.ts` | Vide, peut recevoir toute configuration |

---

## Identifiants de démo (seed)

| Rôle | Email | Mot de passe |
|:---|:---|:---|
| Professeur | prof@example.com | password123 |
| Élève | lucas@example.com | password123 |
| Élève | emma@example.com | password123 |
| Élève | noa@example.com | password123 |
| Élève | lea@example.com | password123 |

---

*Fin du document de passation.*
