# install.ps1 — enlaza las skills a ~/.claude/skills mediante junctions de directorio.
# Las junctions NO requieren admin ni modo desarrollador (a diferencia de los symlinks).
# Re-ejecutable: recrea los enlaces si ya existen.

$ErrorActionPreference = 'Stop'

$source = $PSScriptRoot
$skillsDir = Join-Path $env:USERPROFILE '.claude\skills'
$skills = @('scene-spec', 'scene-build', 'scene-verify')

if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
    Write-Host "Creado $skillsDir"
}

foreach ($name in $skills) {
    $target = Join-Path $source $name
    $link = Join-Path $skillsDir $name

    if (-not (Test-Path $target)) {
        Write-Warning "No existe la skill fuente: $target (se omite)"
        continue
    }

    if (Test-Path $link) {
        $item = Get-Item $link -Force
        if ($item.LinkType) {
            # Es un enlace/junction existente: quítalo para recrearlo.
            $item.Delete()
        } else {
            Write-Warning "$link existe y NO es un enlace (carpeta real). Se omite para no borrar datos."
            continue
        }
    }

    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
    Write-Host "Enlazado  $name  ->  $target"
}

Write-Host ""
Write-Host "Listo. Reinicia Claude Code (o abre una sesion nueva) y usa:"
Write-Host "  /scene-spec    disenar el spec de la escena (drill-down)"
Write-Host "  /scene-build   generar el index.html WebGPU"
Write-Host "  /scene-verify  pasar los gates (critic visual + perf)"
