const { criarSite } = require("./create-site");

function limparTexto(texto) {
    return String(texto || "")
        .replace(/\*\*/g, "")
        .replace(/[`#]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizar(texto) {
    return limparTexto(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function extrairNomeSite(tarefa) {
    const texto = limparTexto(tarefa);

    let match = texto.match(
        /\b(?:chamado|chamada|nomeado|nomeada)\s+["']?([^.,;:\n]+)/i
    );

    if (match && match[1]) {
        return match[1]
            .replace(/["']/g, "")
            .trim()
            .slice(0, 80);
    }

    match = texto.match(
        /\bsite\s+(?:de|para)\s+(?:(?:um|uma|o|a)\s+)?([^.,;:\n]+)/i
    );

    if (match && match[1]) {
        return match[1]
            .replace(/["']/g, "")
            .trim()
            .slice(0, 80);
    }

    return "Novo Site";
}

function detectarWorkflowLocal(tarefa) {
    const texto = normalizar(tarefa);

    const acao =
        /\b(crie|criar|desenvolva|desenvolver|monte|montar|faca|construa|construir|gere|gerar)\b/;

    const site =
        /\b(site|website|landing page|pagina web)\b/;

    if (acao.test(texto) && site.test(texto)) {
        return {
            tipo: "CRIAR_SITE",
            nome: extrairNomeSite(tarefa)
        };
    }

    return null;
}

async function executarWorkflowLocal(workflow, tarefa) {
    if (workflow.tipo === "CRIAR_SITE") {
        return criarSite({
            nome: workflow.nome,
            descricao: tarefa,
            requisitos: [
                "Atender integralmente aos requisitos informados pelo usuario.",
                "Criar uma solucao propria para este projeto.",
                "Ser responsivo e funcional."
            ]
        });
    }

    throw new Error("Workflow local desconhecido.");
}

module.exports = {
    detectarWorkflowLocal,
    executarWorkflowLocal,
    extrairNomeSite
};