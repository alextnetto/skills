// Narração de cada cena com o provedor escolhido em video.config.js. Só refaz cenas cuja fala ou voz mudou.
// Uso: npm run narrar [-- --cenas c1s1,c1s2] [-- --sim]   (--sim pula a confirmação de custo)
import fs from 'node:fs';
import path from 'node:path';
import { P, config, scenes, getKey, args, ok, bad, warn, info, mmss, RITMO } from './lib/comum.mjs';
import { provedor } from './provedores/index.mjs';
import { falaDe, hashFala } from './lib/fala.mjs';
import { decodePcm, wavDuration } from './lib/audio.mjs';
import { alignByPauses } from './alinhamento.mjs';

const a = args();
const only = a.get('--cenas')?.split(',');
const voz = config.voz || {};
const prov = await provedor(voz.provedor || 'elevenlabs');
const key = prov.chave ? getKey(prov.chave) : null;
if (prov.chave && !key) {
  bad(`Falta a chave ${prov.chave} do ${prov.nome}. Rode "npm run verificar" para ver como conseguir.`);
  process.exit(1);
}
if (!voz.id && prov.resolverVoz) {
  const r = await prov.resolverVoz(key);
  voz.id = r.id;
  info(`Voz: ${r.nome || r.id}${r.aviso ? '' : ' (escolhida automaticamente; para fixar, ponha o id em video.config.js, voz.id)'}`);
  if (r.aviso) warn(r.aviso);
}

const todo = [];
scenes.forEach((s, i) => {
  if (only && !only.includes(s.id)) return;
  const texto = falaDe(s);
  if (!texto.trim()) return;
  const meta = path.join(P.audio, `${s.id}.json`);
  const fresh = fs.existsSync(meta) && fs.existsSync(path.join(P.audio, `${s.id}.wav`))
    && JSON.parse(fs.readFileSync(meta)).hash === hashFala(texto, prov, voz);
  if (!fresh) todo.push({ s, texto, anterior: scenes[i - 1] && falaDe(scenes[i - 1]), proximo: scenes[i + 1] && falaDe(scenes[i + 1]) });
});
const chars = todo.reduce((n, t) => n + t.texto.length, 0);
console.log(`${prov.nome}: ${scenes.length} cenas, ${todo.length} para narrar (${chars.toLocaleString('pt-BR')} caracteres; custo: ${prov.custo(chars, voz)})`);
if (!todo.length) { ok('Narração em dia.'); process.exit(0); }

if (prov.checar && key) {
  const c = await prov.checar(key);
  if (!c.ok) { bad(c.msg); process.exit(1); }
  if (c.creditos != null && c.creditos < chars * (/flash|turbo/.test(voz.modelo || '') ? 0.5 : 1)) {
    bad(`Créditos insuficientes: precisa de cerca de ${chars.toLocaleString('pt-BR')}, restam ${c.creditos.toLocaleString('pt-BR')}.`);
    info('Encurte o roteiro, troque para o modelo eleven_flash_v2_5 (metade do custo) ou use outro provedor.');
    process.exit(1);
  }
}

let cursor = 0, failed = 0;
async function worker() {
  while (cursor < todo.length) {
    const t = todo[cursor++];
    const wav = path.join(P.audio, `${t.s.id}.wav`), tmp = path.join(P.work, `tts-${t.s.id}`);
    for (let attempt = 1; ; attempt++) {
      try {
        const al = await prov.sintetizar({ texto: t.texto, anterior: t.anterior, proximo: t.proximo, voz, key, wav, tmp });
        const duration = wavDuration(wav);
        let starts, ends, alinhamento = 'exato';
        if (al) ({ starts, ends } = al);
        else { ({ starts, ends } = alignByPauses(t.texto, decodePcm(wav, 16000), 16000)); alinhamento = 'estimado'; }
        fs.writeFileSync(path.join(P.audio, `${t.s.id}.json`), JSON.stringify({
          id: t.s.id, hash: hashFala(t.texto, prov, voz), provedor: prov.id, alinhamento, text: t.texto, duration, starts, ends,
        }));
        console.log(`  ${t.s.id}  ${duration.toFixed(1)} s`);
        break;
      } catch (e) {
        if (e.fatal) { bad(e.message); failed += todo.length - cursor + 1; cursor = todo.length; break; }
        if (attempt >= 4 || e.retry === false || (e.status && !e.retry)) { bad(`${t.s.id}: ${e.message}`); failed++; break; }
        if (e.wait) info(`${t.s.id}: ${e.message}`);
        await new Promise((r) => setTimeout(r, (e.wait || 3000) * attempt));
      }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(prov.paralelo || 1, todo.length) }, worker));

let total = 0, words = 0, missing = 0;
for (const s of scenes) {
  const meta = path.join(P.audio, `${s.id}.json`);
  if (!fs.existsSync(meta)) { missing++; continue; }
  const m = JSON.parse(fs.readFileSync(meta));
  if (m.hash === 'fake') { missing++; continue; }
  total += m.duration / RITMO + s.lead + s.tail;
  words += m.text.split(/\s+/).filter(Boolean).length;
}
if (failed) { bad(`${failed} cena(s) falharam. Corrija o problema acima e rode "npm run narrar" de novo (as prontas não são refeitas).`); process.exit(1); }
ok(`Narração pronta. Duração aproximada do vídeo: ${mmss(total)}${missing ? ` (faltam ${missing} cenas)` : ''}.`);
if (total > 0) info(`Velocidade: ${Math.round(words / (total / 60))} palavras por minuto, contando as pausas entre cenas.`);
if (prov.exato === false) warn('Este provedor não informa o tempo de cada palavra; os tempos foram estimados pelas pausas do áudio (erro típico abaixo de 0,3 s).');
