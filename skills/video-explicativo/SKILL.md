---
name: video-explicativo
description: Use quando alguém pedir um vídeo explicativo narrado sobre um assunto, uma pesquisa, um relatório, um conceito ou um negócio ("faz um vídeo explicando…", "transforma essa pesquisa em vídeo", "vídeo de 5 minutos sobre…", "explainer narrado"), ou quando precisar instalar, escolher a voz (ElevenLabs, Gemini, OpenAI, voz do computador), pegar chave de API ou corrigir um vídeo feito com esta skill.
compatibility: Requer Claude Code local (terminal ou aba Code do app desktop) ou outro agente com terminal, Node 18 ou mais novo e internet. Não funciona no chat do claude.ai.
---

# Vídeo explicativo narrado

Faz um vídeo 16:9 (1920x1080) narrado em português do Brasil: roteiro em cenas, voz sintética, animações que entram junto com a fala, legenda `.srt` e uma versão leve para compartilhar. Tudo por código, sem editor de vídeo.

O usuário típico **não é técnico**. Você roda todos os comandos e resolve os problemas; ele escolhe o assunto, aprova o roteiro e assiste. A pasta onde está este SKILL.md é a **pasta da skill**; o modelo de projeto fica em `modelo/` dentro dela.

## Princípios

- **Faça você.** Nunca peça ao usuário para abrir terminal, editar arquivo ou rodar comando que você mesmo pode rodar. A única coisa que ele faz por conta própria é criar conta e chave no site da voz, e isso você guia passo a passo.
- **Pergunte pouco.** No máximo uma rodada de perguntas, e só sobre o que muda o vídeo. Use os padrões abaixo e diga quais usou.
- **Fale simples.** Mensagens curtas, sem jargão: o que está acontecendo, quanto falta e o próximo passo.
- **Confira os fatos antes de narrar.** Narrar custa crédito; corrigir depois custa o dobro.
- **Chave de API é segredo.** Nunca repita uma chave na resposta nem a grave fora do arquivo de chaves.

## Fluxo

Crie uma tarefa para cada etapa e siga na ordem.

### 1. Preparar (uma vez por computador; depois só confere)

1. Crie a pasta do vídeo a partir do modelo:
   `node "<pasta da skill>/modelo/ferramentas/novo.mjs" "<destino>" --titulo "<título>" --provedor <voz>`
   Destino: uma subpasta com o nome do tema dentro da pasta de trabalho atual. Se a pasta atual for a pasta pessoal do usuário (home), use `~/videos-explicativos/<tema>`.
2. Dentro da pasta: `npm install`. Na primeira vez baixa cerca de 150 MB (ffmpeg e o navegador que desenha os quadros) e leva alguns minutos; avise o usuário.
3. `npm run verificar` e resolva cada ❌ na ordem que aparece. Sem Node: veja `referencia/problemas.md`.
4. **Voz.** Se o `verificar` acusar falta de chave, faça uma pergunta só, com estas opções:
   - **A melhor voz** → ElevenLabs (US$ 6/mês; o primeiro mês costuma sair por US$ 1). Recomendada.
   - **De graça** → Google Gemini (chave grátis, sem cartão, com limite por dia).
   - **Já uso OpenAI** → OpenAI (pré-pago, mínimo US$ 5).
   - **Só testar agora** → voz do computador (grátis, robótica).

   Guie a criação da chave com o passo a passo de `referencia/vozes.md`; abra o link para a pessoa (`open <url>` no macOS, `start <url>` no Windows). Ofereça as duas formas de entregar a chave descritas lá. Grave a escolha em `voz.provedor` no `video.config.js`. **Não espere parado:** enquanto a pessoa cria a chave, siga com as etapas 2 a 5, que não usam voz.

### 2. Entender o pedido

| Item | Padrão se o usuário não disser |
|---|---|
| Duração | 3 a 5 minutos (450 a 750 palavras faladas) |
| Público | leigo inteligente: todo termo técnico explicado na primeira vez |
| Tom | consultor que explica com calma, frases curtas |
| Tema visual | `papel` (fundo claro); `noite` se pedir escuro |
| Base | o material que o usuário mandou (arquivo, link, texto) ou pesquisa sua |

Pergunte só se o assunto estiver ambíguo ("vídeo sobre IA": para quem e com que objetivo?). Se o usuário mandou material, leia tudo antes de escrever.

### 3. Pesquisar e conferir

Se o vídeo afirma fatos (números, leis, datas, preços, nomes), pesquise em fontes primárias e registre em `docs/fatos.md` cada afirmação com fonte (link) e a data em que conferiu. Fato sem fonte não entra na narração; estimativa aparece na tela como estimativa. Com material do usuário, use só ele e aponte o que parecer duvidoso.

### 4. Escrever o roteiro

**Obrigatório:** leia `referencia/roteiro.md` antes de escrever. Lá estão as regras de texto, a marcação `{tela|fala}`, os gatilhos `@frase`, a grade da tela e o catálogo de itens. Substitua os arquivos de exemplo em `roteiro/` pelos seus e ajuste `titulo`, `tema` e `ficha` em `video.config.js`. Rode `npm run validar` até dar ✅.

### 5. Prévia sem custo

`npm run previa` cria tempos provisórios, roda o verificador de layout e gera folhas de contato em `trabalho/folhas/`. Corrija todo ❌ e ⚠️ do verificador. Depois **abra e olhe cada folha** (são imagens): tela vazia por muito tempo, texto miúdo, item torto ou apertado. Repita até ficar limpo.

### 6. Aprovar com o usuário (uma vez)

Mostre em poucas linhas: título, capítulos (uma linha cada), duração estimada e custo (`npm run custo`), e mande uma folha de contato. Pergunte: "Posso gerar a narração?". Se o usuário já disse algo como "pode fazer tudo", pule esta etapa.

### 7. Narrar, desenhar e montar

1. `npm run narrar`. Só cenas novas ou alteradas são narradas. Com Gemini, OpenAI ou voz do computador, o tempo de cada palavra é estimado sozinho; não há nada a fazer.
2. `npm run checar` (agora com os tempos reais) e corrija o que aparecer.
3. `npm run renderizar`, depois `npm run folhas`, e olhe as folhas de novo.
4. `npm run montar` gera os arquivos em `saida/` e abre o vídeo.
5. `npm run revisar` confere o formato e, se houver chave com transcrição, compara o que a voz falou com o roteiro. Sigla ou número lido errado: corrija a fala com `{escrito|como se fala}` e rode `npm run video` (refaz só o que mudou).

Erros: `referencia/problemas.md`.

### 8. Entregar

Diga, em linguagem simples:
- onde está o vídeo (`saida/<nome>.mp4`) e a duração;
- a versão leve para WhatsApp e redes (`saida/<nome>-leve.mp4`);
- a legenda para YouTube e LinkedIn (`saida/<nome>.srt`), os capítulos para a descrição do YouTube (`saida/capitulos.txt`) e o roteiro (`saida/roteiro.md`);
- se usou ElevenLabs no plano grátis, que não pode haver uso comercial e é preciso citar "elevenlabs.io".

Ofereça dois ou três ajustes prováveis: voz um pouco mais rápida (`ritmo: 1.05`), fundo escuro (`tema: 'noite'`), trocar ou cortar uma cena. Para qualquer ajuste, edite e rode `npm run video`.

## Comandos (dentro da pasta do vídeo)

| Comando | O que faz | Gasta crédito? |
|---|---|---|
| `npm run verificar` | confere Node, pacotes, ffmpeg, navegador e chave | não |
| `npm run validar` | confere o roteiro (ids, falas, gatilhos, imagens) | não |
| `npm run custo` | duração estimada e custo em cada voz | não |
| `npm run vozes` | lista vozes; `-- --amostra id1,id2` grava amostras | só a amostra |
| `npm run previa` | tempos provisórios, verificador e folhas de contato | não |
| `npm run checar` | verificador de layout | não |
| `npm run folhas` | folhas de contato em `trabalho/folhas/` | não |
| `npm run narrar` | narração das cenas novas ou alteradas | sim |
| `npm run renderizar` | desenha as cenas; `-- --quadro c1s2@fim` tira uma foto | não |
| `npm run montar` | vídeo final, versão leve, legenda, capítulos, roteiro | não |
| `npm run revisar` | formato e conferência da fala pela transcrição | pouco |
| `npm run video` | validar, narrar, renderizar e montar em sequência | sim |

## Erros comuns

| Erro | Correção |
|---|---|
| Narrar antes de olhar a prévia | Sempre `npm run previa` e as folhas antes de `narrar` |
| Gatilho com algarismo (`'@200 mil'`) quando a fala diz "duzentos mil" | O gatilho copia a fala falada: `'@duzentos mil'` |
| Cena de 60 segundos com uma imagem só | Divida em cenas de 15 a 40 segundos |
| Confiar só no verificador | Ele não vê tela vazia nem composição feia; olhe as folhas |
| Pedir ao usuário para rodar comando ou editar arquivo | Rode você |
| Repetir a chave de API na resposta | Nunca; confirme só que ela foi salva |
