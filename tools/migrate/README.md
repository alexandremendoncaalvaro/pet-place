# Caixinha Pet Place migration tooling

Run from the repo root with `uv`:

```powershell
uv run --project tools/migrate python tools/migrate/migrate.py audit --service-account .\service-account.json --database-id ai-studio-5c438f28-aaf7-4f47-a22e-9ec085756dfb
uv run --project tools/migrate python tools/migrate/migrate.py export --service-account .\service-account.json --database-id ai-studio-5c438f28-aaf7-4f47-a22e-9ec085756dfb --out .\migration-export
uv run --project tools/migrate python tools/migrate/migrate.py load --export-dir .\migration-export --remote
uv run --project tools/migrate python tools/migrate/migrate.py verify --export-dir .\migration-export --remote
```

The tool expects a Firebase service account JSON with access to Auth, Firestore,
and Storage. It uses Wrangler for Cloudflare D1 and R2 operations.
