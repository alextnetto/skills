# Como escrever o roteiro

O roteiro mora em `roteiro/` dentro da pasta do vídeo. `roteiro/index.js` lista os capítulos em ordem; cada capítulo é um arquivo que exporta uma lista de cenas. O exemplo que vem no modelo ("Como este vídeo foi feito") usa quase todos os recursos: leia-o antes de escrever o seu e substitua os arquivos.

```js
// roteiro/index.js
import abertura from './0-abertura.js';
import mercado from './1-mercado.js';
export const CAPITULOS = [
  { titulo: 'Abertura', cenas: abertura },
  { titulo: 'O mercado', cenas: mercado },
];
```

## Regras de texto (para o ouvido)

| Regra | Por quê |
|---|---|
| Cerca de 150 palavras por minuto de vídeo: 3 min ≈ 450, 5 min ≈ 750, 10 min ≈ 1.500 | É o ritmo das vozes com as pausas entre cenas |
| Cena de 15 a 40 segundos (40 a 100 palavras), uma ideia por cena | Cena longa fica com tela parada |
| Frases curtas, com ponto. Evite parênteses e listas longas na fala | A voz lê parênteses sem mudar o tom |
| Todo termo técnico é explicado na primeira vez: cartão `term` na tela e uma comparação do dia a dia na fala | O público é leigo inteligente |
| Números, datas, valores e siglas aparecem na tela como se escreve e na fala como se fala: `{R$ 200 mil|duzentos mil reais}` | A voz erra algarismos e siglas |
| Algo novo entra na tela a cada 5 a 8 segundos de fala | Tela parada perde a atenção |
| Fato com número, lei ou data só entra se estiver em `docs/fatos.md` com fonte; estimativa aparece como estimativa | Corrigir depois de narrar custa o dobro |
| Cena com número ou dado de terceiros leva `foot` com a fonte | O espectador pode conferir |

### Marcação `{tela|fala}`

O que está antes da barra aparece na legenda; o que está depois é o que a voz fala.

| Na fala do roteiro | A voz fala | A legenda mostra |
|---|---|---|
| `{R$ 1.220|mil duzentos e vinte reais}` | mil duzentos e vinte reais | R$ 1.220 |
| `{48,8%|quarenta e oito vírgula oito por cento}` | quarenta e oito vírgula oito por cento | 48,8% |
| `{01/12/2026|primeiro de dezembro de dois mil e vinte e seis}` | primeiro de dezembro... | 01/12/2026 |
| `{INSS|i ene ésse ésse}` | i ene ésse ésse | INSS |
| `{FIDC|fídique}` | fídique | FIDC |
| `{IA|i a}` | i a | IA |

Siglas que viraram palavra (Pix, Detran, Petrobras) podem ficar como estão. Na dúvida, gere uma amostra: `npm run vozes -- --amostra <voz>` com a frase trocada, ou deixe o `npm run revisar` apontar.

## Estrutura de um vídeo

1. **Abertura** (1 ou 2 cenas): uma frase de gancho (por que isso importa), a promessa (o que a pessoa vai saber no fim) e, se ajudar, um caso condutor.
2. **Capítulos**: cada um abre com uma cena `card` curta ("Primeiro, a máquina.") e tem de 2 a 6 cenas.
3. **Fechamento**: uma cena com `recap` ("Em uma frase") e o próximo passo.

**Caso condutor** (opcional, recomendado para negócios): uma empresa ou pessoa fictícia que atravessa o vídeo ("a Padaria Aurora quer..."). Cenas com `layout: 'ficha'` mostram um painel lateral que vai sendo preenchido. Configure `ficha` em `video.config.js` e marque o caso como ilustrativo no `foot`.

## Uma cena

```js
{
  id: 'c1s2',                        // único; padrão: c<capítulo>s<cena>
  layout: 'full',                    // 'full' (padrão), 'ficha' (painel à direita) ou 'card' (composição centralizada, sem título)
  title: 'A contemplação',           // título no alto da tela (opcional)
  kicker: 'Passo 2',                 // texto pequeno acima do título (opcional)
  fala: 'Todo mês, o grupo junta {R$ 1 milhão|um milhão de reais}...',
  items: [ /* o que aparece na tela, ver catálogo abaixo */ ],
  term: [{ term: 'lance', def: 'Oferta para antecipar parcelas...', at: '@por lance', until: '@lance embutido' }],
  recap: { text: 'A administradora é a síndica.', at: '@so com a taxa' }, // faixa "Em uma frase" no fim da cena
  foot: 'Fonte: Banco Central, junho de 2026',   // uma linha, no rodapé
  ficha: [{ kind: 'field', label: 'Prazo', value: '200 meses', at: '@duzentos meses' }, { kind: 'stamp', label: 'Licença', at: '@autorizada' }],
  continues: false,                  // true: sem transição, continua a imagem da cena anterior (repita o mesmo title)
  lead: 0.25, tail: 0.5,             // silêncio antes e depois da fala, em segundos
}
```

- **Abertura de capítulo**: `{ id: 'c2s0', layout: 'card', card: { n: 2, title: 'O mercado' }, fala: 'Agora, o mercado.' }`.
- **`term`**: um cartão por vez, na faixa de baixo. Com mais de um termo na cena, use `until` no primeiro. Some sozinho antes do `recap`.
- **`ficha`**: só em cenas com `layout: 'ficha'`. `field` é um par rótulo e valor; `stamp` é um item com check. Cada rótulo aparece uma vez no vídeo inteiro (o painel reserva um lugar fixo para cada um) e o painel comporta cerca de 9 campos e 6 carimbos no total. Em cenas `ficha`, o `foot` tem cerca de 100 caracteres.

## Quando cada coisa entra: `at`

| Valor | Significado |
|---|---|
| `'@duzentos mil reais'` | quando a voz diz essa frase (sem diferença de acento ou maiúscula) |
| `'@lance#2'` | na segunda vez que a voz diz "lance" |
| `'@cada capitulo+0.3'` | 0,3 s depois da frase |
| `1.2` | 1,2 s depois do início da cena |
| `-1` | já está na tela quando a cena começa (use com `continues`) |

A frase do gatilho vem da **fala falada**, depois da marcação: com `{R$ 200 mil|duzentos mil reais}`, o gatilho é `'@duzentos mil reais'`, nunca `'@R$ 200 mil'`. `out` faz o item sair; `until` faz o cartão de termo sair. `npm run validar` acusa gatilho que não existe na fala.

## A tela (1920 x 1080)

```
y   74 a 200    título (e kicker)
y  240 a 780    conteúdo. full: x 120 a 1800. ficha: x 120 a 1290 (painel em x 1350 a 1800)
y  806 a 930    faixa de baixo: cartão de termo ou "Em uma frase" (deixe o conteúdo acima de y 790 se a cena tiver term ou recap)
y  958          rodapé (foot)
y 1000+         capítulo e barra de progresso (automáticos)
```

- Duas colunas: `x: 120, w: 800` e `x: 1000, w: 800`. Três: `x` 120, 700, 1280 com `w: 520`. Quatro blocos em linha: `x` 120, 560, 1000, 1440 com `w: 360`.
- Tamanhos: título de abertura 90 a 100; frase de destaque 44 a 56; texto corrido 32 a 38; nada abaixo de 24.
- `npm run checar` acusa texto estourando a caixa, itens encostados, coisas fora da área segura, cena que fica só com o título por mais de 4 s e trechos de mais de 12 s sem nada novo na tela. Corrija mudando `x`, `y`, `w`, `h`, `size` ou o `at`, ou dividindo a cena em duas. Rode de novo depois de narrar: com a voz de verdade os tempos mudam.

## Catálogo de itens

Todos usam coordenadas em pixels (`x`, `y`, `w`, às vezes `h`) e `at`. Tons (`tone`): `ink` (azul), `accent` (laranja), `muted` (cinza), e em alguns itens `ghost`, `warn`, `gold`, `slate`. Em textos, `*palavra*` sai destacada na cor de acento.

| Tipo | Para quê | Campos |
|---|---|---|
| `text` | frase solta, título de abertura, conclusão | `text`, `size` (40), `font` (`serif`, `sans`, `mono`), `weight`, `color` (`text`, `muted`, `accent`, `ink`), `align`, `italic`, `lh`, `out` |
| `rule` | linha que se desenha | `x`, `y`, `w` |
| `node` | caixa de um diagrama | `id`, `h`, `label`, `sub`, `tone` (`ink`, `accent`, `muted`, `ghost`), `out` |
| `edge` | seta entre caixas (declare depois delas) | `from`, `to`, `label`, `dashed`, `bend` (curva, em px) |
| `group` | moldura tracejada em volta de caixas (declare antes delas) | `h`, `label`, `tone` |
| `emph` | pulso de destaque numa caixa | `target`, `dur` |
| `strike` | risca uma caixa | `target` |
| `list` | lista que entra item a item | `size` (36), `gap` (20), `marker` (`dash`, `num`, `check`, `none`), `columns`, `items: [{ text, sub, tone, at }]` |
| `table` | tabela que entra linha a linha | `size` (30), `headAt`, `cols: [{ label, w (peso relativo), align }]`, `rows: [{ cells: [...], tone, at }]` |
| `code` | caixa monoespaçada: contas, trechos, linhas de cálculo | `size` (30), `title`, `tone`, `lines: [{ text, tone, at }]`, `strikeAt` |
| `big` | número grande que conta até o valor | `value`, `decimals`, `prefix`, `suffix`, `from`, `label`, `size` (200), `countDur` |
| `doc` | cartão de documento: recibo, nota, ficha, pedido | `title`, `lines: [{ l, r, note, tone, at }]` |
| `image` | imagem da pasta `midia/` (logo, print, foto, gráfico pronto) | `h`, `src: 'midia/arquivo.png'`, `fit` (`contain`, `cover`), `frame`, `caption`, `pop`, `out` |
| `timeline` | linha do tempo com marcos | `at`, `startLabel`, `endLabel`, `points: [{ pos (0 a 1), date, label: 'linha 1|linha 2', side ('up', 'down'), tone, at }]` |
| `hbars` | barras horizontais na mesma escala | `max`, `labelW`, `rowH`, `rows: [{ label, note, value, display, tone, at }]` |
| `bars` | colunas empilhadas por ano ou categoria | `h`, `max`, `ticks`, `tickFmt` ('R$ # mi'), `series: [{ name, tone }]`, `years: [{ label, values: [...], totalLabel, at }]` |
| `jbars` | barras em volta do zero (caixa acumulado, lucro e prejuízo) | `h`, `min`, `max`, `ticks`, `tickFmt`, `caption`, `bars: [{ label, value, display, tone, at }]` |
| `meter` | barra contra um limite | `max`, `mark`, `markLabel`, `markAt`, `value`, `valueLabel`, `valueAt`, `overLabel`, `overAt` |
| `range` | faixas de mínimo a máximo (marcas a cada 50) | `max`, `unit`, `rows: [{ label, note, lo, hi, tone, at }]` |
| `tower` | camadas que se somam com total corrente | `h`, `max`, `towerW`, `caption`, `prefix`, `suffix`, `round`, `layers: [{ label, value, display, note, tone, at }]` |
| `tranches` | pilha de capital com perdas subindo de baixo | `h`, `stackW`, `layers: [{ label, pct, pctLabel, note, tone, at }]`, `losses: [{ pct, label: 'perda de #%', at }]` |

### Exemplos curtos

```js
// fluxo com setas
{ type: 'node', id: 'a', x: 120, y: 300, w: 380, h: 130, label: 'Cliente', sub: 'paga no Pix', at: '@o cliente' },
{ type: 'node', id: 'b', x: 760, y: 300, w: 400, h: 130, label: 'Banco', tone: 'accent', at: '@o banco' },
{ type: 'edge', from: 'a', to: 'b', label: 'ordem de pagamento', at: '@o banco+0.3' },

// número de impacto
{ type: 'big', x: 1000, y: 300, w: 800, value: 48.8, decimals: 1, suffix: '%', label: 'das cotas são de desistentes', size: 150, at: '@quase metade' },

// conta passo a passo
{ type: 'code', x: 120, y: 270, w: 800, size: 34, title: 'A conta', lines: [
  { text: '  1.000 clientes', at: '@mil clientes' },
  { text: '× R$ 50 por mês', at: '@cinquenta reais' },
  { text: '= R$ 50 mil por mês', at: '@cinquenta mil', tone: 'accent' },
] },

// imagem (coloque o arquivo em midia/)
{ type: 'image', x: 1000, y: 260, w: 800, h: 480, src: 'midia/painel.png', frame: true, caption: 'Tela do sistema', at: '@a tela' },
```

## Depois de escrever

1. `npm run validar`: ids, falas e gatilhos.
2. `npm run previa`: verificador de layout e folhas de contato em `trabalho/folhas/`. Abra cada folha e olhe de verdade: tela vazia por muito tempo, texto miúdo, coisas tortas.
3. Ajuste e repita até ficar limpo. Só então narre.
