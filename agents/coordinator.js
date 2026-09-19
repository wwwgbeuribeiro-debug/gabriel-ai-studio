const { usarIA } = require("../tools/ai");
const { emitirEvento } = require("../tools/events");
const autonomous = require("./autonomous");

const developer = require("./developer");
const content = require("./content");
const {
    detectarWorkflowLocal,
    executarWorkflowLocal
} = require("../workflows");

function decidirLocalmente(tarefa) {
    const texto = tarefa.toLowerCase().trim();

    // Quando o usuário chama um agente pelo nome no início da tarefa,
    // respeitamos isso antes da classificação por palavras.
    // Essa regra tem prioridade absoluta sobre a contagem de palavras-chave.
    if (/^severino\s*[,;:\-]?\s*/.test(texto)) {
        return "DEV";
    }

    if (/^jairo\s*[,;:\-]?\s*/.test(texto)) {
        return "CONTENT";
    }

    const palavrasDev = [
        "código",
        "codigo",
        "javascript",
        "html",
        "css",
        "node",
        "programação",
        "programacao",
        "erro",
        "bug",
        "arquivo",
        "arquivos",
        "projeto",
        "investigue",
        "site",
        "api",
        "implemente",
        "corrija",
        "altere",
        "modifique",
        "refatore",
        "backend",
        "frontend",
        "desfaça",
        "desfaca",
        "desfazer",
        "reverta",
        "reverter",
        "rollback",
        "undo"
    ];

    const palavrasContent = [
        "roteiro",
        "reels",
        "post",
        "legenda",
        "instagram",
        "tiktok",
        "conteúdo",
        "conteudo",
        "vídeo",
        "video"
    ];

    const pontosDev = palavrasDev.filter(
        palavra => texto.includes(palavra)
    ).length;

    const pontosContent = palavrasContent.filter(
        palavra => texto.includes(palavra)
    ).length;

    if (pontosDev > pontosContent) {
        return "DEV";
    }

    if (pontosContent > pontosDev) {
        return "CONTENT";
    }

    return null;
}


async function coordinator(tarefa) {
    console.log("🧠 Carlos recebeu:");
    console.log(tarefa);

    emitirEvento(
        "Carlos",
        "tarefa",
        `Recebeu a tarefa: ${tarefa}`
    );

    try {

        const workflowLocal =
            detectarWorkflowLocal(tarefa);

        if (workflowLocal) {
            console.log("LOCAL_WORKFLOW_SELECTED:", workflowLocal.tipo);

            emitirEvento(
                "Carlos",
                "workflow",
                `Workflow local selecionado: ${workflowLocal.tipo}`
            );

            const resultadoWorkflow =
                await executarWorkflowLocal(
                    workflowLocal,
                    tarefa
                );

            emitirEvento(
                "Carlos",
                "concluido",
                `Workflow local concluido: ${workflowLocal.tipo}`
            );

            return resultadoWorkflow;
        }

        if (
            autonomous.deveExecutarAutonomo(
                tarefa
            )
        ) {
            console.log(
                "Carlos entrou em modo autonomo."
            );

            emitirEvento(
                "Carlos",
                "autonomia",
                "Objetivo recebido para execucao autonoma."
            );

            const resultadoAutonomo =
                await autonomous.executarObjetivoAutonomo(
                    tarefa
                );

            console.log(
                "\nRESULTADO AUTONOMO:\n"
            );

            console.log(
                resultadoAutonomo
            );

            emitirEvento(
                "Carlos",
                "concluido",
                "Objetivo autonomo finalizado."
            );

            return resultadoAutonomo;
        }

        let agenteEscolhido =
            decidirLocalmente(tarefa);

        if (agenteEscolhido) {
            console.log(
                `⚡ Carlos identificou localmente: ${agenteEscolhido}`
            );
        } else {
            console.log(
                "🤔 Carlos ficou em dúvida. Consultando IA..."
            );

            const decisao = await usarIA(`
Você é Carlos, o coordenador de uma equipe de agentes.

Sua função é escolher qual agente deve executar a tarefa.

AGENTES DISPONIVEIS:

DEV
Nome: Severino
Especialista em programação, código, arquivos,
investigação, JavaScript, HTML, CSS, Node.js,
APIs, alterações e problemas técnicos.

CONTENT
Nome: Jairo
Especialista em vídeos, roteiros, Reels,
posts, legendas, redes sociais e conteúdo.

Responda SOMENTE:
DEV
ou
CONTENT

TAREFA:
${tarefa}
`);

            agenteEscolhido =
                decisao.trim().toUpperCase();
        }

        const nomes = {
            DEV: "Severino",
            CONTENT: "Jairo"
        };

        console.log(
            `🤔 Carlos escolheu: ${nomes[agenteEscolhido] || agenteEscolhido}`
        );

        emitirEvento(
            "Carlos",
            "delegacao",
            `Tarefa enviada para ${nomes[agenteEscolhido] || agenteEscolhido}`
        );

        let resultado;

        if (agenteEscolhido === "DEV") {
            resultado = await developer(tarefa);
        } else if (agenteEscolhido === "CONTENT") {
            resultado = await content(tarefa);
        } else {
            throw new Error(
                "Carlos não conseguiu escolher um agente válido."
            );
        }

        // Preserva o retorno estruturado do agente.
        // Para exibição, usamos somente o texto amigável.
        const resultadoExibicao =
            typeof resultado === "object" &&
            resultado !== null &&
            resultado.resultado
                ? resultado.resultado
                : resultado;

        console.log("\n✅ RESULTADO FINAL:\n");
        console.log(resultadoExibicao);

        emitirEvento(
            "Carlos",
            "concluido",
            `Tarefa concluída por ${nomes[agenteEscolhido]}.`
        );

        return resultado;

    } catch (erro) {
        console.log("\n❌ Ocorreu um erro:");
        console.log(erro.message);

        emitirEvento(
            "Carlos",
            "erro",
            erro.message
        );

        throw erro;
    }
}


module.exports = coordinator;