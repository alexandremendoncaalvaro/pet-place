# Security Policy

Pet Place is a public, volunteer-maintained project. Security work should keep the
runtime free, simple, and auditable.

## Supported Version

Only the code deployed from `main` is supported for production fixes.

## Secret Handling

- Never commit `.env`, `.dev.vars`, `.mise.local.toml`, Cloudflare tokens,
  OAuth secrets, VAPID private keys, service account files, database exports,
  or production backups.
- Runtime secrets must live in Cloudflare or GitHub Actions secrets.
- Local secret files are ignored by Git and should stay local.
- `pnpm run security:secrets` scans the current tracked tree for common
  hard-coded secrets.
- GitHub Secret Scanning and push protection are enabled for the repository.

Runtime authorization invariants are documented in
[docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

## Reporting

Open a private security advisory on GitHub when available. If that is not
available, contact the repository owner directly before opening a public issue.

## Incident Response

1. Revoke or rotate the exposed credential first.
2. Remove the secret from the current tree.
3. Add or adjust a regression check.
4. Decide whether history rewriting is worth the disruption.
