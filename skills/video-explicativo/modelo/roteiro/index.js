// Ordem dos capítulos do vídeo. Cada arquivo exporta uma lista de cenas.
import abertura from './0-abertura.js';
import roteiro from './1-roteiro.js';
import voz from './2-voz.js';
import imagem from './3-imagem.js';

export const CAPITULOS = [
  { titulo: 'Abertura', cenas: abertura },
  { titulo: 'O roteiro', cenas: roteiro },
  { titulo: 'A voz', cenas: voz },
  { titulo: 'A imagem', cenas: imagem },
];
