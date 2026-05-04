# Release Process

## Branches

- `development`: branch oficial do ambiente de dev em `https://pet-place-dev.pages.dev`.
- `main`: produção em `https://pet-place.pages.dev`.
- `codex/*`: branches de trabalho.

Neste repositório, `development` é a branch de dev. Não existe branch remota
`dev` para ambiente. Branches antigas ou temporárias podem existir e devem ser
limpas separadamente, sem trocar a convenção de ambiente. Não criar uma branch
`dev` paralela sem uma migração formal de CI/CD, porque ela não dispara o deploy
dev atual.

## Fluxo

1. Trabalhar em uma branch `codex/...`.
2. Rodar `pnpm run quality`.
3. Abrir PR contra `development`.
4. Aguardar os checks obrigatórios do GitHub.
5. Fazer merge para `development`.
6. O GitHub Actions publica o ambiente dev.
7. Validar manualmente no ambiente dev.
8. Quando aprovado, fazer PR/merge de `development` para `main`.
9. A pipeline de produção aplica migrations, publica Worker/Pages e roda smoke test.

## Regra de Auditoria

Deploy não é ação local; é evento auditado no GitHub Actions. O fluxo normal
não permite `wrangler deploy` ou `wrangler pages deploy` direto da máquina de
um desenvolvedor. Se uma emergência exigir esse caminho, ela precisa ser
aprovada explicitamente e documentada depois com motivo, comandos, commit,
Worker Version ID, Pages deployment e resultado do smoke.

## Versionamento

Usamos SemVer simples:

- `MAJOR`: mudança incompatível ou migração operacional grande.
- `MINOR`: feature nova.
- `PATCH`: bugfix.

Enquanto o app ainda está estabilizando, usar `0.x.y`.

## Release Candidate

Quando `development` estiver pronta para validação:

```powershell
git tag v0.1.0-rc.1 development
git push origin v0.1.0-rc.1
```

Se precisar ajustar, criar `rc.2`, `rc.3`, etc.

## Release

Depois da validação manual e merge em `main`:

```powershell
git tag v0.1.0 main
git push origin v0.1.0
```

O registro de releases fica:

- commits atômicos em branches de trabalho;
- release candidates apontando para validações em dev;
- releases finais apontando para produção.
