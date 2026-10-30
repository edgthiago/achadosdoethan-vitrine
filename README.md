# Achados do Ethan — Vitrine

Vitrine React hospedada no Cloudflare Workers.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build e testes

```bash
npm test
npm run build
```

## Deploy

```bash
npm run deploy
```

## Automação diária de conteúdo

A automação em `.github/workflows/automation-daily.yml` executa diariamente às 10:00 no horário de Fortaleza (13:00 UTC).

Fluxo:

1. lê `src/data/products.json`;
2. filtra produtos com preço, foto e link;
3. pontua ofertas, descontos, itens novos, mais vendidos e preços baixos;
4. seleciona 3 candidatos;
5. envia os candidatos ao Cloudflare Workers AI;
6. a IA escolhe 1 produto principal e gera Reel, legenda, CTA, hashtags e 3 Stories;
7. os resultados ficam disponíveis como artefatos do GitHub Actions por 14 dias.

### Secrets necessários no GitHub

Em **Settings → Secrets and variables → Actions**, crie estes Repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_TOKEN`

Nunca salve o token diretamente no código, em commits ou em arquivos do repositório.

### Modelo padrão

`@cf/meta/llama-3.3-70b-instruct-fp8-fast`

O modelo pode ser trocado pela variável `CLOUDFLARE_AI_MODEL` no workflow.

### Segurança

A chamada de IA não roda em eventos de Pull Request. No PR, apenas a seleção local é validada. O Workers AI só é chamado em execução manual ou agendada depois que o workflow estiver no branch padrão e os Secrets estiverem configurados.
