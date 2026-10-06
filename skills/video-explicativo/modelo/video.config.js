// Configuração do vídeo. Mude só os valores; os comentários explicam cada opção.
export default {
  titulo: 'Como este vídeo foi feito',
  slug: 'exemplo', // nome dos arquivos finais em saida/
  tema: 'papel', // 'papel' (fundo claro) ou 'noite' (fundo escuro)
  voz: {
    provedor: 'elevenlabs', // 'elevenlabs', 'gemini', 'openai' ou 'local' (voz do computador)
    id: null, // voz específica; null usa a padrão. Veja as opções com "npm run vozes"
    modelo: null, // null usa o modelo padrão do provedor
    velocidade: 1.0, // ElevenLabs (0.7 a 1.2), OpenAI e voz do computador
  },
  ritmo: 1.0, // acelera a narração inteira na montagem sem mudar o tom (1.05 = 5% mais rápido)
  // Painel lateral que acompanha o vídeo nas cenas com layout 'ficha'. Use null se não precisar.
  ficha: { titulo: 'Ficha do vídeo', nome: 'Este vídeo', carimbos: 'O que já está pronto' },
};
