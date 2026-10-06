// Junta os capítulos do roteiro numa lista única de cenas, com valores padrão.
import { CAPITULOS } from '../roteiro/index.js';

export const chapters = CAPITULOS.map((c) => c.titulo);

export const scenes = CAPITULOS.flatMap((c, chapter) =>
  c.cenas.map((s) => ({ lead: 0.25, tail: 0.5, items: [], term: [], ficha: [], layout: 'full', ...s, chapter })));

scenes.forEach((s, i) => { s.index = i; });

// Itens da ficha revelados antes de uma cena (já aparecem quando ela começa).
export function fichaBefore(sceneId) {
  const out = [];
  for (const s of scenes) {
    if (s.id === sceneId) break;
    out.push(...s.ficha);
  }
  return out;
}

export const byId = (id) => scenes.find((s) => s.id === id);
