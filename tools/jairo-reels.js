require("dotenv").config();

const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");

const FISH_API_KEY =
    process.env.FISH_API_KEY;

const FISH_VOICE_ID =
    process.env.FISH_VOICE_ID;

// ======================================================
// CONFIGURAÇÃO
// ======================================================

if (!FISH_API_KEY) {
    console.error(
        "❌ FISH_API_KEY não encontrada no .env"
    );

    process.exit(1);
}

if (!FISH_VOICE_ID) {
    console.error(
        "❌ FISH_VOICE_ID não encontrada no .env"
    );

    process.exit(1);
}

// ======================================================
// LOCALIZAR ÚLTIMO VÍDEO GOVERNADO
// ======================================================

function encontrarVideoMaisRecente() {

    const pasta =
        path.join(
            process.cwd(),
            "output",
            "videos"
        );

    if (!fs.existsSync(pasta)) {
        throw new Error(
            "Pasta output/videos não encontrada."
        );
    }

    const arquivos =
        fs.readdirSync(pasta)

            .filter(nome =>
                nome.startsWith(
                    "jairo-governado-"
                ) &&
                nome.endsWith(".mp4")
            )

            .map(nome => {

                const caminho =
                    path.join(
                        pasta,
                        nome
                    );

                return {
                    caminho,

                    data:
                        fs.statSync(
                            caminho
                        ).mtimeMs
                };
            })

            .sort(
                (a, b) =>
                    b.data - a.data
            );

    if (
        arquivos.length === 0
    ) {
        throw new Error(
            "Nenhum vídeo governado encontrado."
        );
    }

    return arquivos[0].caminho;
}

// ======================================================
// GERAR VOZ
// ======================================================

async function gerarVoz(
    texto,
    arquivoSaida
) {

    console.log(
        "\n🎙️ Gerando voz do Jairo..."
    );

    const resposta =
        await fetch(
            "https://api.fish.audio/v1/tts",
            {
                method:
                    "POST",

                headers: {
                    "Authorization":
                        `Bearer ${FISH_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "model":
                        "s2.1-pro-free"
                },

                body:
                    JSON.stringify({
                        text:
                            texto,

                        reference_id:
                            FISH_VOICE_ID,

                        format:
                            "mp3"
                    })
            }
        );

    if (!resposta.ok) {

        const erro =
            await resposta.text();

        throw new Error(
            `Fish Audio respondeu ${resposta.status}: ${erro}`
        );
    }

    const audio =
        Buffer.from(
            await resposta.arrayBuffer()
        );

    fs.writeFileSync(
        arquivoSaida,
        audio
    );

    console.log(
        "✅ Narração criada."
    );

    return arquivoSaida;
}

// ======================================================
// CRIAR REEL
// ======================================================

function criarReel(
    videoEntrada,
    audioEntrada,
    videoSaida
) {

    return new Promise(
        (resolve, reject) => {

            console.log(
                "\n📱 Criando Reel 9:16..."
            );

            /*
             * IMPORTANTE:
             *
             * tpad congela o último frame.
             *
             * Assim, se a narração durar mais
             * que a gravação do navegador,
             * o vídeo permanece no checkout
             * até a voz terminar.
             *
             * O -shortest agora vai encerrar
             * quando o ÁUDIO acabar.
             */

            const filtro = [
                "[0:v]split=2[base][frente]",

                "[base]" +
                    "scale=1080:1920:" +
                    "force_original_aspect_ratio=increase," +
                    "crop=1080:1920," +
                    "boxblur=18:8" +
                    "[fundo]",

                "[frente]" +
                    "scale=1040:-2" +
                    "[principal]",

                "[fundo][principal]" +
                    "overlay=(W-w)/2:(H-h)/2," +

                    // congela o último frame
                    // por até 60 segundos
                    "tpad=" +
                    "stop_mode=clone:" +
                    "stop_duration=60" +
                    "[video]"
            ].join(";");

            const processo =
                spawn(
                    ffmpegPath,
                    [
                        "-y",

                        "-i",
                        videoEntrada,

                        "-i",
                        audioEntrada,

                        "-filter_complex",
                        filtro,

                        "-map",
                        "[video]",

                        "-map",
                        "1:a:0",

                        "-c:v",
                        "libx264",

                        "-preset",
                        "veryfast",

                        "-crf",
                        "21",

                        "-pix_fmt",
                        "yuv420p",

                        "-c:a",
                        "aac",

                        "-b:a",
                        "192k",

                        "-movflags",
                        "+faststart",

                        // agora quem determina
                        // o fim é a voz
                        "-shortest",

                        videoSaida
                    ],
                    {
                        stdio: [
                            "ignore",
                            "ignore",
                            "pipe"
                        ]
                    }
                );

            let erroFFmpeg = "";

            processo.stderr.on(
                "data",
                dados => {

                    erroFFmpeg +=
                        dados.toString();
                }
            );

            processo.on(
                "error",
                reject
            );

            processo.on(
                "close",
                codigo => {

                    /*
                     * Às vezes o FFmpeg no Windows
                     * retorna erro mesmo tendo
                     * escrito o arquivo.
                     *
                     * Só aceitamos como sucesso
                     * se o processo terminou
                     * corretamente.
                     */

                    if (
                        codigo === 0
                    ) {

                        resolve();

                    } else {

                        reject(
                            new Error(
                                erroFFmpeg.slice(
                                    -2500
                                )
                            )
                        );
                    }
                }
            );
        }
    );
}

// ======================================================
// PRINCIPAL
// ======================================================

async function principal() {

    console.log(
        "\n🎬 JAIRO — FINALIZADOR DE REELS\n"
    );

    const videoInformado =
        process.argv[2];

    const videoEntrada =
        videoInformado
            ? path.resolve(
                videoInformado
            )
            : encontrarVideoMaisRecente();

    console.log(
        "🎥 Vídeo base:"
    );

    console.log(
        videoEntrada
    );

    const pastaAudio =
        path.join(
            process.cwd(),
            "output",
            "audio"
        );

    const pastaVideos =
        path.join(
            process.cwd(),
            "output",
            "videos"
        );

    fs.mkdirSync(
        pastaAudio,
        {
            recursive: true
        }
    );

    fs.mkdirSync(
        pastaVideos,
        {
            recursive: true
        }
    );

    const data =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    const audio =
        path.join(
            pastaAudio,
            `jairo-narracao-${data}.mp3`
        );

    const reel =
        path.join(
            pastaVideos,
            `jairo-reels-${data}.mp4`
        );

    // ==================================================
    // NARRAÇÃO
    // ==================================================

    const narracao = `
[excited] Eu pedi para minha equipe de IAs demonstrar um site que ela mesma criou.

O Jairo analisou a página e criou um roteiro.

Antes de assumir o navegador, a governança conferiu e corrigiu as ações.

Agora ele testa o Studio de criação, escolhe o estilo, navega pelo catálogo, seleciona o tamanho, adiciona ao carrinho e chega até o checkout.

[confident] E ninguém tocou no mouse.
`;

    // ==================================================
    // VOZ
    // ==================================================

    await gerarVoz(
        narracao,
        audio
    );

    // ==================================================
    // REEL
    // ==================================================

    await criarReel(
        videoEntrada,
        audio,
        reel
    );

    console.log(
        "\n================================"
    );

    console.log(
        "✅ REEL FINALIZADO"
    );

    console.log(
        "================================\n"
    );

    console.log(
        reel
    );

    console.log(
        "\n🎙️ A voz termina antes do vídeo encerrar."
    );

    console.log(
        "📱 Formato: 1080x1920 (9:16)"
    );
}

// ======================================================
// INICIAR
// ======================================================

principal()
    .catch(erro => {

        console.error(
            "\n❌ Erro ao criar Reel:"
        );

        console.error(
            erro.message
        );

        process.exitCode = 1;
    });
    