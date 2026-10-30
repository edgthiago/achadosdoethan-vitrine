# Automação v1 — Achados do Ethan

Objetivo: criar uma primeira camada de automação sem alterar a vitrine publicada.

## Etapa atual

1. Ler `src/data/products.json`.
2. Filtrar produtos com título, preço, imagem e link de afiliado.
3. Priorizar:
   - mais vendidos;
   - ofertas;
   - descontos maiores;
   - produtos até R$ 50;
   - produtos novos.
4. Selecionar 3 candidatos por execução.
5. Gerar `automation/output/candidates.json`.
6. Salvar o resultado como artefato do GitHub Actions.

## Execução

Manual:

```bash
node scripts/automation/select-products.mjs
```

Variáveis opcionais:

```bash
MAX_CANDIDATES=3 MAX_PRICE=80 node scripts/automation/select-products.mjs
```

## Agendamento

O workflow `.github/workflows/automation-daily.yml` está preparado para rodar diariamente às 10:00 no horário de Fortaleza (13:00 UTC), além de permitir execução manual.

O agendamento só passa a funcionar quando o workflow estiver no branch padrão (`main`).

## Próxima etapa

Adicionar uma camada de IA para transformar os 3 produtos escolhidos em um pacote de conteúdo estruturado contendo:

- produto principal do dia;
- gancho de Reel;
- roteiro curto;
- legenda;
- CTA;
- hashtags;
- textos para Stories;
- justificativa da escolha.

A integração de IA deve usar segredo no GitHub/Cloudflare. Nenhuma chave deve ser salva no repositório.
