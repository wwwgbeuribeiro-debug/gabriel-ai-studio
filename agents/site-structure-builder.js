const { usarIA } = require("../tools/ai");

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
        "SITE_STRUCTURE: gerando somente HTML..."
    );

    const resposta = await usarIA(`
Voce e um desenvolvedor front-end senior.

Crie SOMENTE a estrutura HTML completa de um novo site.

PROJETO:
${nome}

BRIEFING:
${briefing}

IMPORTANTE:

- Gere somente HTML.
- Nao gere CSS.
- Nao use tag style.
- Nao gere JavaScript.
- Nao use tag script.
- Crie estrutura visual rica e profissional.
- Use HTML semantico.
- Crie classes descritivas.
- Crie IDs nos elementos que precisarao de interacao.
- Inclua todas as secoes solicitadas no briefing.
- Formularios, botoes, cards, navegacao e etapas devem existir no HTML.
- Nao simplifique o briefing.
- Nao use frameworks.
- Nao escreva explicacoes.
- Nao use markdown.

Comece obrigatoriamente com:

<!DOCTYPE html>

e termine com:

</html>
`.trim());

    return validarHTML(
        limparBlocoCodigo(resposta)
    );
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

    const resposta = await usarIA(`
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