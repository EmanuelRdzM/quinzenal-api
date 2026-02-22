# Quinzenal API 

Backend del proyecto **Quinzenal (CashFlow)**.
API REST para el manejo de ingresos, egresos, deudas, créditos y balances personales.

## Descripción general
Quinzenal API es un servicio RESTful construido con Node.js y Express que permite gestionar:
- Financial periods (quincenas)
- Registro de ingresos y egresos
- Control de efectivo vs tarjeta
- Historial de tarjetas
- Registro de préstamos y deudas
- Control de créditos y pagos

The API is versioned under:
`/api/v1`


## Tech Stack
- Node.js
- Express
- MySQL
- Sequelize (ORM)

## Estructura del proyecto:

```
src/
 ├── controllers/
 ├── routes/
 ├── models/
 ├── database/
 └── app.js
```
Todas las rutas se montan en /api/v1.
Ejemplos de grupos de rutas:
- /periods
- /period-movements
- /cards
- /debts
- /credits

## Instalación
```bash
git clone https://github.com/EmanuelRdzM/quinzenal-api.git
cd quinzenal-api
```


```bash
npm install
```

# Configuración del entorno
Cree un archivo .env en el directorio raíz con base a la estructura de .env.example

# Configuración de la base de datos

```bash
npm run db:create
```

```bash
npm run migrate
```

## Available Scripts

```bash
npm run start        # Run in production mode
npm run dev          # Run with nodemon (development)
npm run db:create    # Create database from .env config
npm run migrate      # Run Sequelize migrations
npm run migrate:undo # Undo all migrations
```

## Endpoint de ejemplos:
# Periods

```
GET    /api/v1/periods
POST   /api/v1/periods
GET    /api/v1/periods/:id
PUT    /api/v1/periods/:id
GET    /api/v1/periods/:id/summary
```

# Movimientos de periodos

```
POST   /api/v1/periods/:id/movements
POST   /api/v1/period-movements
GET    /api/v1/period-movements
GET    /api/v1/period-movements/:id
PATCH  /api/v1/period-movement/:id
DELETE /api/v1/period-movements/:id
```

Los grupos de rutas adicionales incluyen:
- /cards
- /debts
- /credits

# Ejecute el proyecto en modo de desarrollo:
```bash
npm run dev
```

El servidor comenzará a utilizar la configuración definida en .env.

## Notas:
- Esta API no implementa autenticación (proyecto personal).
- Diseñada para el seguimiento y la experimentación financiera personal.
- Estructura de API versionada para una mayor escalabilidad.