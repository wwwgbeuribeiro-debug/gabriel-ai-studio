require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { chromium } = require("playwright");

const ROOT = process.cwd();

const OUTPUT = path.join(
    ROOT,
    "output",
    "video-projeto-v2"
);

const TEMP = path.join(
    OUTPUT,
    "temp"
);

fs.mkdirSync(TEMP, { recursive: true });

const FISH_API_KEY = process.env.FISH_API_KEY;
const FISH_VOICE_ID = process.env.FISH_VOICE_ID;

const PRELUDE_DURACAO = 30;
const JAIRO_DURACAO = 25;
const OUTRO_DURACAO = 5;
const DURACAO_FINAL = PRELUDE_DURACAO + JAIRO_DURACAO + OUTRO_DURACAO;

// ======================================================
// UTILIDADES
// ======================================================

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dataUri(arquivo) {
    const ext = path.extname(arquivo).toLowerCase();

    const mime =
        ext === ".png"
            ? "image/png"
            : "image/jpeg";

    const base64 =
        fs.readFileSync(arquivo)
            .toString("base64");

    return `data:${mime};base64,${base64}`;
}

function textoSeguro(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function normalizarLinha(linha) {
    return String(linha || "")
        .replace(/\r/g, "")
        .trim();
}

// ======================================================
// ENCONTRAR EXECUÇÃO REAL
// ======================================================

function encontrarDemoGeralMaisRecente() {

    const base =
        path.join(
            ROOT,
            "output",
            "demo-geral"
        );

    if (!fs.existsSync(base)) {
        throw new Error(
            "output/demo-geral não encontrado."
        );
    }

    const pastas =
        fs.readdirSync(base)
            .map(nome => {
                const pasta =
                    path.join(
                        base,
                        nome
                    );

                const resumo =
                    path.join(
                        pasta,
                        "resumo.json"
                    );

                const execucao =
                    path.join(
                        pasta,
                        "execucao.txt"
                    );

                if (
                    !fs.existsSync(resumo) ||
                    !fs.existsSync(execucao)
                ) {
                    return null;
                }

                return {
                    pasta,
                    resumo,
                    execucao,
                    data:
                        fs.statSync(resumo)
                            .mtimeMs
                };
            })
            .filter(Boolean)
            .sort(
                (a, b) =>
                    b.data - a.data
            );

    if (!pastas.length) {
        throw new Error(
            "Nenhuma execução completa encontrada."
        );
    }

    return pastas[0];
}

// ======================================================
// ENCONTRAR VÍDEO BOM DO JAIRO
// ======================================================

function encontrarVideoJairo() {

    const pasta =
        path.join(
            ROOT,
            "output",
            "videos"
        );

    if (!fs.existsSync(pasta)) {
        throw new Error(
            "output/videos não encontrado."
        );
    }

    // Preferimos a versão vertical já aprovada visualmente.
    const preferidos = [
        "jairo-reels-2026-09-21T19-10-08-320Z.mp4",
        "jairo-governado-2026-09-21T17-00-05-614Z.mp4"
    ];

    for (const nome of preferidos) {
        const arquivo =
            path.join(
                pasta,
                nome
            );

        if (fs.existsSync(arquivo)) {
            return arquivo;
        }
    }

    const reels =
        fs.readdirSync(pasta)
            .filter(nome =>
                nome.startsWith("jairo-reels-") &&
                nome.endsWith(".mp4")
            )
            .map(nome => {
                const arquivo =
                    path.join(
                        pasta,
                        nome
                    );

                return {
                    arquivo,
                    data:
                        fs.statSync(arquivo)
                            .mtimeMs
                };
            })
            .sort(
                (a, b) =>
                    b.data - a.data
            );

    if (reels.length) {
        return reels[0].arquivo;
    }

    const governados =
        fs.readdirSync(pasta)
            .filter(nome =>
                nome.startsWith("jairo-governado-") &&
                nome.endsWith(".mp4")
            )
            .map(nome => {
                const arquivo =
                    path.join(
                        pasta,
                        nome
                    );

                return {
                    arquivo,
                    data:
                        fs.statSync(arquivo)
                            .mtimeMs
                };
            })
            .sort(
                (a, b) =>
                    b.data - a.data
            );

    if (!governados.length) {
        throw new Error(
            "Nenhum vídeo do Jairo encontrado."
        );
    }

    return governados[0].arquivo;
}

// ======================================================
// EXTRAIR EVENTOS REAIS DO LOG
// ======================================================

function extrairEventos(log) {

    const linhas =
        log
            .split("\n")
            .map(normalizarLinha)
            .filter(Boolean);

    const achar = (...padroes) => {
        for (const padrao of padroes) {
            const linha =
                linhas.find(l =>
                    padrao.test(l)
                );

            if (linha) {
                return linha;
            }
        }

        return null;
    };

    const todos = padrao =>
        linhas.filter(l =>
            padrao.test(l)
        );

    const trabalho = [
        achar(/Carlos criou \d+ etapa/i),
        achar(/Etapa 1 enviada para Severino/i),
        achar(/Memória criada:/i, /Memoria criada:/i),
        achar(/Mapeando o projeto/i),
        achar(/Escolhendo arquivos/i),
        achar(/Lendo public[\\\/]demo-final[\\\/]index\.html/i),
        achar(/Lendo public[\\\/]demo-final[\\\/]style\.css/i),
        achar(/Lendo public[\\\/]demo-final[\\\/]app\.js/i),
        achar(/checkpoint Git/i),
        achar(/Alterou public[\\\/]demo-final/i),
        achar(/Executando validação/i, /Executando validacao/i),
        achar(/Implementação concluída e validada/i, /Implementacao concluida e validada/i),
        achar(/Carlos encontrou uma etapa que ainda falta/i),
        achar(/Responsividade parcial/i),
        achar(/Completar media queries/i),
        achar(/Objetivo autônomo finalizado/i, /Objetivo autonomo finalizado/i)
    ].filter(Boolean);

    const fallback =
        linhas.filter(l =>
            /Tentando Gemini|Gemini.*503|Tentando Groq|Groq.*413|Tentando Mistral|Mistral.*429|Tentando Cloudflare|Tentando OpenRouter|OpenRouter respondeu|Cloudflare respondeu|Groq respondeu/i
                .test(l)
        );

    const unicos = arr => {
        const visto =
            new Set();

        return arr.filter(item => {
            if (visto.has(item)) {
                return false;
            }

            visto.add(item);
            return true;
        });
    };

    return {
        trabalho:
            unicos(trabalho)
                .slice(0, 13),

        fallback:
            unicos(fallback)
                .slice(0, 10),

        etapas:
            Math.max(
                1,
                ...todos(/=== ETAPA \d+/i)
                    .map(l => {
                        const m =
                            l.match(
                                /ETAPA\s+(\d+)/i
                            );

                        return m
                            ? Number(m[1])
                            : 1;
                    })
            )
    };
}

// ======================================================
// CAPTURAR BUILD FLOW REAL
// ======================================================

async function capturarBuildFlow() {

    const index =
        path.join(
            ROOT,
            "public",
            "demo-final",
            "index.html"
        );

    if (!fs.existsSync(index)) {
        throw new Error(
            "public/demo-final/index.html não encontrado."
        );
    }

    const browser =
        await chromium.launch({
            headless: true
        });

    const page =
        await browser.newPage({
            viewport: {
                width: 1440,
                height: 900
            }
        });

    await page.goto(
        pathToFileURL(index).href,
        {
            waitUntil: "load"
        }
    );

    await esperar(1200);

    const screenshot =
        path.join(
            TEMP,
            "buildflow.png"
        );

    await page.screenshot({
        path: screenshot,
        fullPage: false
    });

    await browser.close();

    return screenshot;
}

// ======================================================
// HTML DO FILME DOS LOGS
// ======================================================

function criarHtmlPrelude({
    eventos,
    screenshot
}) {

    const trabalho =
        JSON.stringify(
            eventos.trabalho
        )
            .replace(/</g, "\\u003c");

    const fallback =
        JSON.stringify(
            eventos.fallback
        )
            .replace(/</g, "\\u003c");

    const screenshotBase64 =
        dataUri(screenshot);

    return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
<meta charset="UTF-8">

<style>

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    background: #05080d;
    font-family: "Segoe UI", Arial, sans-serif;
    color: #f5f7fa;
}

body {
    position: relative;
}

.bg {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(circle at 15% 10%, rgba(36,101,150,.28), transparent 36%),
        radial-gradient(circle at 85% 85%, rgba(41,163,118,.20), transparent 34%),
        #05080d;
}

.top {
    position: absolute;
    left: 64px;
    right: 64px;
    top: 60px;
    display: flex;
    justify-content: space-between;
    z-index: 20;
    font-size: 22px;
    letter-spacing: 3px;
    color: #738196;
    font-weight: 700;
}

.scene {
    position: absolute;
    inset: 0;
    padding: 150px 64px 90px;
    opacity: 0;
    transform: scale(.985);
    transition:
        opacity .45s ease,
        transform .45s ease;
    pointer-events: none;
}

.scene.active {
    opacity: 1;
    transform: scale(1);
}

.eyebrow {
    color: #5ef1c1;
    font-size: 25px;
    letter-spacing: 4px;
    font-weight: 800;
    margin-bottom: 24px;
}

h1 {
    margin: 0;
    font-size: 78px;
    line-height: .98;
    letter-spacing: -3px;
    max-width: 920px;
}

.lead {
    margin-top: 28px;
    font-size: 32px;
    line-height: 1.35;
    color: #aab6c8;
    max-width: 900px;
}

.command {
    margin-top: 72px;
    padding: 38px;
    border-radius: 26px;
    border: 1px solid rgba(94,241,193,.30);
    background: rgba(8,16,24,.78);
    box-shadow: 0 30px 80px rgba(0,0,0,.32);
}

.prompt {
    font-size: 24px;
    color: #5ef1c1;
    margin-bottom: 20px;
    font-weight: 700;
}

.commandText {
    font-size: 35px;
    line-height: 1.42;
    font-weight: 650;
}

.cursor {
    display: inline-block;
    width: 4px;
    height: 38px;
    background: #5ef1c1;
    vertical-align: -6px;
    margin-left: 5px;
    animation: blink .8s infinite;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

.terminal {
    margin-top: 42px;
    height: 1210px;
    border-radius: 26px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(3,8,13,.93);
    overflow: hidden;
    box-shadow: 0 32px 90px rgba(0,0,0,.45);
}

.terminalTop {
    height: 66px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.025);
}

.dot {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: rgba(255,255,255,.18);
}

.terminalTitle {
    margin-left: 10px;
    font-size: 20px;
    color: #768397;
}

.logs {
    height: calc(100% - 66px);
    padding: 30px;
    overflow: hidden;
    font-family: Consolas, "Courier New", monospace;
    font-size: 24px;
    line-height: 1.48;
}

.line {
    opacity: 0;
    transform: translateY(8px);
    margin-bottom: 15px;
    color: #c7d0dc;
    transition: .28s ease;
}

.line.show {
    opacity: 1;
    transform: translateY(0);
}

.line.carlos {
    color: #5cb8ff;
}

.line.severino {
    color: #5ef1c1;
}

.line.erro {
    color: #ff8e8e;
}

.line.ok {
    color: #7bf7a5;
}

.line.ia {
    color: #ffd36d;
}

.browserShot {
    margin-top: 55px;
    width: 100%;
    border-radius: 30px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.13);
    box-shadow: 0 35px 110px rgba(0,0,0,.5);
    background: #111;
}

.browserShot img {
    width: 100%;
    display: block;
}

.result {
    margin-top: 38px;
    padding: 28px 30px;
    border-radius: 22px;
    background: rgba(94,241,193,.10);
    border: 1px solid rgba(94,241,193,.28);
    font-size: 29px;
    font-weight: 700;
    color: #bfffe9;
}

.bigNumber {
    font-size: 210px;
    font-weight: 900;
    letter-spacing: -12px;
    color: #5ef1c1;
    line-height: .8;
    margin-top: 80px;
}

.bigCaption {
    margin-top: 36px;
    font-size: 34px;
    color: #bac5d5;
}

</style>
</head>

<body>

<div class="bg"></div>

<div class="top">
    <span>GABRIEL AI STUDIO</span>
    <span>EXECUÇÃO REAL</span>
</div>

<section id="scene1" class="scene active">

    <div class="eyebrow">
        UMA ORDEM
    </div>

    <h1>
        Da ideia ao resultado.
    </h1>

    <div class="lead">
        Sem montar o vídeo manualmente e sem fingir o que os agentes fizeram.
    </div>

    <div class="command">
        <div class="prompt">
            &gt; CARLOS
        </div>

        <div class="commandText">
            <span id="typing"></span><span class="cursor"></span>
        </div>
    </div>

</section>

<section id="scene2" class="scene">

    <div class="eyebrow">
        CARLOS + SEVERINO
    </div>

    <h1>
        A equipe começou a trabalhar.
    </h1>

    <div class="terminal">
        <div class="terminalTop">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>

            <span class="terminalTitle">
                gabriel-ai-studio
            </span>
        </div>

        <div id="logsWork" class="logs"></div>
    </div>

</section>

<section id="scene3" class="scene">

    <div class="eyebrow">
        FALLBACK MULTI-IA
    </div>

    <h1>
        Uma IA falhou. O trabalho continuou.
    </h1>

    <div class="terminal">
        <div class="terminalTop">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>

            <span class="terminalTitle">
                motor de IA
            </span>
        </div>

        <div id="logsAI" class="logs"></div>
    </div>

</section>

<section id="scene4" class="scene">

    <div class="eyebrow">
        RESULTADO DO SEVERINO
    </div>

    <h1>
        O site nasceu da missão.
    </h1>

    <div class="browserShot">
        <img src="${screenshotBase64}">
    </div>

    <div class="result">
        ✓ BuildFlow AI criado dentro de public/demo-final
    </div>

</section>

<section id="scene5" class="scene">

    <div class="eyebrow">
        AGORA É COM O JAIRO
    </div>

    <h1>
        Código pronto. Navegador na mão dele.
    </h1>

    <div class="bigNumber">
        68
    </div>

    <div class="bigCaption">
        elementos mapeados no site de demonstração
    </div>

    <div class="result">
        Qwen planeja → governança valida → Playwright executa → FFmpeg grava
    </div>

</section>

<script>

const trabalho = ${trabalho};
const fallback = ${fallback};

const scenes = [
    document.getElementById("scene1"),
    document.getElementById("scene2"),
    document.getElementById("scene3"),
    document.getElementById("scene4"),
    document.getElementById("scene5")
];

function showScene(index) {
    scenes.forEach(
        (scene, i) =>
            scene.classList.toggle(
                "active",
                i === index
            )
    );
}

function classeLinha(texto) {

    const t =
        texto.toLowerCase();

    if (t.includes("carlos")) {
        return "carlos";
    }

    if (
        t.includes("severino") ||
        t.includes("memória") ||
        t.includes("memoria") ||
        t.includes("checkpoint")
    ) {
        return "severino";
    }

    if (
        t.includes("falhou") ||
        t.includes("indisponível") ||
        t.includes("indisponivel") ||
        t.includes("503") ||
        t.includes("413") ||
        t.includes("429")
    ) {
        return "erro";
    }

    if (
        t.includes("respondeu") ||
        t.includes("concluída") ||
        t.includes("concluida") ||
        t.includes("validada")
    ) {
        return "ok";
    }

    if (
        t.includes("gemini") ||
        t.includes("groq") ||
        t.includes("mistral") ||
        t.includes("cloudflare") ||
        t.includes("openrouter")
    ) {
        return "ia";
    }

    return "";
}

async function escrever(container, linhas, intervalo) {

    container.innerHTML = "";

    for (const texto of linhas) {

        const div =
            document.createElement("div");

        div.className =
            "line " +
            classeLinha(texto);

        div.textContent =
            texto;

        container.appendChild(div);

        requestAnimationFrame(() => {
            div.classList.add("show");
        });

        container.scrollTop =
            container.scrollHeight;

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    intervalo
                )
        );
    }
}

async function digitar() {

    const texto =
        "Carlos, crie um site, organize a execução, deixe o Severino implementar e validar. Depois eu quero demonstrar o resultado.";

    const destino =
        document.getElementById("typing");

    for (const letra of texto) {

        destino.textContent +=
            letra;

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    22
                )
        );
    }
}

(async () => {

    digitar();

    await new Promise(r => setTimeout(r, 4300));

    showScene(1);

    escrever(
        document.getElementById("logsWork"),
        trabalho,
        520
    );

    await new Promise(r => setTimeout(r, 9200));

    showScene(2);

    escrever(
        document.getElementById("logsAI"),
        fallback,
        520
    );

    await new Promise(r => setTimeout(r, 7200));

    showScene(3);

    await new Promise(r => setTimeout(r, 5000));

    showScene(4);

})();

</script>

</body>
</html>`;
}

// ======================================================
// GRAVAR PRELUDE ANIMADO
// ======================================================

async function gravarPrelude(html) {

    console.log(
        "\n🎥 Gravando Carlos + Severino + fallback..."
    );

    const pastaVideo =
        path.join(
            TEMP,
            "prelude-video"
        );

    fs.rmSync(
        pastaVideo,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        pastaVideo,
        {
            recursive: true
        }
    );

    const browser =
        await chromium.launch({
            headless: true
        });

    const context =
        await browser.newContext({
            viewport: {
                width: 1080,
                height: 1920
            },

            recordVideo: {
                dir: pastaVideo,
                size: {
                    width: 1080,
                    height: 1920
                }
            }
        });

    const page =
        await context.newPage();

    await page.setContent(
        html,
        {
            waitUntil: "load"
        }
    );

    await esperar(
        PRELUDE_DURACAO * 1000
    );

    const video =
        page.video();

    await context.close();

    const webm =
        await video.path();

    await browser.close();

    const mp4 =
        path.join(
            TEMP,
            "prelude.mp4"
        );

    await converterParaMp4(
        webm,
        mp4,
        PRELUDE_DURACAO
    );

    return mp4;
}

// ======================================================
// OUTRO ANIMADO
// ======================================================

function htmlOutro() {

    return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
<meta charset="UTF-8">

<style>

* { box-sizing: border-box; }

html,
body {
    margin: 0;
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    background:
        radial-gradient(circle at 50% 35%, #14382e 0, transparent 42%),
        #05080d;
    color: white;
    font-family: "Segoe UI", Arial, sans-serif;
}

.wrap {
    height: 100%;
    padding: 160px 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.small {
    color: #5ef1c1;
    letter-spacing: 5px;
    font-weight: 800;
    font-size: 26px;
}

h1 {
    margin: 22px 0 55px;
    font-size: 86px;
    line-height: .98;
    letter-spacing: -4px;
}

.grid {
    display: grid;
    gap: 22px;
}

.row {
    opacity: 0;
    transform: translateX(-24px);
    padding: 25px 30px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,.11);
    background: rgba(255,255,255,.045);
    font-size: 31px;
    font-weight: 700;
    transition: .35s ease;
}

.row.show {
    opacity: 1;
    transform: translateX(0);
}

strong {
    color: #5ef1c1;
}

</style>
</head>

<body>

<div class="wrap">

    <div class="small">
        GABRIEL AI STUDIO
    </div>

    <h1>
        Três agentes.<br>
        Um mesmo projeto.
    </h1>

    <div class="grid">

        <div class="row">
            <strong>Carlos</strong> coordena
        </div>

        <div class="row">
            <strong>Severino</strong> desenvolve e testa
        </div>

        <div class="row">
            <strong>Jairo</strong> demonstra e grava
        </div>

        <div class="row">
            Memória • Multi-IA • Git • Governança
        </div>

    </div>

</div>

<script>

const rows =
    [...document.querySelectorAll(".row")];

rows.forEach(
    (row, i) => {

        setTimeout(
            () =>
                row.classList.add("show"),
            450 + i * 650
        );
    }
);

</script>

</body>
</html>`;
}

async function gravarOutro() {

    console.log(
        "\n🎬 Gravando fechamento..."
    );

    const pastaVideo =
        path.join(
            TEMP,
            "outro-video"
        );

    fs.rmSync(
        pastaVideo,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        pastaVideo,
        {
            recursive: true
        }
    );

    const browser =
        await chromium.launch({
            headless: true
        });

    const context =
        await browser.newContext({
            viewport: {
                width: 1080,
                height: 1920
            },

            recordVideo: {
                dir: pastaVideo,
                size: {
                    width: 1080,
                    height: 1920
                }
            }
        });

    const page =
        await context.newPage();

    await page.setContent(
        htmlOutro(),
        {
            waitUntil: "load"
        }
    );

    await esperar(
        OUTRO_DURACAO * 1000
    );

    const video =
        page.video();

    await context.close();

    const webm =
        await video.path();

    await browser.close();

    const mp4 =
        path.join(
            TEMP,
            "outro.mp4"
        );

    await converterParaMp4(
        webm,
        mp4,
        OUTRO_DURACAO
    );

    return mp4;
}

// ======================================================
// FFMPEG
// ======================================================

function ffmpeg(args) {

    return new Promise(
        (resolve, reject) => {

            const proc =
                spawn(
                    ffmpegPath,
                    args,
                    {
                        stdio: [
                            "ignore",
                            "ignore",
                            "pipe"
                        ]
                    }
                );

            let erro = "";

            proc.stderr.on(
                "data",
                chunk => {
                    erro +=
                        chunk.toString();
                }
            );

            proc.on(
                "error",
                reject
            );

            proc.on(
                "close",
                code => {

                    if (code === 0) {
                        resolve();
                    } else {
                        reject(
                            new Error(
                                erro.slice(-4000)
                            )
                        );
                    }
                }
            );
        }
    );
}

async function converterParaMp4(
    entrada,
    saida,
    duracao
) {

    await ffmpeg([
        "-y",
        "-i",
        entrada,
        "-t",
        String(duracao),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-movflags",
        "+faststart",
        saida
    ]);
}

// ======================================================
// PREPARAR TRECHO BOM DO JAIRO
// ======================================================

async function prepararJairo(
    entrada
) {

    console.log(
        "\n🤖 Preparando o trecho bom do Jairo..."
    );

    const saida =
        path.join(
            TEMP,
            "jairo.mp4"
        );

    /*
     * Funciona tanto se o arquivo já for vertical
     * quanto se for horizontal.
     */
    const filtro = [
        "scale=1080:1920:force_original_aspect_ratio=decrease",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#05080d",
        "fps=30",
        "format=yuv420p"
    ].join(",");

    await ffmpeg([
        "-y",
        "-i",
        entrada,
        "-t",
        String(JAIRO_DURACAO),
        "-vf",
        filtro,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        saida
    ]);

    return saida;
}

// ======================================================
// CONCATENAÇÃO
// ======================================================

async function concatenar(
    arquivos
) {

    console.log(
        "\n🧩 Juntando a execução..."
    );

    const lista =
        path.join(
            TEMP,
            "concat.txt"
        );

    fs.writeFileSync(
        lista,
        arquivos
            .map(
                arquivo =>
                    `file '${arquivo.replace(/\\/g, "/")}'`
            )
            .join("\n"),
        "utf8"
    );

    const saida =
        path.join(
            OUTPUT,
            "gabriel-ai-studio-v2-sem-voz.mp4"
        );

    await ffmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        lista,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        saida
    ]);

    return saida;
}

// ======================================================
// FISH AUDIO
// ======================================================

async function gerarNarracao(
    eventos
) {

    if (
        !FISH_API_KEY ||
        !FISH_VOICE_ID
    ) {
        throw new Error(
            "Fish Audio não está configurado no .env."
        );
    }

    console.log(
        "\n🎙️ Gerando narração..."
    );

    const arquivo =
        path.join(
            OUTPUT,
            "narracao-v2.mp3"
        );

    const texto = `
Eu passei as últimas semanas tentando transformar três agentes em uma equipe de verdade.

Eu dou uma missão ao Carlos. Ele organiza o objetivo e divide o trabalho.

O Severino cria memória da tarefa, analisa os arquivos, implementa, usa checkpoint com Git e valida o que fez.

E quando uma inteligência artificial fica indisponível, o motor pode tentar outro provedor sem abandonar a tarefa.

Nessa execução, o próprio Carlos revisou o resultado e percebeu que ainda faltava responsividade. Então criou mais uma etapa antes de encerrar.

Depois entra o Jairo.

Ele mapeia a página, usa inteligência artificial para criar um roteiro, passa as ações pela governança e assume o navegador.

Agora ele está executando a demonstração sozinho.

Carlos coordena. Severino desenvolve. Jairo demonstra.

Esse é o Gabriel AI Studio funcionando como uma equipe.
`.trim();

    const resposta =
        await fetch(
            "https://api.fish.audio/v1/tts",
            {
                method: "POST",

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
                        text: texto,
                        reference_id:
                            FISH_VOICE_ID,
                        format: "mp3"
                    })
            }
        );

    if (!resposta.ok) {
        const erro =
            await resposta.text();

        throw new Error(
            `Fish Audio ${resposta.status}: ${erro}`
        );
    }

    fs.writeFileSync(
        arquivo,
        Buffer.from(
            await resposta.arrayBuffer()
        )
    );

    return arquivo;
}

// ======================================================
// ÁUDIO FINAL
// ======================================================

async function adicionarAudio(
    video,
    audio
) {

    console.log(
        "\n🎧 Finalizando áudio..."
    );

    const saida =
        path.join(
            OUTPUT,
            "gabriel-ai-studio-demo-v2.mp4"
        );

    await ffmpeg([
        "-y",
        "-i",
        video,
        "-i",
        audio,

        "-filter_complex",
        `[1:a]apad=pad_dur=${DURACAO_FINAL}[a]`,

        "-map",
        "0:v:0",

        "-map",
        "[a]",

        "-c:v",
        "copy",

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        "-t",
        String(DURACAO_FINAL),

        "-movflags",
        "+faststart",

        saida
    ]);

    return saida;
}

// ======================================================
// PRINCIPAL
// ======================================================

async function principal() {

    console.log(
        "\n========================================"
    );

    console.log(
        "🎬 GABRIEL AI STUDIO — DEMO V2"
    );

    console.log(
        "========================================"
    );

    const demo =
        encontrarDemoGeralMaisRecente();

    console.log(
        "\n📄 Usando execução:"
    );

    console.log(
        demo.execucao
    );

    const log =
        fs.readFileSync(
            demo.execucao,
            "utf8"
        );

    const eventos =
        extrairEventos(log);

    console.log(
        `\n✅ ${eventos.trabalho.length} eventos de trabalho`
    );

    console.log(
        `✅ ${eventos.fallback.length} eventos de IA`
    );

    console.log(
        `✅ ${eventos.etapas} etapas detectadas`
    );

    const screenshot =
        await capturarBuildFlow();

    console.log(
        "✅ BuildFlow capturado"
    );

    const html =
        criarHtmlPrelude({
            eventos,
            screenshot
        });

    const prelude =
        await gravarPrelude(
            html
        );

    const jairoOriginal =
        encontrarVideoJairo();

    console.log(
        "\n🎥 Vídeo do Jairo:"
    );

    console.log(
        jairoOriginal
    );

    const jairo =
        await prepararJairo(
            jairoOriginal
        );

    const outro =
        await gravarOutro();

    const semVoz =
        await concatenar([
            prelude,
            jairo,
            outro
        ]);

    const audio =
        await gerarNarracao(
            eventos
        );

    const final =
        await adicionarAudio(
            semVoz,
            audio
        );

    console.log(
        "\n========================================"
    );

    console.log(
        "✅ RESULTADO PRONTO"
    );

    console.log(
        "========================================\n"
    );

    console.log(
        final
    );

    console.log(
        "\nDuração aproximada:",
        `${DURACAO_FINAL}s`
    );
}

principal()
    .catch(erro => {

        console.error(
            "\n❌ ERRO:"
        );

        console.error(
            erro.message
        );

        process.exitCode = 1;
    });
