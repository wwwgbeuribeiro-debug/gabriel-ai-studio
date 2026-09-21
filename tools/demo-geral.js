require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const util = require("util");
const { spawn } = require("child_process");

const {
    executarObjetivoAutonomo
} = require("../agents/autonomous");

const {
    listarEventosSeguros
} = require("./events");

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const PORTA = 5600;

const PASTA_SITE =
    path.join(
        process.cwd(),
        "public",
        "demo-final"
    );

const URL_SITE =
    `http://127.0.0.1:${PORTA}/public/demo-final/index.html`;

// ======================================================
// MISSÃO DA DEMONSTRAÇÃO
// ======================================================

const MISSAO = `
Carlos, objetivo: execute uma missão completa usando apenas o Severino.

Crie do zero um site demonstrativo chamado BuildFlow AI.

Crie tudo somente dentro da pasta:

public/demo-final

Não altere arquivos fora dessa pasta.

O site deve ser responsivo e funcionar sem dependências externas.

Quero uma interface moderna de gestão de obras com:

- dashboard com indicadores;
- cards de atividades;
- filtros de status;
- lista de tarefas;
- botão para abrir detalhes;
- modal;
- formulário simples para criar uma tarefa;
- pelo menos uma interação real em JavaScript;
- visual profissional.

O Severino deve:

- analisar o objetivo;
- criar os arquivos necessários;
- testar o resultado;
- corrigir erros encontrados;
- validar a implementação.

Nesta missão:

- use somente o Severino;
- não use o Jairo;
- não gere vídeo;
- não faça deploy;
- não faça git push;
- não altere server.js;
- não altere agents;
- não altere tools;
- não altere package.json.

Finalize quando o site estiver criado e validado.
`;

// ======================================================
// UTILIDADES
// ======================================================

function timestamp() {
    return new Date()
        .toISOString()
        .replace(/[:.]/g, "-");
}

function garantirPasta(pasta) {
    fs.mkdirSync(
        pasta,
        {
            recursive: true
        }
    );
}

function textoConsole(valor) {

    if (typeof valor === "string") {
        return valor;
    }

    return util.inspect(
        valor,
        {
            depth: 4,
            colors: false
        }
    );
}

// ======================================================
// CAPTURAR LOGS REAIS
// ======================================================

function iniciarCapturaLogs() {

    const linhas = [];

    const logOriginal =
        console.log;

    const erroOriginal =
        console.error;

    console.log = (...args) => {

        const linha =
            args
                .map(textoConsole)
                .join(" ");

        linhas.push(linha);

        logOriginal(
            ...args
        );
    };

    console.error = (...args) => {

        const linha =
            "[ERRO] " +
            args
                .map(textoConsole)
                .join(" ");

        linhas.push(linha);

        erroOriginal(
            ...args
        );
    };

    return {
        linhas,

        restaurar() {
            console.log =
                logOriginal;

            console.error =
                erroOriginal;
        }
    };
}

// ======================================================
// PROVEDORES UTILIZADOS
// ======================================================

function detectarProvedores(
    linhas
) {

    const encontrados =
        new Set();

    for (
        const linha of linhas
    ) {

        const nuvem =
            linha.match(
                /Tentando\s+(Gemini|Groq|Mistral|Cloudflare|OpenRouter)/i
            );

        if (nuvem) {
            encontrados.add(
                nuvem[1]
            );
        }

        const local =
            linha.match(
                /LOCAL_AI:\s*tentando\s+([^.\n]+)/i
            );

        if (local) {
            encontrados.add(
                local[1].trim()
            );
        }
    }

    return [
        ...encontrados
    ];
}

// ======================================================
// DETECTAR CAPACIDADES MOSTRADAS
// ======================================================

function detectarCapacidades(
    linhas,
    eventos
) {

    const texto =
        [
            ...linhas,

            ...eventos.map(
                evento =>
                    evento.mensagem || ""
            )
        ]
            .join("\n")
            .toLowerCase();

    return {
        memoria:
            texto.includes(
                "memória criada"
            ) ||
            texto.includes(
                "memoria criada"
            ),

        checkpointGit:
            texto.includes(
                "checkpoint git"
            ),

        arquivosAnalisados:
            texto.includes(
                "lendo "
            ) ||
            texto.includes(
                "escolhendo arquivos"
            ),

        validacao:
            texto.includes(
                "validação"
            ) ||
            texto.includes(
                "validacao"
            ),

        correcaoAutomatica:
            texto.includes(
                "corrig"
            ),

        planejamento:
            texto.includes(
                "plano"
            ),

        fallbackIA:
            (
                detectarProvedores(
                    linhas
                ).length > 1
            )
    };
}

// ======================================================
// SERVIDOR ESTÁTICO TEMPORÁRIO
// ======================================================

function contentType(
    arquivo
) {

    const ext =
        path.extname(
            arquivo
        ).toLowerCase();

    const tipos = {
        ".html":
            "text/html; charset=utf-8",

        ".css":
            "text/css; charset=utf-8",

        ".js":
            "application/javascript; charset=utf-8",

        ".json":
            "application/json; charset=utf-8",

        ".svg":
            "image/svg+xml",

        ".png":
            "image/png",

        ".jpg":
            "image/jpeg",

        ".jpeg":
            "image/jpeg",

        ".webp":
            "image/webp"
    };

    return (
        tipos[ext] ||
        "application/octet-stream"
    );
}

function iniciarServidor() {

    const raiz =
        process.cwd();

    const servidor =
        http.createServer(
            (req, res) => {

                try {

                    const url =
                        new URL(
                            req.url,
                            `http://127.0.0.1:${PORTA}`
                        );

                    let pathname =
                        decodeURIComponent(
                            url.pathname
                        );

                    if (
                        pathname === "/"
                    ) {

                        pathname =
                            "/public/demo-final/index.html";
                    }

                    const arquivo =
                        path.resolve(
                            raiz,
                            "." + pathname
                        );

                    if (
                        !arquivo
                            .toLowerCase()
                            .startsWith(
                                raiz.toLowerCase()
                            )
                    ) {

                        res.statusCode =
                            403;

                        res.end(
                            "Acesso bloqueado."
                        );

                        return;
                    }

                    if (
                        !fs.existsSync(
                            arquivo
                        )
                    ) {

                        res.statusCode =
                            404;

                        res.end(
                            "Arquivo não encontrado."
                        );

                        return;
                    }

                    const stat =
                        fs.statSync(
                            arquivo
                        );

                    if (
                        stat.isDirectory()
                    ) {

                        res.statusCode =
                            403;

                        res.end(
                            "Diretório."
                        );

                        return;
                    }

                    res.setHeader(
                        "Content-Type",
                        contentType(
                            arquivo
                        )
                    );

                    fs.createReadStream(
                        arquivo
                    )
                        .pipe(
                            res
                        );

                } catch {

                    res.statusCode =
                        500;

                    res.end(
                        "Erro interno."
                    );
                }
            }
        );

    return new Promise(
        (resolve, reject) => {

            servidor.once(
                "error",
                reject
            );

            servidor.listen(
                PORTA,
                "127.0.0.1",
                () => {

                    console.log(
                        `🌐 Servidor da demonstração: ${URL_SITE}`
                    );

                    resolve(
                        servidor
                    );
                }
            );
        }
    );
}

// ======================================================
// EXECUTAR SCRIPT FILHO
// ======================================================

function executarScript(
    arquivo,
    argumentos = []
) {

    return new Promise(
        (resolve, reject) => {

            const processo =
                spawn(
                    process.execPath,
                    [
                        arquivo,
                        ...argumentos
                    ],
                    {
                        cwd:
                            process.cwd(),

                        stdio:
                            "inherit",

                        env:
                            process.env
                    }
                );

            processo.on(
                "error",
                reject
            );

            processo.on(
                "close",
                codigo => {

                    if (
                        codigo === 0
                    ) {

                        resolve();

                    } else {

                        reject(
                            new Error(
                                `Script terminou com código ${codigo}`
                            )
                        );
                    }
                }
            );
        }
    );
}

// ======================================================
// LOCALIZAR VÍDEO NOVO DO JAIRO
// ======================================================

function listarVideosJairo() {

    const pasta =
        path.join(
            process.cwd(),
            "output",
            "videos"
        );

    if (
        !fs.existsSync(
            pasta
        )
    ) {
        return [];
    }

    return fs
        .readdirSync(
            pasta
        )
        .filter(nome =>
            nome.startsWith(
                "jairo-governado-"
            ) &&
            nome.endsWith(
                ".mp4"
            )
        )
        .map(nome =>
            path.join(
                pasta,
                nome
            )
        );
}

function encontrarVideoNovo(
    anteriores
) {

    const antes =
        new Set(
            anteriores
        );

    const candidatos =
        listarVideosJairo()
            .filter(
                arquivo =>
                    !antes.has(
                        arquivo
                    )
            )
            .map(
                arquivo => ({
                    arquivo,

                    data:
                        fs.statSync(
                            arquivo
                        ).mtimeMs
                })
            )
            .sort(
                (a, b) =>
                    b.data - a.data
            );

    return (
        candidatos[0]
            ?.arquivo ||
        null
    );
}

// ======================================================
// SALVAR EVIDÊNCIAS
// ======================================================

function salvarRelatorio({
    pasta,
    linhas,
    eventos,
    resultadoCarlos,
    videoJairo
}) {

    garantirPasta(
        pasta
    );

    const provedores =
        detectarProvedores(
            linhas
        );

    const capacidades =
        detectarCapacidades(
            linhas,
            eventos
        );

    const resumo = {
        criadoEm:
            new Date()
                .toISOString(),

        missao:
            MISSAO.trim(),

        resultadoCarlos,

        site: {
            pasta:
                "public/demo-final",

            url:
                URL_SITE,

            indexExiste:
                fs.existsSync(
                    path.join(
                        PASTA_SITE,
                        "index.html"
                    )
                )
        },

        provedores,

        capacidades,

        eventos,

        videoJairo
    };

    fs.writeFileSync(
        path.join(
            pasta,
            "resumo.json"
        ),

        JSON.stringify(
            resumo,
            null,
            2
        ),

        "utf8"
    );

    fs.writeFileSync(
        path.join(
            pasta,
            "execucao.txt"
        ),

        linhas.join(
            "\n"
        ),

        "utf8"
    );

    if (
        videoJairo &&
        fs.existsSync(
            videoJairo
        )
    ) {

        fs.copyFileSync(
            videoJairo,

            path.join(
                pasta,
                "jairo-navegacao.mp4"
            )
        );
    }

    console.log(
        "\n📦 Evidências da demonstração:"
    );

    console.log(
        pasta
    );

    console.log(
        "\n🧠 Provedores observados:"
    );

    console.log(
        provedores.length
            ? provedores.join(", ")
            : "Nenhum detectado"
    );

    console.log(
        "\n🛡️ Capacidades observadas:"
    );

    console.log(
        capacidades
    );
}

// ======================================================
// PRINCIPAL
// ======================================================

async function principal() {

    console.log(
        "\n=========================================="
    );

    console.log(
        "🚀 GABRIEL AI STUDIO — DEMONSTRAÇÃO GERAL"
    );

    console.log(
        "==========================================\n"
    );

    const idExecucao =
        timestamp();

    const pastaDemo =
        path.join(
            process.cwd(),
            "output",
            "demo-geral",
            idExecucao
        );

    garantirPasta(
        pastaDemo
    );

    const captura =
        iniciarCapturaLogs();

    const eventosAntes =
        listarEventosSeguros(
            200
        );

    const idsAntes =
        new Set(
            eventosAntes.map(
                evento =>
                    evento.id
            )
        );

    const videosAntes =
        listarVideosJairo();

    let resultadoCarlos =
        null;

    let servidor =
        null;

    let videoJairo =
        null;

    try {

        // ======================================
        // ETAPA 1 — CARLOS + SEVERINO
        // ======================================

        console.log(
            "\n=========================================="
        );

        console.log(
            "🧠 ETAPA 1 — CARLOS + SEVERINO"
        );

        console.log(
            "==========================================\n"
        );

        console.log(
            "📥 ORDEM ÚNICA:"
        );

        console.log(
            MISSAO.trim()
        );

        console.log("");

        resultadoCarlos =
            await executarObjetivoAutonomo(
                MISSAO
            );

        console.log(
            "\n✅ Carlos terminou a missão."
        );

        // ======================================
        // VERIFICAR RESULTADO
        // ======================================

        const index =
            path.join(
                PASTA_SITE,
                "index.html"
            );

        if (
            !fs.existsSync(
                index
            )
        ) {

            throw new Error(
                "Carlos/Severino terminaram, mas public/demo-final/index.html não foi encontrado."
            );
        }

        console.log(
            "✅ Site final encontrado."
        );

        // ======================================
        // ETAPA 2 — SERVIDOR
        // ======================================

        console.log(
            "\n=========================================="
        );

        console.log(
            "🌐 ETAPA 2 — PUBLICANDO LOCALMENTE"
        );

        console.log(
            "==========================================\n"
        );

        servidor =
            await iniciarServidor();

        // ======================================
        // ETAPA 3 — JAIRO
        // ======================================

        console.log(
            "\n=========================================="
        );

        console.log(
            "🎬 ETAPA 3 — JAIRO ASSUME"
        );

        console.log(
            "==========================================\n"
        );

        const scriptJairo =
            path.join(
                __dirname,
                "jairo-demo-rapido.js"
            );

        await executarScript(
            scriptJairo,
            [
                URL_SITE
            ]
        );

        videoJairo =
            encontrarVideoNovo(
                videosAntes
            );

        if (
            !videoJairo
        ) {

            throw new Error(
                "Jairo terminou, mas não encontrei um novo MP4 governado."
            );
        }

        console.log(
            "\n✅ Jairo criou a demonstração."
        );

        console.log(
            videoJairo
        );

    } finally {

        if (
            servidor
        ) {

            await new Promise(
                resolve =>
                    servidor.close(
                        resolve
                    )
            );

            console.log(
                "\n🌐 Servidor temporário encerrado."
            );
        }

        const eventosDepois =
            listarEventosSeguros(
                200
            );

        const eventosNovos =
            eventosDepois.filter(
                evento =>
                    !idsAntes.has(
                        evento.id
                    )
            );

        captura.restaurar();

        salvarRelatorio({
            pasta:
                pastaDemo,

            linhas:
                captura.linhas,

            eventos:
                eventosNovos,

            resultadoCarlos,

            videoJairo
        });
    }

    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ DEMONSTRAÇÃO GERAL CONCLUÍDA"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "\nAgora temos material real de:"
    );

    console.log(
        "• Carlos coordenando"
    );

    console.log(
        "• Severino criando/testando"
    );

    console.log(
        "• memória e eventos"
    );

    console.log(
        "• provedores usados"
    );

    console.log(
        "• checkpoint/validação"
    );

    console.log(
        "• Jairo navegando"
    );

    console.log(
        "• MP4 automático"
    );
}

// ======================================================
// EXECUTAR
// ======================================================

principal()
    .catch(erro => {

        console.error(
            "\n❌ DEMONSTRAÇÃO GERAL FALHOU:"
        );

        console.error(
            erro.message
        );

        process.exitCode =
            1;
    });