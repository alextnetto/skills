export default [
  {
    id: 'c2s0', layout: 'card', card: { n: 2, title: 'A voz' },
    fala: 'Depois, a voz.',
  },
  {
    id: 'c2s1', title: 'Quatro opções de voz',
    fala: 'O texto vai para um serviço de narração: ElevenLabs, Gemini, OpenAI ou a própria voz do computador. Junto com o áudio vem o tempo de cada palavra. Quando o serviço não informa esse tempo, a ferramenta descobre sozinha, pelas pausas do áudio.',
    foot: 'Preços e planos conferidos em outubro de 2026.',
    term: [
      { term: 'alinhamento', def: 'O momento exato em que cada palavra é dita. É ele que faz a imagem entrar junto com a fala.', at: '@o tempo de cada palavra' },
    ],
    items: [
      { type: 'table', x: 120, y: 260, w: 1680, size: 30, headAt: 0.3, cols: [
        { label: 'Serviço', w: 3 }, { label: 'Custo', w: 4 }, { label: 'Português', w: 3 },
      ], rows: [
        { cells: ['ElevenLabs', 'a partir de US$ 6 por mês', 'a mais natural'], tone: 'accent', at: '@elevenlabs' },
        { cells: ['Google Gemini', 'grátis, com limite diário', 'boa'], at: '@gemini' },
        { cells: ['OpenAI', 'crédito pré-pago, a partir de US$ 5', 'boa, leve sotaque'], at: '@openai' },
        { cells: ['Voz do computador', 'grátis, sem cadastro', 'robótica, para rascunho'], at: '@voz do computador' },
      ] },
      { type: 'text', x: 120, y: 640, w: 1680, text: 'Sem o tempo informado, a ferramenta estima *pelas pausas do áudio*.', size: 36, italic: true, color: 'muted', at: '@quando o servico' },
    ],
  },
];
