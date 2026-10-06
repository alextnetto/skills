// Junta as cenas desenhadas com a narração (sincronia exata por amostra de áudio) e gera os arquivos finais em saida/:
// <slug>.mp4 (alta qualidade), <slug>-leve.mp4 (para WhatsApp e redes), <slug>.srt (legenda), capitulos.txt e roteiro.md.
import fs from 'node:fs';
import path from 'node:path';
import { P, config, scenes, chapters, RITMO, SLUG, ok, bad, info, mmss, openFile, args } from './lib/comum.mjs';
import { display, displayWords } from '../motor/marcacao.js';
import { FPS } from '../motor/constantes.js';
import { ff } from './lib/audio.mjs';

const SR = 48000, SPF = SR / FPS;
const W = (f) => path.join(P.work, f);
const problems = [];
for (const s of scenes) {
  const info = W(`${s.id}.info.json`), audio = path.join(P.audio, `${s.id}.json`);
  if (!fs.existsSync(info) || !fs.existsSync(W(`${s.id}.mp4`))) problems.push(`${s.id}: cena não desenhada (rode "npm run renderizar")`);
  else if (JSON.parse(fs.readFileSync(info)).ritmo !== RITMO) problems.push(`${s.id}: desenhada com outro ritmo (rode "npm run renderizar")`);
  if (!fs.existsSync(audio) || JSON.parse(fs.readFileSync(audio)).hash === 'fake') problems.push(`${s.id}: sem narração de verdade (rode "npm run narrar")`);
}
if (problems.length) { problems.slice(0, 12).forEach((p) => bad(p)); if (problems.length > 12) info(`… e mais ${problems.length - 12}`); process.exit(1); }

// 1. narração de cada cena, acelerada pelo ritmo e completada com silêncio até o tamanho exato da cena
let offset = 0;
const timeline = [];
for (const s of scenes) {
  const inf = JSON.parse(fs.readFileSync(W(`${s.id}.info.json`)));
  const n = inf.frames * SPF;
  const tempo = RITMO === 1 ? '' : `atempo=${RITMO},`;
  ff(['-i', path.join(P.audio, `${s.id}.wav`), '-af', `${tempo}aresample=${SR},adelay=${Math.round(inf.lead * 1000)}:all=1,apad=whole_len=${n},atrim=end_sample=${n}`,
    '-ac', '2', '-c:a', 'pcm_s16le', W(`${s.id}.final.wav`)]);
  timeline.push({ scene: s, start: offset, lead: inf.lead });
  offset += inf.frames / FPS;
}

// 2. concatena vídeo (sem recomprimir) e áudio
fs.writeFileSync(W('video.txt'), scenes.map((s) => `file '${s.id}.mp4'`).join('\n'));
fs.writeFileSync(W('audio.txt'), scenes.map((s) => `file '${s.id}.final.wav'`).join('\n'));
ff(['-f', 'concat', '-safe', '0', '-i', W('video.txt'), '-c', 'copy', W('video.mp4')]);
ff(['-f', 'concat', '-safe', '0', '-i', W('audio.txt'), '-c:a', 'pcm_s16le', W('audio.wav')]);

// 3. junta, com volume padronizado para fala
const OUT = path.join(P.out, `${SLUG}.mp4`), LEVE = path.join(P.out, `${SLUG}-leve.mp4`);
ff(['-i', W('video.mp4'), '-i', W('audio.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(SR), '-c:a', 'aac', '-b:a', '192k',
  '-metadata', `title=${config.titulo || SLUG}`, '-metadata', 'language=por', '-movflags', '+faststart', OUT]);
// versão leve: mesma imagem, arquivo bem menor
ff(['-i', OUT, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', LEVE]);

// 4. legenda a partir do tempo de cada letra, mostrando a forma escrita (não a falada)
const ts = (t) => {
  const ms = Math.max(0, Math.round(t * 1000)), p = (x, l = 2) => String(x).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const twoLines = (text) => {
  if (text.length <= 42) return text;
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.abs(a.length - b.length) + (/[,;:]$/.test(a) ? -8 : 0) + (/^(de|da|do|que|e|o|a|um|uma|em|no|na|por|para|com)$/i.test(words[i - 1]) ? 10 : 0);
    if (!best || score < best.score) best = { score, text: `${a}\n${b}` };
  }
  return best.text;
};
const cues = [];
for (const { scene, start, lead } of timeline) {
  const al = JSON.parse(fs.readFileSync(path.join(P.audio, `${scene.id}.json`)));
  const words = displayWords(scene.fala || '').map((w) => ({
    word: w.word, t0: start + lead + al.starts[w.start] / RITMO, t1: start + lead + al.ends[Math.max(w.start, w.end - 1)] / RITMO,
  }));
  let cur = [];
  const lenOf = (ws) => ws.reduce((n, x) => n + x.word.length + 1, 0) - 1;
  const flush = () => { if (cur.length) cues.push({ t0: cur[0].t0, t1: cur[cur.length - 1].t1, text: cur.map((w) => w.word).join(' ') }); cur = []; };
  words.forEach((w, i) => {
    cur.push(w);
    if (lenOf(cur) > 80) {
      // passou do tamanho: quebra na última vírgula (ou dois-pontos) e leva o resto para a próxima legenda
      let k = -1;
      for (let x = cur.length - 2; x >= 0; x--) if (/[,;:]$/.test(cur[x].word) && lenOf(cur.slice(0, x + 1)) >= 20) { k = x; break; }
      if (k < 0) k = cur.length - 2;
      const rest = cur.slice(k + 1);
      cur = cur.slice(0, k + 1); flush(); cur = rest;
    }
    const next = words[i + 1], len = lenOf(cur);
    if (/[.?!]$/.test(w.word) || (/[:;]$/.test(w.word) && len > 30) || (/,$/.test(w.word) && len > 58) || (next && next.t0 - w.t1 > 0.6 && len > 25)) flush();
  });
  flush();
}
cues.forEach((c, i) => {
  const next = cues[i + 1];
  c.t1 = Math.max(c.t1 + 0.15, c.t0 + 1.0);
  if (next && c.t1 > next.t0 - 0.04) c.t1 = next.t0 - 0.04;
});
fs.writeFileSync(path.join(P.out, `${SLUG}.srt`), cues.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${twoLines(c.text)}\n`).join('\n'));

// 5. capítulos (para a descrição do YouTube) e roteiro legível
const firstOf = chapters.map((_, c) => timeline.find((x) => x.scene.chapter === c)).filter(Boolean);
fs.writeFileSync(path.join(P.out, 'capitulos.txt'), firstOf.map((x) => `${mmss(x.start)} ${chapters[x.scene.chapter]}`).join('\n') + '\n');
let md = `# ${config.titulo || SLUG}\n\nDuração: ${mmss(offset)}. Roteiro gerado a partir da pasta roteiro/.\n`;
timeline.forEach(({ scene, start }) => {
  if (firstOf.find((x) => x.scene.id === scene.id)) md += `\n## ${chapters[scene.chapter]} (${mmss(start)})\n`;
  md += `\n**${scene.id}${scene.title ? ` · ${display(scene.title)}` : ''}** (${mmss(start)})\n\n${display(scene.fala || '')}\n`;
  (scene.term || []).forEach((t) => { md += `\n> Termo na tela: **${t.term}**. ${t.def}\n`; });
  if (scene.recap) md += `\n> Em uma frase: ${scene.recap.text}\n`;
  if (scene.foot) md += `\n> Rodapé: ${scene.foot}\n`;
});
fs.writeFileSync(path.join(P.out, 'roteiro.md'), md);
fs.writeFileSync(W('script.json'), JSON.stringify(timeline.map(({ scene, start }) => ({ id: scene.id, start, display: display(scene.fala || '') }))));

const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1);
ok(`Vídeo pronto: ${path.relative(process.cwd(), OUT)} (${mmss(offset)}, ${mb(OUT)} MB)`);
info(`Versão leve para compartilhar: ${path.relative(process.cwd(), LEVE)} (${mb(LEVE)} MB)`);
info(`Legenda: saida/${SLUG}.srt · capítulos: saida/capitulos.txt · roteiro: saida/roteiro.md`);
if (!args().has('--sem-abrir')) openFile(OUT);
