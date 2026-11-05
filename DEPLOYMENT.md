# Deploy EduCore to GitHub, Render and Vercel

## 1. Upload this directory

Use the folder containing this README, server and web as the repository root. If you upload the parent monorepo instead, prefix every root directory below with `apps/` and select `apps/render.yaml` as the Blueprint path. Keep all local .env files private. The prepared .gitignore applies recursively inside this directory.

## 2. MongoDB Atlas

Create a cluster and application database user. Set MONGODB_URI to its connection string with a database name. URL-encode reserved characters in the password. Add the backend's outbound addresses to Atlas network access using Render's service networking information. Create the vector index described in server/AI_SETUP.md for `tutorchunks`. The application database user needs the permissions required by the chosen index-creation method.

## 3. Render backend

Create a **Web Service**, connect GitHub, select Node and Root Directory `server`. Build: `npm ci --include=dev --workspaces=false && npm run build`. Start: `npm start`. Health check: `/api/health`. Select Node 22. Alternatively create a Blueprint from render.yaml, reviewing the service plan before confirming.

Set these in Render's Environment panel:

| Variable | Value |
|---|---|
| NODE_ENV | production |
| MONGODB_URI | Private Atlas connection string |
| JWT_ACCESS_SECRET | Independently generated random secret, at least 32 characters |
| JWT_REFRESH_SECRET | A different random secret, at least 32 characters |
| CLIENT_URL | Exact production Vercel origin, e.g. https://your-school.vercel.app (no trailing slash) |
| GROQ_API_KEY | Private Groq key for AI |
| GROQ_CHAT_MODEL | openai/gpt-oss-20b, or a supported model your account can access |
| AI_VECTOR_INDEX | course_content_local_v1 |
| ADMIN_BOOTSTRAP_EMAIL / PASSWORD / NAME | Private initial administrator configuration |
| SMTP_* and EMAIL_FROM | Optional, required for actual password-reset emails |

Render supplies PORT. Do not hard-code it. Generate each JWT secret locally using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`; save it directly to the hosting dashboard, not a tracked file.

Use the Render shell to run `node dist/bootstrapAdmin.js` once (or run bootstrap locally against the intended Atlas database with the same private environment). Remove bootstrap password from the hosting environment after setup. Never run seed commands on production records. Create the Atlas index with `node dist/setupTutorIndex.js`, or use Atlas UI. Prepare existing materials with `node dist/prepareTutorMaterials.js`.

Photos uploaded through all student/teacher routes are now compressed and stored in MongoDB. Startup attempts to recover older /uploads photo references from existing local files without deleting the originals. A missing original file must be uploaded again. To retain other legacy disk uploads across redeploys, attach persistent storage and set UPLOAD_DIR to its absolute mount path. Do not commit uploads to GitHub. Local embedding cache is disposable and redownloads when missing; allocate enough RAM for model inference and PDF processing. Use an always-on backend for timely quiz deadlines and chat. A sleeping service processes overdue attempts after it wakes.

## 4. Vercel frontend

Import the same repository, choose **Next.js**, Root Directory `web`, Node 22. web/vercel.json sets install `npm ci --workspaces=false` and build `npm run build`; leave the Next.js output directory default.

Set `NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com/api` in Vercel's Production environment. It is public and embedded at build time; redeploy after changing it. Never add MongoDB, JWT, SMTP or Groq secrets as NEXT_PUBLIC variables. Deploy, then update Render CLIENT_URL to the final Vercel production origin and redeploy Render.

The API allows credentials from CLIENT_URL, and production refresh cookies use Secure + SameSite=None for cross-site hosting. Browsers that block third-party cookies may still prevent refresh across unrelated vercel.app/onrender.com sites. For reliable production sessions, use HTTPS custom domains under the same site, such as app.school.example and api.school.example. The Socket.IO URL is derived from the API base URL; keep the `/api` suffix for Axios and preserve Socket.IO transport support on Render.

Vercel preview URLs are separate origins. Use a dedicated staging backend with its own CLIENT_URL and database instead of granting every preview access to production.

## 5. Verify after deployment

Open API /api/health. Sign in and refresh the frontend, check that the session refresh works, upload and reload a profile photo, create a course, download material, mark attendance, submit a practice quiz, check teacher quiz approval, and open parent/teacher chat in two browsers. Check Render logs for MongoDB, model download or index errors. Verify there are no localhost API requests in browser network tools.

## Troubleshooting

- CORS: CLIENT_URL must equal the browser origin; redeploy after edits.
- Login works but later expires: check HTTPS, cookie blocking and the domain guidance above.
- AI setup message: verify GROQ_API_KEY, model access, Atlas index readiness and prepared source content.
- Missing old photos: recovery needs the original upload files; re-upload photos whose originals are gone.
- Build fails: verify Node 22, selected application root and lockfile; install dev dependencies for server TypeScript compilation.
- Files vanish: use persistent storage for legacy disk files; MongoDB portraits and course attachments are stored separately from that directory.

Official references: [Render Express deployment](https://render.com/docs/deploy-node-express-app), [Render Blueprint](https://render.com/docs/blueprint-spec), [Vercel monorepos](https://vercel.com/docs/monorepos).
