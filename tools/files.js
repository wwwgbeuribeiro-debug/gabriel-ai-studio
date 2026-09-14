const fs = require("fs");
const path = require("path");

const raizProjeto = path.join(__dirname, "..");

function listarArquivos(pasta = ".") {
    const caminho = path.resolve(raizProjeto, pasta);

    // Segurança: impede sair da pasta do projeto
    if (!caminho.startsWith(raizProjeto)) {
        return "Acesso negado.";
    }

    const itens = fs.readdirSync(caminho, {
        withFileTypes: true
    });

    return itens
        .filter(item => item.name !== "node_modules")
        .filter(item => item.name !== ".env")
        .map(item =>
            item.isDirectory()
                ? `PASTA: ${path.join(pasta, item.name)}`
                : `ARQUIVO: ${path.join(pasta, item.name)}`
        )
        .join("\n");
}

function lerArquivo(caminhoArquivo) {
    const caminho = path.resolve(raizProjeto, caminhoArquivo);

    // Segurança
    if (!caminho.startsWith(raizProjeto)) {
        return "Acesso negado.";
    }

    // Nunca permitir leitura do .env
    if (path.basename(caminho) === ".env") {
        return "Acesso ao .env bloqueado.";
    }

    if (!fs.existsSync(caminho)) {
        return "Arquivo não encontrado.";
    }

    return fs.readFileSync(caminho, "utf8");
}

module.exports = {
    listarArquivos,
    lerArquivo
};