const fs = require("fs");
const path = require("path");

const developer = require("../agents/developer");

function criarSlug(nome) {
    return String(nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function validarResultado(resultado, pastaRelativa) {
    if (!resultado || typeof resultado !== "object") {
        throw new Error(
            "Severino não retornou um resultado estruturado."
        );
    }

    if (resultado.status !== "concluido") {
        throw new Error(
            `Severino terminou com status inesperado: ${resultado.status}`
        );
    }

    const arquivos = Array.isArray(resultado.arquivos)
        ? resultado.arquivos
        : [];

    const indexEsperado = path
        .join(pastaRelativa, "index.html")
        .replace(/\\/g, "/");

    const indexExisteNoResultado = arquivos.some(arquivo =>
        String(arquivo)
            .replace(/\\/g, "/")
            .endsWith(indexEsperado)
    );

    const indexFisico = path.resolve(
        process.cwd(),
        pastaRelativa,
        "index.html"
    );

    if (
        !indexExisteNoResultado &&
        !fs.existsSync(indexFisico)
    ) {
        throw new Error(
            `Workflow terminou sem encontrar ${indexEsperado}`
        );
    }

    return arquivos;
}

async function criarSite({
    nome,
    descricao = "",
    requisitos = []
}) {
    if (!nome) {
        throw new Error(
            "O workflow CRIAR_SITE precisa do nome do projeto."
        );
    }

    const slug = criarSlug(nome);

    if (!slug) {
        throw new Error(
            "Não foi possível gerar uma pasta válida para o projeto."
        );
    }

    const pastaRelativa = `public/${slug}`;

    if (fs.existsSync(path.resolve(process.cwd(), pastaRelativa))) {
        throw new Error(
            `A pasta ${pastaRelativa} já existe. Use outro projeto ou remova a pasta antes de criar um site novo.`
        );
    }

    const listaRequisitos =
        Array.isArray(requisitos) && requisitos.length > 0
            ? requisitos.map(item => `- ${item}`).join("\n")
            : "- site responsivo\n- HTML, CSS e JavaScript válidos";

    const tarefa = `
Crie DO ZERO um site completo chamado "${nome}".

PASTA OBRIGATÓRIA:
${pastaRelativa}

DESCRIÇÃO:
${descricao || "Projeto web novo."}

REQUISITOS:
${listaRequisitos}

REGRAS:
- Esta é UMA única tarefa de implementação.
- Crie todos os arquivos necessários dentro de ${pastaRelativa}.
- O projeto deve possuir pelo menos index.html.
- Crie identidade visual própria para este projeto.
- Não copie projetos anteriores.
- Todas as alterações desta tarefa devem ficar exclusivamente dentro de ${pastaRelativa}.
- Teste os arquivos criados.
- Corrija erros encontrados antes de concluir.
- Retorne os arquivos realmente criados.
`.trim();

    console.log("");
    console.log("==========================================");
    console.log("WORKFLOW LOCAL: CRIAR_SITE");
    console.log("==========================================");
    console.log(`Projeto: ${nome}`);
    console.log(`Pasta: ${pastaRelativa}`);

    const resultado = await developer(tarefa);

    const arquivos =
        validarResultado(
            resultado,
            pastaRelativa
        );

    return {
        workflow: "CRIAR_SITE",
        status: "concluido",
        projeto: nome,
        pasta: pastaRelativa,
        taskId: resultado.taskId || null,
        arquivos,
        resultado: resultado.resultado || ""
    };
}

module.exports = {
    criarSite,
    criarSlug
};