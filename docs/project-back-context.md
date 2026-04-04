# Quinzenal Backend Project Context (for AI Assistants)

This document describes how this backend is structured and how to extend it safely.

## 1) Project Architecture

Architecture style: layered REST API.

Request flow:
1. `src/app.js` boots Express, CORS, JSON parsing, mounts routes.
2. `src/routes/*.routes.js` maps URL paths to controller handlers.
3. `src/controllers/*.controller.js` parses HTTP input, calls services, formats HTTP responses.
4. `src/services/*.service.js` contains business logic, validations, and Sequelize persistence.
5. `src/database/models/*.js` defines Sequelize models and associations.
6. Migrations in `src/migrations/*.js` define schema evolution.

Core architectural characteristics:
- API is versioned under `/api/v1` (mounted in `src/routes/index.js`).
- Domain is split by modules: `period`, `card`, `debt/person`, `credit`.
- Services are the business boundary; controllers are thin.
- Most write operations use Sequelize transactions (`sequelize.transaction(...)`).
- The server port defaults to `3000` and can be overridden with the `PORT` environment variable.
- Frontend static build is **not** currently served by this backend; `src/app.js` has no static file middleware.

## 2) Folder Structure

Top-level relevant folders:
- `config/`: Sequelize/environment DB config.
- `src/`: application source.
- `src/controllers/`: HTTP controllers.
- `src/routes/`: route registration.
- `src/services/`: business logic and DB operations.
- `src/database/`: Sequelize connection, model initialization, DB scripts.
- `src/database/models/`: model classes + associations.
- `src/migrations/`: schema migrations.
- `src/shared/`: env helper and shared errors.
- `docs/`: project documentation (this file).

Model bootstrap path:
- `src/database/index.js`: creates Sequelize instance.
- `src/database/models/associateModels.js`: initializes every model and calls `associate()` hooks.

## 3) Frameworks and Libraries Used

Runtime and platform:
- Node.js with ESM (`"type": "module"`).

HTTP/API:
- Express `5.x`
- CORS middleware

Persistence:
- Sequelize `6.x`
- `mysql2` driver
- `sequelize-cli` for migrations

Utilities:
- `dotenv` for environment variables
- `date-fns` for date parsing/validation in movement/payment services

Dev tooling:
- `nodemon` for development

## 4) Coding Patterns in This Repository

Layering and responsibilities:
- Routes only wire endpoints.
- Controllers:
  - Parse params/query/body.
  - Convert to primitives (`parseInt`, `Number`).
  - Return response codes (`201`, `404`, etc.).
  - Forward unexpected errors with `next(err)` in many modules.
- Services:
  - Perform validations.
  - Execute DB queries and aggregations.
  - Enforce business rules (example: no credit overpay by default).
  - Use transactions for create/update/delete flows.

Validation style:
- Mostly manual validation in service functions (no schema validation library).
- Validation errors throw `Error` or `ApiError` depending on module.
- Enumerated domain values are enforced in both service logic and DB enums.

Transaction style:
- Two patterns coexist:
  - Managed transaction callback: `return sequelize.transaction(async (t) => { ... })`.
  - Manual `const t = await sequelize.transaction(); ... commit/rollback`.

Aggregation and summaries:
- Summary endpoints are calculated in services with SQL aggregates (`SUM`, `COUNT`) and/or grouped queries.
- Some modules use cent-based arithmetic to avoid floating point issues (`credit.service.js`, `creditPayment.service.js`).

Error handling pattern (important inconsistency):
- Some controllers handle errors inline with `res.status(...).json(...)`.
- Some use `ApiError` and map by `err.status`.
- Some pass to `next(err)` but there is no central error middleware in `src/app.js`.
- Result: error behavior is functional but not fully standardized.

## 5) How API Calls Are Done

Incoming API calls (client -> backend):
- Prefix: `/api/v1`.
- Endpoint groups and HTTP methods:

  **Periods** (`period.routes.js`)
  | Method | Path | Description |
  |--------|------|--------------|
  | GET    | `/periods` | List periods (`?limit=&offset=`) |
  | POST   | `/periods` | Create period |
  | GET    | `/periods/:id` | Get period by id |
  | PUT    | `/periods/:id` | Update period |
  | GET    | `/periods/:id/summary` | Period summary (income/expense/balance) |
  | POST   | `/periods/:id/movements` | Create movement scoped to a period |

  **Period Movements** (`period.routes.js`)
  | Method | Path | Description |
  |--------|------|--------------|
  | POST   | `/period-movements` | Create movement (periodId in body) |
  | GET    | `/period-movements` | List movements (`?periodId=&limit=&offset=`) |
  | GET    | `/period-movements/:id` | Get movement by id |
  | PATCH  | `/period-movements/:id` | Update movement |
  | DELETE | `/period-movements/:id` | Delete movement |

  **Cards** (`card.routes.js`)
  | Method | Path | Description |
  |--------|------|--------------|
  | GET    | `/cards` | List cards (`?limit=&offset=&q=`) |
  | POST   | `/cards` | Create card |
  | GET    | `/cards/:id` | Get card by id |
  | PUT    | `/cards/:id` | Update card |
  | DELETE | `/cards/:id` | Delete card |
  | GET    | `/cards/:id/summary` | Card summary |
  | POST   | `/cards/:cardId/movements` | Create movement scoped to card |
  | GET    | `/cards/:cardId/movements` | List movements of a card (`?fromDate=&toDate=`) |

  **Card Movements**
  | Method | Path | Description |
  |--------|------|--------------|
  | GET    | `/card-movements/:id` | Get by id |
  | PUT    | `/card-movements/:id` | Update |
  | DELETE | `/card-movements/:id` | Delete |

  **People** (`debt.routes.js`)
  | Method | Path | Description |
  |--------|------|--------------|
  | POST   | `/people` | Create person |
  | GET    | `/people` | List people |
  | GET    | `/people/:id` | Get person |
  | PUT    | `/people/:id` | Update person |
  | DELETE | `/people/:id` | Delete person |
  | GET    | `/people/:id/summary` | Person summary (net balance across debts) |

  **Debts**
  | Method | Path | Description |
  |--------|------|--------------|
  | POST   | `/debts` | Create debt |
  | GET    | `/debts` | List debts (`?personId=&limit=&offset=`) |
  | GET    | `/debts/:id` | Get debt |
  | PUT    | `/debts/:id` | Update debt |
  | DELETE | `/debts/:id` | Delete debt |
  | GET    | `/debts/:id/summary` | Debt summary |
  | POST   | `/debts/:debtId/movements` | Create movement scoped to debt |
  | GET    | `/debts/:debtId/movements` | List movements of a debt |

  **Debt Movements**
  | Method | Path | Description |
  |--------|------|--------------|
  | GET    | `/debt-movements/:id` | Get by id |
  | PUT    | `/debt-movements/:id` | Update |
  | DELETE | `/debt-movements/:id` | Delete |

  **Credits** (`credit.routes.js`)
  | Method | Path | Description |
  |--------|------|--------------|
  | POST   | `/credits` | Create credit |
  | GET    | `/credits` | List credits (`?limit=&offset=`) |
  | GET    | `/credits/:id` | Get credit |
  | PUT    | `/credits/:id` | Update credit |
  | DELETE | `/credits/:id` | Delete credit |
  | GET    | `/credits/:id/summary` | Credit summary (totals, paid, remaining) |
  | POST   | `/credits/:creditId/payments` | Create payment scoped to credit |
  | GET    | `/credits/:creditId/payments` | List payments of a credit |

  **Credit Payments**
  | Method | Path | Description |
  |--------|------|--------------|
  | GET    | `/credit-payments/:id` | Get by id |
  | PUT    | `/credit-payments/:id` | Update |
  | DELETE | `/credit-payments/:id` | Delete |

Typical call lifecycle:
1. Express route receives request.
2. Controller normalizes input and calls a service.
3. Service validates, performs DB work, returns entity/summary.
4. Controller serializes JSON response and sets proper status.

Outbound API calls (backend -> external services):
- None found in `src/`.
- This backend currently does not call external HTTP APIs.

## 6) How State Management Works

This backend is stateless at the HTTP layer:
- No session storage.
- No authentication state management in current code.
- No Redis/cache layer.

State source of truth:
- MySQL database via Sequelize models.
- Business state transitions are applied in service functions.
- Transaction boundaries ensure consistency for many write operations.

Derived state:
- Summaries (`balance`, `totalPaid`, etc.) are computed on demand from movements/payments.
- No persisted read-model/projection layer.

## 7) Naming Conventions

Files and folders:
- `kebab-case` for route files and migrations.
- `*.controller.js`, `*.service.js` suffixes.
- One module per domain concept.

Code symbols:
- Model classes: `PascalCase` (`Period`, `CreditPayment`).
- Variables/functions: `camelCase`.
- Route aliases commonly use `*Ctrl` or `*Service` namespace imports.

Database naming:
- Tables: `snake_case` plural (`credit_payments`, `period_movements`).
- FKs in models: `camelCase` (`creditId`, `periodId`) mapped to migration columns with same names.
- Association aliases use snake_case plural in several places (`period_movements`, `debt_movements`) and simpler names in others (`payments`, `person`).

API naming:
- REST nouns are plural for collections (`/credits`, `/debts`).
- Nested resources used for scoped operations (`/credits/:creditId/payments`).

## 8) Rules for Adding New Features

Follow these rules when implementing a new backend feature/module.

1. Keep the existing layer split.
- Add route in `src/routes/*.routes.js`.
- Add controller in `src/controllers/`.
- Put business logic in `src/services/`.
- Do not place DB logic directly in controllers.

2. Keep API under `/api/v1`.
- Register new router through `src/routes/index.js`.

3. Add/extend persistence correctly.
- Add migration in `src/migrations/` for schema changes.
- Update/create model in `src/database/models/`.
- Register model and associations in `associateModels.js`.

4. Use transactions for write operations.
- Prefer managed transaction callback pattern for consistency.
- Group multi-step updates in one transaction.

5. Validate inputs in services.
- Validate required fields, enums, and numeric/date constraints.
- Prefer `ApiError(message, status)` for business/domain errors.

6. Preserve money precision.
- For monetary rules, use cent-based integer arithmetic before storing DECIMAL values.

7. Keep response and error semantics consistent.
- `201` for create, `404` when entity not found, `400` for invalid input.
- If adding new module code, use one error strategy consistently.

8. Keep naming and endpoint style consistent.
- Plural nouns for collections.
- Nested resource endpoints when child belongs to parent.
- Follow existing file suffixes and model naming.

9. Add indexes/constraints in migrations when needed.
- Example already used: unique `(creditId, paymentNumber)` for credit payments.

10. Do not introduce new global state.
- Persist state in DB and compute aggregates in service layer.

## 9) Suggested Implementation Template for New Module

When adding a new domain (example: `savings`):
1. Create migration(s): table + indexes + FK constraints.
2. Create model file `src/database/models/Saving.js` with `initModel` and `associate`.
3. Register model in `src/database/models/associateModels.js`.
4. Create service `src/services/saving.service.js` for validations and DB operations.
5. Create controller `src/controllers/saving.controller.js`.
6. Create router `src/routes/saving.routes.js` and mount in `src/routes/index.js`.
7. Add summary/helper endpoints only through services.
8. Validate all writes with transaction boundaries.

## 10) Notes for AI Assistants

- Prefer minimal, localized changes in the target module.
- Preserve current coding style in touched files.
- Avoid introducing a new architecture pattern unless requested.
- If standardizing errors, do it as a separate explicit refactor.
- Verify related migrations and associations whenever adding a foreign key.
