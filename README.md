# Atlas View

Explorador de imagens de satélite e aéreas para consultar uma localização, comparar datas e visualizar o detalhe disponível em diferentes acervos. A interface está em português e permite selecionar um ponto, informar coordenadas ou desenhar uma área no mapa.

**Autor:** Dumar Castilho - https://github.com/dumarcastilho

## Funcionalidades

- Busca por latitude e longitude em graus decimais ou por retângulo.
- Seleção de fonte, período e cena; resultados de captura ordenados por data.
- Visualização por blocos do mapa, sem baixar o GeoTIFF inteiro para navegar.
- Data, resolução e créditos da imagem selecionada.
- Controle de opacidade, reposicionamento e nova tentativa de carregamento.
- Links para os arquivos disponibilizados pelos provedores.
- Painel recolhível e layout adaptado a celular.

| Acervo | Visualização | Características |
| --- | --- | --- |
| CBERS-4A / WPM, via INPE | RGB fusionado, 2 m | Combina detalhes pancromáticos de 2 m com cores de 8 m. |
| Sentinel-2, via INPE | Cores naturais, 10 m | Cenas selecionáveis por captura. |
| Landsat Collection 2, via INPE | Composição RGB, 30 m | Combina as bandas vermelha, verde e azul para visualização. |
| Esri World Imagery | Mosaico contínuo | Resolução e captura variam; os metadados consultados se referem ao centro do mapa na escala atual. |
| Esri Wayback | Histórico de mosaicos | A data de publicação da versão não equivale à data de captura das imagens. |
| OpenAerialMap | Levantamentos aéreos e de drones | Cobertura localizada e atualização irregular; captura e resolução declaradas pelos produtores. |

A opção de busca combinada reúne CBERS, Sentinel-2 e Landsat. Os demais acervos são consultados individualmente. Cenas nubladas continuam disponíveis.

## Requisitos

- Node.js 22 ou superior e npm.
- Git para clonar o repositório.
- Navegador atualizado e acesso à internet.

Não há dependências npm de execução nem arquivo `.env` obrigatório. Leaflet, Leaflet.draw e as fontes tipográficas são carregados por serviços externos. As consultas usam os endpoints públicos declarados no código; a disponibilidade continua sujeita aos provedores.

## Executar localmente

```sh
git clone https://github.com/dumarcastilho/atlas-view.git
cd atlas-view
npm run dev
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Interrompa com `Ctrl+C`.

O comando gera o build e inicia o servidor local. Não há recarga automática: após editar o código, encerre e execute novamente `npm run dev`.

Para usar um build já gerado:

```sh
npm run build
npm start
```

Não abra `web/index.html` diretamente nem use apenas um servidor estático: a busca OpenAerialMap utiliza a rota `/api/aerial` na mesma origem da aplicação.

### Porta e endereço de escuta

`PORT` altera a porta; `HOST` altera o endereço de escuta. O padrão é `127.0.0.1:4173`.

macOS/Linux:

```sh
PORT=4180 npm run dev
```

PowerShell:

```powershell
$env:PORT = "4180"
npm run dev
```

O servidor Node incluído é voltado ao desenvolvimento e à verificação local. Para publicação, configure HTTPS e os controles de acesso apropriados ao seu ambiente.

## Usar o mapa

1. Escolha a fonte.
2. Informe latitude e longitude com ponto decimal, nessa ordem, separadas por vírgula; ou use **Selecionar ponto** / **Desenhar área**.
3. Defina o período quando a fonte permitir e clique no botão de consulta.
4. Selecione uma captura ou versão histórica e navegue no mapa.

As coordenadas iniciais apontam para Brasília como referência geográfica pública. A entrada de coordenadas é limitada ao Brasil e áreas próximas. As buscas aceitam áreas de até 5 graus por eixo. Ampliação de zoom não aumenta a resolução original da imagem.

## Desenvolvimento e verificação

```sh
npm run check
npm test
```

Os testes usam dados sintéticos e respostas simuladas. Verificam a entrega dos recursos, a validação da consulta aérea, o destino permitido e o tratamento de indisponibilidade, sem depender de contas ou das APIs externas. Não verificam cobertura real, renderização visual ou disponibilidade dos provedores.

```text
web/                  interface, estilos e consultas no navegador
worker/index.js       rotas HTTP e consulta ao catálogo OpenAerialMap
scripts/build.mjs     incorpora os recursos no módulo Worker
scripts/serve.mjs     adapta o Worker para desenvolvimento em Node.js
scripts/dev.mjs       gera o build e inicia o servidor
test/                testes com dados sintéticos
wrangler.jsonc        configuração reutilizável para Cloudflare Workers
```

O build é gerado em `dist/server/index.js`. A interface é escrita em HTML, CSS e JavaScript, com Leaflet. CBERS, Sentinel, Landsat e Esri são acessados pelo navegador. O catálogo OpenAerialMap é consultado pelo servidor, evitando a restrição de CORS da API; as imagens continuam sendo carregadas do provedor.

### API aérea

`GET /api/aerial` aceita:

| Parâmetro | Uso |
| --- | --- |
| `bbox` | `oeste,sul,leste,norte` em graus decimais, até 5 graus por eixo. |
| `page` | Página de 1 a 20; padrão 1, com até 100 registros por página. |
| `acquisition_from` | Data inicial opcional em formato reconhecido por `Date.parse`, preferencialmente ISO 8601. |

O destino externo é fixo em `https://api.openaerialmap.org/meta`; a rota não aceita um servidor de destino fornecido pelo cliente. As respostas expõem os metadados necessários à interface, sem campos de contato dos produtores. Parâmetros inválidos retornam `400`; falhas do catálogo retornam `502`.

## Hospedar em Cloudflare Workers

Há uma configuração em `wrangler.jsonc`. Defina seu próprio nome de Worker no campo `name`; uma conta Cloudflare e a autenticação do Wrangler são necessárias. O projeto não contém identificadores de conta nem credenciais.

Com o Wrangler disponível no seu ambiente:

```sh
npm run build
npx wrangler login
npx wrangler deploy
```

O módulo Worker entrega os recursos e a API na mesma origem. Consulte a [documentação de configuração do Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/) para domínio, limites e controles do seu ambiente. O projeto não configura publicação automática a partir do GitHub.

## Limitações e solução de problemas

- **Busca aérea sem resultados:** amplie a área ou consulte todo o acervo. O OpenAerialMap não cobre todas as cidades.
- **Blocos não carregados:** tente recarregar ou selecionar outra captura. Há uma tentativa automática adicional por bloco, mas falhas, áreas sem dados e restrições do provedor podem persistir.
- **Muitas cenas:** reduza período ou área. A busca STAC limita a paginação a 30 páginas por coleção; o catálogo aéreo consulta até 20 páginas e pode interromper após reunir imagens suficientes para os resultados exibidos.
- **Imagem desfocada:** compare a resolução por pixel. Sentinel e Landsat têm menos detalhe espacial que CBERS-4A; mosaicos também variam por local.
- **Esri sem data:** os metadados podem não estar disponíveis na posição ou escala consultada. A data de publicação do Wayback deve ser interpretada separadamente da captura.
- **GeoTIFF grande:** o download original pode ocupar vários gigabytes. Use um visualizador geoespacial para abri-lo.
- **Fonte ou mapa ausente:** confira conectividade e bloqueadores de conteúdo. A interface depende de bibliotecas, fontes, APIs e blocos de imagem externos.

O código não contém autenticação própria, persistência de pesquisas ou limitação de requisições por visitante. Antes de expor a aplicação a terceiros, configure autenticação e limites na hospedagem conforme seu uso. Coordenadas e regiões consultadas são enviadas aos provedores envolvidos na busca ou visualização. Não use a interface para informações que você não deseja compartilhar com esses serviços.

## Licença e créditos

Código do Atlas View sob a [licença MIT](LICENSE), de **Dumar Castilho - https://github.com/dumarcastilho**.

As bibliotecas, fontes, mapas, imagens e metadados de terceiros seguem suas próprias licenças e condições. A licença MIT do aplicativo não concede direitos adicionais sobre esses dados. Veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) e preserve os créditos exibidos no mapa.
