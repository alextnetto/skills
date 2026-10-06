// Estima duração e custo da narração em cada provedor, antes de gastar qualquer coisa.
import { scenes, config, ok, info, mmss } from './lib/comum.mjs';
import { provedor, PROVEDORES } from './provedores/index.mjs';
import { falaDe } from './lib/fala.mjs';

const chars = scenes.reduce((n, s) => n + falaDe(s).length, 0);
const words = scenes.reduce((n, s) => n + falaDe(s).split(/\s+/).filter(Boolean).length, 0);
ok(`${scenes.length} cenas, ${words} palavras, ${chars.toLocaleString('pt-BR')} caracteres falados.`);
info(`Duração estimada: ${mmss((words / 150) * 60)} a ${mmss((words / 120) * 60)}, conforme a voz.`);
const atual = config.voz?.provedor || 'elevenlabs';
for (const id of PROVEDORES) {
  const p = await provedor(id);
  info(`${id === atual ? '→ ' : '  '}${p.nome.padEnd(20)} ${p.custo(chars, id === atual ? config.voz : {})}`);
}
