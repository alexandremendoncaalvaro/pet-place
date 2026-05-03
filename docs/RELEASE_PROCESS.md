# Release Process

## Branches

- `development`: ambiente de dev em `https://pet-place-dev.pages.dev`.
- `main`: producao em `https://pet-place.pages.dev`.
- `codex/*`: branches de trabalho.

## Fluxo

1. Trabalhar em uma branch `codex/...`.
2. Rodar `npm run quality`.
3. Fazer merge para `development`.
4. Validar manualmente no ambiente dev.
5. Quando aprovado, fazer merge de `development` para `main`.
6. A pipeline de producao aplica migrations, publica Worker/Pages e roda smoke test.

## Versionamento

Usamos SemVer simples:

- `MAJOR`: mudanca incompatível ou migracao operacional grande.
- `MINOR`: feature nova.
- `PATCH`: bugfix.

Enquanto o app ainda esta estabilizando, usar `0.x.y`.

## Release Candidate

Quando `development` estiver pronta para validacao:

```powershell
git tag v0.1.0-rc.1 development
git push origin v0.1.0-rc.1
```

Se precisar ajustar, criar `rc.2`, `rc.3`, etc.

## Release

Depois da validacao manual e merge em `main`:

```powershell
git tag v0.1.0 main
git push origin v0.1.0
```

O registro de releases fica:

- commits atomicos em branches de trabalho;
- release candidates apontando para validacoes em dev;
- releases finais apontando para producao.
