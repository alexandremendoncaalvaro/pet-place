# Documentação

Este diretório é a fonte principal de documentação técnica e operacional do Pet Place.

## Mapa

- [ARCHITECTURE.md](ARCHITECTURE.md): visão de arquitetura, fronteiras de módulo e direção evolutiva.
- [DEPLOYMENT.md](DEPLOYMENT.md): ambientes, CI/CD, Cloudflare, GitHub Actions e variáveis.
- [ENGINEERING_STANDARDS.md](ENGINEERING_STANDARDS.md): padrões obrigatórios, quality gates e backlog técnico.
- [TEST_STRATEGY.md](TEST_STRATEGY.md): pirâmide de testes, contratos de regressão e direção para Worker/Playwright.
- [SECURITY_MODEL.md](SECURITY_MODEL.md): invariantes de autorização e superfícies protegidas.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): tokens, primitives e regras visuais.
- [MEDIA_POLICY.md](MEDIA_POLICY.md): regras para imagens, vídeos, comprovantes e recibos.
- [IDENTITY_LINKING.md](IDENTITY_LINKING.md): pré-cadastro offline e junção por telefone.
- [RELEASE_PROCESS.md](RELEASE_PROCESS.md): fluxo de branches, RCs e releases.
- [TECHNICAL_AUDIT.md](TECHNICAL_AUDIT.md): auditoria sênior atual e plano de maturidade.

## Convenções

- `README.md` e `SECURITY.md` ficam na raiz por convenção do GitHub.
- Documentação técnica longa fica em `docs/`.
- Procedimentos operacionais devem citar comandos `pnpm` e `uv` quando aplicável.
- Mudanças de arquitetura devem atualizar `ARCHITECTURE.md`, `ENGINEERING_STANDARDS.md` e, quando houver risco, `TECHNICAL_AUDIT.md`.
