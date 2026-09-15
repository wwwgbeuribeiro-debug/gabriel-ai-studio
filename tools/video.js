const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const sharp = require("sharp");
const ffmpegPath = require("ffmpeg-static");

const ROOT = path.resolve(__dirname, "..");

const ACTIVITY_FILE =
    path.join(ROOT, "memory", "activity.json");

const OUTPUT_DIR =
    path.join(ROOT, "output", "videos");

const TEMP_DIR =
    path.join(ROOT, ".video-tmp");


function carregarAtividade() {

    if (!fs.existsSync(ACTIVITY_FILE)) {
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

    const dados = JSON.parse(texto);

    return Array.isArray(dados)
        ? dados
        : [];
}


function normalizarEvento(item) {

    return {
        agente:
            item.agente ??
            item.agent ??
            "",

        tipo:
            item.tipo ??
            item.type ??
            "evento",

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


function contemDadoSensivel(texto) {

    if (typeof texto !== "string") {
        return true;
    }

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
        padrao => padrao.test(texto)
    );
}


function mensagemUtil(evento) {

    const texto =
        String(evento.mensagem || "")
            .replace(/\s+/g, " ")
            .trim();

    if (!texto) {
        return false;
    }

    if (contemDadoSensivel(texto)) {
        return false;
    }

    // Evita colocar prompts completos no vídeo.
    if (
        /^recebeu a tarefa:/i.test(texto)
    ) {
        return false;
    }

    return true;
}


function selecionarFatos(limite = 5) {

    const permitidos =
        new Set([
            "carlos",
            "severino"
        ]);

    const atividade =
        carregarAtividade()
            .map(normalizarEvento)
            .filter(evento =>
                permitidos.has(
                    String(evento.agente)
                        .toLowerCase()
                        .trim()
                )
            )
            .filter(mensagemUtil);

    const vistos = new Set();
    const selecionados = [];

    for (
        let i = atividade.length - 1;
        i >= 0;
        i--
    ) {

        const evento = atividade[i];

        const chave = [
            evento.agente,
            evento.tipo,
            evento.mensagem
        ].join("|");

        if (vistos.has(chave)) {
            continue;
        }

        vistos.add(chave);
        selecionados.push(evento);

        if (
            selecionados.length >= limite
        ) {
            break;
        }
    }

    return selecionados.reverse();
}


function escaparXml(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


function quebrarTexto(
    texto,
    maxCaracteres = 32
) {

    const palavras =
        String(texto)
            .replace(/\s+/g, " ")
            .trim()
            .split(" ");

    const linhas = [];
    let linha = "";

    for (const palavra of palavras) {

        const candidata =
            linha
                ? `${linha} ${palavra}`
                : palavra;

        if (
            candidata.length >
            maxCaracteres &&
            linha
        ) {
            linhas.push(linha);
            linha = palavra;
        } else {
            linha = candidata;
        }
    }

    if (linha) {
        linhas.push(linha);
    }

    return linhas.slice(0, 8);
}


function horarioCurto(valor) {

    if (!valor) {
        return "";
    }

    const data = new Date(valor);

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function svgBase(conteudo) {

    return `
<svg
    width="1080"
    height="1920"
    viewBox="0 0 1080 1920"
    xmlns="http://www.w3.org/2000/svg"
>
    <defs>
        <linearGradient
            id="bg"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
        >
            <stop
                offset="0%"
                stop-color="#090b12"
            />
            <stop
                offset="55%"
                stop-color="#111628"
            />
            <stop
                offset="100%"
                stop-color="#090b12"
            />
        </linearGradient>
    </defs>

    <rect
        width="1080"
        height="1920"
        fill="url(#bg)"
    />

    <circle
        cx="930"
        cy="190"
        r="260"
        fill="#6557ff"
        opacity="0.12"
    />

    <circle
        cx="120"
        cy="1690"
        r="290"
        fill="#18c7b3"
        opacity="0.08"
    />

    ${conteudo}
</svg>
`;
}


function criarIntro(
    quantidadeFatos
) {

    return svgBase(`
        <text
            x="90"
            y="300"
            font-family="Arial, sans-serif"
            font-size="44"
            fill="#8b82ff"
            font-weight="700"
        >
            GABRIEL AI STUDIO
        </text>

        <text
            x="90"
            y="610"
            font-family="Arial, sans-serif"
            font-size="92"
            fill="#ffffff"
            font-weight="700"
        >
            Trabalho real.
        </text>

        <text
            x="90"
            y="725"
            font-family="Arial, sans-serif"
            font-size="92"
            fill="#ffffff"
            font-weight="700"
        >
            Resultado real.
        </text>

        <text
            x="90"
            y="910"
            font-family="Arial, sans-serif"
            font-size="40"
            fill="#aeb4c6"
        >
            Jairo transformando atividade
        </text>

        <text
            x="90"
            y="970"
            font-family="Arial, sans-serif"
            font-size="40"
            fill="#aeb4c6"
        >
            registrada em vídeo.
        </text>

        <rect
            x="90"
            y="1190"
            width="900"
            height="170"
            rx="34"
            fill="#ffffff"
            opacity="0.07"
        />

        <text
            x="145"
            y="1270"
            font-family="Arial, sans-serif"
            font-size="34"
            fill="#aeb4c6"
        >
            FATOS REAIS SELECIONADOS
        </text>

        <text
            x="145"
            y="1340"
            font-family="Arial, sans-serif"
            font-size="58"
            fill="#ffffff"
            font-weight="700"
        >
            ${quantidadeFatos}
        </text>
    `);
}


function criarCenaFato(
    evento,
    indice,
    total
) {

    const agente =
        escaparXml(
            evento.agente
        );

    const tipo =
        escaparXml(
            evento.tipo
        );

    const hora =
        escaparXml(
            horarioCurto(
                evento.horario
            )
        );

    const linhas =
        quebrarTexto(
            evento.mensagem,
            31
        );

    const linhasSvg =
        linhas
            .map(
                (linha, posicao) => `
        <text
            x="110"
            y="${720 + posicao * 78}"
            font-family="Arial, sans-serif"
            font-size="52"
            fill="#ffffff"
            font-weight="600"
        >
            ${escaparXml(linha)}
        </text>
        `
            )
            .join("");

    return svgBase(`
        <text
            x="90"
            y="230"
            font-family="Arial, sans-serif"
            font-size="34"
            fill="#8b82ff"
            font-weight="700"
        >
            FATO REAL ${indice}/${total}
        </text>

        <rect
            x="90"
            y="330"
            width="900"
            height="190"
            rx="38"
            fill="#ffffff"
            opacity="0.07"
        />

        <text
            x="140"
            y="410"
            font-family="Arial, sans-serif"
            font-size="52"
            fill="#ffffff"
            font-weight="700"
        >
            ${agente}
        </text>

        <text
            x="140"
            y="470"
            font-family="Arial, sans-serif"
            font-size="30"
            fill="#aeb4c6"
        >
            ${tipo}${hora ? ` • ${hora}` : ""}
        </text>

        ${linhasSvg}

        <rect
            x="90"
            y="1530"
            width="900"
            height="130"
            rx="28"
            fill="#6557ff"
            opacity="0.18"
        />

        <text
            x="140"
            y="1605"
            font-family="Arial, sans-serif"
            font-size="30"
            fill="#c5c0ff"
        >
            Fonte: memória real do Gabriel AI Studio
        </text>
    `);
}


function criarOutro() {

    return svgBase(`
        <text
            x="90"
            y="580"
            font-family="Arial, sans-serif"
            font-size="82"
            fill="#ffffff"
            font-weight="700"
        >
            Gabriel AI Studio
        </text>

        <text
            x="90"
            y="760"
            font-family="Arial, sans-serif"
            font-size="46"
            fill="#aeb4c6"
        >
            Agentes trabalhando.
        </text>

        <text
            x="90"
            y="830"
            font-family="Arial, sans-serif"
            font-size="46"
            fill="#aeb4c6"
        >
            Histórico registrado.
        </text>

        <text
            x="90"
            y="900"
            font-family="Arial, sans-serif"
            font-size="46"
            fill="#aeb4c6"
        >
            Vídeo gerado automaticamente.
        </text>

        <rect
            x="90"
            y="1120"
            width="900"
            height="160"
            rx="36"
            fill="#18c7b3"
            opacity="0.12"
        />

        <text
            x="140"
            y="1215"
            font-family="Arial, sans-serif"
            font-size="34"
            fill="#9df0e5"
        >
            Sem fatos inventados.
        </text>
    `);
}


async function criarImagem(
    svg,
    arquivo
) {

    await sharp(
        Buffer.from(svg)
    )
        .png()
        .toFile(arquivo);
}


function caminhoConcat(arquivo) {

    return arquivo
        .replace(/\\/g, "/")
        .replace(/'/g, "'\\''");
}


async function gerarVideoAtividade(
    opcoes = {}
) {

    if (!ffmpegPath) {
        throw new Error(
            "FFmpeg não foi encontrado."
        );
    }

    const limiteFatos =
        Number(
            opcoes.limiteFatos || 5
        );

    const fatos =
        selecionarFatos(
            limiteFatos
        );

    if (fatos.length === 0) {
        throw new Error(
            "Não existem fatos reais suficientes em memory/activity.json."
        );
    }

    fs.mkdirSync(
        OUTPUT_DIR,
        { recursive: true }
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
        { recursive: true }
    );

    const cenas = [];

    const intro =
        path.join(
            TEMP_DIR,
            "000-intro.png"
        );

    await criarImagem(
        criarIntro(
            fatos.length
        ),
        intro
    );

    cenas.push({
        arquivo: intro,
        duracao: 2
    });


    for (
        let i = 0;
        i < fatos.length;
        i++
    ) {

        const arquivo =
            path.join(
                TEMP_DIR,
                `${String(i + 1).padStart(3, "0")}-fato.png`
            );

        await criarImagem(
            criarCenaFato(
                fatos[i],
                i + 1,
                fatos.length
            ),
            arquivo
        );

        cenas.push({
            arquivo,
            duracao: 3
        });
    }


    const outro =
        path.join(
            TEMP_DIR,
            "999-outro.png"
        );

    await criarImagem(
        criarOutro(),
        outro
    );

    cenas.push({
        arquivo: outro,
        duracao: 2
    });


    const concatFile =
        path.join(
            TEMP_DIR,
            "frames.txt"
        );

    const linhas = [];

    for (const cena of cenas) {

        linhas.push(
            `file '${caminhoConcat(cena.arquivo)}'`
        );

        linhas.push(
            `duration ${cena.duracao}`
        );
    }

    // FFmpeg precisa repetir a última imagem.
    linhas.push(
        `file '${caminhoConcat(
            cenas[cenas.length - 1].arquivo
        )}'`
    );

    fs.writeFileSync(
        concatFile,
        linhas.join("\n"),
        "utf8"
    );


    const stamp =
        new Date()
            .toISOString()
            .replace(/[:.]/g, "-");

    const output =
        path.join(
            OUTPUT_DIR,
            `jairo-${stamp}.mp4`
        );


    const resultado =
        spawnSync(
            ffmpegPath,
            [
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concatFile,
                "-vf",
                "fps=30,format=yuv420p",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-movflags",
                "+faststart",
                output
            ],
            {
                stdio: "inherit"
            }
        );


    if (
        resultado.status !== 0 ||
        !fs.existsSync(output)
    ) {
        throw new Error(
            "FFmpeg não conseguiu gerar o vídeo."
        );
    }


    const relativo =
        path.relative(
            ROOT,
            output
        );


    return {
        arquivo: output,
        relativo,
        fatos: fatos.length,
        duracao:
            cenas.reduce(
                (total, cena) =>
                    total + cena.duracao,
                0
            )
    };
}


module.exports = {
    gerarVideoAtividade,
    selecionarFatos
};


if (require.main === module) {

    gerarVideoAtividade()
        .then(resultado => {

            console.log("");
            console.log(
                "✅ VIDEO GERADO"
            );

            console.log(
                `Arquivo: ${resultado.relativo}`
            );

            console.log(
                `Fatos reais usados: ${resultado.fatos}`
            );

            console.log(
                `Duração aproximada: ${resultado.duracao}s`
            );

            console.log("");
        })
        .catch(erro => {

            console.error("");
            console.error(
                "❌ Falha ao gerar vídeo:"
            );

            console.error(
                erro.message
            );

            process.exit(1);
        });
}
