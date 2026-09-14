const fs = require("fs");
const path = require("path");

const raizProjeto = path.resolve(__dirname, "..");

const NOMES_BLOQUEADOS = new Set([
    ".env",
    ".git",
    "node_modules",
    "backups",
    "gabriel-ai-studio-upgrade",
    "gabriel-ai-studio-upgrade-v2"
]);

const EXTENSOES_SENSIVEIS = new Set([
    ".pem",
    ".key",
    ".p12",
    ".pfx"
]);

const pastaHistorico = path.join(
    raizProjeto,
    "memory"
);

const caminhoHistorico = path.join(
    pastaHistorico,
    "change-history.json"
);

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

            if (!fs.existsSync(origem)) {
                throw new Error(
                    `Backup incompleto para ${relativo}.`
                );
            }

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
                {
                    force: true,
                    recursive: false
                }
            );
        }
    }
}

function carregarHistoricoMudancas() {
    try {
        if (!fs.existsSync(caminhoHistorico)) {
            return {
                versao: 1,
                mudancas: []
            };
        }

        const texto = fs
            .readFileSync(
                caminhoHistorico,
                "utf8"
            )
            .trim();

        if (!texto) {
            return {
                versao: 1,
                mudancas: []
            };
        }

        const dados = JSON.parse(texto);

        if (!Array.isArray(dados.mudancas)) {
            return {
                versao: 1,
                mudancas: []
            };
        }

        return dados;
    } catch (erro) {
        throw new Error(
            `Não foi possível ler o histórico de alterações: ${erro.message}`
        );
    }
}

function salvarHistoricoMudancas(historico) {
    fs.mkdirSync(
        pastaHistorico,
        { recursive: true }
    );

    fs.writeFileSync(
        caminhoHistorico,
        JSON.stringify(
            historico,
            null,
            2
        ),
        "utf8"
    );
}

function registrarMudancaConcluida({
    idTarefa,
    descricao,
    backup,
    arquivos
}) {
    if (!backup || !backup.pastaBackup) {
        throw new Error(
            "Não existe backup para registrar esta alteração."
        );
    }

    const historico =
        carregarHistoricoMudancas();

    const backupRelativo = path.relative(
        raizProjeto,
        backup.pastaBackup
    );

    const registro = {
        idTarefa,
        descricao:
            descricao || "Alteração concluída",
        arquivos: [
            ...new Set(arquivos || [])
        ],
        backup: backupRelativo,
        status: "aplicada",
        criadaEm: new Date().toISOString(),
        desfeitaEm: null
    };

    const indiceExistente =
        historico.mudancas.findIndex(
            item =>
                item.idTarefa === idTarefa
        );

    if (indiceExistente >= 0) {
        historico.mudancas[indiceExistente] =
            registro;
    } else {
        historico.mudancas.push(registro);
    }

    salvarHistoricoMudancas(historico);

    return registro;
}

function listarMudancasReversiveis(
    limite = 10
) {
    const historico =
        carregarHistoricoMudancas();

    return historico.mudancas
        .filter(
            item => item.status === "aplicada"
        )
        .slice(-limite)
        .reverse();
}

function carregarBackupDoRegistro(registro) {
    const pastaBackup = path.resolve(
        raizProjeto,
        registro.backup
    );

    const pastaBackupsPermitida = path.resolve(
        raizProjeto,
        "memory",
        "backups"
    );

    const relativo = path.relative(
        pastaBackupsPermitida,
        pastaBackup
    );

    if (
        relativo.startsWith("..") ||
        path.isAbsolute(relativo)
    ) {
        throw new Error(
            "Caminho de backup inválido no histórico."
        );
    }

    const caminhoManifest = path.join(
        pastaBackup,
        "manifest.json"
    );

    if (!fs.existsSync(caminhoManifest)) {
        throw new Error(
            `Backup da tarefa ${registro.idTarefa} não foi encontrado.`
        );
    }

    const manifest = JSON.parse(
        fs.readFileSync(
            caminhoManifest,
            "utf8"
        )
    );

    return {
        pastaBackup,
        manifest
    };
}

function encontrarConflitosPosteriores(
    historico,
    indiceAlvo
) {
    const alvo =
        historico.mudancas[indiceAlvo];

    const arquivosAlvo = new Set(
        alvo.arquivos || []
    );

    const conflitos = [];

    for (
        let i = indiceAlvo + 1;
        i < historico.mudancas.length;
        i++
    ) {
        const posterior =
            historico.mudancas[i];

        if (posterior.status !== "aplicada") {
            continue;
        }

        const sobrepostos =
            (posterior.arquivos || [])
                .filter(arquivo =>
                    arquivosAlvo.has(arquivo)
                );

        if (sobrepostos.length > 0) {
            conflitos.push({
                idTarefa:
                    posterior.idTarefa,
                arquivos:
                    sobrepostos
            });
        }
    }

    return conflitos;
}

function desfazerMudanca(
    idTarefa = null
) {
    const historico =
        carregarHistoricoMudancas();

    if (historico.mudancas.length === 0) {
        throw new Error(
            "Ainda não existem alterações registradas para desfazer."
        );
    }

    let indice = -1;

    if (idTarefa) {
        indice = historico.mudancas.findIndex(
            item =>
                item.idTarefa === idTarefa
        );

        if (indice === -1) {
            throw new Error(
                `Não encontrei a alteração ${idTarefa}.`
            );
        }

        if (
            historico.mudancas[indice].status ===
            "desfeita"
        ) {
            throw new Error(
                `A alteração ${idTarefa} já foi desfeita.`
            );
        }
    } else {
        for (
            let i = historico.mudancas.length - 1;
            i >= 0;
            i--
        ) {
            if (
                historico.mudancas[i].status ===
                "aplicada"
            ) {
                indice = i;
                break;
            }
        }

        if (indice === -1) {
            throw new Error(
                "Não existe nenhuma alteração ativa para desfazer."
            );
        }
    }

    const registro =
        historico.mudancas[indice];

    const conflitos =
        encontrarConflitosPosteriores(
            historico,
            indice
        );

    if (conflitos.length > 0) {
        const detalhes = conflitos
            .map(item =>
                `${item.idTarefa} (${item.arquivos.join(", ")})`
            )
            .join("; ");

        throw new Error(
            `Não posso desfazer ${registro.idTarefa} com segurança porque alterações posteriores mexeram nos mesmos arquivos: ${detalhes}. Desfaça primeiro as alterações posteriores.`
        );
    }

    const backup =
        carregarBackupDoRegistro(registro);

    restaurarBackup(backup);

    registro.status = "desfeita";
    registro.desfeitaEm =
        new Date().toISOString();

    salvarHistoricoMudancas(historico);

    return {
        idTarefa: registro.idTarefa,
        descricao: registro.descricao,
        arquivos: registro.arquivos,
        desfeitaEm: registro.desfeitaEm
    };
}

module.exports = {
    raizProjeto,
    listarProjeto,
    arquivoExiste,
    lerArquivo,
    escreverArquivo,
    criarBackup,
    restaurarBackup,
    resolverCaminhoSeguro,
    registrarMudancaConcluida,
    listarMudancasReversiveis,
    desfazerMudanca
};
