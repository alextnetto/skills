#!/usr/bin/env bash
# Instala (ou atualiza) as skills do Alex Netto no Claude Code e em outros agentes de IA.
#
# Uso, no Mac ou no Linux:
#   curl -fsSL https://raw.githubusercontent.com/alextnetto/skills/main/instalar.sh | bash
# Só uma skill:
#   curl -fsSL https://raw.githubusercontent.com/alextnetto/skills/main/instalar.sh | bash -s -- video-explicativo
#
# O que faz: baixa a versão atual do repositório github.com/alextnetto/skills e copia cada skill para
# ~/.claude/skills/ (Claude Code). Se encontrar Codex, Gemini CLI ou ~/.agents, copia também para
# ~/.agents/skills/. Rodar de novo atualiza. Não pede senha e não instala nenhum outro programa.
set -euo pipefail

REPO="alextnetto/skills"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Baixando as skills de github.com/$REPO ..."
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$TMP"
SRC="$TMP/skills-main/skills"

# quais skills: as pedidas na linha de comando ou todas as do repositório
QUAIS=()
if [ "$#" -gt 0 ]; then
  QUAIS=("$@")
else
  for d in "$SRC"/*/; do [ -f "$d/SKILL.md" ] && QUAIS+=("$(basename "$d")"); done
fi

DESTINOS=("$HOME/.claude/skills")
for agente in "$HOME/.agents" "$HOME/.codex" "$HOME/.gemini"; do
  if [ -d "$agente" ]; then DESTINOS+=("$HOME/.agents/skills"); break; fi
done

for s in "${QUAIS[@]}"; do
  if ! [[ "$s" =~ ^[a-z0-9-]+$ ]] || [ ! -f "$SRC/$s/SKILL.md" ]; then
    echo "❌ Não existe a skill \"$s\". Disponíveis: $(cd "$SRC" && ls -d */ | tr -d / | tr '\n' ' ')"
    exit 1
  fi
done

for destino in "${DESTINOS[@]}"; do
  mkdir -p "$destino"
  for s in "${QUAIS[@]}"; do
    rm -rf "${destino:?}/$s"
    cp -R "$SRC/$s" "$destino/$s"
    echo "✅ $s instalada em $destino/$s"
  done
done

echo ""
echo "Pronto. Abra uma conversa NOVA no Claude (aba Code) e peça, por exemplo:"
echo "  Faz um vídeo explicativo de 3 minutos sobre como funciona o Pix, para donos de pequenas empresas."
