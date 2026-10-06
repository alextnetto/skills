# Vozes: qual escolher e como pegar a chave

Conferido em outubro de 2026. Preços e planos mudam; na dúvida, confira o site do serviço.

| Opção | Qualidade em português | Custo | Tempo de cada palavra | Para quem |
|---|---|---|---|---|
| **ElevenLabs** (`elevenlabs`) | a mais natural, com vozes brasileiras | plano Starter: US$ 6/mês, 30 mil créditos (cerca de 30 min de narração por mês). O primeiro mês costuma sair por US$ 1 | exato | quem quer o melhor resultado |
| **Google Gemini** (`gemini`) | boa | grátis com limite diário de pedidos; sem cartão | estimado pelas pausas | quem quer começar de graça |
| **OpenAI** (`openai`) | boa, com leve sotaque estrangeiro | pré-pago, mínimo US$ 5; cerca de US$ 0,02 por minuto | estimado pelas pausas | quem já tem conta na OpenAI |
| **Voz do computador** (`local`) | robótica | grátis, sem cadastro, sem internet | estimado pelas pausas | rascunho e teste; macOS e Windows |

"Estimado pelas pausas" funciona bem: nos testes, a diferença para o tempo real ficou abaixo de 0,1 s na metade das palavras e abaixo de 0,3 s em 90% delas. O usuário não precisa fazer nada.

**Atenção ao plano grátis do ElevenLabs:** contas criadas a partir de março de 2026 não conseguem usar vozes pela API no plano grátis. Para este uso, considere o ElevenLabs como pago. No plano grátis, além disso, o vídeo não pode ter uso comercial e precisa citar "elevenlabs.io".

## Onde a chave fica guardada

Num arquivo só, que vale para todos os vídeos do usuário:

- macOS e Linux: `~/.config/video-explicativo/chaves.env`
- Windows: `C:\Users\<usuário>\.config\video-explicativo\chaves.env`

Uma linha por chave:

```
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
```

Também funcionam uma variável de ambiente com o mesmo nome ou um arquivo `.env` na pasta do vídeo. Nunca ponha a chave em `video.config.js` nem em arquivos do roteiro.

**Como receber a chave do usuário.** Duas formas; ofereça as duas e deixe a pessoa escolher:

1. **Colar no chat** (mais fácil): ela cola a chave na conversa e você grava o arquivo acima. Não repita a chave nas suas respostas. Avise que a chave fica no histórico da conversa e que, por isso, vale criar uma chave só para isso, com limite de gasto.
2. **Colar no arquivo** (mais reservado): você cria o arquivo com a linha `NOME_DA_CHAVE=` e abre no editor de texto (macOS: `open -e <arquivo>`; Windows: `notepad <arquivo>`). Ela cola a chave depois do `=`, salva e avisa.

Depois, rode `npm run verificar` para confirmar.

## ElevenLabs, passo a passo

1. Criar conta em https://elevenlabs.io (entrar com Google é o mais rápido).
2. Assinar o Starter em https://elevenlabs.io/app/subscription.
3. Criar a chave em https://elevenlabs.io/app/settings/api-keys, botão **Create API Key**:
   - **Name**: `video-explicativo`.
   - Deixe **Restrict Key** ligado. Dê acesso (**Access**) a **Text to Speech** e **Speech to Text**; leitura (**Read**) em **Voices** e **User**. Sem Voices e User a narração funciona, mas a ferramenta não consegue escolher a voz sozinha nem ver o saldo.
   - Opcional: em **Credit Limit**, um teto mensal.
   - **Create Key** e copie a chave na hora (ela começa com `sk_` e só aparece uma vez).
4. Escolher uma voz brasileira: em https://elevenlabs.io/app/voice-library, filtre o idioma Portuguese e o sotaque Brazilian, ouça algumas e adicione a escolhida às suas vozes (botão de adicionar). Com `voz.id: null` no `video.config.js`, a ferramenta usa sozinha uma voz brasileira da conta. Para fixar uma voz, rode `npm run vozes`, copie o id e ponha em `voz.id`.

Modelos (`voz.modelo`): `eleven_multilingual_v2` (padrão, estável e testado), `eleven_v4` (mais expressivo e mais lento; não aceita `velocidade`), `eleven_flash_v2_5` (metade do custo, um pouco menos natural). Todos devolvem o tempo exato de cada letra.

## Google Gemini, passo a passo

1. Entrar em https://aistudio.google.com/apikey com a conta Google e aceitar os termos.
2. **Create API key**. Se pedir um projeto, aceite o projeto padrão que ele oferece.
3. Copiar a chave (começa com `AIza`).

Não precisa de cartão. O plano grátis tem limite de pedidos por dia (um pedido por cena); se acabar, `npm run narrar` avisa e retoma de onde parou no dia seguinte. No plano grátis o Google pode usar os dados enviados para melhorar os produtos dele; não use para roteiro confidencial.

Vozes: `npm run vozes -- --provedor gemini` lista as 30 opções. Boas para explicação: `Charon` (padrão, informativa), `Kore` (firme), `Iapetus` (clara), `Sadaltager` (conhecedora), `Achird` (amigável), `Sulafat` (calorosa). Modelo padrão: `gemini-3.8-flash-tts`.

## OpenAI, passo a passo

1. Entrar em https://platform.openai.com com a conta.
2. Adicionar crédito em **Settings > Billing** (mínimo de US$ 5). Sem crédito a API recusa.
3. Criar a chave em https://platform.openai.com/api-keys, **Create new secret key**, e copiar (começa com `sk-`).

Vozes: `marin` (padrão) e `cedar` são as recomendadas; `npm run vozes -- --provedor openai` lista as 13. O modelo `gpt-4o-mini-tts` recebe uma instrução de sotaque e tom (`voz.instrucoes` no `video.config.js` troca a instrução padrão).

## Voz do computador

- **macOS**: já vem com a Luciana. Para vozes melhores, em Ajustes do Sistema > Acessibilidade > Conteúdo Falado > Voz do Sistema > Gerenciar Vozes, baixe as vozes "Português (Brasil)" com qualidade aprimorada. `npm run vozes` mostra as instaladas.
- **Windows**: usa as vozes do sistema em português (por exemplo, Maria). Se não houver, instale o pacote de fala em português em Configurações > Hora e idioma > Fala.

## Escolher entre vozes

`npm run vozes -- --amostra <id1>,<id2>` grava uma frase de teste com cada voz em `amostras/` e abre a primeira. Mande os arquivos para o usuário ouvir e escolher; grave a escolhida em `voz.id`.

## Ajustar o ritmo

- `ritmo` no `video.config.js` acelera a narração inteira na montagem sem mudar o tom (1,05 = 5% mais rápido). Funciona com qualquer voz. Depois de mudar, rode `npm run renderizar` e `npm run montar` (a narração não precisa ser refeita).
- `voz.velocidade` muda a velocidade na própria voz (ElevenLabs de 0,7 a 1,2; OpenAI e voz do computador também aceitam). Exige narrar de novo.
- Referência: entre 140 e 160 palavras por minuto soa natural para explicação. `npm run narrar` mostra a velocidade no fim.
