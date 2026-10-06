// Lista de provedores de voz. O escolhido fica em video.config.js (voz.provedor).
export const PROVEDORES = ['elevenlabs', 'openai', 'gemini', 'local'];

export async function provedor(id) {
  if (!PROVEDORES.includes(id)) throw new Error(`provedor de voz desconhecido "${id}". Opções: ${PROVEDORES.join(', ')}`);
  return (await import(`./${id}.mjs`)).default;
}
