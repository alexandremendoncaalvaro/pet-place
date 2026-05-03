# Importação de dados

Ferramenta operacional para importações controladas de dados para D1/R2.
Execute a partir da raiz do repositório com `uv`:

```powershell
uv run --project tools/migrate python tools/migrate/migrate.py audit --service-account .\source-service-account.json --database-id <source-database-id>
uv run --project tools/migrate python tools/migrate/migrate.py export --service-account .\source-service-account.json --database-id <source-database-id> --out .\migration-export
uv run --project tools/migrate python tools/migrate/migrate.py load --export-dir .\migration-export --remote
uv run --project tools/migrate python tools/migrate/migrate.py verify --export-dir .\migration-export --remote
```

Credenciais de origem e diretórios de exportação devem permanecer locais e fora
do Git. A carga em Cloudflare usa Wrangler para D1 e R2.
