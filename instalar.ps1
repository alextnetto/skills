# Instala (ou atualiza) as skills do Alex Netto no Claude Code e em outros agentes de IA.
#
# Uso, no Windows (PowerShell):
#   irm https://raw.githubusercontent.com/alextnetto/skills/main/instalar.ps1 | iex
# So uma skill:
#   $env:SKILLS = 'video-explicativo'; irm https://raw.githubusercontent.com/alextnetto/skills/main/instalar.ps1 | iex
#
# O que faz: baixa a versao atual do repositorio github.com/alextnetto/skills e copia cada skill para
# %USERPROFILE%\.claude\skills\ (Claude Code). Se encontrar Codex, Gemini CLI ou .agents, copia tambem para
# %USERPROFILE%\.agents\skills\. Rodar de novo atualiza. Nao pede senha e nao instala nenhum outro programa.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = 'alextnetto/skills'
$casa = if ($env:SKILLS_HOME) { $env:SKILLS_HOME } else { $HOME } # SKILLS_HOME: so para testes
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('skills-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  Write-Host "Baixando as skills de github.com/$repo ..."
  $zip = Join-Path $tmp 'skills.zip'
  Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/$repo/zip/refs/heads/main" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $tmp
  $src = Join-Path $tmp (Join-Path 'skills-main' 'skills')

  $todas = @(Get-ChildItem $src -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object { $_.Name })
  $quais = if ($env:SKILLS) { @($env:SKILLS -split ',' | ForEach-Object { $_.Trim() }) } else { $todas }
  foreach ($s in $quais) {
    if ($todas -notcontains $s) { throw "Nao existe a skill '$s'. Disponiveis: $($todas -join ', ')" }
  }

  $destinos = @((Join-Path (Join-Path $casa '.claude') 'skills'))
  foreach ($agente in '.agents', '.codex', '.gemini') {
    if (Test-Path (Join-Path $casa $agente)) { $destinos += (Join-Path (Join-Path $casa '.agents') 'skills'); break }
  }

  foreach ($destino in $destinos) {
    New-Item -ItemType Directory -Force -Path $destino | Out-Null
    foreach ($s in $quais) {
      $alvo = Join-Path $destino $s
      if (Test-Path $alvo) { Remove-Item -Recurse -Force $alvo }
      Copy-Item -Recurse (Join-Path $src $s) $alvo
      Write-Host "OK  $s instalada em $alvo"
    }
  }
  Write-Host ''
  Write-Host 'Pronto. Abra uma conversa NOVA no Claude (aba Code) e peca, por exemplo:'
  Write-Host '  Faz um video explicativo de 3 minutos sobre como funciona o Pix, para donos de pequenas empresas.'
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
