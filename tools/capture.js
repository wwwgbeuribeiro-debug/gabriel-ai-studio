const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");

const URL =
    "http://127.0.0.1:3000";


function candidatosNavegador() {

    const lista = [];

    if (process.env.CHROME_PATH) {
        lista.push(process.env.CHROME_PATH);
    }

    if (process.env.LOCALAPPDATA) {
        lista.push(
            path.join(
                process.env.LOCALAPPDATA,
                "Google",
                "Chrome",
                "Application",
                "chrome.exe"
            )
        );

        lista.push(
            path.join(
                process.env.LOCALAPPDATA,
                "Microsoft",
                "Edge",
                "Application",
                "msedge.exe"
            )
        );
    }

    lista.push(
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    );

    lista.push(
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    );

    lista.push(
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    );

    lista.push(
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );

    return lista;
}


function encontrarNavegador() {

    const encontrado =
        candidatosNavegador()
            .find(caminho =>
                caminho &&
                fs.existsSync(caminho)
            );

    if (!encontrado) {
        throw new Error(
            "Chrome ou Edge não foi encontrado neste computador."
        );
    }

    return encontrado;
}


async function servidorDisponivel() {

    try {

        const resposta =
            await fetch(
                `${URL}/api/status`,
                {
                    signal:
                        AbortSignal.timeout(1200)
                }
            );

        return resposta.ok;

    } catch {
        return false;
    }
}


async function esperarServidor(
    limiteMs = 10000
) {

    const inicio = Date.now();

    while (
        Date.now() - inicio <
        limiteMs
    ) {

        if (
            await servidorDisponivel()
        ) {
            return true;
        }

        await new Promise(
            resolver =>
                setTimeout(
                    resolver,
                    350
                )
        );
    }

    return false;
}


async function iniciarServidorSeNecessario() {

    if (
        await servidorDisponivel()
    ) {

        return {
            processo: null,
            iniciadoAqui: false
        };
    }

    console.log(
        "🌐 Iniciando servidor temporariamente para a captura..."
    );

    const processo =
        spawn(
            process.execPath,
            ["server.js"],
            {
                cwd: ROOT,
                windowsHide: true,
                stdio: "ignore"
            }
        );

    const abriu =
        await esperarServidor();

    if (!abriu) {

        try {
            processo.kill();
        } catch {}

        throw new Error(
            "Não consegui iniciar o Gabriel AI Studio em localhost:3000."
        );
    }

    return {
        processo,
        iniciadoAqui: true
    };
}


async function protegerCaptura(page) {

    await page.evaluate(() => {

        // Esconde o conteúdo digitado nos campos.
        document
            .querySelectorAll(
                "input, textarea"
            )
            .forEach(elemento => {

                try {
                    elemento.value = "";
                } catch {}

                elemento.setAttribute(
                    "placeholder",
                    "conteúdo ocultado no vídeo"
                );
            });


        // Protege prompts completos e possíveis segredos
        // somente na cópia aberta pelo navegador headless.
        const walker =
            document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT
            );

        const alterar = [];

        while (
            walker.nextNode()
        ) {

            const node =
                walker.currentNode;

            const texto =
                String(
                    node.nodeValue || ""
                );

            if (
                /recebeu a tarefa:/i
                    .test(texto)
            ) {

                alterar.push({
                    node,
                    texto:
                        "Tarefa recebida — conteúdo ocultado no vídeo."
                });

                continue;
            }

            if (
                /\.env|api[_-]?key|password|senha|bearer\s+|credential|credencial/i
                    .test(texto)
            ) {

                alterar.push({
                    node,
                    texto:
                        "[conteúdo protegido]"
                });
            }
        }

        for (
            const item of alterar
        ) {
            item.node.nodeValue =
                item.texto;
        }
    });


    await page.addStyleTag({
        content: `
            input,
            textarea {
                filter: blur(8px) !important;
            }

            * {
                caret-color: transparent !important;
            }
        `
    });
}


async function capturarInterface(
    pastaDestino
) {

    fs.mkdirSync(
        pastaDestino,
        {
            recursive: true
        }
    );

    const servidor =
        await iniciarServidorSeNecessario();

    let browser = null;

    try {

        const executavel =
            encontrarNavegador();

        console.log(
            "📸 Capturando a interface real do Studio..."
        );

        browser =
            await chromium.launch({
                headless: true,
                executablePath:
                    executavel,
                args: [
                    "--disable-gpu",
                    "--no-sandbox"
                ]
            });


        const page =
            await browser.newPage({
                viewport: {
                    width: 1440,
                    height: 900
                },
                deviceScaleFactor: 1
            });


        await page.goto(
            URL,
            {
                waitUntil:
                    "domcontentloaded",
                timeout: 15000
            }
        );


        await page.waitForTimeout(
            1800
        );


        await protegerCaptura(
            page
        );


        await page.evaluate(
            () =>
                window.scrollTo(
                    0,
                    0
                )
        );


        await page.waitForTimeout(
            250
        );


        const topo =
            path.join(
                pastaDestino,
                "interface-topo.png"
            );


        await page.screenshot({
            path: topo,
            fullPage: false
        });


        await page.evaluate(
            () =>
                window.scrollTo(
                    0,
                    document.body.scrollHeight
                )
        );


        await page.waitForTimeout(
            350
        );


        const atividade =
            path.join(
                pastaDestino,
                "interface-atividade.png"
            );


        await page.screenshot({
            path: atividade,
            fullPage: false
        });


        console.log(
            "✅ Interface capturada."
        );


        return {
            topo,
            atividade
        };

    } finally {

        if (browser) {

            try {
                await browser.close();
            } catch {}
        }


        if (
            servidor.iniciadoAqui &&
            servidor.processo
        ) {

            try {
                servidor.processo.kill();
            } catch {}
        }
    }
}


module.exports = {
    capturarInterface
};
