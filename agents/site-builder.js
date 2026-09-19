const { usarIA } = require("../tools/ai");

const {
    escreverArquivo
} = require("../tools/workspace");

const {
    testarAlteracoes
} = require("../tools/tester");

const {
    criarTarefa,
    adicionarProgresso,
    atualizarStatus,
    definirProximoPasso
} = require("../tools/memory");

const {
    emitirEvento
} = require("../tools/events");


function extrairArquivos(resposta) {
    const texto = String(resposta || "");

    const regex =
        /===FILE:(index\.html|style\.css|app\.js)===\s*([\s\S]*?)(?====FILE:|$)/g;

    const arquivos = {};

    let match;

    while ((match = regex.exec(texto)) !== null) {
        arquivos[match[1]] =
            match[2]
                .replace(/^```[a-z]*\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();
    }

    return arquivos;
}


function validarPacote(arquivos) {
    const obrigatorios = [
        "index.html",
        "style.css",
        "app.js"
    ];

    for (const nome of obrigatorios) {
        if (
            !arquivos[nome] ||
            arquivos[nome].trim().length < 20
        ) {
            throw new Error(
                `IA nao entregou corretamente o arquivo ${nome}.`
            );
        }
    }
}


function formatarTeste(teste) {
    return teste.resultados
        .map(item =>
            `${item.sucesso ? "OK" : "ERRO"} - ${item.arquivo}: ${item.mensagem}`
        )
        .join("\n");
}


async function corrigirJavaScript({
    tarefa,
    caminho,
    conteudo,
    erro
}) {
    const resposta = await usarIA(`
Voce esta corrigindo SOMENTE um arquivo JavaScript.

PROJETO:
${tarefa}

ARQUIVO:
${caminho}

ERRO DE VALIDACAO:
${erro}

CODIGO ATUAL:
${conteudo}

REGRAS:
- Corrija somente o JavaScript.
- Preserve as funcionalidades existentes.
- Nao gere HTML.
- Nao gere CSS.
- Nao explique.
- Nao use markdown.

Responda exatamente neste formato:

===FILE:app.js===
codigo corrigido aqui
`.trim());

    const arquivos =
        extrairArquivos(resposta);

    if (!arquivos["app.js"]) {
        throw new Error(
            "A IA nao retornou uma correcao valida para app.js."
        );
    }

    return arquivos["app.js"];
}


async function criarSiteEspecializado({
    nome,
    pasta,
    briefing
}) {
    const tarefaMemoria =
        criarTarefa(
            `Criar site: ${nome}`,
            "Severino"
        );

    emitirEvento(
        "Severino",
        "inicio",
        `Construtor especializado iniciou: ${nome}`
    );

    atualizarStatus(
        tarefaMemoria.id,
        "criando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Gerar os arquivos principais do site."
    );

    adicionarProgresso(
        tarefaMemoria.id,
        "Usando fluxo especializado CRIAR_SITE."
    );

    console.log("");
    console.log("SITE_BUILDER: gerando projeto sem mapear o Studio...");

    const resposta = await usarIA(`
Voce e um desenvolvedor web senior.

Crie um projeto web NOVO e ORIGINAL.

NOME:
${nome}

BRIEFING COMPLETO:
${briefing}

ARQUIVOS OBRIGATORIOS:
- index.html
- style.css
- app.js

REGRAS IMPORTANTES:

- Crie uma identidade visual propria.
- Nao copie projetos anteriores.
- Nao use um template generico apenas trocando cores e textos.
- HTML deve carregar ./style.css e ./app.js.
- Todo o projeto deve funcionar somente no front-end.
- Nao use API paga.
- Nao dependa de backend.
- Nao use frameworks.
- Nao use bibliotecas externas obrigatorias.
- Crie layout responsivo.
- Implemente de verdade as interacoes solicitadas.
- Use HTML semantico.
- Use CSS bem organizado.
- Use JavaScript valido.
- Nao escreva explicacoes.
- Nao use blocos markdown envolvendo a resposta.

FORMATO OBRIGATORIO:

===FILE:index.html===
conteudo completo do index.html

===FILE:style.css===
conteudo completo do style.css

===FILE:app.js===
conteudo completo do app.js
`.trim());

    const pacote =
        extrairArquivos(resposta);

    validarPacote(pacote);

    const caminhos = {
        html: `${pasta}/index.html`,
        css: `${pasta}/style.css`,
        js: `${pasta}/app.js`
    };

    definirProximoPasso(
        tarefaMemoria.id,
        "Salvar os arquivos gerados."
    );

    escreverArquivo(
        caminhos.html,
        pacote["index.html"]
    );

    escreverArquivo(
        caminhos.css,
        pacote["style.css"]
    );

    escreverArquivo(
        caminhos.js,
        pacote["app.js"]
    );

    const arquivosCriados = [
        caminhos.html,
        caminhos.css,
        caminhos.js
    ];

    arquivosCriados.forEach(arquivo => {
        emitirEvento(
            "Severino",
            "arquivo",
            `Criado: ${arquivo}`
        );
    });

    adicionarProgresso(
        tarefaMemoria.id,
        `Arquivos criados: ${arquivosCriados.join(", ")}`
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Validar os arquivos localmente."
    );

    console.log("SITE_BUILDER: validando arquivos...");

    let teste =
        await testarAlteracoes(
            arquivosCriados
        );

    if (!teste.sucesso) {
        const erroJS =
            teste.resultados.find(item =>
                !item.sucesso &&
                String(item.arquivo)
                    .toLowerCase()
                    .endsWith(".js")
            );

        if (erroJS) {
            console.log(
                "SITE_BUILDER: corrigindo somente o JavaScript..."
            );

            const corrigido =
                await corrigirJavaScript({
                    tarefa: briefing,
                    caminho: caminhos.js,
                    conteudo: pacote["app.js"],
                    erro: erroJS.mensagem
                });

            escreverArquivo(
                caminhos.js,
                corrigido
            );

            teste =
                await testarAlteracoes(
                    arquivosCriados
                );
        }
    }

    if (!teste.sucesso) {
        atualizarStatus(
            tarefaMemoria.id,
            "erro"
        );

        definirProximoPasso(
            tarefaMemoria.id,
            "Corrigir erros restantes."
        );

        throw new Error(
            "Site criado, mas a validacao falhou:\n" +
            formatarTeste(teste)
        );
    }

    adicionarProgresso(
        tarefaMemoria.id,
        "Validacao local concluida com sucesso."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "concluida"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        null
    );

    emitirEvento(
        "Severino",
        "concluido",
        `Site especializado concluido: ${nome}`
    );

    return {
        taskId: tarefaMemoria.id,
        status: "concluido",
        tipo: "criacao-site",
        arquivos: arquivosCriados,
        resultado: [
            `Site criado: ${nome}`,
            `Arquivos: ${arquivosCriados.join(", ")}`,
            "",
            "Validacao:",
            formatarTeste(teste)
        ].join("\n")
    };
}


module.exports = {
    criarSiteEspecializado
};