// ... (código anterior permanece inalterado) ...

function detectarCriacaoArquivoSimples(tarefa) {
    const texto = removerChamadaDoAgente(tarefa);

    const encontrado = texto.match(
        /^(?:crie|criar)\s+(?:um\s+)?arquivo\s+["'`]?([^\s"'`]+)["'`]?\s+com\s+(?:a\s+)?(?:frase|texto|conteúdo|conteudo)\s+([\s\S]+)$/i
    );

    if (!encontrado) {
        return null;
    }

    const caminho = encontrado[1]
        .trim()
        .replace(/[\,\;\:]+$/, "");

    let conteudo = encontrado[2].trim();

    const paresAspas = [
        ["\"", "\""],
        ["'", "'"] ,
        ["“", "”"]
    ];

    for (const [inicio, fim] of paresAspas) {
        if (
            conteudo.startsWith(inicio) &&
            conteudo.endsWith(fim) &&
            conteudo.length >= 2
        ) {
            conteudo = conteudo.slice(1, -1);
            break;
        }
    }

    return {
        path: caminho,
        content: conteudo
    };
}

function extrairMudancasDaProposta(proposta) {
    if (!proposta || typeof proposta !== "object") {
        return null;
    }

    const candidatos = [
        proposta.changes,
        proposta.mudancas,
        proposta.alteracoes,
        proposta.arquivos,
        proposta.files
    ];

    const lista = candidatos.find(
        item => Array.isArray(item)
    );

    if (!lista) {
        return null;
    }

    return lista.map(item => {
        if (!item || typeof item !== "object") {
            return item;
        }

        return {
            path:
                item.path ??
                item.caminho ??
                item.arquivo ??
                item.file,
            content:
                item.content ??
                item.conteudo ??
                item.texto ??
                item.code
        };
    });
}

// ... (código posterior permanece inalterado) ...