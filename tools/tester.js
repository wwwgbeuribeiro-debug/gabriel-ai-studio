const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const {
    resolverCaminhoSeguro
} = require("./workspace");

function executarArquivo(
    programa,
    argumentos,
    timeout = 15000
) {
    return new Promise(resolve => {
        execFile(
            programa,
            argumentos,
            {
                timeout,
                windowsHide: true,
                maxBuffer: 1024 * 1024
            },
            (erro, stdout, stderr) => {
                resolve({
                    sucesso: !erro,
                    stdout: stdout || "",
                    stderr: stderr || "",
                    erro: erro
                        ? erro.message
                        : null
                });
            }
        );
    });
}

async function testarArquivo(caminhoRelativo) {
    const { absoluto, relativo } =
        resolverCaminhoSeguro(caminhoRelativo);

    if (!fs.existsSync(absoluto)) {
        return {
            arquivo: relativo,
            sucesso: false,
            detalhes: "Arquivo não encontrado após a alteração."
        };
    }

    const extensao = path
        .extname(relativo)
        .toLowerCase();

    if (extensao === ".js") {
        const resultado = await executarArquivo(
            process.execPath,
            ["--check", absoluto]
        );

        return {
            arquivo: relativo,
            sucesso: resultado.sucesso,
            detalhes:
                resultado.stderr ||
                resultado.stdout ||
                resultado.erro ||
                "Sintaxe JavaScript válida."
        };
    }

    if (extensao === ".json") {
        try {
            JSON.parse(
                fs.readFileSync(
                    absoluto,
                    "utf8"
                )
            );

            return {
                arquivo: relativo,
                sucesso: true,
                detalhes: "JSON válido."
            };
        } catch (erro) {
            return {
                arquivo: relativo,
                sucesso: false,
                detalhes: erro.message
            };
        }
    }

    return {
        arquivo: relativo,
        sucesso: true,
        detalhes:
            "Arquivo salvo. Não há verificador local específico para essa extensão."
    };
}

async function testarAlteracoes(arquivos) {
    const resultados = [];

    for (const arquivo of [...new Set(arquivos)]) {
        resultados.push(
            await testarArquivo(arquivo)
        );
    }

    return {
        sucesso: resultados.every(
            item => item.sucesso
        ),
        resultados
    };
}

module.exports = {
    testarAlteracoes
};
