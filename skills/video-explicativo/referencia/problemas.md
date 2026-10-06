# Problemas comuns

| Mensagem ou sintoma | O que fazer |
|---|---|
| `node: command not found` / "Node é antigo demais" | Instale o Node LTS. macOS com Homebrew: `brew install node`; Windows: `winget install OpenJS.NodeJS.LTS`; ou o instalador de https://nodejs.org. Depois abra uma sessão nova |
| "Pacotes não instalados" | `npm install` na pasta do vídeo |
| "Falta o navegador que desenha os quadros" | `npx playwright install --only-shell chromium` |
| "ffmpeg não encontrado" | `npm install` de novo (o pacote `ffmpeg-static` baixa o programa). Atrás de proxy corporativo o download pode falhar: instale o ffmpeg no sistema (`brew install ffmpeg` ou `winget install Gyan.FFmpeg`) |
| "Rode este comando dentro da pasta do vídeo" | Entre na pasta que tem `video.config.js` |
| "a frase "..." não aparece na fala" | O gatilho `@frase` precisa copiar um trecho da fala **falada** (depois da marcação `{tela\|fala}`). Números e siglas contam como são falados |
| "tipo de item desconhecido" | Confira o nome no catálogo de `referencia/roteiro.md` |
| "o rodapé (foot) não cabe em uma linha" | Encurte o `foot` (cerca de 140 caracteres no máximo) |
| Verificador: "texto mais largo que a caixa" | Aumente `w`, diminua `size` ou encurte o texto |
| Verificador: "X encosta em Y" | Afaste os itens (`x`, `y`) ou reduza um deles; se não couber, divida a cena |
| Verificador: "sai da área segura" | Traga o item para dentro: conteúdo entre x 120 e 1800, y 240 e 780 |
| "invade o painel da ficha" | Em cenas `layout: 'ficha'`, o conteúdo vai até x + w = 1290 |
| ElevenLabs 401 "chave inválida" | Copie a chave inteira de novo (começa com `sk_`) |
| ElevenLabs "a chave não tem a permissão" | Edite a chave no site e ligue a permissão citada (Text to Speech: Access) |
| ElevenLabs "créditos acabaram" / "Créditos insuficientes" | Espere o ciclo renovar, assine um plano maior, use `eleven_flash_v2_5` (metade do custo) ou troque de provedor |
| ElevenLabs "a voz escolhida não está disponível" / "Free users cannot use library voices" | Plano grátis não usa vozes da biblioteca pela API: assine o Starter ou use outro provedor |
| Gemini "limite diário grátis" | Rode `npm run narrar` amanhã (as cenas prontas ficam guardadas) ou ative o faturamento no AI Studio |
| Gemini "modelo não encontrado" | `npm run verificar` lista os modelos de voz da chave; ponha um deles em `voz.modelo` |
| OpenAI "sem crédito" | Adicione crédito em platform.openai.com > Settings > Billing |
| Voz lê sigla ou número errado | Use a marcação de escrito e falado na fala (exemplos em `roteiro.md`) e rode `npm run narrar` (só a cena alterada é refeita) |
| Voz rápida ou lenta demais | `ritmo` no `video.config.js` (1,05 acelera 5%) e depois `npm run renderizar` e `npm run montar` |
| Imagem entra antes ou depois da fala | Confira o gatilho `@frase`; use `+0.3` para atrasar um pouco |
| Tela vazia no começo de uma cena | O primeiro item entra tarde demais: use `at: 0.3` ou o começo da fala |
| Vídeo final sem som em uma cena | Rode `npm run narrar` (faltou narrar essa cena) e depois `npm run montar` |
| "desenhada com outro ritmo" | Mudou o `ritmo`: `npm run renderizar` e depois `npm run montar` |
| Revisão: "Som e imagem com a mesma duração (diferença de até 120 ms)" | Normal: o formato de áudio AAC acrescenta um enchimento curto no fim. Só é problema acima disso |
| Renderização lenta | Normal: cerca de 30 s por minuto de vídeo num computador recente. `-- --paralelo 2` usa menos memória |
