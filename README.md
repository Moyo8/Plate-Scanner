# Plate-Scanner

Plate-Scanner is a small full-stack app for detecting fake vehicle license plates.

Features
- Responsive frontend (vanilla HTML/CSS/JS) with a demo plates dataset at `frontend/data/plates.js`.
- Node/Express backend with Mongoose for user auth (JWT access + refresh tokens), password reset flows (link + 6-digit code), and Mailtrap integration.
- Client-side activity log persisted to localStorage and exportable as CSV.

Quick start
1. Install dependencies:

```powershell
npm install
```

2. Start backend server (from project root):

```powershell
cd backend
npm start
```

3. Start frontend static server:

```powershell
node frontend-server.js
```

4. Open the frontend in your browser (e.g., http://localhost:3000)

Notes
- Create `backend/.env` and set `JWT_SECRET` and optional `MAILTRAP_TOKEN` for real email delivery.
- The demo plates dataset is `frontend/data/plates.js`.

License
- MIT
