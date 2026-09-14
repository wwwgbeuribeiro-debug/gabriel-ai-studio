const fs = require("fs");
const path = require("path");

const caminhoAtividade = path.join(
    __dirname,
    "..",
    "memory",
    "activity.json"
);

function carregarAtividade() {
    try {
        if (!fs.existsSync(caminhoAtividade)) {
            return [];
        }

        const dados = fs.readFileSync(caminhoAtividade, "utf8").trim();

        if (!dados) {
            return [];
        }

        return JSON.parse(dados);
    } catch (erro) {
        console.log("⚠️ Não foi possível carregar a atividade persistente.");
        return [];
    }
}

function salvarAtividade(atividades) {
    // Limita a 500 registros mais recentes
    if (atividades.length > 500) {
        atividades =atividades.slice(-500);
    }

    fs.writeFileSync(
        caminhoAtividade,
        JSON.stringify(atividades, null, 2),
        "utf8"
    );
}

module.exports = {
    carregarAtividade,
    salvarAtividade
};