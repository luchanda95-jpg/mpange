# Mpange Backend (MongoDB scaffold)

Tech stack: Node.js, Express, Mongoose (MongoDB), JWT auth, multer file upload (local / S3-ready).

## Quickstart (dev)
1. Install Node (>=16) and MongoDB (or run a MongoDB container).
2. Copy `.env.example` to `.env` and fill values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## Endpoints (summary)
- `POST /api/auth/signup` — create account (returns JWT)
- `POST /api/auth/login` — login (returns JWT)
- `POST /api/auth/forgot-password` — request password reset (placeholder)
- `GET /api/users/me` — get current user (auth required)
- `GET /api/projects` — list projects
- `POST /api/projects` — create project (auth + file upload)
- `GET /api/projects/:id` — get project
- `PUT /api/projects/:id` — update project (auth)
- `DELETE /api/projects/:id` — delete project (auth)

This scaffold includes Mongoose models, example controllers, and setup instructions.
