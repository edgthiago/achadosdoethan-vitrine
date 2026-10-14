# Vitrine Achados do Ethan

Site estático com seis produtos e links de afiliado.

## Cloudflare

Conecte este repositório ao novo Worker `achadosdoethan-vitrine`.

- Nome do projeto: `achadosdoethan-vitrine`
- Branch de produção: `main`
- Diretório raiz: `/`
- Comando de build: deixar vazio
- Comando de deploy: `npx wrangler deploy`
- Preview builds: pode deixar desativado durante a configuração inicial
- Cloudflare Access: desativado para acesso público à vitrine

O nome do projeto deve corresponder ao nome em `wrangler.json`. Confira o primeiro deploy e a URL exibida pela Cloudflare antes de substituir o link do Instagram.

## Atualizações

Os arquivos públicos ficam em `public/`. Atualizações da branch de produção disparam a publicação quando a conexão Git estiver ativa. Valide o fluxo com uma atualização e a leitura da página publicada.

Não inclua senhas ou tokens no repositório. Preserve os links de afiliado e use somente informações confirmadas.
