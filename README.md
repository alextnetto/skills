# Skills do Alex Netto

Ensine o Claude a fazer **vídeos explicativos narrados, em português**, sobre qualquer assunto. Você não precisa saber programar: você pede, o Claude faz.

![Quadros de um vídeo feito com a skill](assets/exemplo.jpg)

---

## Como instalar (3 passos, uns 5 minutos)

### Passo 1. Tenha o Claude no computador

1. Baixe o app do Claude em **[claude.com/download](https://claude.com/download)** (Mac ou Windows) e entre com a sua conta.
2. Você precisa de um **plano pago** (o Pro custa US$ 20 por mês). O plano grátis não inclui o **Claude Code**, que é a parte do Claude que consegue rodar programas no seu computador.
3. No app, clique na aba **Code** e escolha uma pasta para trabalhar (pode ser a pasta Documentos).

### Passo 2. Copie esta mensagem e cole no chat da aba Code

```
Instale as skills do Alex Netto (github.com/alextnetto/skills).
No Mac ou Linux, rode: curl -fsSL https://raw.githubusercontent.com/alextnetto/skills/main/instalar.sh | bash
No Windows, rode no PowerShell: irm https://raw.githubusercontent.com/alextnetto/skills/main/instalar.ps1 | iex
```

O Claude escolhe o comando certo para o seu computador e pede permissão para rodar. Clique em **permitir** (Allow). Em alguns segundos ele avisa que terminou.

### Passo 3. Abra uma conversa nova e peça o seu vídeo

Clique em **nova conversa** (assim o Claude com certeza enxerga a skill recém-instalada) e escreva, por exemplo:

```
Faz um vídeo explicativo de 3 minutos sobre como funciona o Pix, para donos de pequenas empresas.
```

Na primeira vez, o Claude prepara o computador sozinho e te ajuda a escolher a voz. Depois ele pesquisa, escreve o roteiro, mostra uma prévia e pergunta se pode gerar a narração. No fim, o vídeo abre na sua tela.

---

## O que você recebe

- O vídeo em alta qualidade (1920x1080, MP4).
- Uma versão leve, para mandar no WhatsApp e postar nas redes.
- A legenda (arquivo `.srt`), para YouTube e LinkedIn.
- Os capítulos, para colar na descrição do YouTube.
- O roteiro em texto.

## Quanto custa

Além do plano do Claude, o vídeo precisa de uma **voz**. Na primeira vez o Claude pergunta qual você prefere e te guia, passo a passo, para criar a chave de acesso.

| Voz | Como soa em português | Custo |
|---|---|---|
| ElevenLabs | a mais natural | US$ 6 por mês (o primeiro mês costuma sair por US$ 1) |
| Google Gemini | boa | grátis, com limite por dia, sem cartão |
| OpenAI | boa, com leve sotaque | pré-pago, a partir de US$ 5 |
| Voz do computador | robótica, serve para teste | grátis, sem cadastro |

---

## Perguntas frequentes

**O que é uma skill?**
Um pacote de instruções e ferramentas que ensina o Claude a fazer uma tarefa inteira, do começo ao fim. Depois de instalada, ela entra em ação sozinha quando você pede um vídeo.

**Preciso saber programar ou mexer no terminal?**
Não. Você só conversa com o Claude. Ele roda os comandos e resolve os problemas.

**Funciona no site claude.ai ou no app do celular?**
Não. Precisa do app no computador, na aba **Code**, porque a skill roda programas no seu computador para montar o vídeo.

**Funciona no Windows?**
Deve funcionar, mas foi testada no Mac. Se aparecer algum erro, copie a mensagem e cole no chat dizendo "deu esse erro, resolve".

**Como atualizo?**
Cole de novo a mensagem do Passo 2. Ela baixa a versão mais nova por cima da antiga.

**Como desinstalo?**
Peça ao Claude: "apague a pasta ~/.claude/skills/video-explicativo".

**Onde ficam os meus vídeos?**
Numa pasta com o nome do tema, dentro da pasta que você escolheu no Passo 1. O Claude diz o caminho exato no fim.

**Deu erro. E agora?**
Copie a mensagem de erro, cole no chat e peça para o Claude resolver. A maioria dos problemas comuns já tem solução descrita dentro da skill.

---

## Outras formas de instalar

**Sem rodar o instalador:** cole no chat

```
Baixe o repositório https://github.com/alextnetto/skills e copie cada pasta que está dentro de skills/ para ~/.claude/skills/. Depois confira se o arquivo ~/.claude/skills/video-explicativo/SKILL.md existe.
```

**Direto no Terminal** (Mac/Linux) ou no **PowerShell** (Windows): os mesmos comandos do Passo 2.

**Como plugin, pelo Claude Code no terminal** (recebe atualizações):

```
/plugin marketplace add alextnetto/skills
/plugin install video-explicativo@alextnetto
```

**Em outros agentes** (Codex, Cursor e outros):

```bash
npx skills add alextnetto/skills --skill video-explicativo
```

---

## Skills disponíveis

| Skill | O que faz |
|---|---|
| [`video-explicativo`](skills/video-explicativo) | Vídeo narrado sobre qualquer assunto ou pesquisa: roteiro, voz, animação que entra junto com a fala, legenda e versão leve para compartilhar |

Ideias de pedido:

- "Faz um vídeo de 3 minutos sobre o que é inflação, para adolescentes."
- "Transforma esse relatório em um vídeo narrado de 5 minutos." (e mande o arquivo junto)
- "Quero um vídeo explicando o nosso produto para clientes novos, com fundo escuro."

Para ajustar depois: "deixa a voz um pouco mais rápida", "troca a cena 3", "corta o capítulo 2".

---

## Para curiosos: como funciona por dentro

Cada vídeo vira uma pasta com o roteiro em JavaScript, um motor de animação em que tudo é função do tempo, e ferramentas em Node.

1. A voz narra cada cena e informa o momento exato de cada letra. Quando o serviço não informa (Gemini, OpenAI, voz do computador), a ferramenta estima pelas pausas do áudio. Nos testes, o erro ficou em 0,06 s na metade das palavras e abaixo de 0,3 s em 90% delas.
2. Cada elemento da tela entra quando a fala diz uma frase do roteiro.
3. Um navegador invisível (Chromium, via Playwright) desenha cada quadro. Antes disso, um verificador procura texto estourando a caixa, itens encostados e tela parada.
4. O ffmpeg junta som e imagem com sincronia exata e gera a legenda a partir dos mesmos tempos.

Detalhes: [`skills/video-explicativo/SKILL.md`](skills/video-explicativo/SKILL.md) e a pasta [`referencia/`](skills/video-explicativo/referencia).

## Para agentes de IA que estão instalando isto

Se um usuário pediu para instalar este repositório: no macOS ou Linux, rode `curl -fsSL https://raw.githubusercontent.com/alextnetto/skills/main/instalar.sh | bash`; no Windows, rode `irm https://raw.githubusercontent.com/alextnetto/skills/main/instalar.ps1 | iex` no PowerShell. O instalador copia cada pasta de `skills/` para `~/.claude/skills/` (e para `~/.agents/skills/` se houver Codex ou Gemini CLI), não pede senha e não instala outros programas. Depois, diga ao usuário para abrir uma conversa nova.

## Licença

MIT. As fontes (Crimson Text e IBM Plex, licença OFL) são baixadas pelo npm na instalação.
