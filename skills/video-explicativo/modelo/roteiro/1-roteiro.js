export default [
  {
    id: 'c1s0', layout: 'card', card: { n: 1, title: 'O roteiro' },
    fala: 'Primeiro, o roteiro.',
  },
  {
    id: 'c1s1', title: 'Do pedido às cenas',
    fala: 'Tudo começa com um pedido, por exemplo: faça um vídeo de quatro minutos sobre como funciona o Pix. O assistente pesquisa, confere os fatos em fontes confiáveis e escreve o roteiro em cenas. Cada cena tem uma fala e uma lista do que aparece na tela. E cada elemento entra quando a narração diz a frase certa.',
    term: [
      { term: 'cena', def: 'Um trecho do vídeo: uma fala e o que aparece na tela enquanto ela é dita.', at: '@em cenas' },
    ],
    items: [
      { type: 'node', id: 'pedido', x: 120, y: 290, w: 360, h: 130, label: 'Pedido', sub: '"vídeo sobre o Pix"', at: '@um pedido' },
      { type: 'node', id: 'pesquisa', x: 560, y: 290, w: 360, h: 130, label: 'Pesquisa', sub: 'fatos conferidos', at: '@o assistente pesquisa' },
      { type: 'node', id: 'roteiro', x: 1000, y: 290, w: 360, h: 130, label: 'Roteiro', sub: 'texto da narração', at: '@escreve o roteiro' },
      { type: 'node', id: 'cenas', x: 1440, y: 290, w: 360, h: 130, label: 'Cenas', sub: 'fala + tela', tone: 'accent', at: '@em cenas' },
      { type: 'edge', from: 'pedido', to: 'pesquisa', at: '@o assistente pesquisa+0.2' },
      { type: 'edge', from: 'pesquisa', to: 'roteiro', at: '@escreve o roteiro+0.2' },
      { type: 'edge', from: 'roteiro', to: 'cenas', at: '@em cenas+0.2' },
      { type: 'code', x: 120, y: 480, w: 1100, size: 28, title: 'Uma cena, por dentro', lines: [
        { text: "fala: 'Tudo começa com um pedido…'", at: '@cada cena tem' },
        { text: "na tela: bloco 'Pedido'", at: '@uma lista do que' },
        { text: "entra quando a fala diz 'um pedido'", at: '@cada elemento entra', tone: 'accent' },
      ] },
      { type: 'text', x: 1290, y: 500, w: 510, text: 'Cada elemento entra quando a narração diz *a frase certa*.', size: 34, italic: true, color: 'muted', at: '@cada elemento entra' },
    ],
  },
];
