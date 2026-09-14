const fs = require("fs");
const path = require("path");

const raizProjeto = path.resolve(__dirname, "..");

const NOMES_BLOQUEADOS = new Set([
    ".env",
    ".git",
    "node_modules",
    "backups",
    "gabriel-ai-studio-upgrade"
]);

const EXTENSOES_SENSIVEIS = new Set([
    ".pem",
    ".key",
    ".p12",
    ".pfx"
]);

function caminhoEhSensivel(relativo) {
    const partes = relativo
        .split(path.sep)
        .filter(Boolean);

    if (
        partes.some(parte =>
            NOMES_BLOQUEADOS.has(parte)
        )
    ) {
        return true;
    }

    const nome = path.basename(relativo).toLowerCase();

    if (
        nome === "credentials.json" ||
        nome === "secrets.json" ||
        nome === "secret.json"
    ) {
        return true;
    }

    return EXTENSOES_SENSIVEIS.has(
        path.extname(nome)
    );
}

function resolverCaminhoSeguro(caminhoRelativo) {
    if (
        !caminhoRelativo ||
        typeof caminhoRelativo !== "string"
    ) {
        throw new Error("Caminho inválido.");
    }

    const caminhoLimpo = caminhoRelativo
        .replace(/^[.][\\/]/, "")
        .trim();

    const absoluto = path.resolve(
        raizProjeto,
        caminhoLimpo
    );

    const relativo = path.relative(
        raizProjeto,
        absoluto
    );

    if (
        relativo.startsWith("..") ||
        path.isAbsolute(relativo)
    ) {
        throw new Error(
            `Acesso fora do projeto bloqueado: ${caminhoRelativo}`
        );
    }

    if (caminhoEhSensivel(relativo)) {
        throw new Error(
            `Arquivo protegido: ${caminhoRelativo}`
        );
    }

    return {
        absoluto,
        relativo
    };
}

function listarProjeto() {
    const resultados = [];
    const MAX_ARQUIVOS = 300;
    const MAX_PROFUNDIDADE = 6;

    function visitar(pastaAbsoluta, profundidade) {
        if (
            profundidade > MAX_PROFUNDIDADE ||
            resultados.length >= MAX_ARQUIVOS
        ) {
            return;
        }

        const itens = fs.readdirSync(
            pastaAbsoluta,
            { withFileTypes: true }
        );

        for (const item of itens) {
            if (resultados.length >= MAX_ARQUIVOS) {
                break;
            }

            if (NOMES_BLOQUEADOS.has(item.name)) {
                continue;
            }

            const absoluto = path.join(
                pastaAbsoluta,
                item.name
            );

            const relativo = path.relative(
                raizProjeto,
                absoluto
            );

            if (caminhoEhSensivel(relativo)) {
                continue;
            }

            if (item.isDirectory()) {
                visitar(
                    absoluto,
                    profundidade + 1
                );
            } else {
                resultados.push(relativo);
            }
        }
    }

    visitar(raizProjeto, 0);

    return resultados;
}

function arquivoExiste(caminhoRelativo) {
    try {
        const { absoluto } =
            resolverCaminhoSeguro(caminhoRelativo);

        return (
            fs.existsSync(absoluto) &&
            fs.statSync(absoluto).isFile()
        );
    } catch {
        return false;
    }
}

function lerArquivo(caminhoRelativo) {
    const { absoluto } =
        resolverCaminhoSeguro(caminhoRelativo);

    if (!fs.existsSync(absoluto)) {
        throw new Error(
            `Arquivo não encontrado: ${caminhoRelativo}`
        );
    }

    return fs.readFileSync(
        absoluto,
        "utf8"
    );
}

function escreverArquivo(
    caminhoRelativo,
    conteudo
) {
    const { absoluto, relativo } =
        resolverCaminhoSeguro(caminhoRelativo);

    fs.mkdirSync(
        path.dirname(absoluto),
        { recursive: true }
    );

    fs.writeFileSync(
        absoluto,
        conteudo,
        "utf8"
    );

    return relativo;
}

function criarBackup(idTarefa, arquivos) {
    const carimbo = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const pastaBackup = path.join(
        raizProjeto,
        "memory",
        "backups",
        `${idTarefa}-${carimbo}`
    );

    fs.mkdirSync(
        pastaBackup,
        { recursive: true }
    );

    const manifest = [];

    for (const arquivo of [...new Set(arquivos)]) {
        const { absoluto, relativo } =
            resolverCaminhoSeguro(arquivo);

        const existia = fs.existsSync(absoluto);

        const registro = {
            arquivo: relativo,
            existia
        };

        if (existia) {
            const destino = path.join(
                pastaBackup,
                relativo
            );

            fs.mkdirSync(
                path.dirname(destino),
                { recursive: true }
            );

            fs.copyFileSync(
                absoluto,
                destino
            );
        }

        manifest.push(registro);
    }

    fs.writeFileSync(
        path.join(
            pastaBackup,
            "manifest.json"
        ),
        JSON.stringify(manifest, null, 2),
        "utf8"
    );

    return {
        pastaBackup,
        manifest
    };
}

function restaurarBackup(backup) {
    if (!backup || !backup.manifest) {
        return;
    }

    for (const item of backup.manifest) {
        const { absoluto, relativo } =
            resolverCaminhoSeguro(item.arquivo);

        if (item.existia) {
            const origem = path.join(
                backup.pastaBackup,
                relativo
            );

            fs.mkdirSync(
                path.dirname(absoluto),
                { recursive: true }
            );

            fs.copyFileSync(
                origem,
                absoluto
            );
        } else if (fs.existsSync(absoluto)) {
            fs.rmSync(
                absoluto,
                { force: true }
            );
        }
    }
}

module.exports = {
    raizProjeto,
    listarProjeto,
    arquivoExiste,
    lerArquivo,
    escreverArquivo,
    criarBackup,
    restaurarBackup,
    resolverCaminhoSeguro
};
