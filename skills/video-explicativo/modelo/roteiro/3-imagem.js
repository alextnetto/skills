export default [
  {
    id: 'c3s0', layout: 'card', card: { n: 3, title: 'A imagem' },
    fala: 'Por fim, a imagem.',
  },
  {
    id: 'c3s1', layout: 'ficha', title: 'Quadro a quadro',
    fala: 'Com roteiro e voz prontos, um navegador invisível desenha o vídeo quadro a quadro, trinta por segundo. Antes disso, um verificador procura texto estourando a caixa ou elementos encostados. No fim, som e imagem são unidos com precisão, e saem também a legenda e uma versão leve, para compartilhar.',
    items: [
      { type: 'list', x: 120, y: 260, w: 1170, size: 34, gap: 26, marker: 'num', items: [
        { text: 'Um navegador invisível desenha cada quadro', sub: '30 quadros por segundo', at: '@um navegador invisivel' },
        { text: 'Um verificador confere o layout', sub: 'texto estourando a caixa, elementos encostados', at: '@um verificador' },
        { text: 'Som e imagem são unidos', sub: 'a sincronia é exata', at: '@som e imagem' },
        { text: 'Saem a legenda e uma versão leve', sub: 'para publicar e compartilhar', at: '@a legenda' },
      ] },
    ],
    ficha: [
      { kind: 'stamp', label: 'Roteiro', at: '@com roteiro' },
      { kind: 'stamp', label: 'Voz', at: '@e voz prontos' },
      { kind: 'field', label: 'Formato', value: '1920x1080, 30 fps', at: '@trinta por segundo' },
      { kind: 'stamp', label: 'Imagem', at: '@som e imagem' },
      { kind: 'field', label: 'Legenda', value: 'arquivo .srt', at: '@a legenda' },
      { kind: 'field', label: 'Versão leve', value: 'para WhatsApp', at: '@uma versao leve' },
    ],
  },
  {
    id: 'c3s2', title: 'Para fazer o seu',
    fala: 'Para fazer o seu, basta dizer o assunto, o público, a duração e, se quiser, a voz. O assistente pesquisa, escreve, narra e monta o vídeo. Você descreve o assunto, e o assistente faz o resto.',
    foot: 'Feito com a skill video-explicativo · github.com/alextnetto/skills',
    recap: { text: 'Você descreve o assunto. O assistente faz o resto.', at: '@voce descreve' },
    items: [
      { type: 'doc', x: 120, y: 260, w: 860, title: 'O seu pedido', lines: [
        { l: 'Assunto', r: 'como funciona o Pix', at: '@dizer o assunto' },
        { l: 'Público', r: 'donos de pequenas empresas', at: '@o publico' },
        { l: 'Duração', r: '4 minutos', at: '@a duracao' },
        { l: 'Voz', r: 'Gemini, grátis', at: '@a voz' },
      ] },
      { type: 'text', x: 1060, y: 300, w: 740, text: 'O assistente *pesquisa, escreve, narra e monta*.', size: 50, weight: 600, at: '@o assistente pesquisa' },
    ],
  },
];
