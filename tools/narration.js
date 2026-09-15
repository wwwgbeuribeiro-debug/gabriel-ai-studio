const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function gerarNarracao(texto, destino, pastaTemp) {

    const script =
        path.join(
            pastaTemp,
            "jairo-tts.ps1"
        );


    const conteudo = `
param(
    [string]$Texto,
    [string]$Saida
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$sintetizador =
    New-Object System.Speech.Synthesis.SpeechSynthesizer

$vozPt =
    $sintetizador.GetInstalledVoices() |
    Where-Object {
        $_.VoiceInfo.Culture.Name -like "pt-*"
    } |
    Select-Object -First 1

if (-not $vozPt) {
    Write-Error "VOZ_PT_NAO_ENCONTRADA"
    exit 3
}

$sintetizador.SelectVoice(
    $vozPt.VoiceInfo.Name
)

$sintetizador.Rate = 1
$sintetizador.Volume = 100

$sintetizador.SetOutputToWaveFile(
    $Saida
)

$sintetizador.Speak(
    $Texto
)

$sintetizador.Dispose()

Write-Output $vozPt.VoiceInfo.Name
`;


    fs.writeFileSync(
        script,
        conteudo,
        "utf8"
    );


    const resultado =
        spawnSync(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script,
                "-Texto",
                texto,
                "-Saida",
                destino
            ],
            {
                encoding: "utf8",
                windowsHide: true
            }
        );


    if (
        resultado.status === 3 ||
        !fs.existsSync(destino)
    ) {

        console.log(
            "⚠️ Voz portuguesa do Windows não encontrada."
        );

        console.log(
            "🎵 O vídeo continuará somente com música."
        );

        return null;
    }


    if (
        resultado.status !== 0
    ) {

        console.log(
            "⚠️ Não consegui gerar a narração."
        );

        console.log(
            "🎵 Continuando somente com música."
        );

        return null;
    }


    const voz =
        String(
            resultado.stdout || ""
        ).trim();


    console.log(
        `🗣️ Narração criada${voz ? ` com ${voz}` : ""}.`
    );


    return destino;
}


module.exports = {
    gerarNarracao
};
