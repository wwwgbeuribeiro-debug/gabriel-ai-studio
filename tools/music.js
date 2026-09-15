const fs = require("fs");
const path = require("path");

const ROOT =
    path.resolve(__dirname, "..");

const MUSIC_DIR =
    path.join(
        ROOT,
        "assets",
        "music"
    );


function encontrarMusicaUsuario() {

    const candidatos = [
        "background.mp3",
        "background.wav",
        "background.m4a",
        "background.aac"
    ];

    for (
        const nome of candidatos
    ) {

        const arquivo =
            path.join(
                MUSIC_DIR,
                nome
            );

        if (
            fs.existsSync(arquivo)
        ) {
            return arquivo;
        }
    }

    return null;
}


function escreverHeaderWav(
    buffer,
    sampleRate,
    canais,
    totalFrames
) {

    const bits = 16;

    const bytesPorSample =
        bits / 8;

    const blockAlign =
        canais *
        bytesPorSample;

    const byteRate =
        sampleRate *
        blockAlign;

    const dataSize =
        totalFrames *
        blockAlign;


    buffer.write(
        "RIFF",
        0
    );

    buffer.writeUInt32LE(
        36 + dataSize,
        4
    );

    buffer.write(
        "WAVE",
        8
    );

    buffer.write(
        "fmt ",
        12
    );

    buffer.writeUInt32LE(
        16,
        16
    );

    buffer.writeUInt16LE(
        1,
        20
    );

    buffer.writeUInt16LE(
        canais,
        22
    );

    buffer.writeUInt32LE(
        sampleRate,
        24
    );

    buffer.writeUInt32LE(
        byteRate,
        28
    );

    buffer.writeUInt16LE(
        blockAlign,
        32
    );

    buffer.writeUInt16LE(
        bits,
        34
    );

    buffer.write(
        "data",
        36
    );

    buffer.writeUInt32LE(
        dataSize,
        40
    );
}


function clamp(
    valor,
    minimo,
    maximo
) {

    return Math.max(
        minimo,
        Math.min(
            maximo,
            valor
        )
    );
}


function envelopeGeral(
    tempo,
    duracao
) {

    const fadeIn =
        Math.min(
            1,
            tempo / 1.3
        );

    const restante =
        duracao -
        tempo;

    const fadeOut =
        Math.min(
            1,
            restante / 1.8
        );

    return Math.max(
        0,
        Math.min(
            fadeIn,
            fadeOut
        )
    );
}


function gerarMusicaOriginal(
    destino,
    duracaoSegundos
) {

    console.log(
        "🎵 Jairo criando trilha instrumental original..."
    );

    const sampleRate =
        44100;

    const canais =
        2;

    const duracao =
        Math.max(
            5,
            Number(
                duracaoSegundos
            ) || 20
        );

    const totalFrames =
        Math.floor(
            sampleRate *
            duracao
        );

    const dataSize =
        totalFrames *
        canais *
        2;

    const buffer =
        Buffer.alloc(
            44 +
            dataSize
        );


    escreverHeaderWav(
        buffer,
        sampleRate,
        canais,
        totalFrames
    );


    // Progressão:
    // Am -> F -> C -> G
    //
    // Feita matematicamente pelo próprio sistema.
    const progressao = [
        {
            root: 110.00,
            chord: [
                110.00,
                130.81,
                164.81
            ]
        },
        {
            root: 87.31,
            chord: [
                87.31,
                110.00,
                130.81
            ]
        },
        {
            root: 130.81,
            chord: [
                130.81,
                164.81,
                196.00
            ]
        },
        {
            root: 98.00,
            chord: [
                98.00,
                123.47,
                146.83
            ]
        }
    ];


    const duracaoAcorde =
        4;


    let offset =
        44;


    let noiseState =
        123456789;


    for (
        let i = 0;
        i < totalFrames;
        i++
    ) {

        const t =
            i /
            sampleRate;


        const indiceAcorde =
            Math.floor(
                t /
                duracaoAcorde
            ) %
            progressao.length;


        const atual =
            progressao[
                indiceAcorde
            ];


        // -----------------------------
        // PAD
        // -----------------------------

        let pad =
            0;


        for (
            const freq of atual.chord
        ) {

            pad +=
                Math.sin(
                    2 *
                    Math.PI *
                    freq *
                    t
                ) *
                0.016;


            pad +=
                Math.sin(
                    2 *
                    Math.PI *
                    freq *
                    2 *
                    t
                ) *
                0.004;
        }


        // -----------------------------
        // BAIXO PULSANTE
        // -----------------------------

        const beatLength =
            0.5;


        const beatPhase =
            (
                t %
                beatLength
            ) /
            beatLength;


        const beatEnvelope =
            Math.exp(
                -beatPhase *
                6.5
            );


        const bass =
            Math.sin(
                2 *
                Math.PI *
                atual.root *
                0.5 *
                t
            ) *
            (
                0.018 +
                beatEnvelope *
                0.040
            );


        // -----------------------------
        // ARPEGGIO
        // -----------------------------

        const arpIndex =
            Math.floor(
                t *
                2
            ) %
            atual.chord.length;


        const arpFreq =
            atual.chord[
                arpIndex
            ] *
            2;


        const arpPhase =
            (
                t %
                0.5
            ) /
            0.5;


        const arpEnvelope =
            Math.exp(
                -arpPhase *
                7
            );


        const arp =
            Math.sin(
                2 *
                Math.PI *
                arpFreq *
                t
            ) *
            arpEnvelope *
            0.022;


        // -----------------------------
        // KICK SUAVE
        // -----------------------------

        const kickPhase =
            t %
            1;


        let kick =
            0;


        if (
            kickPhase <
            0.16
        ) {

            const progresso =
                kickPhase /
                0.16;


            const frequenciaKick =
                62 -
                progresso *
                28;


            kick =
                Math.sin(
                    2 *
                    Math.PI *
                    frequenciaKick *
                    kickPhase
                ) *
                Math.exp(
                    -kickPhase *
                    22
                ) *
                0.075;
        }


        // -----------------------------
        // HI-HAT LEVE
        // -----------------------------

        const hatPhase =
            t %
            0.25;


        let hat =
            0;


        if (
            hatPhase <
            0.035
        ) {

            noiseState =
                (
                    noiseState *
                    1664525 +
                    1013904223
                ) >>>
                0;


            const noise =
                (
                    noiseState /
                    4294967295
                ) *
                2 -
                1;


            hat =
                noise *
                Math.exp(
                    -hatPhase *
                    95
                ) *
                0.009;
        }


        const envelope =
            envelopeGeral(
                t,
                duracao
            );


        const mix =
            (
                pad +
                bass +
                arp +
                kick +
                hat
            ) *
            envelope;


        // Pequena diferença estéreo.
        const esquerda =
            clamp(
                mix *
                0.96,
                -1,
                1
            );


        const direita =
            clamp(
                mix *
                0.92 +
                pad *
                0.04,
                -1,
                1
            );


        buffer.writeInt16LE(
            Math.round(
                esquerda *
                32767
            ),
            offset
        );


        offset += 2;


        buffer.writeInt16LE(
            Math.round(
                direita *
                32767
            ),
            offset
        );


        offset += 2;
    }


    fs.writeFileSync(
        destino,
        buffer
    );


    console.log(
        "✅ Trilha original criada."
    );


    return destino;
}


module.exports = {
    encontrarMusicaUsuario,
    gerarMusicaOriginal
};
