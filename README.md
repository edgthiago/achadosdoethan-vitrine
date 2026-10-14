# Vitrine Achados do Ethan

Site estático com seis produtos e links de afiliado.

## Conectar ao Worker existente

No painel da Cloudflare, abra o Worker `achadosdoethan`, vá a Settings > Builds e conecte este repositório do GitHub.

- Branch de produção: `main`
- Diretório raiz: `/`
- Comando de build: deixar vazio
- Comando de deploy: `npx wrangler deploy`

O nome do Worker e o nome em `wrangler.json` devem ser iguais. Autorize somente o repositório desta vitrine na integração do GitHub.

## Atualizações

Os arquivos públicos ficam em `public/`. Alterações enviadas à branch de produção disparam a publicação da Cloudflare após a conexão estar ativa. Confira o primeiro build e o endereço publicado antes de considerar a automação validada.

Não inclua senhas ou tokens nos arquivos. Preserve os links de afiliado e só publique preços e características confirmados.
