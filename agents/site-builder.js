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
        /===\s*FILE\s*:\s*(index\.html|style\.css|app\.js)\s*===\s*([\s\S]*?)(?====\s*FILE\s*:|$)/gi;

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


async function completarArquivosAusentes({
    pacote,
    nome,
    briefing
}) {
    const obrigatorios = [
        "index.html",
        "style.css",
        "app.js"
    ];

    const faltando = obrigatorios.filter(
        arquivo =>
            !pacote[arquivo] ||
            pacote[arquivo].trim().length < 20
    );

    if (faltando.length === 0) {
        return pacote;
    }

    console.log(
        "SITE_BUILDER: arquivos ausentes:",
        faltando.join(", ")
    );

    for (const arquivo of faltando) {
        console.log(
            `SITE_BUILDER: solicitando somente ${arquivo}...`
        );

        const referenciasHTML =
            pacote["index.html"]
                ? (
                    pacote["index.html"]
                        .match(/(?:class|id)=["'][^"']+["']/g) || []
                )
                    .slice(0, 120)
                    .join("\n")
                : "HTML ainda nao disponivel.";

        const resposta = await usarIA(`
Voce precisa completar UM UNICO arquivo que faltou em um projeto web.

PROJETO:
${nome}

ARQUIVO FALTANDO:
${arquivo}

BRIEFING:
${briefing}

REFERENCIAS DE CLASSES E IDS DO HTML:
${referenciasHTML}

REGRAS:
- Gere somente o arquivo solicitado.
- Nao explique.
- Nao gere os outros arquivos.
- Nao use markdown externo.
- Preserve o briefing do projeto.
- Se for CSS, use as classes e IDs informados quando existirem.
- Se for JavaScript, implemente as interacoes descritas no briefing.

RESPONDA EXATAMENTE ASSIM:

===FILE:${arquivo}===
conteudo completo do arquivo
`.trim());

        const recuperados =
            extrairArquivos(resposta);

        if (
            recuperados[arquivo] &&
            recuperados[arquivo].trim().length >= 20
        ) {
            pacote[arquivo] =
                recuperados[arquivo];

            console.log(
                `SITE_BUILDER: ${arquivo} recuperado.`
            );
        }
    }

    return pacote;
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

    let pacote = null;
    let ultimoErroPacote = null;

    for (
        let tentativaPacote = 1;
        tentativaPacote <= 3;
        tentativaPacote++
    ) {
        console.log(
            "SITE_BUILDER: gerando HTML integrado " +
            tentativaPacote + "/3..."
        );

        const respostaTentativa = await usarIA(`
Voce e um desenvolvedor web senior.

Crie um site NOVO, ORIGINAL, completo e funcional.

NOME:
${nome}

BRIEFING COMPLETO:
${briefing}

FORMA DE TRABALHO:

Crie UM UNICO arquivo HTML autocontido.

O HTML deve conter:

<style>
TODO O CSS DO SITE
</style>

e, antes do fechamento de body:

<script>
TODO O JAVASCRIPT DO SITE
</script>

Isso e obrigatorio porque HTML, CSS e JavaScript
precisam ser desenvolvidos juntos como uma unica interface.

REGRAS DE QUALIDADE:

- Crie identidade visual propria.
- Nao copie projetos anteriores.
- Nao use template generico apenas trocando cores.
- Crie hierarquia visual profissional.
- Hero deve ter presenca visual forte.
- Formularios devem ser totalmente estilizados.
- Crie estados hover, focus e active.
- Crie layout responsivo real.
- Crie menu adequado para celular.
- Se houver fluxo em etapas, use stepper visual.
- Implemente de verdade as interacoes solicitadas.
- CSS deve usar exatamente as classes e IDs do HTML.
- JavaScript deve acessar somente elementos que existam no HTML.
- Nao use frameworks.
- Nao dependa de backend.
- Nao dependa de API paga.
- Nao use base64.
- Nao use imagens aleatorias sem relacao com o projeto.
- Prefira composicoes visuais em CSS quando nao houver imagem real.
- Use HTML semantico.
- Use JavaScript valido.
- Priorize completar TODO o documento.
- Seja conciso no codigo para evitar resposta truncada.

FORMATO OBRIGATORIO:

Responda SOMENTE com o documento HTML completo.

Comece com:

<!DOCTYPE html>

e termine obrigatoriamente com:

</html>

Nao escreva explicacoes antes ou depois.
Nao use blocos markdown.
`.trim());

        let documento =
            String(respostaTentativa || "")
                .trim();

        documento = documento
            .replace(/^\`\`\`html\s*/i, "")
            .replace(/^\`\`\`\s*/i, "")
            .replace(/\`\`\`\s*$/i, "")
            .trim();

        const inicioHtml =
            documento.search(
                /<!doctype\s+html|<html/i
            );

        const fimHtml =
            documento.toLowerCase()
                .lastIndexOf("</html>");

        if (
            inicioHtml === -1 ||
            fimHtml === -1
        ) {
            ultimoErroPacote =
                "Documento HTML truncado ou incompleto.";

            console.log(
                "SITE_BUILDER: " +
                ultimoErroPacote
            );

            console.log(
                "SITE_BUILDER: descartando resposta incompleta."
            );

            continue;
        }

        documento =
            documento.slice(
                inicioHtml,
                fimHtml + "</html>".length
            );

        const styleMatch =
            documento.match(
                /<style[^>]*>([\s\S]*?)<\/style>/i
            );

        const scriptMatch =
            documento.match(
                /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/i
            );

        if (
            !styleMatch ||
            styleMatch[1].trim().length < 20
        ) {
            ultimoErroPacote =
                "HTML nao trouxe um bloco CSS completo.";

            console.log(
                "SITE_BUILDER: " +
                ultimoErroPacote
            );

            console.log(
                "SITE_BUILDER: descartando resposta incompleta."
            );

            continue;
        }

        if (
            !scriptMatch ||
            scriptMatch[1].trim().length < 20
        ) {
            ultimoErroPacote =
                "HTML nao trouxe um bloco JavaScript completo.";

            console.log(
                "SITE_BUILDER: " +
                ultimoErroPacote
            );

            console.log(
                "SITE_BUILDER: descartando resposta incompleta."
            );

            continue;
        }

        const css =
            styleMatch[1].trim();

        const js =
            scriptMatch[1].trim();

        let html =
            documento
                .replace(
                    styleMatch[0],
                    ""
                )
                .replace(
                    scriptMatch[0],
                    ""
                );

        if (/<\/head>/i.test(html)) {
            html = html.replace(
                /<\/head>/i,
                '    <link rel="stylesheet" href="./style.css">\n</head>'
            );
        } else {
            ultimoErroPacote =
                "HTML sem fechamento de head.";

            console.log(
                "SITE_BUILDER: " +
                ultimoErroPacote
            );

            continue;
        }

        if (/<\/body>/i.test(html)) {
            html = html.replace(
                /<\/body>/i,
                '    <script src="./app.js"></script>\n</body>'
            );
        } else {
            ultimoErroPacote =
                "HTML sem fechamento de body.";

            console.log(
                "SITE_BUILDER: " +
                ultimoErroPacote
            );

            continue;
        }

        pacote = {
            "index.html": html.trim(),
            "style.css": css,
            "app.js": js
        };

        validarPacote(pacote);

        console.log(
            "SITE_BUILDER: HTML, CSS e JS extraidos do mesmo documento."
        );

        break;
    }

    if (!pacote) {
        throw new Error(
            "Nao foi possivel gerar um documento integrado completo. " +
            (
                ultimoErroPacote ||
                "Resposta completa nao recebida."
            )
        );
    }

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