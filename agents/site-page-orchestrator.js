const fs = require("fs");
const path = require("path");

const {
    usarIA,
    usarIACodigo
} = require("../tools/ai");

const {
    criarHeroIterativo
} = require("./site-component-builder");


const PASTA_JOBS = path.join(
    process.cwd(),
    "memory",
    "site-jobs"
);


function salvarJob(job) {
    fs.mkdirSync(
        PASTA_JOBS,
        { recursive: true }
    );

    fs.writeFileSync(
        path.join(
            PASTA_JOBS,
            `${job.taskId}.json`
        ),
        JSON.stringify(
            job,
            null,
            2
        ),
        "utf8"
    );
}


function limparMarkdown(texto) {
    return String(texto || "")
        .replace(/```html/gi, "")
        .replace(/```css/gi, "")
        .replace(/```/g, "")
        .trim();
}


function extrairPacote(resposta) {
    const texto =
        limparMarkdown(resposta);

    const inicioHTML =
        texto.indexOf("===HTML===");

    const inicioCSS =
        texto.indexOf("===CSS===");

    const fim =
        texto.indexOf("===FIM===");

    if (
        inicioHTML === -1 ||
        inicioCSS === -1
    ) {
        throw new Error(
            "Componente nao retornou HTML/CSS no formato esperado."
        );
    }

    const html = texto
        .slice(
            inicioHTML + 10,
            inicioCSS
        )
        .trim();

    const css = texto
        .slice(
            inicioCSS + 9,
            fim === -1
                ? texto.length
                : fim
        )
        .trim();

    if (
        html.length < 80 ||
        css.length < 100
    ) {
        throw new Error(
            "Componente retornou codigo insuficiente."
        );
    }

    return {
        html,
        css
    };
}


async function extrairPacoteRobusto(resposta) {
    try {
        return await extrairPacoteRobusto(resposta);

    } catch (erroInicial) {
        console.log(
            "SITE_PAGE: formato da resposta invalido."
        );

        console.log(
            "SITE_PAGE: corrigindo formato automaticamente..."
        );

        const textoOriginal =
            String(resposta || "");

        if (!textoOriginal.trim()) {
            throw erroInicial;
        }

        const respostaCorrigida =
            await usarIACodigo(`
Sua unica tarefa e REFORMATAR uma resposta de codigo.

Nao melhore.
Nao redesenhe.
Nao explique.
Nao remova funcionalidades.
Nao invente codigo novo.

A resposta original foi:

---------------- RESPOSTA ORIGINAL ----------------

${textoOriginal}

---------------- FIM ORIGINAL ----------------

Extraia o HTML e o CSS existentes e responda
EXATAMENTE neste formato:

===HTML===
HTML aqui

===CSS===
CSS aqui

===FIM===

Nao use markdown.
Nao escreva nada antes de ===HTML===.
Nao escreva nada depois de ===FIM===.
`.trim());

        const pacote =
            extrairPacote(
                respostaCorrigida
            );

        console.log(
            "SITE_PAGE: formato corrigido. Continuando tarefa..."
        );

        return pacote;
    }
}


function avaliarComponente({
    tipo,
    html,
    css
}) {
    const problemas = [];

    const h =
        String(html || "").trim();

    const c =
        String(css || "").trim();

    const primeiroElemento =
        h.search(/<[a-z][^>]*>/i);

    if (primeiroElemento > 0) {
        const texto =
            h.slice(
                0,
                primeiroElemento
            ).trim();

        if (texto) {
            problemas.push(
                `Existe texto solto antes do HTML: "${texto.slice(0, 60)}".`
            );
        }
    }

    const imagens =
        [...h.matchAll(/<img\b[^>]*>/gi)];

    for (const item of imagens) {
        const src =
            item[0].match(
                /\bsrc\s*=\s*["']([^"']*)["']/i
            );

        if (!src || !src[1].trim()) {
            problemas.push(
                "Existe imagem sem src valido."
            );

            continue;
        }

        const endereco =
            src[1].trim();

        if (
            !/^(https?:)?\/\//i.test(endereco) &&
            !/^data:/i.test(endereco)
        ) {
            problemas.push(
                `Imagem local inexistente: "${endereco}".`
            );
        }
    }

    if (tipo === "header") {
        if (!/<header\b/i.test(h)) {
            problemas.push(
                "O componente deve usar <header>."
            );
        }

        if (!/<nav\b/i.test(h)) {
            problemas.push(
                "O header precisa possuir navegacao."
            );
        }
    }

    if (tipo === "servicos") {
        if (!/<section\b/i.test(h)) {
            problemas.push(
                "Servicos deve usar uma section semantica."
            );
        }

        if (!/<h2\b/i.test(h)) {
            problemas.push(
                "Servicos precisa possuir um H2."
            );
        }
    }

    if (tipo === "agendamento") {
        if (!/<section\b/i.test(h)) {
            problemas.push(
                "Agendamento deve usar uma section semantica."
            );
        }

        if (
            !/id\s*=\s*["']agendamento["']/i.test(h)
        ) {
            problemas.push(
                'A section de agendamento precisa ter id="agendamento".'
            );
        }

        if (!/<form\b/i.test(h)) {
            problemas.push(
                "Agendamento precisa possuir um formulario."
            );
        }

        if (
            !/<input\b|<select\b|<textarea\b/i.test(h)
        ) {
            problemas.push(
                "Agendamento precisa possuir campos preenchiveis."
            );
        }

        if (!/<button\b/i.test(h)) {
            problemas.push(
                "Agendamento precisa possuir botao de confirmacao."
            );
        }
    }

    if (
        !/display\s*:\s*(flex|grid)/i.test(c)
    ) {
        problemas.push(
            "O componente precisa controlar layout com flex ou grid."
        );
    }

    if (!/max-width/i.test(c)) {
        problemas.push(
            "Falta largura maxima para organizar o conteudo."
        );
    }

    if (!/@media/i.test(c)) {
        problemas.push(
            "Falta comportamento responsivo."
        );
    }

    return [
        ...new Set(problemas)
    ];
}


async function revisarLocal({
    tipo,
    briefing,
    html,
    css
}) {
    const resposta =
        await usarIACodigo(`
Voce esta revisando apenas o componente "${tipo}".

BRIEFING:
${briefing}

HTML:
${html}

CSS:
${css}

CRITERIOS:
- aparencia profissional;
- hierarquia visual;
- espacamento;
- composicao;
- coerencia;
- responsividade;
- nao parecer HTML cru;
- nao parecer quebrado.

Se estiver suficientemente bom:
APROVADO

Caso contrario, responda no maximo 4 linhas:

PROBLEMA: problema especifico

Nao gere codigo.
        `.trim());

    const texto =
        String(resposta || "").trim();

    if (/^APROVADO\b/i.test(texto)) {
        return {
            aprovado: true,
            problemas: []
        };
    }

    const problemas =
        texto
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(x =>
                /^PROBLEMA:/i.test(x)
            )
            .map(x =>
                x.replace(
                    /^PROBLEMA:\s*/i,
                    ""
                )
            );

    return {
        aprovado: false,
        problemas:
            problemas.length
                ? problemas
                : [
                    "Revisor local nao aprovou."
                ]
    };
}


async function gerarLocal({
    tipo,
    nome,
    briefing,
    contextoVisual,
    anterior,
    problemas,
    tentativa
}) {
    const melhoria =
        anterior
            ? `
VERSAO ATUAL:

HTML:
${anterior.html}

CSS:
${anterior.css}

PROBLEMAS:
${problemas
    .map((x, i) => `${i + 1}. ${x}`)
    .join("\n")}

Melhore a versao existente.
Mantenha o que estiver bom.
`
            : "";

    const resposta =
        await usarIACodigo(`
Voce e um desenvolvedor front-end.

Crie SOMENTE o componente:
${tipo}

PROJETO:
${nome}

BRIEFING:
${briefing}

DIRECAO VISUAL DA PAGINA:
${contextoVisual}

TENTATIVA:
${tentativa}

${melhoria}

REGRAS:
- componente profissional;
- HTML semantico;
- CSS completo apenas deste componente;
- responsivo;
- sem JavaScript;
- sem frameworks;
- nao invente imagens locais;
- nao crie outras secoes;
- use nomes de classes prefixados com "${tipo}-";
- nao escreva explicacoes;
- nao escreva "HTML melhorado".

Retorne exatamente:

===HTML===
codigo

===CSS===
codigo

===FIM===
        `.trim());

    return await extrairPacoteRobusto(resposta);
}


async function escalonarNuvem({
    tipo,
    nome,
    briefing,
    contextoVisual,
    atual,
    problemas
}) {
    console.log(
        `SITE_PAGE: escalonando ${tipo} para nuvem...`
    );

    const resposta =
        await usarIA(`
Voce e um diretor de arte e desenvolvedor front-end senior.

Melhore SOMENTE este componente de um site:

${tipo}

PROJETO:
${nome}

BRIEFING:
${briefing}

DIRECAO VISUAL:
${contextoVisual}

HTML ATUAL:
${atual.html}

CSS ATUAL:
${atual.css}

PROBLEMAS:
${problemas
    .map((x, i) => `${i + 1}. ${x}`)
    .join("\n")}

O resultado deve parecer parte de um site premium
feito para um cliente real.

Nao use JavaScript.
Nao use frameworks.
Nao invente arquivos de imagem locais.
Nao crie outras secoes.
Nao escreva explicacoes.

Retorne exatamente:

===HTML===
codigo

===CSS===
codigo

===FIM===
        `.trim());

    return await extrairPacoteRobusto(resposta);
}


async function criarComponente({
    tipo,
    nome,
    briefing,
    contextoVisual,
    maxTentativas = 2
}) {
    let atual = null;
    let problemas = [];

    for (
        let tentativa = 1;
        tentativa <= maxTentativas;
        tentativa++
    ) {
        console.log("");
        console.log(
            `SITE_PAGE: ${tipo} tentativa ${tentativa}/${maxTentativas}`
        );

        atual =
            await gerarLocal({
                tipo,
                nome,
                briefing,
                contextoVisual,
                anterior: atual,
                problemas,
                tentativa
            });

        const locais =
            avaliarComponente({
                tipo,
                html: atual.html,
                css: atual.css
            });

        const revisao =
            await revisarLocal({
                tipo,
                briefing,
                html: atual.html,
                css: atual.css
            });

        problemas = [
            ...locais,
            ...revisao.problemas
        ];

        if (
            locais.length === 0 &&
            revisao.aprovado
        ) {
            console.log(
                `SITE_PAGE: ${tipo} aprovado localmente.`
            );

            return {
                ...atual,
                origem: "local"
            };
        }

        console.log(
            `SITE_PAGE: ${tipo} ainda precisa melhorar.`
        );

        problemas.forEach(
            p => console.log(" - " + p)
        );
    }

    const nuvem =
        await escalonarNuvem({
            tipo,
            nome,
            briefing,
            contextoVisual,
            atual,
            problemas
        });

    const problemasNuvem =
        avaliarComponente({
            tipo,
            html: nuvem.html,
            css: nuvem.css
        });

    if (problemasNuvem.length) {
        throw new Error(
            `${tipo} continuou invalido apos nuvem: ` +
            problemasNuvem.join(" | ")
        );
    }

    console.log(
        `SITE_PAGE: ${tipo} aprovado apos nuvem.`
    );

    return {
        ...nuvem,
        origem: "nuvem"
    };
}


async function criarDirecaoVisual({
    nome,
    briefing
}) {
    console.log(
        "SITE_PAGE: criando direcao visual..."
    );

    const resposta =
        await usarIA(`
Defina uma direcao visual curta para este site.

PROJETO:
${nome}

BRIEFING:
${briefing}

Defina:
- estilo;
- personalidade;
- paleta;
- contraste;
- tipografia;
- espacamentos;
- formato dos cards;
- estilo dos botoes;
- regras para manter todas as secoes coerentes.

Seja curto.
Nao gere HTML.
Nao gere CSS.
        `.trim());

    return String(resposta).trim();
}


async function criarPaginaInicial({
    nome,
    briefing,
    taskId = `site-page-${Date.now()}`
}) {
    const job = {
        taskId,
        nome,
        briefing,
        status: "executando",
        etapa: "direcao_visual",
        componentes: {}
    };

    salvarJob(job);

    const contextoVisual =
        await criarDirecaoVisual({
            nome,
            briefing
        });

    job.contextoVisual =
        contextoVisual;

    salvarJob(job);

    // =====================================
    // HEADER
    // =====================================

    job.etapa = "header";
    salvarJob(job);

    const header =
        await criarComponente({
            tipo: "header",
            nome,
            briefing,
            contextoVisual
        });

    job.componentes.header = {
        status: "aprovado",
        origem: header.origem
    };

    salvarJob(job);

    // =====================================
    // HERO
    // =====================================

    job.etapa = "hero";
    salvarJob(job);

    const hero =
        await criarHeroIterativo({
            nome,
            briefing:
`${briefing}

DIRECAO VISUAL DA PAGINA:
${contextoVisual}

Este Hero precisa combinar visualmente com o Header
e com o restante da pagina.`,
            maxTentativas: 3,
            taskId
        });

    if (
        ![
            "aprovado",
            "aprovado_nuvem"
        ].includes(hero.status)
    ) {
        throw new Error(
            "Hero nao conseguiu ser aprovado."
        );
    }

    job.componentes.hero = {
        status: "aprovado",
        origem:
            hero.origem || "local"
    };

    salvarJob(job);

    // =====================================
    // SERVICOS
    // =====================================

    job.etapa = "servicos";
    salvarJob(job);

    const servicos =
        await criarComponente({
            tipo: "servicos",
            nome,
            briefing,
            contextoVisual
        });

    job.componentes.servicos = {
        status: "aprovado",
        origem: servicos.origem
    };

    // =====================================
    // AGENDAMENTO
    // =====================================

    job.etapa = "agendamento";
    salvarJob(job);

    const agendamento =
        await criarComponente({
            tipo: "agendamento",
            nome,

            briefing:
`${briefing}

REQUISITOS ESPECIFICOS DO AGENDAMENTO:

- crie uma section com id="agendamento";
- tenha titulo e explicacao curta;
- permita escolher um servico;
- tenha campo de nome;
- tenha campo de telefone ou WhatsApp;
- tenha campo de data;
- tenha campo de horario;
- tenha botao de confirmar ou continuar;
- o formulario deve parecer premium;
- ainda nao precisa enviar para backend;
- nao use JavaScript nesta etapa.
`,

            contextoVisual
        });

    job.componentes.agendamento = {
        status: "aprovado",
        origem: agendamento.origem
    };

    salvarJob(job);


    // =====================================
    // MONTAGEM
    // =====================================

    job.etapa = "montagem";
    salvarJob(job);

    const css = [
        "* { box-sizing: border-box; }",
        "html { scroll-behavior: smooth; }",
        "body { margin: 0; }",
        header.css,
        hero.css,
        servicos.css,
        agendamento.css
    ].join("\n\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>${nome}</title>
    <link
        rel="stylesheet"
        href="./style.css"
    >
</head>
<body>

${header.html}

<main>
${hero.html}

${servicos.html}

${agendamento.html}
</main>

<script src="./app.js" defer></script>
</body>
</html>`;

    const pasta =
        path.join(
            process.cwd(),
            "tmp-site-page"
        );

    fs.mkdirSync(
        pasta,
        { recursive: true }
    );

    fs.writeFileSync(
        path.join(
            pasta,
            "index.html"
        ),
        html,
        "utf8"
    );

    fs.writeFileSync(
        path.join(
            pasta,
            "style.css"
        ),
        css,
        "utf8"
    );

    const javascript = `
document.addEventListener("DOMContentLoaded", () => {

    const agendamento =
        document.getElementById("agendamento");

    document.addEventListener("click", event => {

        const elemento =
            event.target.closest("a, button");

        if (!elemento) {
            return;
        }

        const texto =
            (elemento.textContent || "")
                .toLowerCase()
                .trim();

        const href =
            elemento.getAttribute("href") || "";

        const querAgendar =
            href === "#agendamento" ||
            /agend|consulta|reserv|horario|atendimento/.test(texto);

        if (
            querAgendar &&
            agendamento
        ) {
            event.preventDefault();

            agendamento.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });

});
`;

    fs.writeFileSync(
        path.join(
            pasta,
            "app.js"
        ),
        javascript,
        "utf8"
    );


    job.status =
        "preview_pronto";

    job.etapa =
        "aguardando_expansao";

    job.preview =
        path.join(
            pasta,
            "index.html"
        );

    salvarJob(job);

    console.log("");
    console.log(
        "SITE_PAGE: PRIMEIRA PAGINA MONTADA"
    );

    return {
        taskId,
        status: job.status,
        componentes:
            job.componentes,
        preview:
            job.preview
    };
}


module.exports = {
    criarPaginaInicial
};