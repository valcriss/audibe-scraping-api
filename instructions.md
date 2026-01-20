# MVP API Audible Scraper (local, sans cache/BDD)

## Objectif
Créer un service **privé** (exécution locale, idéalement en Docker) qui expose une API HTTP permettant :
- `GET /search` : rechercher des livres audio sur Audible.fr via la page de recherche HTML.
- `GET /details/:asin` : récupérer les détails d’un livre audio via sa page HTML.

Le MVP **ne** comprend **pas** de cache Redis, **pas** de base de données. Il fait uniquement des appels HTTP et parse le HTML.

> Note : ce projet est pensé pour un usage local/privé. Le service ne doit pas viser l’exposition publique.

## Stack technique
- Node.js (LTS)
- TypeScript
- Framework HTTP : Express
- HTTP client : `undici` (ou fetch natif Node si dispo)
- Parsing HTML : `cheerio`
- Validation d’entrées : `zod`
- Logs : `pino` + `pino-http` (ou équivalent)
- Tests : Jest + ts-jest (ou Vitest)
- Lint : ESLint
- Format : Prettier

## Contraintes non-fonctionnelles
- Structure modulaire (séparation routes / services / parseurs)
- Configuration via variables d’environnement (avec validation au démarrage)
- Gestion d’erreurs propre (codes HTTP, payload d’erreur stable)
- Tests unitaires sur les parseurs (HTML fixtures)
- Tests d’intégration sur les routes (Supertest)
- Rate limiting minimal côté API (optionnel mais recommandé) et limitation de concurrence côté sorties (recommandé)

---

# Spécification API

## 1) `GET /health`
### But
Vérifier que le serveur tourne.

### Réponse (200)
```json
{ "status": "ok" }
```

---

## 2) `GET /search`
### Query params
- `keywords` (string, requis) : texte de recherche (sera URL-encodé pour appeler Audible).
- `page` (number, optionnel, défaut 1) : page de résultats.

### Comportement
- Construire l’URL :
  - `https://www.audible.fr/search?keywords=<keywords_enc>&page=<page>`
- Faire une requête HTTP GET avec headers réalistes (voir section HTTP).
- Parser le HTML.
- Retourner une liste de résultats normalisés.

### Réponse (200)
```json
{
  "query": {
    "keywords": "harry potter",
    "page": 1
  },
  "items": [
    {
      "asin": "B0XXXXXXX",
      "title": "Titre",
      "authors": ["Auteur 1"],
      "narrators": ["Narrateur 1"],
      "releaseDate": "2022-01-01",
      "releaseYear": 2022,
      "runtimeMinutes": 615,
      "language": "Français",
      "rating": 4.6,
      "ratingCount": 1234,
      "thumbnailUrl": "https://...",
      "detailUrl": "https://www.audible.fr/pd/.../B0XXXXXXX"
    }
  ]
}
```

### Erreurs
- 400 si `keywords` manquant ou vide.
- 502 si Audible ne répond pas correctement.
- 500 si parsing échoue de manière inattendue.

---

## 3) `GET /details/:asin`
### Path params
- `asin` (string, requis) : identifiant du livre (format souvent `B` + 9 caractères alphanum). Le MVP ne doit pas trop valider strictement, mais au minimum vérifier longueur et charset.

### Comportement
- Construire une URL de détails :
  - Option A (recommandée) : si `AUDIBLE_DETAILS_URL_TEMPLATE` est fourni, l’utiliser.
  - Option B : appeler une URL standard `https://www.audible.fr/pd/<placeholder>/${asin}` n’est pas garanti.

**Stratégie MVP recommandée :**
- En `search`, renvoyer `detailUrl`.
- Pour `details`, construire l’URL comme : `https://www.audible.fr/pd/${asin}` **si et seulement si** ça fonctionne en pratique.
- Sinon, accepter un paramètre optionnel `url` (et privilégier `url` quand fourni) :
  - `GET /details/:asin?url=<detailUrl>`

> L’agent IA doit vérifier la stratégie la plus robuste pendant l’implémentation. Le design doit garder une séparation claire : `details` attend un ASIN, et éventuellement accepte l’URL exacte en query.

### Réponse (200)
```json
{
  "asin": "B0XXXXXXX",
  "title": "Titre",
  "authors": ["Auteur 1"],
  "narrators": ["Narrateur 1"],
  "publisher": "Éditeur",
  "releaseDate": "2022-01-01",
  "language": "Français",
  "runtimeMinutes": 615,
  "series": {
    "name": "Nom série",
    "position": 1
  },
  "categories": ["Fantasy", "Aventure"],
  "rating": 4.6,
  "ratingCount": 1234,
  "description": "...",
  "coverUrl": "https://...",
  "thumbnails": ["https://...", "https://..."]
}
```

### Erreurs
- 404 si le livre n’est pas trouvé (ou page retournée sans contenu identifiable).
- 400 si asin invalide.
- 502 si Audible répond mal.
- 500 si parsing échoue.

---

# Modèle de données (TypeScript)

## Types (contrat de sortie)
- `SearchItem`
  - asin: string
  - title: string
  - authors: string[]
  - narrators: string[]
  - releaseDate?: string (ISO)
  - releaseYear?: number
  - runtimeMinutes?: number
  - language?: string
  - rating?: number
  - ratingCount?: number
  - thumbnailUrl?: string
  - detailUrl: string

- `SearchResponse`
  - query: { keywords: string; page: number }
  - items: SearchItem[]

- `BookDetails`
  - asin: string
  - title: string
  - authors: string[]
  - narrators: string[]
  - publisher?: string
  - releaseDate?: string
  - language?: string
  - runtimeMinutes?: number
  - series?: { name: string; position?: number }
  - categories?: string[]
  - rating?: number
  - ratingCount?: number
  - description?: string
  - coverUrl?: string
  - thumbnails?: string[]

## Erreurs (contrat stable)
- `ApiError`
  - code: string (ex: `VALIDATION_ERROR`, `UPSTREAM_ERROR`, `PARSING_ERROR`)
  - message: string
  - details?: any

---

# Configuration (variables d’environnement)

Le service doit charger `.env` en local (dotenv) mais fonctionner sans en prod.

Variables :
- `PORT` (default: 3000)
- `NODE_ENV` (development|test|production)

Audible :
- `AUDIBLE_BASE_URL` (default: `https://www.audible.fr`)
- `AUDIBLE_SEARCH_PATH` (default: `/search`)
- `AUDIBLE_TIMEOUT_MS` (default: 10000)
- `AUDIBLE_USER_AGENT` (default: UA navigateur)
- `AUDIBLE_ACCEPT_LANGUAGE` (default: `fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7`)
- `AUDIBLE_DETAILS_URL_MODE` (default: `guess`)
  - `guess` : tente une construction d’URL basée sur asin
  - `requireUrl` : exige `?url=`

Sécurité / Robustesse :
- `API_RATE_LIMIT_ENABLED` (default: false)
- `API_RATE_LIMIT_WINDOW_MS` (default: 60000)
- `API_RATE_LIMIT_MAX` (default: 60)

Sorties (vers Audible) :
- `OUTBOUND_CONCURRENCY` (default: 2)
- `OUTBOUND_MIN_TIME_MS` (default: 500)  

Validation :
- Utiliser `zod` pour valider et normaliser la config au démarrage. Échec => crash avec message clair.

---

# Comportement HTTP (client vers Audible)

## Headers recommandés
- `User-Agent`: depuis env
- `Accept`: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
- `Accept-Language`: depuis env

## Timeout
- Timeout global `AUDIBLE_TIMEOUT_MS`.

## Gestion des codes
- 200 => parse.
- 3xx => suivre redirection (undici gère si configuré).
- 403/429 => remonter 502 (UPSTREAM_ERROR) avec info.
- 5xx => 502.

## Limitation de débit/concurrence
- Implémenter un petit limiteur en mémoire (ex: `p-limit` + délai) ou `bottleneck`.
- Objectif : éviter l’emballement et rendre les tests plus stables.

---

# Parsing HTML (cheerio)

## Principes
- Parsing défensif : le HTML peut changer.
- Ne jamais dépendre d’un seul sélecteur fragile si possible.
- Favoriser extraction via attributs (href contenant l’ASIN) ou JSON embarqué (script type="application/ld+json") quand présent.

## Stratégie extraction ASIN
- Depuis les résultats de recherche :
  - repérer les liens vers pages détails (`/pd/` ou `/pd/…/ASIN`) et extraire l’ASIN via regex.
  - Exemple regex indicative : `/\b(B[0-9A-Z]{9})\b/` (à adapter)

## Search parsing – champs minimaux attendus
- `title`
- `detailUrl`
- `asin`
- `authors` (si présent)
- `releaseYear` ou `releaseDate` (best effort)
- `thumbnailUrl` (best effort)

## Details parsing – champs minimaux attendus
- `asin`
- `title`
- `authors`
- `description` (best effort)
- `coverUrl` (best effort)

---

# Structure du projet (proposée)

```
.
├─ src/
│  ├─ server.ts
│  ├─ app.ts
│  ├─ config/
│  │  ├─ env.ts
│  │  └─ schema.ts
│  ├─ http/
│  │  ├─ audibleClient.ts
│  │  └─ outboundLimiter.ts
│  ├─ routes/
│  │  ├─ health.ts
│  │  ├─ search.ts
│  │  └─ details.ts
│  ├─ parsers/
│  │  ├─ searchParser.ts
│  │  └─ detailsParser.ts
│  ├─ models/
│  │  ├─ api.ts
│  │  └─ audible.ts
│  ├─ middleware/
│  │  ├─ errorHandler.ts
│  │  ├─ requestLogger.ts
│  │  └─ rateLimit.ts
│  └─ utils/
│     ├─ assert.ts
│     └─ url.ts
├─ test/
│  ├─ fixtures/
│  │  ├─ search.html
│  │  └─ details.html
│  ├─ parsers.search.test.ts
│  ├─ parsers.details.test.ts
│  └─ routes.test.ts
├─ package.json
├─ tsconfig.json
├─ jest.config.ts (ou vitest config)
├─ .eslintrc.*
├─ .prettierrc
├─ Dockerfile
└─ docker-compose.yml
```

## Notes
- `app.ts` exporte l’instance Express pour les tests (Supertest) sans lancer `listen`.
- `server.ts` lance `app.listen(PORT)`.

---

# Tests

## Unit tests parseurs
- Charger fixtures HTML depuis `test/fixtures`.
- Valider que :
  - `searchParser` renvoie une liste non vide avec ASIN + title + detailUrl.
  - `detailsParser` renvoie title + authors (best effort).
- Utiliser des assertions tolérantes : certains champs optionnels peuvent manquer.

## Integration tests routes
- Supertest sur `app`.
- Mock HTTP vers Audible :
  - Recommandé : `nock` ou `undici MockAgent`.
  - Objectif : pas d’accès réseau en tests.

---

# Lint / Format / Qualité

## ESLint
- Config TS recommandée (`@typescript-eslint`).
- Règles : no-floating-promises, consistent-type-imports, unused-vars.

## Prettier
- Format standard.

## Scripts package.json (attendus)
- `dev`: ts-node-dev (ou tsx) + reload
- `build`: tsc
- `start`: node dist/server.js
- `test`: jest (ou vitest)
- `lint`: eslint
- `format`: prettier

---

# Docker

## Dockerfile (attendu)
- Build multi-stage :
  - stage build : npm ci + tsc
  - stage run : node dist

## docker-compose.yml (attendu)
- service `api`
  - build: .
  - ports: `${PORT}:3000` (ou mapping fixe)
  - env_file: `.env`

---

# Checklist d’acceptation MVP
- [ ] `GET /health` => 200
- [ ] `GET /search?keywords=...` => 200 et liste d’items avec `asin`, `title`, `detailUrl`
- [ ] `GET /details/:asin` => 200 et objet détails minimal
- [ ] Config via env validée au démarrage
- [ ] Lint + format ok
- [ ] Tests parseurs + routes passent sans réseau
- [ ] Docker build + run ok

---

# Recommandations de robustesse (MVP+)
- Ajouter un petit mécanisme de retry (1-2 tentatives) sur erreurs réseau transitoires.
- Ajouter un header `X-Request-Id` et le reporter dans les logs.
- Prévoir une stratégie d’évolution du parsing (plusieurs sélecteurs, fallback sur JSON-LD).

