const fs = require("fs");
const path = require("path");

const {
    usarIACodigo
} = require("../tools/ai");


const PASTA_ESTADOS = path.join(
    process.cwd(),
    "memory",
    "site-iterations"
);


function garantirPastaEstados() {
    fs.mkdirSync(
        PASTA_ESTADOS,
        { recursive: true }
    );
}


function caminhoEstado(taskId) {
    return path.join(
        PASTA_ESTADOS,
        `${taskId}.json`
    );
}


function salvarEstado(estado) {
    garantirPastaEstados();

    fs.writeFileSync(
        caminhoEstado(estado.taskId),
        JSON.stringify(
            estado,
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
            "Qwen nao retornou HTML e CSS no formato esperado."
        );
    }

    const html = texto
        .slice(
            inicioHTML + "===HTML===".length,
            inicioCSS
        )
        .trim();

    const css = texto
        .slice(
            inicioCSS + "===CSS===".length,
            fim === -1
                ? texto.length
                : fim
        )
        .trim();

    if (html.length < 100) {
        throw new Error(
            "HTML do componente veio pequeno demais."
        );
    }

    if (css.length < 150) {
        throw new Error(
            "CSS do componente veio pequeno demais."
        );
    }

    return {
        html,
        css
    };
}


function avaliarHeroLocal({
    html,
    css
}) {
    const problemas = [];

    if (
        !/<section\b/i.test(html)
    ) {
        problemas.push(
            "Use uma section semantica para o hero."
        );
    }

    if (
        !/<h1\b/i.test(html)
    ) {
        problemas.push(
            "O hero precisa ter um H1."
        );
    }

    if (
        !/<a\b|<button\b/i.test(html)
    ) {
        problemas.push(
            "O hero precisa ter pelo menos um CTA."
        );
    }

    if (
        !/hero/i.test(html)
    ) {
        problemas.push(
            "Use classes descritivas contendo hero."
        );
    }

    if (
        !/hero/i.test(css)
    ) {
        problemas.push(
            "O CSS precisa estilizar explicitamente o hero."
        );
    }

    if (
        !/display\s*:\s*(flex|grid)/i.test(css)
    ) {
        problemas.push(
            "Use flex ou grid para controlar o layout."
        );
    }

    if (
        !/max-width/i.test(css)
    ) {
        problemas.push(
            "Defina uma largura maxima para o conteudo."
        );
    }

    if (
        !/padding/i.test(css)
    ) {
        problemas.push(
            "Defina espacamento interno adequado."
        );
    }

    if (
        !/@media/i.test(css)
    ) {
        problemas.push(
            "Adicione comportamento responsivo."
        );
    }

    if (
        /<script\b/i.test(html)
    ) {
        problemas.push(
            "O hero nao deve conter JavaScript nesta etapa."
        );
    }

    return problemas;
}


async function revisarHeroComIA({
    briefing,
    html,
    css
}) {
    const resposta =
        await usarIACodigo(`
Voce esta atuando SOMENTE como revisor de interface.

BRIEFING:
${briefing}

HTML ATUAL:
${html}

CSS ATUAL:
${css}

Avalie o hero pelos seguintes criterios:

- hierarquia visual clara;
- titulo principal forte;
- CTA visivel;
- composicao profissional;
- aproveitamento adequado do espaco;
- alinhamento consistente;
- layout moderno;
- responsividade;
- aparencia nao deve parecer um HTML cru;
- nao deve haver espacos vazios exagerados;
- nao deve parecer um template quebrado.

IMPORTANTE:

Nao gere codigo.
Nao explique longamente.

Se estiver suficientemente bom, responda exatamente:

APROVADO

Caso contrario, responda no maximo 4 linhas,
cada uma iniciando com:

PROBLEMA:

Seja especifico.
`.trim());

    const texto =
        String(resposta || "").trim();

    if (
        /^APROVADO\b/i.test(texto)
    ) {
        return {
            aprovado: true,
            problemas: []
        };
    }

    const problemas = texto
        .split(/\r?\n/)
        .map(linha => linha.trim())
        .filter(linha =>
            /^PROBLEMA:/i.test(linha)
        )
        .map(linha =>
            linha.replace(
                /^PROBLEMA:\s*/i,
                ""
            )
        )
        .filter(Boolean);

    if (!problemas.length) {
        return {
            aprovado: false,
            problemas: [
                "O revisor nao aprovou o componente."
            ]
        };
    }

    return {
        aprovado: false,
        problemas
    };
}


async function gerarVersao({
    nome,
    briefing,
    tentativa,
    htmlAnterior,
    cssAnterior,
    problemas
}) {
    const primeira =
        !htmlAnterior;

    const prompt = primeira
        ? `
Voce e um desenvolvedor front-end.

Crie SOMENTE o HERO de um site.

PROJETO:
${nome}

BRIEFING:
${briefing}

O hero deve parecer uma secao real de um site profissional.

Requisitos:
- HTML semantico;
- H1 forte;
- texto de apoio;
- CTA principal;
- CTA secundario quando fizer sentido;
- composicao visual clara;
- classes descritivas;
- responsivo;
- CSS completo somente deste componente;
- nao use JavaScript;
- nao use frameworks;
- nao crie o resto do site;
- nao use markdown.

Retorne EXATAMENTE:

===HTML===
fragmento HTML

===CSS===
CSS completo do hero

===FIM===
`
        : `
Voce esta trabalhando NA MESMA TAREFA.

Nao recrie tudo do zero sem necessidade.

PROJETO:
${nome}

BRIEFING:
${briefing}

VERSAO ATUAL DO HTML:
${htmlAnterior}

VERSAO ATUAL DO CSS:
${cssAnterior}

PROBLEMAS ENCONTRADOS:
${problemas
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n")}

Esta e a tentativa ${tentativa}.

Melhore a versao atual corrigindo os problemas.

Mantenha o que ja estiver bom.

Nao crie outras secoes do site.
Nao use JavaScript.
Nao use frameworks.
Nao use markdown.

Retorne EXATAMENTE:

===HTML===
HTML melhorado

===CSS===
CSS melhorado

===FIM===
`;

    const resposta =
        await usarIACodigo(
            prompt.trim()
        );

    return extrairPacote(
        resposta
    );
}


async function criarHeroIterativo({
    nome,
    briefing,
    maxTentativas = 3,
    taskId = `site-${Date.now()}`
}) {
    let html = "";
    let css = "";
    let problemas = [];

    const estado = {
        taskId,
        tipo: "SITE_COMPONENT_ITERATION",
        componente: "hero",
        nome,
        briefing,
        status: "executando",
        tentativa: 0,
        maxTentativas,
        historico: [],
        html: "",
        css: "",
        problemas: []
    };

    salvarEstado(estado);

    for (
        let tentativa = 1;
        tentativa <= maxTentativas;
        tentativa++
    ) {
        console.log("");
        console.log(
            `SITE_LOOP: Hero tentativa ${tentativa}/${maxTentativas}`
        );

        const versao =
            await gerarVersao({
                nome,
                briefing,
                tentativa,
                htmlAnterior: html,
                cssAnterior: css,
                problemas
            });

        html = versao.html;
        css = versao.css;

        console.log(
            "SITE_LOOP: avaliacao local..."
        );

        const problemasLocais =
            avaliarHeroLocal({
                html,
                css
            });

        console.log(
            `SITE_LOOP: ${problemasLocais.length} problema(s) estrutural(is)`
        );

        console.log(
            "SITE_LOOP: revisao visual por IA..."
        );

        const revisao =
            await revisarHeroComIA({
                briefing,
                html,
                css
            });

        problemas = [
            ...problemasLocais,
            ...revisao.problemas
        ];

        const aprovado =
            problemasLocais.length === 0 &&
            revisao.aprovado;

        estado.tentativa =
            tentativa;

        estado.html =
            html;

        estado.css =
            css;

        estado.problemas =
            problemas;

        estado.historico.push({
            tentativa,
            aprovado,
            problemas: [...problemas],
            htmlChars: html.length,
            cssChars: css.length
        });

        if (aprovado) {
            estado.status =
                "aprovado";

            salvarEstado(
                estado
            );

            console.log("");
            console.log(
                "SITE_LOOP: HERO APROVADO"
            );

            return {
                taskId,
                status: "aprovado",
                componente: "hero",
                tentativa,
                html,
                css,
                problemas: []
            };
        }

        salvarEstado(
            estado
        );

        console.log(
            "SITE_LOOP: ainda nao aprovado."
        );

        problemas.forEach(
            problema => {
                console.log(
                    " - " + problema
                );
            }
        );
    }

    estado.status =
        "precisa_escalonamento";

    salvarEstado(
        estado
    );

    console.log("");
    console.log(
        "SITE_LOOP: limite local atingido."
    );

    return {
        taskId,
        status: "precisa_escalonamento",
        componente: "hero",
        tentativa: maxTentativas,
        html,
        css,
        problemas
    };
}


module.exports = {
    criarHeroIterativo,
    avaliarHeroLocal
};