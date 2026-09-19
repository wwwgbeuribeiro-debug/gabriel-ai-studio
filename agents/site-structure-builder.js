const { usarIACodigo } = require("../tools/ai");

const {
    extrairContratoHTML,
    formatarContratoHTML
} = require("../tools/html-contract");


function limparBlocoCodigo(resposta) {
    return String(resposta || "")
        .replace(/^```[a-z]*\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
}


function validarHTML(html) {
    const texto = String(html || "").trim();

    const inicio =
        texto.search(/<!doctype\s+html|<html/i);

    const fim =
        texto.toLowerCase()
            .lastIndexOf("</html>");

    if (
        inicio === -1 ||
        fim === -1
    ) {
        throw new Error(
            "HTML incompleto ou truncado."
        );
    }

    return texto.slice(
        inicio,
        fim + "</html>".length
    );
}


async function gerarHTML({
    nome,
    briefing
}) {
    console.log(
        "SITE_STRUCTURE: gerando HTML em blocos..."
    );

    const partes = [
        {
            nome: "header-hero",
            instrucao: `
Crie SOMENTE:
- header responsivo;
- navegacao;
- hero principal;
- CTAs principais;
- abertura da apresentacao do negocio.
`
        },
        {
            nome: "conteudo",
            instrucao: `
Crie SOMENTE:
- apresentacao;
- diferenciais;
- servicos;
- antes e depois;
- depoimentos quando solicitados.
`
        },
        {
            nome: "agendamento",
            instrucao: `
Crie SOMENTE:
- fluxo visual de agendamento;
- stepper;
- escolha de servico;
- escolha de profissional;
- data e horario;
- formulario de anamnese completo;
- botoes avancar e voltar;
- resumo de confirmacao.
`
        },
        {
            nome: "final",
            instrucao: `
Crie SOMENTE:
- FAQ;
- contato;
- informacoes finais;
- footer.
`
        }
    ];

    const fragmentos = [];

    for (const parte of partes) {
        console.log(
            "SITE_STRUCTURE: HTML bloco " +
            parte.nome + "..."
        );

        const resposta = await usarIACodigo(`
Voce e um desenvolvedor front-end senior.

PROJETO:
${nome}

BRIEFING GERAL:
${briefing}

BLOCO ATUAL:
${parte.instrucao}

REGRAS GLOBAIS:

- Gere SOMENTE fragmento HTML.
- Nao gere <!DOCTYPE>.
- Nao gere html, head ou body.
- Nao gere CSS.
- Nao use tag style.
- Nao gere JavaScript.
- Nao use tag script.
- Use HTML semantico.
- Use classes descritivas e consistentes.
- Use prefixos claros por componente.
- Coloque IDs nos elementos que precisarao de JavaScript.
- Nao repita secoes de outros blocos.
- Nao simplifique as funcionalidades solicitadas.
- Nao use frameworks.
- Nao use markdown.
- Nao explique.

Responda somente com o fragmento HTML.
`.trim());

        let fragmento =
            limparBlocoCodigo(resposta);

        fragmento = fragmento
            .replace(/<!doctype[^>]*>/gi, "")
            .replace(/<\/?html[^>]*>/gi, "")
            .replace(/<head[\s\S]*?<\/head>/gi, "")
            .replace(/<\/?body[^>]*>/gi, "")
            .trim();

        if (fragmento.length < 80) {
            throw new Error(
                `Bloco HTML ${parte.nome} veio incompleto.`
            );
        }

        fragmentos.push(
            `<!-- BLOCO: ${parte.nome} -->\n${fragmento}`
        );
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nome}</title>
</head>
<body>
${fragmentos.join("\n\n")}
</body>
</html>`;

    console.log(
        "SITE_STRUCTURE: HTML montado localmente."
    );

    return validarHTML(html);
}


async function gerarCSS({
    nome,
    briefing,
    html
}) {
    const contrato =
        extrairContratoHTML(html);

    const contratoTexto =
        formatarContratoHTML(contrato);

    console.log(
        "SITE_STRUCTURE: contrato extraido:",
        contrato.classes.length,
        "classes /",
        contrato.ids.length,
        "ids"
    );

    console.log(
        "SITE_STRUCTURE: gerando CSS a partir do HTML real..."
    );

    const resposta = await usarIACodigo(`
Voce e um especialista senior em UI e CSS.

Crie SOMENTE o CSS completo para o HTML real abaixo.

PROJETO:
${nome}

BRIEFING:
${briefing}

CONTRATO EXTRAIDO LOCALMENTE DO HTML:

${contratoTexto}

HTML REAL:

${html}

REGRAS:

- Use as classes e IDs que realmente existem no HTML.
- Nao invente uma estrutura HTML diferente.
- Nao renomeie classes.
- Nao gere HTML.
- Nao gere JavaScript.
- Nao use frameworks.
- Nao use CSS inline.
- Crie identidade visual propria.
- Evite aparencia de template generico.
- Crie hierarquia tipografica forte.
- Crie layout responsivo.
- Estilize completamente formularios.
- Estilize botoes, cards e navegacao.
- Crie estados hover, focus e active.
- Se houver fluxo por etapas, estilize como stepper.
- Crie boa experiencia mobile.
- Nao escreva explicacoes.
- Nao use markdown.

Responda somente com CSS valido.
`.trim());

    const css =
        limparBlocoCodigo(resposta);

    if (css.length < 100) {
        throw new Error(
            "CSS retornado esta incompleto."
        );
    }

    return {
        html,
        css,
        contrato
    };
}


async function gerarEstruturaVisual({
    nome,
    briefing
}) {
    const html =
        await gerarHTML({
            nome,
            briefing
        });

    return gerarCSS({
        nome,
        briefing,
        html
    });
}


module.exports = {
    gerarHTML,
    gerarCSS,
    gerarEstruturaVisual
};