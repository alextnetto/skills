export default [
  {
    id: 'c0s1', layout: 'card',
    fala: 'Este vídeo foi feito inteiro por um assistente de inteligência artificial, a partir de um pedido em português. Ninguém abriu um editor de vídeo. Foram três peças: um roteiro, uma voz e as imagens, cada uma sincronizada com a outra.',
    tail: 0.9,
    items: [
      { type: 'text', x: 160, y: 190, w: 1600, text: 'Como este vídeo foi feito', size: 96, weight: 600, align: 'center', at: 0.15 },
      { type: 'text', x: 160, y: 330, w: 1600, text: 'Um assistente de IA, um pedido em português e nenhum editor de vídeo', size: 44, italic: true, color: 'muted', align: 'center', at: '@a partir de um pedido' },
      { type: 'rule', x: 860, y: 450, w: 200, at: '@ninguem abriu' },
      { type: 'text', x: 160, y: 540, w: 520, text: 'roteiro', size: 64, color: 'accent', weight: 600, align: 'right', at: '@um roteiro' },
      { type: 'text', x: 700, y: 540, w: 520, text: 'voz', size: 64, color: 'accent', weight: 600, align: 'center', at: '@uma voz' },
      { type: 'text', x: 1240, y: 540, w: 520, text: 'imagem', size: 64, color: 'accent', weight: 600, align: 'left', at: '@as imagens' },
      { type: 'text', x: 160, y: 680, w: 1600, text: 'cada uma sincronizada com a outra', size: 40, italic: true, color: 'muted', align: 'center', at: '@cada uma sincronizada' },
    ],
  },
];
