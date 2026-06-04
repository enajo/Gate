#!/usr/bin/env bash
# Runs once after the devcontainer is created.
# PostgreSQL is already installed and gatekeeper DB already exists (baked into the image).

set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          Gate — dev environment setup         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Start PostgreSQL ───────────────────────────────────────────────────────
echo "▸ Starting PostgreSQL …"
sudo service postgresql start
echo "   ✓ Ready"
echo ""

# ── 2. Environment file ───────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "▸ Creating .env from .env.example …"
  cp .env.example .env

  SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")
  sed -i "s|NEXTAUTH_SECRET=\"change-me\"|NEXTAUTH_SECRET=\"${SECRET}\"|" .env
  sed -i "s|AUTH_SECRET=\"change-me\"|AUTH_SECRET=\"${SECRET}\"|" .env

  if [ -n "${CODESPACE_NAME:-}" ]; then
    DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    CODESPACE_URL="https://${CODESPACE_NAME}-3000.${DOMAIN}"
    sed -i "s|NEXTAUTH_URL=\"http://localhost:3000\"|NEXTAUTH_URL=\"${CODESPACE_URL}\"|" .env
    sed -i "s|NEXT_PUBLIC_APP_URL=\"http://localhost:3000\"|NEXT_PUBLIC_APP_URL=\"${CODESPACE_URL}\"|" .env
    sed -i "s|GOOGLE_REDIRECT_URI=\"http://localhost:3000/api/app/google/callback\"|GOOGLE_REDIRECT_URI=\"${CODESPACE_URL}/api/app/google/callback\"|" .env
    echo "   ✓ URLs set to ${CODESPACE_URL}"
  else
    echo "   ✓ .env created (localhost URLs)"
  fi
else
  echo "▸ .env already exists — skipping"
fi
echo ""

# ── 3. Install dependencies ───────────────────────────────────────────────────
echo "▸ Installing npm dependencies …"
npm install 2>&1 | tail -3
echo "   ✓ Done"
echo ""

# ── 4. Run migrations ─────────────────────────────────────────────────────────
echo "▸ Running Prisma migrations …"
npx prisma migrate deploy
echo "   ✓ Migrations applied"
echo ""

# ── 5. Seed the database ──────────────────────────────────────────────────────
echo "▸ Seeding database …"
npm run db:seed
echo "   ✓ Seed complete"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Setup complete! Dev server starting…     ║"
echo "║                                              ║"
echo "║  Demo logins:                                ║"
echo "║    john@example.com                          ║"
echo "║    sarah@example.com                         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
