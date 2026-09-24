const { chromium } = require("playwright");
const { usarIACodigo } = require("./ai");
const ffmpegPath = require("ffmpeg-static");

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const MAX_ACOES = 9;

// ======================================================
// UTILIDADES
// ======================================================

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function extrairJSON(texto) {
    const limpo = String(texto || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const inicio = limpo.indexOf("[");
    const fim = limpo.lastIndexOf("]");

    if (
        inicio === -1 ||
        fim === -1
    ) {
        throw new Error(
            "A IA não retornou uma lista JSON."
        );
    }

    const resultado = JSON.parse(
        limpo.slice(inicio, fim + 1)
    );

    if (!Array.isArray(resultado)) {
        throw new Error(
            "O roteiro da IA não é uma lista."
        );
    }

    return resultado;
}

// ======================================================
// MAPEAR PÁGINA
// ======================================================

async function mapearPagina(page) {
    return page.evaluate(() => {

        function pegarTexto(el) {
            return (
                el.innerText ||
                el.getAttribute("aria-label") ||
                el.getAttribute("placeholder") ||
                el.getAttribute("title") ||
                el.value ||
                ""
            )
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 160);
        }

        const elementos = [
            ...document.querySelectorAll(
                `
                button,
                a,
                input,
                select,
                textarea,
                [role="button"]
                `
            )
        ];

        return elementos
            .filter(el => {

                const estilo =
                    window.getComputedStyle(el);

                return (
                    estilo.display !== "none" &&
                    estilo.visibility !== "hidden" &&
                    el.offsetWidth > 0 &&
                    el.offsetHeight > 0
                );
            })
            .map((el, index) => {

                const item = {
                    numero:
                        index + 1,

                    tipo:
                        el.tagName.toLowerCase(),

                    texto:
                        pegarTexto(el),

                    id:
                        el.id || "",

                    placeholder:
                        el.getAttribute(
                            "placeholder"
                        ) || "",

                    href:
                        el.getAttribute(
                            "href"
                        ) || ""
                };

                if (
                    el.tagName.toLowerCase() ===
                    "select"
                ) {

                    item.opcoes = [
                        ...el.options
                    ].map(option =>
                        option.textContent.trim()
                    );
                }

                return item;
            });
    });
}

// ======================================================
// LOCALIZAR ELEMENTOS NO MAPA
// ======================================================

function encontrar(
    mapa,
    regex,
    tipo = null
) {

    return mapa.find(item => {

        if (
            tipo &&
            item.tipo !== tipo
        ) {
            return false;
        }

        const texto =
            normalizarTexto(
                item.texto ||
                item.placeholder
            );

        return regex.test(texto);
    });
}

function encontrarTodos(
    mapa,
    regex,
    tipo = null
) {

    return mapa.filter(item => {

        if (
            tipo &&
            item.tipo !== tipo
        ) {
            return false;
        }

        const texto =
            normalizarTexto(
                item.texto ||
                item.placeholder
            );

        return regex.test(texto);
    });
}

// ======================================================
// IA CRIA UM PLANO
// ======================================================

function montarPrompt(mapa) {

    const mapaCompacto =
        mapa.map(item => ({
            numero:
                item.numero,

            tipo:
                item.tipo,

            texto:
                item.texto,

            placeholder:
                item.placeholder,

            opcoes:
                item.opcoes
        }));

    return `
Você é Jairo, agente demonstrador de software
do Gabriel AI Studio.

Analise o site e proponha um roteiro visual curto.

Você fará UMA ÚNICA análise.
Depois o sistema executará o roteiro sem consultar você novamente.

Crie entre 6 e 9 ações.

OBJETIVO:
mostrar as funcionalidades mais interessantes do site.

AÇÕES PERMITIDAS:

"clicar"
"preencher"
"selecionar"

REGRAS:

- Não invente elementos.
- Use somente números existentes no mapa.
- INPUT e TEXTAREA devem usar "preencher".
- SELECT deve usar "selecionar".
- BUTTON e LINK devem usar "clicar".
- Se houver campo de criação/prompt,
  preencha antes de copiar ou utilizar.
- Se houver produto,
  escolha tamanho/opção antes de adicionar.
- Pode abrir carrinho.
- Pode abrir checkout.
- NÃO conclua pagamento.
- NÃO confirme pedido.
- NÃO clique em link externo.
- NÃO execute compra real.
- Evite ações repetidas.

FORMATO:

[
    {
        "acao": "preencher",
        "elemento": 9,
        "valor": "Lobo samurai cyberpunk com neon",
        "motivo": "Demonstrar personalização"
    },
    {
        "acao": "selecionar",
        "elemento": 10,
        "valor": "Cyberpunk & Neon",
        "motivo": "Demonstrar estilos"
    },
    {
        "acao": "clicar",
        "elemento": 16,
        "motivo": "Demonstrar filtro"
    }
]

Responda SOMENTE JSON.

MAPA REAL DA PÁGINA:

${JSON.stringify(mapaCompacto)}
`;
}

async function criarPlanoIA(mapa) {

    console.log(
        "\n🧠 Jairo analisando o site..."
    );

    console.log(
        "⏳ Uma única chamada à IA.\n"
    );

    try {

        const resposta =
            await usarIACodigo(
                montarPrompt(mapa)
            );

        const plano =
            extrairJSON(resposta);

        console.log(
            `✅ IA sugeriu ${plano.length} ações.`
        );

        return plano;

    } catch (erro) {

        console.log(
            "⚠️ A IA não conseguiu criar um roteiro utilizável."
        );

        console.log(
            "🛡️ A governança continuará usando o mapa do site."
        );

        console.log(
            `Motivo: ${erro.message}`
        );

        return [];
    }
}

// ======================================================
// SEGURANÇA
// ======================================================

function elementoBloqueado(elemento) {

    const texto =
        normalizarTexto(
            elemento?.texto
        );

    const bloqueios = [
        /pagar agora/,
        /confirmar pagamento/,
        /confirmar pedido/,
        /realizar pagamento/,
        /comprar agora/,
        /encomendar camiseta customizada/
    ];

    return bloqueios.some(
        regra =>
            regra.test(texto)
    );
}

// ======================================================
// CORRIGIR AÇÃO DA IA
// ======================================================

function corrigirPasso(
    passo,
    elemento
) {

    const corrigido = {
        ...passo
    };

    // INPUT / TEXTAREA
    if (
        elemento.tipo === "input" ||
        elemento.tipo === "textarea"
    ) {

        corrigido.acao =
            "preencher";

        if (!corrigido.valor) {

            corrigido.valor =
                "Lobo samurai cyberpunk com neon em uma cidade futurista";
        }

        return corrigido;
    }

    // SELECT
    if (
        elemento.tipo === "select"
    ) {

        corrigido.acao =
            "selecionar";

        const opcoes =
            elemento.opcoes || [];

        const valorExiste =
            opcoes.some(opcao =>
                normalizarTexto(opcao) ===
                normalizarTexto(
                    corrigido.valor
                )
            );

        if (!valorExiste) {

            const opcaoInteressante =
                opcoes.find(opcao =>
                    !/mais populares/i.test(
                        opcao
                    )
                );

            corrigido.valor =
                opcaoInteressante ||
                opcoes[0];
        }

        return corrigido;
    }

    // BUTTON / LINK
    if (
        elemento.tipo === "button" ||
        elemento.tipo === "a"
    ) {

        corrigido.acao =
            "clicar";

        delete corrigido.valor;

        return corrigido;
    }

    return corrigido;
}

// ======================================================
// CRIAR PASSO GOVERNADO
// ======================================================

function criarPasso(
    elemento,
    acao,
    valor,
    motivo
) {

    if (!elemento) {
        return null;
    }

    const passo = {
        acao,
        elemento:
            elemento.numero,
        motivo
    };

    if (
        valor !== undefined &&
        valor !== null
    ) {

        passo.valor =
            valor;
    }

    return passo;
}

function adicionarSemDuplicar(
    roteiro,
    passo
) {

    if (!passo) {
        return;
    }

    const existe =
        roteiro.some(item =>
            item.elemento ===
                passo.elemento &&
            item.acao ===
                passo.acao
        );

    if (!existe) {
        roteiro.push(passo);
    }
}

// ======================================================
// GOVERNANÇA DO JAIRO
// ======================================================

function governarPlano(
    planoIA,
    mapa
) {

    console.log(
        "\n================================"
    );

    console.log(
        "🛡️ GOVERNANÇA DO JAIRO"
    );

    console.log(
        "================================\n"
    );

    // ------------------------------------------
    // Primeiro: limpar sugestões da IA
    // ------------------------------------------

    const sugestoesValidas = [];

    for (const passo of planoIA) {

        if (
            !passo ||
            typeof passo !== "object"
        ) {
            continue;
        }

        const elemento =
            mapa.find(
                item =>
                    item.numero ===
                    passo.elemento
            );

        if (!elemento) {

            console.log(
                `⚠️ Elemento ${passo.elemento} inexistente.`
            );

            continue;
        }

        if (
            elementoBloqueado(
                elemento
            )
        ) {

            console.log(
                `🛑 Ação bloqueada: ${elemento.texto}`
            );

            continue;
        }

        sugestoesValidas.push(
            corrigirPasso(
                passo,
                elemento
            )
        );
    }

    // ------------------------------------------
    // Detectar capacidades deste site
    // ------------------------------------------

    const criarPrompt =
        encontrar(
            mapa,
            /criar com prompt/
        );

    const campoPrompt =
        encontrar(
            mapa,
            /gato astronauta|prompt/,
            "input"
        );

    const selectEstilo =
        mapa.find(item =>
            item.tipo === "select" &&
            Array.isArray(
                item.opcoes
            ) &&
            item.opcoes.some(
                opcao =>
                    /cyberpunk/i.test(
                        opcao
                    )
            )
        );

    const copiarPrompt =
        encontrar(
            mapa,
            /copiar prompt/,
            "button"
        );

    const filtroCyber =
        encontrar(
            mapa,
            /cyber.*tech/,
            "button"
        );

    const tamanhos =
        encontrarTodos(
            mapa,
            /^(p|m|g|gg)$/,
            "button"
        );

    const tamanhoM =
        tamanhos.find(
            item =>
                normalizarTexto(
                    item.texto
                ) === "m"
        ) ||
        tamanhos[0];

    const adicionar =
        encontrar(
            mapa,
            /^adicionar$/,
            "button"
        );

    const carrinho =
        encontrar(
            mapa,
            /carrinho/,
            "button"
        );

    const checkout =
        encontrar(
            mapa,
            /finalizar compra/,
            "button"
        );

    // ------------------------------------------
    // Roteiro governado
    // ------------------------------------------

    const roteiro = [];

    // 1 - Entrar no Studio
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            criarPrompt,
            "clicar",
            null,
            "Abrir ferramenta criativa"
        )
    );

    // 2 - Escrever prompt
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            campoPrompt,
            "preencher",
            "Lobo samurai cyberpunk com neon em uma cidade futurista",
            "Demonstrar personalização"
        )
    );

    // 3 - Escolher estilo
    if (selectEstilo) {

        const opcaoCyber =
            selectEstilo.opcoes.find(
                opcao =>
                    /cyberpunk/i.test(
                        opcao
                    )
            );

        adicionarSemDuplicar(
            roteiro,
            criarPasso(
                selectEstilo,
                "selecionar",
                opcaoCyber ||
                    selectEstilo.opcoes[0],
                "Demonstrar escolha de estilo"
            )
        );
    }

    // 4 - Copiar prompt
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            copiarPrompt,
            "clicar",
            null,
            "Demonstrar geração do prompt"
        )
    );

    // 5 - Filtrar catálogo
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            filtroCyber,
            "clicar",
            null,
            "Demonstrar filtro de produtos"
        )
    );

    // 6 - Tamanho vem ANTES de adicionar
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            tamanhoM,
            "clicar",
            null,
            "Selecionar tamanho"
        )
    );

    // 7 - Adicionar
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            adicionar,
            "clicar",
            null,
            "Adicionar produto ao carrinho"
        )
    );

    // 8 - Carrinho
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            carrinho,
            "clicar",
            null,
            "Abrir carrinho"
        )
    );

    // 9 - Checkout
    adicionarSemDuplicar(
        roteiro,
        criarPasso(
            checkout,
            "clicar",
            null,
            "Mostrar checkout sem concluir compra"
        )
    );

    // Se for outro site e faltar algo,
    // aproveita as decisões válidas da IA.

    for (
        const sugestao of
        sugestoesValidas
    ) {

        if (
            roteiro.length >=
            MAX_ACOES
        ) {
            break;
        }

        adicionarSemDuplicar(
            roteiro,
            sugestao
        );
    }

    const final =
        roteiro.slice(
            0,
            MAX_ACOES
        );

    console.log(
        `✅ ${final.length} ações aprovadas.\n`
    );

    final.forEach(
        (passo, indice) => {

            const elemento =
                mapa.find(
                    item =>
                        item.numero ===
                        passo.elemento
                );

            console.log(
                `${indice + 1}. ${passo.acao.toUpperCase()} → ${elemento?.texto || elemento?.placeholder}`
            );
        }
    );

    return final;
}

// ======================================================
// ENCONTRAR ELEMENTO NO NAVEGADOR
// ======================================================

function locatorDoElemento(
    page,
    elemento
) {

    // ID
    if (elemento.id) {

        const idSeguro =
            elemento.id.replace(
                /"/g,
                '\\"'
            );

        return page
            .locator(
                `[id="${idSeguro}"]`
            )
            .first();
    }

    // PLACEHOLDER
    if (elemento.placeholder) {

        return page
            .getByPlaceholder(
                elemento.placeholder,
                {
                    exact: true
                }
            )
            .first();
    }

    // BUTTON
    if (
        elemento.tipo ===
        "button"
    ) {

        const texto =
            normalizarTexto(
                elemento.texto
            );

        // Carrinho muda de
        // "Carrinho 0" para "Carrinho 1"
        if (
            texto.includes(
                "carrinho"
            )
        ) {

            return page
                .getByRole(
                    "button",
                    {
                        name:
                            /carrinho/i
                    }
                )
                .first();
        }

        if (
            texto.includes(
                "finalizar compra"
            )
        ) {

            return page
                .getByRole(
                    "button",
                    {
                        name:
                            /finalizar compra/i
                    }
                )
                .first();
        }

        return page
            .getByRole(
                "button",
                {
                    name:
                        elemento.texto,

                    exact:
                        true
                }
            )
            .first();
    }

    // LINK
    if (
        elemento.tipo ===
        "a"
    ) {

        return page
            .getByRole(
                "link",
                {
                    name:
                        elemento.texto,

                    exact:
                        true
                }
            )
            .first();
    }

    // SELECT
    if (
        elemento.tipo ===
        "select"
    ) {

        if (
            elemento.opcoes?.length
        ) {

            return page
                .locator("select")
                .filter({
                    hasText:
                        elemento.opcoes[0]
                })
                .first();
        }

        return page
            .locator("select")
            .first();
    }

    return page
        .locator(
            elemento.tipo
        )
        .first();
}

// ======================================================
// EXECUTAR ROTEIRO
// ======================================================

async function executarPlano(
    page,
    plano,
    mapa
) {

    console.log(
        "\n🎬 Jairo começou a demonstração.\n"
    );

    let numero = 0;

    for (const passo of plano) {

        numero++;

        const elemento =
            mapa.find(
                item =>
                    item.numero ===
                    passo.elemento
            );

        if (!elemento) {

            console.log(
                `⚠️ Passo ${numero} ignorado: elemento não encontrado.`
            );

            continue;
        }

        const locator =
            locatorDoElemento(
                page,
                elemento
            );

        try {

            await locator.waitFor({
                state:
                    "visible",

                timeout:
                    8000
            });

            await locator
                .scrollIntoViewIfNeeded();

            await page.waitForTimeout(
                500
            );

            console.log(
                `${numero}. ${passo.acao.toUpperCase()} → ${elemento.texto || elemento.placeholder}`
            );

            // ----------------------------------
            // PREENCHER
            // ----------------------------------

            if (
                passo.acao ===
                "preencher"
            ) {

                await locator.fill("");

                await locator
                    .pressSequentially(
                        String(
                            passo.valor
                        ),
                        {
                            delay: 30
                        }
                    );
            }

            // ----------------------------------
            // SELECIONAR
            // ----------------------------------

            else if (
                passo.acao ===
                "selecionar"
            ) {

                await locator
                    .selectOption({
                        label:
                            String(
                                passo.valor
                            )
                    });
            }

            // ----------------------------------
            // CLICAR
            // ----------------------------------

            else if (
                passo.acao ===
                "clicar"
            ) {

                await locator.click();
            }

            await page.waitForTimeout(
                1300
            );

        } catch (erro) {

            console.log(
                `⚠️ Passo ${numero} não executado: ${erro.message.split("\n")[0]}`
            );
        }
    }

    console.log(
        "\n✅ Demonstração terminada."
    );
}

// ======================================================
// CONVERTER VÍDEO PARA MP4
// ======================================================

function converterParaMp4(
    entrada,
    saida
) {

    return new Promise(
        (resolve, reject) => {

            const processo =
                spawn(
                    ffmpegPath,
                    [
                        "-y",

                        "-i",
                        entrada,

                        "-c:v",
                        "libx264",

                        "-preset",
                        "veryfast",

                        "-crf",
                        "22",

                        "-pix_fmt",
                        "yuv420p",

                        "-movflags",
                        "+faststart",

                        "-an",

                        saida
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

                    if (
                        codigo === 0
                    ) {

                        resolve();

                    } else {

                        reject(
                            new Error(
                                erroFFmpeg.slice(
                                    -1500
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
// FASE 1 - PLANEJAMENTO SEM GRAVAÇÃO
// ======================================================

async function planejar(url) {

    console.log(
        "\n================================"
    );

    console.log(
        "🧠 FASE 1 — PLANEJAMENTO"
    );

    console.log(
        "================================\n"
    );

    const browser =
        await chromium.launch({
            headless: true
        });

    try {

        const page =
            await browser.newPage();

        await page.goto(
            url,
            {
                waitUntil:
                    "networkidle"
            }
        );

        const mapa =
            await mapearPagina(
                page
            );

        console.log(
            `🔎 ${mapa.length} elementos encontrados.`
        );

        const planoIA =
            await criarPlanoIA(
                mapa
            );

        const plano =
            governarPlano(
                planoIA,
                mapa
            );

        if (
            plano.length <
            3
        ) {

            throw new Error(
                "A governança não conseguiu criar um roteiro suficiente."
            );
        }

        return {
            mapa,
            plano
        };

    } finally {

        await browser.close();
    }
}

// ======================================================
// FASE 2 - GRAVAÇÃO
// ======================================================

async function gravar(
    url,
    mapa,
    plano
) {

    console.log(
        "\n================================"
    );

    console.log(
        "🎥 FASE 2 — GRAVAÇÃO"
    );

    console.log(
        "================================\n"
    );

    const pasta =
        path.join(
            process.cwd(),
            "output",
            "videos"
        );

    fs.mkdirSync(
        pasta,
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

    const webm =
        path.join(
            pasta,
            `jairo-temp-${data}.webm`
        );

    const mp4 =
        path.join(
            pasta,
            `jairo-governado-${data}.mp4`
        );

    const browser =
        await chromium.launch({
            headless:
                false,

            args: [
                "--start-maximized"
            ]
        });

    const context =
        await browser.newContext({
            viewport:
                null,

            recordVideo: {
                dir:
                    pasta,

                size: {
                    width:
                        1280,

                    height:
                        720
                }
            }
        });

    const page =
        await context.newPage();

    const video =
        page.video();

    try {

        // Maximizar de verdade

        const cdp =
            await context
                .newCDPSession(
                    page
                );

        const {
            windowId
        } =
            await cdp.send(
                "Browser.getWindowForTarget"
            );

        await cdp.send(
            "Browser.setWindowBounds",
            {
                windowId,

                bounds: {
                    windowState:
                        "maximized"
                }
            }
        );

        await page.goto(
            url,
            {
                waitUntil:
                    "networkidle"
            }
        );

        await page.waitForTimeout(
            1500
        );

        await executarPlano(
            page,
            plano,
            mapa
        );

        await page.waitForTimeout(
            2500
        );

    } finally {

        console.log(
            "\n💾 Salvando gravação..."
        );

        await page.close();

        if (video) {

            await video.saveAs(
                webm
            );
        }

        await context.close();
        await browser.close();
    }

    if (
        !fs.existsSync(
            webm
        )
    ) {

        throw new Error(
            "O vídeo WebM não foi criado."
        );
    }

    console.log(
        "🎞️ Convertendo para MP4..."
    );

    await converterParaMp4(
        webm,
        mp4
    );

    if (
        fs.existsSync(
            webm
        )
    ) {

        fs.unlinkSync(
            webm
        );
    }

    console.log(
        "\n✅ VÍDEO PRONTO:"
    );

    console.log(
        mp4
    );

    return mp4;
}

// ======================================================
// PRINCIPAL
// ======================================================

async function principal(url) {

    console.log(
        "\n🎬 JAIRO — DEMONSTRAÇÃO GOVERNADA\n"
    );

    console.log(
        `🌐 ${url}`
    );

    const {
        mapa,
        plano
    } =
        await planejar(
            url
        );

    await gravar(
        url,
        mapa,
        plano
    );

    console.log(
        "\n🏁 Jairo terminou."
    );
}

// ======================================================
// INICIAR
// ======================================================

const url =
    process.argv[2];

if (!url) {

    console.error(
        "❌ Informe a URL."
    );

    console.error(
        "\nExemplo:"
    );

    console.error(
        "node tools/jairo-demo-rapido.js http://127.0.0.1:5500/public/camisetas/index.html#studio"
    );

    process.exit(1);
}

principal(url)
    .catch(erro => {

        console.error(
            "\n❌ Jairo encontrou um erro:"
        );

        console.error(
            erro.message
        );

        process.exitCode = 1;
    });