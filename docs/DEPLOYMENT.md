# Deploying Health Copilot

The app is two services plus Supabase, which is already hosted (project `health-copilot-india`, Mumbai `ap-south-1`).

| Part | What it is | Runs on |
|---|---|---|
| `backend/` | FastAPI + uvicorn, Python 3.12. Talks to Gemini, Groq and Supabase. | Render, AWS App Runner, or any Docker host |
| `frontend/` | Next.js 15 app router. Calls the backend with the user's Supabase JWT. | Vercel, Render, or AWS Amplify |
| Supabase | Postgres, Auth, Storage bucket `documents`. Schema lives in `supabase/migrations/`. | Already live, nothing to deploy |

Pick the host, then do the three Supabase steps at the end. Every option below works on free tiers for a demo.

---

## 1. Environment variables

Never commit these. `backend/.env.example` lists the backend names.

### Backend

| Name | Value |
|---|---|
| `GROQ_API_KEY` | Groq key (Qwen text + Whisper) |
| `GEMINI_API_KEY` | Google AI Studio key (vision OCR) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_KEY` | `sb_secret_…` service key. Server only, bypasses row-level security |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_JWKS_URL` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `FRONTEND_ORIGIN` | The public frontend URL, e.g. `https://health-copilot.vercel.app`. Comma-separate several (preview domains). Used for CORS |
| `HOST` / `PORT` | `0.0.0.0` and whatever the host injects. Render and App Runner set `PORT` themselves |

Get the two Supabase keys with the CLI (or Dashboard → Project Settings → API Keys):

```
supabase projects api-keys --project-ref <project-ref> --reveal
```

### Frontend

| Name | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend public URL **with** the prefix, e.g. `https://health-copilot-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as `SUPABASE_PUBLISHABLE_KEY` (safe in the browser) |
| `NEXT_PUBLIC_SITE_URL` | The public frontend URL, used for Open Graph links |

The backend and frontend point at each other, so deploy the backend first, then the frontend, then go back and set `FRONTEND_ORIGIN` on the backend.

---

## 2. Option A: Vercel (frontend) + Render (backend) — recommended for the hackathon

### Backend on Render

1. Render Dashboard → **New → Web Service** → connect the GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
   - **Region:** Singapore (closest to the Mumbai Supabase project)
   - **Environment → Add:** `PYTHON_VERSION=3.12.7` plus every backend variable from section 1. Leave `FRONTEND_ORIGIN` as `http://localhost:3000` for now.
3. Deploy. Open `https://<service>.onrender.com/health`; it should return `{"status":"ok","vision":true,"language_model":true}`. A `false` means that API key is missing on the host.

Or commit this `render.yaml` at the repo root and use **New → Blueprint**:

```yaml
services:
  - type: web
    name: health-copilot-api
    runtime: python
    rootDir: backend
    region: singapore
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.7
      - key: GROQ_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: SUPABASE_PUBLISHABLE_KEY
        sync: false
      - key: SUPABASE_JWKS_URL
        sync: false
      - key: FRONTEND_ORIGIN
        sync: false
```

`sync: false` means Render asks you for the value in the dashboard instead of reading it from git.

**Free-tier warning:** Render free services sleep after 15 minutes idle and take about 50 seconds to wake. Before a live demo either open the `/health` URL a minute early, or move the service to the Starter plan for the day.

### Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory:** `frontend` (Framework preset Next.js is detected automatically).
3. **Environment Variables:** the four frontend variables from section 1. `NEXT_PUBLIC_BACKEND_URL` is the Render URL plus `/api/v1`. `NEXT_PUBLIC_SITE_URL` is the Vercel URL you are about to get, e.g. `https://health-copilot.vercel.app`; you can set it after the first deploy and redeploy.
4. Deploy.

### Wire them together

1. Render → the backend service → Environment → set `FRONTEND_ORIGIN` to the Vercel URL, e.g. `https://health-copilot.vercel.app`. Add preview domains comma-separated if you use them. Save; Render redeploys.
2. Do the Supabase steps in section 5.

---

## 3. Option B: everything on Render

Backend exactly as in Option A. Add a second Web Service for the frontend:

- **Root Directory:** `frontend`
- **Runtime:** Node
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run start`  (Next.js reads Render's `PORT` automatically)
- **Environment:** the four frontend variables; `NEXT_PUBLIC_BACKEND_URL` is the backend service's `.onrender.com` URL plus `/api/v1`.

`NEXT_PUBLIC_*` values are baked in at build time, so changing one needs a redeploy, not just a restart.

---

## 4. Option C: AWS

Use region **ap-south-1 (Mumbai)** so the backend sits next to Supabase.

### Backend on App Runner (container)

Add this `backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV HOST=0.0.0.0 PORT=8000
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build, push to ECR, create the service:

```bash
AWS_REGION=ap-south-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
aws ecr create-repository --repository-name health-copilot-api --region $AWS_REGION
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
docker build --platform linux/amd64 -t health-copilot-api backend
docker tag health-copilot-api:latest $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/health-copilot-api:latest
docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/health-copilot-api:latest
```

Then App Runner console → **Create service** → Source: Container registry, the image above → Port `8000` → Environment variables: every backend variable from section 1 → Health check path `/health` → Create. App Runner gives you an `https://….awsapprunner.com` URL; that plus `/api/v1` is the frontend's `NEXT_PUBLIC_BACKEND_URL`.

Minimum configuration (1 vCPU, 2 GB) is enough. App Runner does not sleep, so there is no cold start.

**EC2 alternative:** a t3.small Ubuntu instance with Docker, `docker run -d --env-file .env -p 80:8000 health-copilot-api`, and a security group open on 80/443. Put Caddy or an ALB in front for TLS, because the frontend is served over HTTPS and browsers block mixed content.

### Frontend on Amplify Hosting

1. Amplify console → **New app → Host web app** → GitHub → pick the repo and `main`.
2. Set **monorepo root** to `frontend`. Amplify detects Next.js SSR.
3. **Environment variables:** the four frontend variables.
4. Deploy. Then set `FRONTEND_ORIGIN` on the App Runner service to the `https://main.….amplifyapp.com` URL and redeploy it.

Vercel for the frontend with App Runner for the backend is also fine; mix freely, only the URLs change.

---

## 5. Supabase settings for the deployed URL (all options)

Only one setting has to change. The project is otherwise ready as it is.

1. **Auth → URL Configuration.** Site URL is set to `http://localhost:3010` and the redirect allow-list only has localhost. Change **Site URL** to the public frontend URL and add it and `https://<frontend>/**` to **Redirect URLs**. This only affects links inside auth emails (password reset, magic links); sign-in and sign-up work before you do it, but do it anyway.
2. **Schema:** already applied. If you ever deploy to a fresh project, run from the repo root:
   ```
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   This creates the tables, row-level-security policies and the private `documents` bucket.
3. **Keys:** the service key (`SUPABASE_KEY`) is only ever set on the backend host. The browser only sees the publishable key.

Things you do **not** need to touch, checked against the live project:

- **No IP allowlist.** Network restrictions are open (`0.0.0.0/0`), so Render, Vercel, AWS or any other host can reach the database and storage.
- **No email confirmation.** Auto-confirm is on, so a judge who signs up is logged in immediately with no email round-trip. Leave it on for the demo.
- **No storage CORS.** Files are served through short-lived signed URLs minted by the backend, and the bucket stays private.
- **Row-level security** is part of the migrations and is already applied.

One limit to know: Supabase's built-in mailer sends at most 2 emails per hour. Sign-up never sends one, but password reset does, so do not rely on reset during a demo. If you need more, add a custom SMTP provider under Auth → SMTP Settings.

**Demo account.** A demo user with the sample Kumar family already exists in Auth → Users. Its login is shared with the team privately, never in the repo. It is an ordinary Supabase user, so it works unchanged on the deployed site; change its password in Auth → Users before the link goes public.

---

## 6. After deploy checklist

- `GET https://<backend>/health` returns `{"status":"ok","vision":true,"language_model":true}`.
- Open the frontend, sign in, upload a sample from `docs/sample-documents/`. If the browser console shows a CORS error, `FRONTEND_ORIGIN` on the backend does not match the frontend URL exactly (scheme, host, no trailing slash).
- Document previews load. If they do not, the backend cannot reach Supabase Storage; check `SUPABASE_URL` and `SUPABASE_KEY`.
- **Model quotas:** the Gemini free tier allows a handful of vision requests per day on the flash model and Groq's free tier caps tokens per minute. Put both keys on a paid tier before a demo, or uploads will fall back to lower-quality models mid-presentation.
- **Rotate any key that was ever pasted in a chat, ticket or screenshot** before the repo is shared with judges.
- Upload limit is 15 MB per file (`backend/app/routers/ingestion.py`). Render and App Runner both allow this; if you put Cloudflare or an ALB in front, raise its body limit too.
