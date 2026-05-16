# TaskFlow Backend

Production-ready Node.js + Express backend for TaskFlow using MongoDB, Mongoose, JWT authentication, and clean modular architecture.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Passport Google OAuth
- Nodemailer

## Structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
  .env.example
  .env.production.example
  package.json
  server.js
```

## Setup

1. Copy `.env.example` to `.env`
2. Set `MONGO_URI`
3. Install packages with `npm install`
4. Start the backend with `npm run dev`

## Environment Variables

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `CLIENT_URLS`
- `CLIENT_URL_PATTERNS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `RESET_PASSWORD_URL`

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `POST /api/auth/set-password`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

### Tasks

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Teams

- `POST /api/teams`
- `GET /api/teams`
- `POST /api/teams/:id/add-member`
- `GET /api/teams/:id`

### Notifications

- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`

### Dashboard

- `GET /api/dashboard/summary`

### Reports

- `GET /api/reports/weekly`
- `GET /api/reports/status-distribution`
- `GET /api/reports/category-analysis`
- `GET /api/reports/productivity`

## Notes

- Public API IDs remain numeric for frontend compatibility.
- MongoDB ObjectId references are used internally through Mongoose refs.
- The backend is ready for MongoDB Atlas, Render, Railway, and similar hosts.
