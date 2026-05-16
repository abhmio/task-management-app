# TaskFlow MySQL to MongoDB Migration Guide

This backend has been migrated from MySQL to MongoDB using Mongoose while preserving the existing API routes and frontend response structures.

## What Changed

- Replaced `mysql2` with `mongoose`
- Replaced SQL query models with Mongoose-backed model wrappers
- Preserved existing API paths and JSON envelope structure
- Preserved public numeric `id` fields for frontend compatibility
- Added internal MongoDB references using `ObjectId` and `ref`

## New Required Environment Variable

```env
MONGO_URI=mongodb://127.0.0.1:27017/taskflow
```

For MongoDB Atlas:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskflow?retryWrites=true&w=majority
```

## Frontend Compatibility

No frontend route or field-name changes are required.

The backend still returns the same public shapes such as:

- `id`
- `created_by`
- `assignee_id`
- `created_at`
- `is_read`

## Data Model Notes

- `User`, `Task`, `Team`, and `Notification` now use MongoDB collections
- MongoDB `_id` is internal
- Numeric `id` fields are generated through a counters collection so the frontend can continue using integer IDs

## Local Setup

1. Install MongoDB locally or create a MongoDB Atlas cluster
2. Update `backend/.env`
3. Run:

```powershell
cd backend
npm install
npm run dev
```

## Production Setup

1. Set `MONGO_URI` in your host environment
2. Set `NODE_ENV=production`
3. Set `CLIENT_URL`, `CLIENT_URLS`, and `CLIENT_URL_PATTERNS`
4. Restart the backend service

## Testing Checklist

- Register
- Login
- Google login
- Forgot password
- Reset password
- Create task
- Update task
- Delete task
- Create team
- Add member
- Notifications
- Dashboard
- Reports
