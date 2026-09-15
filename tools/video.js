const fs = require("fs");
const path = require("path");

const {
    spawnSync
} = require("child_process");

const sharp =
    require("sharp");

const ffmpegPath =
    require("ffmpeg-static");

const {
    capturarInterface
} = require("./capture");

const {
    encontrarMusicaUsuario,
    gerarMusicaOriginal
} = require("./music");

const {
    gerarNarracao
} = require("./narration");


const ROOT =
    path.resolve(
        __dirname,
        ".."
    );

const ACTIVITY_FILE =
    path.join(
        ROOT,
        "memory",
        "activity.json"
    );

const OUTPUT_DIR =
    path.join(
        ROOT,
        "output",
        "videos"
    );

const TEMP_DIR =
    path.join(
        ROOT,
        ".video-tmp"
    );


function carregarAtividade() {

    if (
        !fs.existsSync(
            ACTIVITY_FILE
        )
    ) {
        throw new Error(
            "memory/activity.json não existe."
        );
    }

    const texto =
        fs.readFileSync(
            ACTIVITY_FILE,
            "utf8"
        ).trim();

    if (!texto) {
        return [];
    }

    const dados =
        JSON.parse(texto);

    return Array.isArray(dados)
        ? dados
        : [];
}


function normalizar(
    item,
    indice
) {

    return {
        indice,

        agente:
            item.agente ??
            item.agent ??
            "",

        tipo:
            item.tipo ??
            item.type ??
            "",

        mensagem:
            item.mensagem ??
            item.message ??
            "",

        horario:
            item.horario ??
            item.timestamp ??
            ""
    };
}


function eSensivel(texto) {

    const padroes = [
        /\.env/i,
        /api[_-]?key/i,
        /secret/i,
        /password|senha/i,
        /token/i,
        /credential|credencial/i,
        /bearer\s+[a-z0-9_.-]+/i
    ];

    return padroes.some(
        padrao =>
            padrao.test(
                String(texto || "")
            )
    );
}


function limparCaminho(texto) {

    return String(texto || "")
        .trim()
        .replace(
            /[.,;]+$/,
            ""
        )
        .replace(
            /\\/g,
            "/"
        );
}


function ultimaSessaoSeverino(
    eventos
) {

    let fim = -1;

    for (
        let i =
            eventos.length - 1;
        i >= 0;
        i--
    ) {

        const agente =
            String(
                eventos[i].agente || ""
            ).toLowerCase();

        const mensagem =
            String(
                eventos[i].mensagem || ""
            );


        if (
            (
                agente === "carlos" &&
                /tarefa concluída por severino/i
                    .test(mensagem)
            ) ||
            (
                agente === "severino" &&
                /implementação concluída e validada/i
                    .test(mensagem)
            )
        ) {

            fim = i;
            break;
        }
    }


    if (
        fim === -1
    ) {
        return eventos;
    }


    let inicio = 0;


    for (
        let i = fim;
        i >= 0;
        i--
    ) {

        const agente =
            String(
                eventos[i].agente || ""
            ).toLowerCase();

        const mensagem =
            String(
                eventos[i].mensagem || ""
            );


        if (
            agente === "carlos" &&
            /tarefa enviada para severino/i
                .test(mensagem)
        ) {

            inicio = i;
            break;
        }
    }


    return eventos.slice(
        inicio,
        fim + 1
    );
}


function analisarFato(evento) {

    const agente =
        String(
            evento.agente || ""
        ).trim();

    const agenteLower =
        agente.toLowerCase();

    const mensagem =
        String(
            evento.mensagem || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        ![
            "carlos",
            "severino"
        ].includes(
            agenteLower
        )
    ) {
        return null;
    }


    if (
        !mensagem ||
        eSensivel(mensagem)
    ) {
        return null;
    }


    if (
        /^recebeu a tarefa:/i
            .test(mensagem)
    ) {
        return null;
    }


    if (
        /\bjairo\b|\broteiro\b|\bvídeo\b|\bvideo\b/i
            .test(mensagem)
    ) {
        return null;
    }


    const base = {
        ...evento,
        logReal: mensagem
    };


    if (
        agenteLower === "carlos" &&
        /tarefa enviada para severino/i
            .test(mensagem)
    ) {

        return {
            ...base,

            categoria:
                "delegacao",

            titulo:
                "Carlos passou a tarefa",

            resumo:
                "O trabalho foi encaminhado para Severino.",

            narracao:
                "Carlos identificou quem deveria executar o trabalho e passou a tarefa para Severino."
        };
    }


    if (
        /protegendo .*checkpoint git/i
            .test(mensagem)
    ) {

        return {
            ...base,

            categoria:
                "seguranca",

            titulo:
                "Projeto protegido",

            resumo:
                "Antes de alterar o código, Severino criou um ponto seguro.",

            narracao:
                "Antes de mexer no código, Severino protegeu o estado anterior do projeto."
        };
    }


    const alterou =
        mensagem.match(
            /^alterou\s+(.+)/i
        );


    if (alterou) {

        const arquivo =
            limparCaminho(
                alterou[1]
            );


        return {
            ...base,

            categoria:
                "alteracao",

            titulo:
                "Código modificado",

            resumo:
                `${arquivo} foi alterado de verdade.`,

            narracao:
                `Depois ele modificou o arquivo ${arquivo}.`
        };
    }


    if (
        /executando validação/i
            .test(mensagem)
    ) {

        return {
            ...base,

            categoria:
                "validacao",

            titulo:
                "Código em teste",

            resumo:
                "A alteração passou pela validação automática.",

            narracao:
                "Em seguida, o sistema testou automaticamente a alteração."
        };
    }


    if (
        /implementação concluída e validada/i
            .test(mensagem)
    ) {

        return {
            ...base,

            categoria:
                "conclusao",

            titulo:
                "Implementação aprovada",

            resumo:
                "A alteração foi concluída e validada.",

            narracao:
                "A implementação terminou e foi validada com sucesso."
        };
    }


    if (
        agenteLower === "carlos" &&
        /tarefa concluída por severino/i
            .test(mensagem)
    ) {

        return {
            ...base,

            categoria:
                "entrega",

            titulo:
                "Resultado entregue",

            resumo:
                "Carlos recebeu a conclusão do trabalho.",

            narracao:
                "No final, Carlos recebeu o resultado do trabalho concluído."
        };
    }


    return null;
}


function selecionarFatos(
    limite = 6
) {

    const normalizados =
        carregarAtividade()
            .map(normalizar);


    const sessao =
        ultimaSessaoSeverino(
            normalizados
        );


    const fatos =
        sessao
            .map(analisarFato)
            .filter(Boolean);


    if (
        fatos.length === 0
    ) {
        return [];
    }


    const grupos = [
        [
            "delegacao"
        ],
        [
            "seguranca"
        ],
        [
            "alteracao"
        ],
        [
            "validacao"
        ],
        [
            "conclusao"
        ],
        [
            "entrega"
        ]
    ];


    const escolhidos = [];


    for (
        const grupo of grupos
    ) {

        let encontrado =
            null;


        for (
            let i =
                fatos.length - 1;
            i >= 0;
            i--
        ) {

            if (
                grupo.includes(
                    fatos[i].categoria
                )
            ) {

                encontrado =
                    fatos[i];

                break;
            }
        }


        if (
            encontrado &&
            !escolhidos.includes(
                encontrado
            )
        ) {

            escolhidos.push(
                encontrado
            );
        }
    }


    escolhidos.sort(
        (a, b) =>
            a.indice -
            b.indice
    );


    return escolhidos.slice(
        0,
        Math.min(
            Number(limite) || 6,
            6
        )
    );
}


function escaparXml(texto) {

    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


function quebrarTexto(
    texto,
    tamanho,
    maxLinhas
) {

    const palavras =
        String(texto || "")
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .split(" ")
            .filter(Boolean);


    const linhas = [];

    let linha = "";


    for (
        const palavra of palavras
    ) {

        const tentativa =
            linha
                ? `${linha} ${palavra}`
                : palavra;


        if (
            tentativa.length >
                tamanho &&
            linha
        ) {

            linhas.push(linha);

            linha =
                palavra;

        } else {

            linha =
                tentativa;
        }


        if (
            linhas.length >=
            maxLinhas
        ) {
            break;
        }
    }


    if (
        linha &&
        linhas.length <
            maxLinhas
    ) {

        linhas.push(linha);
    }


    return linhas;
}


function linhasSvg(
    linhas,
    opcoes
) {

    return linhas
        .map(
            (
                linha,
                indice
            ) => `
            <text
                x="${opcoes.x}"
                y="${
                    opcoes.y +
                    indice *
                    opcoes.distancia
                }"
                font-family="Arial, Segoe UI, sans-serif"
                font-size="${opcoes.tamanho}"
                font-weight="${opcoes.peso}"
                fill="${opcoes.cor}"
            >
                ${escaparXml(linha)}
            </text>
            `
        )
        .join("");
}


async function imagemInterfaceGrande(
    arquivo,
    agente
) {

    const posicao =
        String(agente)
            .toLowerCase() ===
            "carlos"
            ? "left"
            : "right";


    return sharp(arquivo)
        .resize(
            1000,
            1180,
            {
                fit:
                    "cover",
                position:
                    posicao
            }
        )
        .sharpen()
        .png()
        .toBuffer();
}


async function fundo(
    arquivo
) {

    return sharp(arquivo)
        .resize(
            1080,
            1920,
            {
                fit: "cover"
            }
        )
        .blur(30)
        .modulate({
            brightness:
                0.25,
            saturation:
                0.65
        })
        .png()
        .toBuffer();
}


async function criarIntro(
    captura,
    destino
) {

    const bg =
        await fundo(captura);


    const tela =
        await sharp(captura)
            .resize(
                960,
                650,
                {
                    fit:
                        "cover",
                    position:
                        "top"
                }
            )
            .sharpen()
            .png()
            .toBuffer();


    const overlay = `
    <svg
        width="1080"
        height="1920"
        xmlns="http://www.w3.org/2000/svg"
    >

        <rect
            width="1080"
            height="1920"
            fill="#080a10"
            opacity="0.45"
        />

        <text
            x="60"
            y="150"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="31"
            font-weight="700"
            fill="#988fff"
        >
            GABRIEL AI STUDIO
        </text>

        <text
            x="60"
            y="320"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="82"
            font-weight="700"
            fill="#ffffff"
        >
            Eu dei a tarefa.
        </text>

        <text
            x="60"
            y="425"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="82"
            font-weight="700"
            fill="#ffffff"
        >
            Eles fizeram o resto.
        </text>

        <rect
            x="59"
            y="559"
            width="962"
            height="652"
            rx="30"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.35"
            stroke-width="3"
        />

        <text
            x="60"
            y="1400"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="43"
            font-weight="600"
            fill="#d0d4df"
        >
            Trabalho registrado em tempo real.
        </text>

        <text
            x="60"
            y="1775"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="27"
            fill="#858c9d"
        >
            Jairo Video V4
        </text>

    </svg>
    `;


    await sharp({
        create: {
            width: 1080,
            height: 1920,
            channels: 4,
            background:
                "#080a10"
        }
    })
        .composite([
            {
                input: bg,
                top: 0,
                left: 0
            },
            {
                input: tela,
                top: 560,
                left: 60
            },
            {
                input:
                    Buffer.from(
                        overlay
                    ),
                top: 0,
                left: 0
            }
        ])
        .png()
        .toFile(destino);
}


async function criarCena(
    captura,
    destino,
    fato,
    indice,
    total
) {

    const bg =
        await fundo(captura);


    const tela =
        await imagemInterfaceGrande(
            captura,
            fato.agente
        );


    const titulo =
        quebrarTexto(
            fato.titulo,
            23,
            2
        );


    const resumo =
        quebrarTexto(
            fato.resumo,
            36,
            2
        );


    const log =
        quebrarTexto(
            fato.logReal,
            48,
            2
        );


    const tituloSvg =
        linhasSvg(
            titulo,
            {
                x: 65,
                y: 1450,
                tamanho: 68,
                distancia: 76,
                cor: "#ffffff",
                peso: "700"
            }
        );


    const resumoY =
        1450 +
        titulo.length *
        76 +
        70;


    const resumoSvg =
        linhasSvg(
            resumo,
            {
                x: 65,
                y: resumoY,
                tamanho: 39,
                distancia: 51,
                cor: "#c9ceda",
                peso: "500"
            }
        );


    const logSvg =
        linhasSvg(
            log,
            {
                x: 95,
                y: 1260,
                tamanho: 30,
                distancia: 42,
                cor: "#dedbff",
                peso: "600"
            }
        );


    const overlay = `
    <svg
        width="1080"
        height="1920"
        xmlns="http://www.w3.org/2000/svg"
    >

        <rect
            width="1080"
            height="1920"
            fill="#080a10"
            opacity="0.28"
        />

        <rect
            x="39"
            y="109"
            width="1002"
            height="1182"
            rx="28"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.35"
            stroke-width="3"
        />

        <rect
            x="55"
            y="45"
            width="230"
            height="60"
            rx="30"
            fill="#6557ff"
            fill-opacity="0.90"
        />

        <text
            x="90"
            y="86"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="26"
            font-weight="700"
            fill="#ffffff"
        >
            ${escaparXml(fato.agente)}
        </text>

        <text
            x="1010"
            y="86"
            text-anchor="end"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="25"
            font-weight="700"
            fill="#ffffff"
        >
            ${indice}/${total}
        </text>

        <rect
            x="55"
            y="1195"
            width="970"
            height="150"
            rx="26"
            fill="#151328"
            fill-opacity="0.94"
            stroke="#8177ff"
            stroke-opacity="0.85"
            stroke-width="2"
        />

        <text
            x="95"
            y="1235"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="20"
            font-weight="700"
            fill="#968dff"
        >
            LOG REAL
        </text>

        ${logSvg}

        ${tituloSvg}

        ${resumoSvg}

        <text
            x="65"
            y="1850"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="23"
            fill="#737b8e"
        >
            Gabriel AI Studio • atividade registrada
        </text>

    </svg>
    `;


    await sharp({
        create: {
            width: 1080,
            height: 1920,
            channels: 4,
            background:
                "#080a10"
        }
    })
        .composite([
            {
                input: bg,
                top: 0,
                left: 0
            },
            {
                input: tela,
                top: 110,
                left: 40
            },
            {
                input:
                    Buffer.from(
                        overlay
                    ),
                top: 0,
                left: 0
            }
        ])
        .png()
        .toFile(destino);
}


async function criarOutro(
    captura,
    destino
) {

    const bg =
        await fundo(captura);


    const overlay = `
    <svg
        width="1080"
        height="1920"
        xmlns="http://www.w3.org/2000/svg"
    >

        <rect
            width="1080"
            height="1920"
            fill="#080a10"
            opacity="0.72"
        />

        <text
            x="65"
            y="650"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="82"
            font-weight="700"
            fill="#ffffff"
        >
            Gabriel AI Studio
        </text>

        <text
            x="65"
            y="790"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="46"
            fill="#c8cdd9"
        >
            Carlos organiza.
        </text>

        <text
            x="65"
            y="865"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="46"
            fill="#c8cdd9"
        >
            Severino executa.
        </text>

        <text
            x="65"
            y="940"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="46"
            fill="#c8cdd9"
        >
            Jairo transforma em conteúdo.
        </text>

        <rect
            x="65"
            y="1100"
            width="950"
            height="170"
            rx="36"
            fill="#6557ff"
            fill-opacity="0.22"
        />

        <text
            x="115"
            y="1200"
            font-family="Arial, Segoe UI, sans-serif"
            font-size="39"
            font-weight="700"
            fill="#e0ddff"
        >
            Agentes trabalhando juntos.
        </text>

    </svg>
    `;


    await sharp({
        create: {
            width: 1080,
            height: 1920,
            channels: 4,
            background:
                "#080a10"
        }
    })
        .composite([
            {
                input: bg,
                top: 0,
                left: 0
            },
            {
                input:
                    Buffer.from(
                        overlay
                    ),
                top: 0,
                left: 0
            }
        ])
        .png()
        .toFile(destino);
}


function executarFFmpeg(
    args,
    descricao
) {

    const resultado =
        spawnSync(
            ffmpegPath,
            args,
            {
                stdio: "inherit"
            }
        );


    if (
        resultado.status !== 0
    ) {

        throw new Error(
            `FFmpeg falhou: ${descricao}`
        );
    }
}


function caminhoConcat(arquivo) {

    return path
        .resolve(arquivo)
        .replace(/\\/g, "/")
        .replace(/'/g, "'\\''");
}


function criarSegmento(
    imagem,
    destino,
    duracao,
    indice
) {

    const direcao =
        indice % 2 === 0
            ? "iw/2-(iw/zoom/2)"
            : "iw/2-(iw/zoom/2)+8";


    const filtro =
        [
            "zoompan=" +
            "z='min(max(zoom,pzoom)+0.00065,1.055)':" +
            `x='${direcao}':` +
            "y='ih/2-(ih/zoom/2)':" +
            "d=1:" +
            "s=1080x1920:" +
            "fps=30",

            "format=yuv420p"
        ].join(",");


    executarFFmpeg(
        [
            "-y",

            "-loop",
            "1",

            "-framerate",
            "30",

            "-i",
            imagem,

            "-t",
            String(duracao),

            "-vf",
            filtro,

            "-an",

            "-c:v",
            "libx264",

            "-preset",
            "veryfast",

            "-crf",
            "20",

            destino
        ],

        "cena animada"
    );
}


function juntarSegmentos(
    arquivos,
    destino
) {

    const lista =
        path.join(
            TEMP_DIR,
            "segmentos-v4.txt"
        );


    fs.writeFileSync(
        lista,

        arquivos
            .map(
                arquivo =>
                    `file '${caminhoConcat(
                        arquivo
                    )}'`
            )
            .join("\n"),

        "utf8"
    );


    executarFFmpeg(
        [
            "-y",

            "-f",
            "concat",

            "-safe",
            "0",

            "-i",
            lista,

            "-c",
            "copy",

            destino
        ],

        "concatenação"
    );
}


function adicionarAudio({
    video,
    musica,
    musicaPersonalizada,
    narracao,
    duracao,
    destino
}) {

    const fadeOut =
        Math.max(
            0,
            duracao - 1.5
        );


    const args = [
        "-y",

        "-i",
        video
    ];


    if (
        musicaPersonalizada
    ) {

        args.push(
            "-stream_loop",
            "-1"
        );
    }


    args.push(
        "-i",
        musica
    );


    if (narracao) {

        args.push(
            "-i",
            narracao
        );


        const volumeMusica =
            musicaPersonalizada
                ? "0.13"
                : "0.70";


        args.push(
            "-filter_complex",

            `[1:a]volume=${volumeMusica},` +
            `afade=t=in:st=0:d=0.8,` +
            `afade=t=out:st=${fadeOut}:d=1.5[m];` +

            `[2:a]volume=1.0,` +
            `adelay=350|350[v];` +

            `[m][v]amix=` +
            `inputs=2:` +
            `duration=first:` +
            `dropout_transition=2[a]`,

            "-map",
            "0:v:0",

            "-map",
            "[a]"
        );

    } else {

        const volumeMusica =
            musicaPersonalizada
                ? "0.18"
                : "1.0";


        args.push(
            "-filter_complex",

            `[1:a]volume=${volumeMusica},` +
            `afade=t=in:st=0:d=0.8,` +
            `afade=t=out:st=${fadeOut}:d=1.5[a]`,

            "-map",
            "0:v:0",

            "-map",
            "[a]"
        );
    }


    args.push(
        "-c:v",
        "copy",

        "-c:a",
        "aac",

        "-b:a",
        "160k",

        "-t",
        String(duracao),

        "-movflags",
        "+faststart",

        destino
    );


    executarFFmpeg(
        args,
        "áudio final"
    );
}



function duracaoWav(
    arquivo
) {

    if (
        !arquivo ||
        !fs.existsSync(
            arquivo
        )
    ) {
        return 0;
    }


    const buffer =
        fs.readFileSync(
            arquivo
        );


    if (
        buffer.length < 44 ||
        buffer.toString(
            "ascii",
            0,
            4
        ) !== "RIFF"
    ) {

        return 0;
    }


    let offset = 12;

    let byteRate = 0;
    let dataSize = 0;


    while (
        offset + 8 <=
        buffer.length
    ) {

        const id =
            buffer.toString(
                "ascii",
                offset,
                offset + 4
            );


        const tamanho =
            buffer.readUInt32LE(
                offset + 4
            );


        const inicioDados =
            offset + 8;


        if (
            id === "fmt " &&
            inicioDados + 12 <=
                buffer.length
        ) {

            byteRate =
                buffer.readUInt32LE(
                    inicioDados + 8
                );
        }


        if (
            id === "data"
        ) {

            dataSize =
                tamanho;

            break;
        }


        offset =
            inicioDados +
            tamanho +
            (
                tamanho % 2
            );
    }


    if (
        !byteRate ||
        !dataSize
    ) {

        return 0;
    }


    return (
        dataSize /
        byteRate
    );
}


function estenderVideo(
    video,
    duracaoAtual,
    duracaoFinal
) {

    const extra =
        duracaoFinal -
        duracaoAtual;


    if (
        extra <= 0.05
    ) {

        return video;
    }


    console.log(
        `⏱️ Narração precisa de mais ${extra.toFixed(1)}s. Estendendo o encerramento...`
    );


    const destino =
        path.join(
            TEMP_DIR,
            "v4-video-estendido.mp4"
        );


    executarFFmpeg(
        [
            "-y",

            "-i",
            video,

            "-vf",
            `tpad=stop_mode=clone:stop_duration=${extra.toFixed(3)},format=yuv420p`,

            "-an",

            "-c:v",
            "libx264",

            "-preset",
            "veryfast",

            "-crf",
            "20",

            destino
        ],

        "extensão automática do vídeo"
    );


    return destino;
}


async function gerarVideoAtividade(
    opcoes = {}
) {

    if (!ffmpegPath) {

        throw new Error(
            "FFmpeg não encontrado."
        );
    }


    const limite =
        Math.min(
            Number(
                opcoes.limiteFatos ||
                6
            ),
            6
        );


    const fatos =
        selecionarFatos(
            limite
        );


    if (
        fatos.length < 2
    ) {

        throw new Error(
            "Não encontrei fatos suficientes da última tarefa do Severino."
        );
    }


    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive: true
        }
    );


    fs.rmSync(
        TEMP_DIR,
        {
            recursive: true,
            force: true
        }
    );


    fs.mkdirSync(
        TEMP_DIR,
        {
            recursive: true
        }
    );


    console.log(
        `🧠 Jairo encontrou ${fatos.length} etapas da última execução.`
    );


    const capturas =
        await capturarInterface(
            TEMP_DIR
        );


    const cenas = [];


    const intro =
        path.join(
            TEMP_DIR,
            "000-intro-v4.png"
        );


    await criarIntro(
        capturas.topo,
        intro
    );


    cenas.push({
        arquivo: intro,
        duracao: 2.8
    });


    for (
        let i = 0;
        i < fatos.length;
        i++
    ) {

        const fato =
            fatos[i];


        const arquivo =
            path.join(
                TEMP_DIR,
                `${String(
                    i + 1
                ).padStart(
                    3,
                    "0"
                )}-v4.png`
            );


        const captura =
            fato.agente
                .toLowerCase() ===
                "carlos"
                ? capturas.topo
                : capturas.atividade;


        await criarCena(
            captura,
            arquivo,
            fato,
            i + 1,
            fatos.length
        );


        cenas.push({
            arquivo,
            duracao: 4.4
        });
    }


    const outro =
        path.join(
            TEMP_DIR,
            "999-outro-v4.png"
        );


    await criarOutro(
        capturas.topo,
        outro
    );


    cenas.push({
        arquivo: outro,
        duracao: 2.6
    });


    console.log(
        "🎥 Criando movimento..."
    );


    const segmentos = [];


    for (
        let i = 0;
        i < cenas.length;
        i++
    ) {

        const segmento =
            path.join(
                TEMP_DIR,
                `v4-segmento-${String(
                    i
                ).padStart(
                    3,
                    "0"
                )}.mp4`
            );


        criarSegmento(
            cenas[i].arquivo,
            segmento,
            cenas[i].duracao,
            i
        );


        segmentos.push(
            segmento
        );
    }


    const videoSemAudio =
        path.join(
            TEMP_DIR,
            "v4-sem-audio.mp4"
        );


    juntarSegmentos(
        segmentos,
        videoSemAudio
    );


    const duracao =
        cenas.reduce(
            (
                total,
                cena
            ) =>
                total +
                cena.duracao,
            0
        );


    // -------------------------------------------------
    // MUSICA
    // -------------------------------------------------

    let musica =
        encontrarMusicaUsuario();


    const musicaPersonalizada =
        Boolean(musica);


    if (
        musicaPersonalizada
    ) {

        console.log(
            `🎵 Música personalizada: ${path.basename(
                musica
            )}`
        );

    } else {

        musica =
            path.join(
                TEMP_DIR,
                "jairo-v4-music.wav"
            );


        gerarMusicaOriginal(
            musica,
            duracao
        );
    }


    // -------------------------------------------------
    // NARRACAO BASEADA SOMENTE NOS FATOS ESCOLHIDOS
    // -------------------------------------------------

    const textoNarracao = [
        "Eu dei a tarefa. Eles fizeram o resto.",

        ...fatos.map(
            fato =>
                fato.narracao
        ),

        "Gabriel AI Studio. Agentes trabalhando juntos."
    ].join(" ");


    const narracaoArquivo =
        path.join(
            TEMP_DIR,
            "jairo-v4-narracao.wav"
        );


    const narracao =
        gerarNarracao(
            textoNarracao,
            narracaoArquivo,
            TEMP_DIR
        );


    // -------------------------------------------------
    // DURAÇÃO INTELIGENTE
    // -------------------------------------------------

    const duracaoNarracao =
        narracao
            ? duracaoWav(
                narracao
            )
            : 0;


    // 350 ms do delay da voz +
    // uma pequena folga no encerramento.
    const margemNarracao =
        1.7;


    const duracaoFinal =
        narracao
            ? Math.max(
                duracao,
                duracaoNarracao +
                margemNarracao
            )
            : duracao;


    console.log(
        `🎙️ Narração: ${duracaoNarracao.toFixed(1)}s`
    );


    console.log(
        `🎬 Vídeo final: ${duracaoFinal.toFixed(1)}s`
    );


    const videoFinal =
        estenderVideo(
            videoSemAudio,
            duracao,
            duracaoFinal
        );


    // A trilha criada pelo próprio Jairo
    // também precisa acompanhar a nova duração.
    if (
        !musicaPersonalizada &&
        duracaoFinal >
            duracao + 0.05
    ) {

        gerarMusicaOriginal(
            musica,
            duracaoFinal
        );
    }


    // -------------------------------------------------
    // FINAL
    // -------------------------------------------------

    const stamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );


    const nome =
        `jairo-v4-${stamp}`;


    const output =
        path.join(
            OUTPUT_DIR,
            `${nome}.mp4`
        );


    console.log(
        "🎞️ Finalizando vídeo..."
    );


    adicionarAudio({
        video:
            videoFinal,

        musica,

        musicaPersonalizada,

        narracao,

        duracao:
            duracaoFinal,

        destino:
            output
    });


    const manifesto =
        path.join(
            OUTPUT_DIR,
            `${nome}.json`
        );


    fs.writeFileSync(
        manifesto,

        JSON.stringify(
            {
                versao:
                    "Jairo Video V4",

                criadoEm:
                    new Date()
                        .toISOString(),

                narracao:
                    Boolean(
                        narracao
                    ),

                textoNarracao,

                musica:
                    musicaPersonalizada
                        ? path.basename(
                            musica
                        )
                        : "Trilha original do Jairo",

                fatos:
                    fatos.map(
                        fato => ({
                            agente:
                                fato.agente,

                            categoria:
                                fato.categoria,

                            logReal:
                                fato.logReal,

                            titulo:
                                fato.titulo
                        })
                    )
            },

            null,
            2
        ),

        "utf8"
    );


    return {
        arquivo:
            output,

        relativo:
            path.relative(
                ROOT,
                output
            ),

        fatos:
            fatos.length,

        duracao:
            Math.round(
                duracaoFinal
            ),

        narracao:
            Boolean(
                narracao
            )
    };
}


module.exports = {
    gerarVideoAtividade,
    selecionarFatos
};


if (
    require.main === module
) {

    gerarVideoAtividade({
        limiteFatos: 6
    })
        .then(
            resultado => {

                console.log("");
                console.log(
                    "=========================================="
                );

                console.log(
                    "✅ JAIRO VIDEO V4 PRONTO"
                );

                console.log(
                    "=========================================="
                );

                console.log(
                    `Arquivo: ${resultado.relativo}`
                );

                console.log(
                    `Fatos usados: ${resultado.fatos}`
                );

                console.log(
                    `Duração: ${resultado.duracao}s`
                );

                console.log(
                    `Narração: ${
                        resultado.narracao
                            ? "SIM"
                            : "NÃO"
                    }`
                );

                console.log("");
            }
        )
        .catch(
            erro => {

                console.error("");
                console.error(
                    "❌ ERRO NO JAIRO V4"
                );

                console.error(
                    erro.message
                );

                process.exit(1);
            }
        );
}
