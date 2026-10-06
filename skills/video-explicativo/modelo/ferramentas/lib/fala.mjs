// Texto falado de cada cena e a chave de cache da narração.
import crypto from 'node:crypto';
import { spoken } from '../../motor/marcacao.js';

// Sem normalizar espaços: as posições das letras precisam bater com as legendas (marcacao.displayWords).
export const falaDe = (scene) => spoken(scene.fala || '');

export function hashFala(texto, prov, voz) {
  const settings = prov.ajustes ? prov.ajustes(voz) : {};
  return crypto.createHash('sha1')
    .update(JSON.stringify([texto, prov.id, voz.id || prov.vozPadrao, voz.modelo || prov.modeloPadrao, voz.instrucoes || '', settings, voz.velocidade ?? 1]))
    .digest('hex').slice(0, 12);
}
