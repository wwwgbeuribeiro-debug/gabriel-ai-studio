const { chromium } = require("playwright");
const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function pausa(page, tempo = 1200) {
    await page.waitForTimeout(tempo);
}

async function clicar(page, locator, nome) {
    console.log(`🖱️ Jairo: ${nome}`);

    await locator.waitFor({
        state: "visible",
        timeout: 10000
    });

    await locator.scrollIntoViewIfNeeded();
    await pausa(page, 500);

    await locator.click();
    await pausa(page, 1200);
}

function converterParaMp4(entrada, saida) {
    return new Promise((resolve, reject) => {
        console.log("\n🎞️ Convertendo gravação para MP4...");

        const processo = spawn(
            ffmpegPath,
            [
                "-y",
                "-i", entrada,

                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",

                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",

                "-an",

                saida
            ],
            {
                stdio: ["ignore", "ignore", "pipe"]
            }
        );

        let erroFFmpeg = "";

        processo.stderr.on("data", dados => {
            erroFFmpeg += dados.toString();
        });

        processo.on("error", erro => {
            reject(erro);
        });

        processo.on("close", codigo => {
            if (codigo === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `FFmpeg terminou com código ${codigo}\n` +
                        erroFFmpeg.slice(-1500)
                    )
                );
            }
        });
    });
}

async function demonstrar(url) {
    console.log("\n🎬 JAIRO DEMONSTRADOR");
    console.log(`🌐 ${url}\n`);

    const pastaVideos = path.join(
        process.cwd(),
        "output",
        "videos"
    );

    fs.mkdirSync(pastaVideos, {
        recursive: true
    });

    const data = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const caminhoWebm = path.join(
        pastaVideos,
        `jairo-temporario-${data}.webm`
    );

    const caminhoMp4 = path.join(
        pastaVideos,
        `jairo-demo-${data}.mp4`
    );

    const browser = await chromium.launch({
        headless: false,
        slowMo: 250,
        args: ["--start-maximized"]
    });

    const context = await browser.newContext({
        viewport: null,

        recordVideo: {
            dir: pastaVideos,
            size: {
                width: 1280,
                height: 720
            }
        }
    });

    const page = await context.newPage();
    const video = page.video();

    const cdp = await context.newCDPSession(page);

    const { windowId } =
        await cdp.send("Browser.getWindowForTarget");

    await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
            windowState: "maximized"
        }
    });

    try {

        console.log("🚀 Abrindo site...");

        await page.goto(url, {
            waitUntil: "networkidle"
        });

        await pausa(page, 2000);

        // =========================
        // STUDIO IA
        // =========================

        console.log("\n🤖 Demonstrando Studio AI...\n");

        const campoPrompt = page
            .getByPlaceholder(/Gato astronauta/i)
            .first();

        await campoPrompt.scrollIntoViewIfNeeded();
        await campoPrompt.click();
        await campoPrompt.fill("");

        await campoPrompt.pressSequentially(
            "Lobo mecanico cyberpunk com neon azul em uma cidade futurista",
            {
                delay: 35
            }
        );

        await pausa(page, 1200);

        const seletorEstilo = page
            .locator("#studio select")
            .first();

        if (await seletorEstilo.isVisible()) {

            await seletorEstilo.selectOption({
                label: "Cyberpunk & Neon"
            });

            await pausa(page, 1200);
        }

        const copiarPrompt = page
            .getByRole(
                "button",
                {
                    name: /Copiar Prompt IA/i
                }
            )
            .first();

        if (await copiarPrompt.isVisible()) {

            await clicar(
                page,
                copiarPrompt,
                "Gerando/copiando prompt da IA"
            );
        }

        // =========================
        // CATÁLOGO
        // =========================

        console.log("\n👕 Demonstrando catálogo...\n");

        const catalogo = page
            .getByRole(
                "link",
                {
                    name: "Catálogo",
                    exact: true
                }
            )
            .first();

        await clicar(
            page,
            catalogo,
            "Abrindo catálogo"
        );

        // =========================
        // FILTRO
        // =========================

        const cyberTech = page
            .getByRole(
                "button",
                {
                    name: "Cyber & Tech",
                    exact: true
                }
            )
            .first();

        await clicar(
            page,
            cyberTech,
            "Filtrando coleção Cyber & Tech"
        );

        // =========================
        // TAMANHO
        // =========================

        const tamanhoM = page
            .locator("button:visible")
            .filter({
                hasText: /^M$/
            })
            .first();

        await clicar(
            page,
            tamanhoM,
            "Selecionando tamanho M"
        );

        // =========================
        // ANALISAR BOTÕES
        // =========================

        console.log("\n🔎 Procurando botão de adicionar...");

        const botoesVisiveis = await page
            .locator("button:visible")
            .allTextContents();

        console.log(
            "Botões disponíveis:",
            botoesVisiveis
        );

        // =========================
        // ADICIONAR
        // =========================

        const adicionar = page
            .getByRole(
                "button",
                {
                    name: /Adicionar/i
                }
            )
            .first();

        await clicar(
            page,
            adicionar,
            "Adicionando camiseta ao carrinho"
        );

        // =========================
        // CARRINHO
        // =========================

        const carrinho = page
            .getByRole(
                "button",
                {
                    name: /Carrinho/i
                }
            )
            .first();

        await clicar(
            page,
            carrinho,
            "Abrindo carrinho"
        );

        // =========================
        // CHECKOUT
        // =========================

        const finalizar = page
            .getByRole(
                "button",
                {
                    name: /Finalizar Compra/i
                }
            )
            .first();

        await clicar(
            page,
            finalizar,
            "Abrindo checkout"
        );

        console.log("\n💳 Checkout aberto.");

        await pausa(page, 1200);

        // =========================
        // DADOS DEMONSTRAÇÃO
        // =========================

        const nome = page.getByPlaceholder(
            "Seu nome"
        );

        if (await nome.isVisible()) {

            console.log(
                "⌨️ Jairo: preenchendo nome"
            );

            await nome.fill(
                "Cliente Demonstracao"
            );

            await pausa(page, 700);
        }

        const email = page.getByPlaceholder(
            "seu@email.com"
        );

        if (await email.isVisible()) {

            console.log(
                "⌨️ Jairo: preenchendo email"
            );

            await email.fill(
                "demo@camisetas.art"
            );

            await pausa(page, 700);
        }

        console.log(
            "\n✅ Demonstração automática concluída!"
        );

        await pausa(page, 4000);

    } catch (erro) {

        console.error(
            "\n❌ Jairo encontrou um problema:"
        );

        console.error(erro.message);

    } finally {

        console.log(
            "\n💾 Finalizando gravação..."
        );

        try {

            await page.close();

            if (video) {
                await video.saveAs(caminhoWebm);
            }

            await context.close();
            await browser.close();

            if (fs.existsSync(caminhoWebm)) {

                await converterParaMp4(
                    caminhoWebm,
                    caminhoMp4
                );

                console.log(
                    "\n✅ Conversão concluída."
                );

                // Remove o WebM temporário
                fs.unlinkSync(caminhoWebm);

                console.log(
                    "\n🎥 VÍDEO MP4 PRONTO:"
                );

                console.log(caminhoMp4);

            } else {

                console.error(
                    "❌ Arquivo de gravação não foi encontrado."
                );
            }

        } catch (erroVideo) {

            console.error(
                "\n⚠️ Problema ao finalizar vídeo:"
            );

            console.error(
                erroVideo.message
            );

        }

        console.log(
            "\n🏁 Jairo finalizado."
        );
    }
}

const url = process.argv[2];

if (!url) {

    console.error(
        "❌ Informe a URL do site."
    );

    process.exit(1);
}

demonstrar(url);
