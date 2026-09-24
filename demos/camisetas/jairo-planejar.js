const { chromium } = require("playwright");
const { usarIACodigo } = require("./ai");

// =====================================================
// UTILIDADES
// =====================================================

function extrairJSON(texto) {
    const limpo = String(texto || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const inicio = limpo.indexOf("[");
    const fim = limpo.lastIndexOf("]");

    if (inicio === -1 || fim === -1) {
        throw new Error(
            "A IA não retornou uma lista JSON válida."
        );
    }

    const json = limpo.slice(
        inicio,
        fim + 1
    );

    const resultado = JSON.parse(json);

    if (!Array.isArray(resultado)) {
        throw new Error(
            "O plano retornado não é uma lista."
        );
    }

    return resultado;
}

// =====================================================
// MAPEAR ELEMENTOS DA PÁGINA
// =====================================================

async function mapearPagina(page) {
    return page.evaluate(() => {

        function obterTexto(el) {
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
                .slice(0, 140);
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
            .map((el, index) => ({
                numero: index + 1,

                tipo:
                    el.tagName.toLowerCase(),

                texto:
                    obterTexto(el),

                id:
                    el.id || "",

                name:
                    el.getAttribute("name") || "",

                placeholder:
                    el.getAttribute("placeholder") || "",

                href:
                    el.getAttribute("href") || ""
            }));
    });
}

// =====================================================
// CRIAR PROMPT PARA O JAIRO
// =====================================================

function montarPrompt(mapa) {
    return `
Você é Jairo, agente demonstrador do Gabriel AI Studio.

Sua função é observar uma página real e decidir
quais ações devem ser realizadas para criar
uma demonstração curta, visual e interessante.

Você recebeu um mapa dos elementos interativos
existentes na página.

OBJETIVO:

Criar um roteiro com entre 5 e 10 ações
que demonstre as principais funcionalidades do site.

REGRAS IMPORTANTES:

- Não invente elementos.
- Use SOMENTE números existentes no mapa.
- Não realize compras reais.
- Não envie formulários reais.
- Não clique em links externos desnecessários.
- Não abra política de privacidade.
- Não abra FAQ sem necessidade.
- Evite ações repetidas.
- Prefira recursos interativos.
- Prefira campos, filtros, seleções, produtos,
  carrinho e checkout de demonstração.
- O roteiro deve parecer uma demonstração de produto.

AÇÕES PERMITIDAS:

"clicar"
"preencher"
"selecionar"
"rolar"

FORMATO OBRIGATÓRIO:

Retorne SOMENTE uma lista JSON válida.

Exemplo:

[
    {
        "acao": "preencher",
        "elemento": 9,
        "valor": "Lobo cyberpunk com luzes neon",
        "motivo": "Demonstrar criação personalizada"
    },
    {
        "acao": "clicar",
        "elemento": 16,
        "motivo": "Demonstrar filtro de categoria"
    }
]

IMPORTANTE:

O campo "elemento" precisa ser exatamente
o número de um elemento existente no mapa.

MAPA REAL DA PÁGINA:

${JSON.stringify(mapa, null, 2)}
`;
}

// =====================================================
// PEDIR PLANO PARA A IA LOCAL
// =====================================================

async function criarPlano(mapa) {
    const prompt =
        montarPrompt(mapa);

    console.log(
        "\n🧠 Jairo está planejando a demonstração...\n"
    );

    console.log(
        "🖥️ Tentando IA local primeiro...\n"
    );

    const resposta =
        await usarIACodigo(prompt);

    console.log(
        "\n🤖 RESPOSTA RECEBIDA:\n"
    );

    console.log(resposta);

    try {
        return extrairJSON(resposta);

    } catch (erro) {

        console.log(
            "\n⚠️ A resposta não veio em JSON válido."
        );

        console.log(
            "🧠 Jairo vai pedir correção do formato...\n"
        );

        const respostaCorrigida =
            await usarIACodigo(`
Você respondeu a uma solicitação de planejamento,
mas o formato não pôde ser interpretado.

Transforme a resposta abaixo em uma LISTA JSON válida.

REGRAS:

- Não explique nada.
- Não use markdown.
- Não use bloco de código.
- Não invente novas ações.
- Preserve os números dos elementos.
- Retorne SOMENTE JSON.

RESPOSTA ORIGINAL:

${resposta}
`);

        return extrairJSON(
            respostaCorrigida
        );
    }
}

// =====================================================
// VALIDAR PLANO
// =====================================================

function validarPlano(plano, mapa) {

    if (!Array.isArray(plano)) {
        throw new Error(
            "Plano inválido."
        );
    }

    if (plano.length === 0) {
        throw new Error(
            "Jairo criou um plano vazio."
        );
    }

    const numerosValidos =
        new Set(
            mapa.map(
                elemento =>
                    elemento.numero
            )
        );

    const acoesPermitidas =
        new Set([
            "clicar",
            "preencher",
            "selecionar",
            "rolar"
        ]);

    const planoValido = [];

    for (const passo of plano) {

        if (
            !passo ||
            typeof passo !== "object"
        ) {
            continue;
        }

        if (
            !acoesPermitidas.has(
                passo.acao
            )
        ) {
            continue;
        }

        if (
            passo.acao !== "rolar" &&
            !numerosValidos.has(
                passo.elemento
            )
        ) {
            continue;
        }

        planoValido.push(
            passo
        );
    }

    if (planoValido.length === 0) {
        throw new Error(
            "Nenhuma ação válida foi encontrada no plano."
        );
    }

    return planoValido;
}

// =====================================================
// MOSTRAR PLANO
// =====================================================

function mostrarPlano(
    plano,
    mapa
) {

    console.log(
        "\n================================"
    );

    console.log(
        "🎯 PLANO CRIADO PELO JAIRO"
    );

    console.log(
        "================================\n"
    );

    plano.forEach(
        (passo, indice) => {

            console.log(
                `${indice + 1}. ${passo.acao.toUpperCase()}`
            );

            if (
                passo.elemento
            ) {

                const elemento =
                    mapa.find(
                        item =>
                            item.numero ===
                            passo.elemento
                    );

                console.log(
                    `   Elemento: ${passo.elemento}`
                );

                console.log(
                    `   Tipo: ${elemento?.tipo || "desconhecido"}`
                );

                console.log(
                    `   Texto: ${elemento?.texto || "(sem texto)"}`
                );
            }

            if (
                passo.valor !== undefined
            ) {
                console.log(
                    `   Valor: ${passo.valor}`
                );
            }

            if (
                passo.motivo
            ) {
                console.log(
                    `   Motivo: ${passo.motivo}`
                );
            }

            console.log("");
        }
    );
}

// =====================================================
// EXECUÇÃO PRINCIPAL
// =====================================================

async function executar(url) {

    console.log(
        "\n🎬 JAIRO - PLANEJADOR AUTÔNOMO\n"
    );

    console.log(
        `🌐 Site: ${url}\n`
    );

    const browser =
        await chromium.launch({
            headless: false,

            args: [
                "--start-maximized"
            ]
        });

    const context =
        await browser.newContext({
            viewport: null
        });

    const page =
        await context.newPage();

    try {

        // =====================================
        // MAXIMIZAR JANELA
        // =====================================

        const cdp =
            await context.newCDPSession(
                page
            );

        const { windowId } =
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

        // =====================================
        // ABRIR SITE
        // =====================================

        await page.goto(
            url,
            {
                waitUntil:
                    "networkidle"
            }
        );

        console.log(
            "✅ Site aberto."
        );

        // =====================================
        // MAPEAR
        // =====================================

        const mapa =
            await mapearPagina(
                page
            );

        console.log(
            `🔎 ${mapa.length} elementos encontrados.`
        );

        if (
            mapa.length === 0
        ) {
            throw new Error(
                "Nenhum elemento interativo foi encontrado."
            );
        }

        // =====================================
        // IA PLANEJA
        // =====================================

        const planoBruto =
            await criarPlano(
                mapa
            );

        // =====================================
        // VALIDAR
        // =====================================

        const plano =
            validarPlano(
                planoBruto,
                mapa
            );

        // =====================================
        // MOSTRAR RESULTADO
        // =====================================

        mostrarPlano(
            plano,
            mapa
        );

        console.log(
            "✅ Planejamento concluído."
        );

        console.log(
            `🧠 ${plano.length} ações foram escolhidas pelo Jairo.`
        );

        console.log(
            "\n⚠️ Neste teste ele ainda NÃO executa os cliques."
        );

        console.log(
            "A próxima etapa será entregar esse plano ao Playwright."
        );

        // Mantém o navegador aberto
        // alguns segundos para visualização.

        await page.waitForTimeout(
            10000
        );

    } finally {

        await context.close();
        await browser.close();
    }
}

// =====================================================
// URL RECEBIDA PELO TERMINAL
// =====================================================

const url =
    process.argv[2];

if (!url) {

    console.error(
        "❌ Informe a URL do site."
    );

    console.error(
        "\nExemplo:"
    );

    console.error(
        "node tools/jairo-planejar.js http://127.0.0.1:5500/public/camisetas/index.html#studio"
    );

    process.exit(1);
}

// =====================================================
// INICIAR
// =====================================================

executar(url)
    .catch(erro => {

        console.error(
            "\n❌ Erro no Jairo:"
        );

        console.error(
            erro.message
        );

        process.exitCode = 1;
    });
    