#!/usr/bin/env bash
# Runs once after the devcontainer is created.
# Safe to re-run — every step is idempotent.

set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          Gate — dev environment setup         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Environment file ───────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "▸ Creating .env from .env.example …"
  cp .env.example .env

  # Auto-generate secrets so NextAuth works immediately
  SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")
  sed -i "s|NEXTAUTH_SECRET=\"change-me\"|NEXTAUTH_SECRET=\"${SECRET}\"|" .env
  sed -i "s|AUTH_SECRET=\"change-me\"|AUTH_SECRET=\"${SECRET}\"|" .env

  # Fix URLs for Codespaces
  if [ -n "${CODESPACE_NAME:-}" ]; then
    DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    CODESPACE_URL="https://${CODESPACE_NAME}-3000.${DOMAIN}"
    sed -i "s|NEXTAUTH_URL=\"http://localhost:3000\"|NEXTAUTH_URL=\"${CODESPACE_URL}\"|" .env
    sed -i "s|NEXT_PUBLIC_APP_URL=\"http://localhost:3000\"|NEXT_PUBLIC_APP_URL=\"${CODESPACE_URL}\"|" .env
    sed -i "s|GOOGLE_REDIRECT_URI=\"http://localhost:3000/api/app/google/callback\"|GOOGLE_REDIRECT_URI=\"${CODESPACE_URL}/api/app/google/callback\"|" .env
    echo "   ✓ URLs set to ${CODESPACE_URL}"
  else
    echo "   ✓ .env created (localhost URLs — local dev mode)"
  fi

  echo "   ⚠  Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY when ready"
else
  echo "▸ .env already exists — skipping"
fi

echo ""

# ── 2. Create the database ────────────────────────────────────────────────────
echo "▸ Creating database …"
createdb -U postgres gatekeeper 2>/dev/null || echo "   (already exists)"
echo ""

# ── 3. Install dependencies ───────────────────────────────────────────────────
echo "▸ Installing npm dependencies …"
npm install 2>&1 | tail -3
echo "   ✓ Done"
echo ""

# ── 4. Wait for PostgreSQL ────────────────────────────────────────────────────
echo "▸ Waiting for PostgreSQL …"
for i in $(seq 1 15); do
  if pg_isready -h localhost -U postgres -q 2>/dev/null; then
    break
  fi
  sleep 1
done
pg_isready -h localhost -U postgres -q || { echo "❌ Postgres never became ready"; exit 1; }
echo "   ✓ PostgreSQL is ready"
echo ""

# ── 5. Run migrations ─────────────────────────────────────────────────────────
echo "▸ Running Prisma migrations …"
npx prisma migrate deploy
echo "   ✓ Migrations applied"
echo ""

# ── 6. Seed the database ──────────────────────────────────────────────────────
echo "▸ Seeding database with demo data …"
npm run db:seed
echo "   ✓ Seed complete"
echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Setup complete!                          ║"
echo "║                                              ║"
echo "║  Demo logins:                                ║"
echo "║    john@example.com                          ║"
echo "║    sarah@example.com                         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
