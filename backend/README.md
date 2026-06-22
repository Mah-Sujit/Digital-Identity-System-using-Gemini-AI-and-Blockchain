## Digital Identity Backend

### 1) Install
npm install

### 2) Setup .env
Copy .env.example to .env and set DATABASE_URL and JWT_SECRET.

### 3) Create DB + run migrations
Create database: digital_identity
Run SQL in src/database/migrations/*.sql

### 4) Start
npm run dev

### 5) Test
GET http://localhost:4000/health
