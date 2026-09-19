function unicos(lista) {
    return [...new Set(
        lista
            .map(item => String(item || "").trim())
            .filter(Boolean)
    )];
}

function extrairAtributo(tag, nome) {
    const regex = new RegExp(
        nome + '\\s*=\\s*["\']([^"\']+)["\']',
        "i"
    );

    const match = String(tag || "").match(regex);

    return match ? match[1].trim() : null;
}

function extrairContratoHTML(html) {
    const texto = String(html || "");

    const classes = [];

    const regexClasses =
        /class\s*=\s*["']([^"']+)["']/gi;

    let match;

    while ((match = regexClasses.exec(texto)) !== null) {
        classes.push(
            ...match[1]
                .split(/\s+/)
                .filter(Boolean)
        );
    }

    const ids = [];

    const regexIds =
        /id\s*=\s*["']([^"']+)["']/gi;

    while ((match = regexIds.exec(texto)) !== null) {
        ids.push(match[1]);
    }

    const botoes = [];

    const regexBotoes =
        /<(button|a)\b[^>]*>/gi;

    while ((match = regexBotoes.exec(texto)) !== null) {
        const tag = match[0];

        botoes.push({
            tag: match[1].toLowerCase(),
            id: extrairAtributo(tag, "id"),
            classe: extrairAtributo(tag, "class"),
            href: extrairAtributo(tag, "href"),
            type: extrairAtributo(tag, "type")
        });
    }

    const campos = [];

    const regexCampos =
        /<(input|select|textarea)\b[^>]*>/gi;

    while ((match = regexCampos.exec(texto)) !== null) {
        const tag = match[0];

        campos.push({
            tag: match[1].toLowerCase(),
            id: extrairAtributo(tag, "id"),
            classe: extrairAtributo(tag, "class"),
            name: extrairAtributo(tag, "name"),
            type: extrairAtributo(tag, "type")
        });
    }

    const formularios = [];

    const regexForm =
        /<form\b[^>]*>/gi;

    while ((match = regexForm.exec(texto)) !== null) {
        const tag = match[0];

        formularios.push({
            id: extrairAtributo(tag, "id"),
            classe: extrairAtributo(tag, "class")
        });
    }

    return {
        classes: unicos(classes),
        ids: unicos(ids),
        botoes,
        campos,
        formularios
    };
}

function formatarContratoHTML(contrato) {
    return [
        "CLASSES REAIS DO HTML:",
        contrato.classes.length
            ? contrato.classes.join(", ")
            : "Nenhuma",
        "",
        "IDS REAIS DO HTML:",
        contrato.ids.length
            ? contrato.ids.join(", ")
            : "Nenhum",
        "",
        "BOTOES/LINKS:",
        JSON.stringify(contrato.botoes, null, 2),
        "",
        "CAMPOS:",
        JSON.stringify(contrato.campos, null, 2),
        "",
        "FORMULARIOS:",
        JSON.stringify(contrato.formularios, null, 2)
    ].join("\n");
}

module.exports = {
    extrairContratoHTML,
    formatarContratoHTML
};