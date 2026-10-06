// Voz do próprio computador: grátis, sem cadastro e sem internet. Soa robótica; serve para rascunho e teste.
// macOS: comando "say" (vozes Luciana e Felipe). Windows: síntese de voz do sistema (voz Maria, se instalada).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { toWorkWav } from '../lib/audio.mjs';

const mac = process.platform === 'darwin', win = process.platform === 'win32';

function macVoices() {
  const out = spawnSync('say', ['-v', '?'], { encoding: 'utf8' }).stdout || '';
  return out.split('\n').map((l) => l.match(/^(.+?)\s{2,}(pt[_-]BR)\b/)).filter(Boolean).map((m) => ({ id: m[1].trim(), nome: m[1].trim(), detalhe: m[2] }));
}

function winVoices() {
  const ps = 'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + "|" + $_.VoiceInfo.Culture.Name }';
  const out = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).stdout || '';
  return out.split(/\r?\n/).filter((l) => /\|pt-BR/i.test(l)).map((l) => { const [n] = l.split('|'); return { id: n, nome: n, detalhe: 'pt-BR' }; });
}

export default {
  id: 'local',
  nome: 'Voz do computador',
  chave: null,
  exato: false,
  paralelo: 1,
  get vozPadrao() {
    const vs = mac ? macVoices() : win ? winVoices() : [];
    return (vs.find((v) => /Luciana|Maria/i.test(v.id)) || vs[0] || { id: null }).id;
  },
  modeloPadrao: null,

  async sintetizar({ texto, voz, wav, tmp }) {
    const id = voz.id || this.vozPadrao;
    if (!id) throw new Error('não há voz em português instalada neste computador');
    const txt = `${tmp}.txt`;
    fs.writeFileSync(txt, texto);
    if (mac) {
      const rate = Math.round(185 * (voz.velocidade ?? 1));
      execFileSync('say', ['-v', id, '-r', String(rate), '-f', txt, '-o', `${tmp}.bruto.aiff`]);
      toWorkWav(`${tmp}.bruto.aiff`, wav);
      fs.rmSync(`${tmp}.bruto.aiff`, { force: true });
    } else if (win) {
      const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('${id.replace(/'/g, "''")}'); $s.Rate = ${Math.round(((voz.velocidade ?? 1) - 1) * 10)}; $s.SetOutputToWaveFile('${path.resolve(`${tmp}.bruto.wav`).replace(/'/g, "''")}'); $s.Speak([IO.File]::ReadAllText('${path.resolve(txt).replace(/'/g, "''")}')); $s.Dispose()`;
      execFileSync('powershell', ['-NoProfile', '-Command', ps]);
      toWorkWav(`${tmp}.bruto.wav`, wav);
      fs.rmSync(`${tmp}.bruto.wav`, { force: true });
    } else {
      throw new Error('a voz do computador só funciona no macOS e no Windows');
    }
    fs.rmSync(txt, { force: true });
    return null; // sem alinhamento: a ferramenta estima pelas pausas
  },

  async checar() {
    if (!mac && !win) return { ok: false, msg: 'voz do computador indisponível neste sistema (só macOS e Windows)' };
    const v = this.vozPadrao;
    return v ? { ok: true, msg: `voz "${v}" disponível` } : { ok: false, msg: 'nenhuma voz em português do Brasil instalada (no Mac: Ajustes > Acessibilidade > Conteúdo Falado > Voz do Sistema > Gerenciar Vozes > Português (Brasil))' };
  },

  async vozes() { return mac ? macVoices() : win ? winVoices() : []; },

  custo() { return 'grátis'; },
};
