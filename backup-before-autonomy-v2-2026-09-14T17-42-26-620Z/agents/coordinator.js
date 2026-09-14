const { usarIA } = require("../tools/ai");
const { emitirEvento } = require("../tools/events");

const developer = require("./developer");
const content = require("./content");

function decidirLocalmente(tarefa) {
    const texto = tarefa.toLowerCase();

    // Quando o usuário chama um agente pelo nome,
    // respeitamos isso antes da classificação por palavras.
    if (texto.includes("severino")) {
        return "DEV";
    }

    if (texto.includes("jairo")) {
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
        "frontend"
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

AGENTES DISPONÍVEIS:

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

        console.log("\n✅ RESULTADO FINAL:\n");
        console.log(resultado);

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
