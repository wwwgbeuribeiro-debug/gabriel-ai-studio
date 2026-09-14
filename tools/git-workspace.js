const fs = require("fs");
const path = require("path");
const {
    execFileSync
} = require("child_process");

const raizProjeto = path.resolve(
    __dirname,
    ".."
);

function executarGit(
    argumentos,
    {
        permitirErro = false
    } = {}
) {
    try {
        return execFileSync(
            "git",
            argumentos,
            {
                cwd: raizProjeto,
                encoding: "utf8",
                windowsHide: true,
                stdio: [
                    "ignore",
                    "pipe",
                    "pipe"
                ]
            }
        ).trim();
    } catch (erro) {
        if (permitirErro) {
            return null;
        }

        const detalhes =
            erro.stderr?.toString()?.trim() ||
            erro.stdout?.toString()?.trim() ||
            erro.message;

        throw new Error(
            `Git: ${detalhes}`
        );
    }
}

function garantirRepositorioGit() {
    const resultado = executarGit(
        [
            "rev-parse",
            "--is-inside-work-tree"
        ],
        {
            permitirErro: true
        }
    );

    if (resultado !== "true") {
        throw new Error(
            "Este projeto ainda não está configurado como repositório Git."
        );
    }
}

function statusGit() {
    garantirRepositorioGit();

    return executarGit([
        "status",
        "--porcelain"
    ]);
}

function garantirArvoreLimpa() {
    const status = statusGit();

    if (!status) {
        return true;
    }

    const linhas = status
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");

    throw new Error(
        [
            "O projeto possui alterações fora da tarefa atual.",
            "Por segurança, Severino não vai misturá-las com uma nova alteração.",
            "",
            linhas,
            "",
            "Salve, descarte ou faça commit dessas alterações antes de tentar novamente."
        ].join("\n")
    );
}

function obterCommitAtual() {
    garantirRepositorioGit();

    return executarGit([
        "rev-parse",
        "HEAD"
    ]);
}

function normalizarCaminhoGit(caminho) {
    return caminho
        .replace(/\\/g, "/")
        .replace(/^\.\//, "");
}

function arquivoExisteNoCommit(
    commit,
    caminhoRelativo
) {
    const caminho =
        normalizarCaminhoGit(
            caminhoRelativo
        );

    const resultado = executarGit(
        [
            "cat-file",
            "-e",
            `${commit}:${caminho}`
        ],
        {
            permitirErro: true
        }
    );

    // cat-file -e não imprime nada quando funciona.
    // executarGit retorna "" em sucesso e null em falha.
    return resultado !== null;
}

function criarBackup(
    idTarefa,
    arquivos
) {
    garantirArvoreLimpa();

    const commit = obterCommitAtual();

    const manifest = [
        ...new Set(
            (arquivos || []).map(
                normalizarCaminhoGit
            )
        )
    ].map(arquivo => ({
        arquivo,
        existia:
            arquivoExisteNoCommit(
                commit,
                arquivo
            )
    }));

    return {
        tipo: "git",
        idTarefa,
        commit,
        manifest
    };
}

function restaurarBackup(backup) {
    if (
        !backup ||
        backup.tipo !== "git" ||
        !backup.commit ||
        !Array.isArray(backup.manifest)
    ) {
        throw new Error(
            "Checkpoint Git inválido."
        );
    }

    for (const item of backup.manifest) {
        const arquivo =
            normalizarCaminhoGit(
                item.arquivo
            );

        const absoluto = path.resolve(
            raizProjeto,
            arquivo
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
                `Caminho inválido no checkpoint: ${arquivo}`
            );
        }

        if (item.existia) {
            executarGit([
                "restore",
                "--source",
                backup.commit,
                "--staged",
                "--worktree",
                "--",
                arquivo
            ]);
        } else {
            executarGit(
                [
                    "rm",
                    "--cached",
                    "--ignore-unmatch",
                    "--",
                    arquivo
                ],
                {
                    permitirErro: true
                }
            );

            if (fs.existsSync(absoluto)) {
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
}

function mensagemCommit(
    idTarefa,
    descricao
) {
    const resumo = String(
        descricao || "alteração concluída"
    )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 90);

    return `severino(${idTarefa}): ${resumo}`;
}

function haMudancasPreparadas() {
    const resultado = executarGit(
        [
            "diff",
            "--cached",
            "--quiet"
        ],
        {
            permitirErro: true
        }
    );

    // Em sucesso, retorna "".
    // Em diferença, retorna null.
    return resultado === null;
}

function registrarMudancaConcluida({
    idTarefa,
    descricao,
    backup,
    arquivos
}) {
    if (
        !backup ||
        backup.tipo !== "git"
    ) {
        throw new Error(
            "Checkpoint Git não encontrado."
        );
    }

    const atual = obterCommitAtual();

    if (atual !== backup.commit) {
        throw new Error(
            "O histórico Git mudou enquanto Severino trabalhava. A alteração não será registrada automaticamente."
        );
    }

    const caminhos = [
        ...new Set(
            (arquivos || []).map(
                normalizarCaminhoGit
            )
        )
    ];

    if (caminhos.length === 0) {
        throw new Error(
            "Nenhum arquivo foi informado para o commit."
        );
    }

    executarGit([
        "add",
        "--",
        ...caminhos
    ]);

    if (!haMudancasPreparadas()) {
        return {
            idTarefa,
            arquivos: caminhos,
            commit: atual,
            semMudancas: true
        };
    }

    executarGit([
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        mensagemCommit(
            idTarefa,
            descricao
        )
    ]);

    const commit = obterCommitAtual();

    return {
        idTarefa,
        arquivos: caminhos,
        commit,
        semMudancas: false
    };
}

function lerLogEstruturado(
    limite = 120
) {
    const texto = executarGit([
        "log",
        `-n${limite}`,
        "--format=%H%x1f%s%x1f%b%x1e"
    ]);

    if (!texto) {
        return [];
    }

    return texto
        .split("\x1e")
        .map(bloco => bloco.trim())
        .filter(Boolean)
        .map(bloco => {
            const partes =
                bloco.split("\x1f");

            return {
                hash:
                    partes[0]?.trim() || "",
                assunto:
                    partes[1]?.trim() || "",
                corpo:
                    partes
                        .slice(2)
                        .join("\x1f")
                        .trim()
            };
        });
}

function hashRevertidoPorCommit(log) {
    const revertidos = new Set();

    for (const item of log) {
        const encontrou =
            item.corpo.match(
                /This reverts commit ([0-9a-f]{7,40})\./i
            );

        if (encontrou) {
            revertidos.add(
                encontrou[1].toLowerCase()
            );
        }
    }

    return revertidos;
}

function extrairIdDoAssunto(assunto) {
    const encontrado =
        assunto.match(
            /^severino\((task-\d+)\):/i
        );

    return encontrado
        ? encontrado[1].toLowerCase()
        : null;
}

function commitFoiRevertido(
    hash,
    revertidos
) {
    const alvo = hash.toLowerCase();

    for (const revertido of revertidos) {
        if (
            alvo === revertido ||
            alvo.startsWith(revertido) ||
            revertido.startsWith(alvo)
        ) {
            return true;
        }
    }

    return false;
}

function encontrarCommitSeverino(
    idTarefa = null
) {
    const log = lerLogEstruturado();
    const revertidos =
        hashRevertidoPorCommit(log);

    for (const item of log) {
        const id =
            extrairIdDoAssunto(
                item.assunto
            );

        if (!id) {
            continue;
        }

        if (
            idTarefa &&
            id !== idTarefa.toLowerCase()
        ) {
            continue;
        }

        if (
            commitFoiRevertido(
                item.hash,
                revertidos
            )
        ) {
            if (idTarefa) {
                throw new Error(
                    `A alteração ${idTarefa} já foi desfeita no Git.`
                );
            }

            continue;
        }

        return {
            ...item,
            idTarefa: id
        };
    }

    if (idTarefa) {
        throw new Error(
            `Não encontrei um commit ativo do Severino para ${idTarefa}.`
        );
    }

    throw new Error(
        "Ainda não existe uma alteração ativa do Severino para desfazer."
    );
}

function arquivosDoCommit(hash) {
    const texto = executarGit([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        hash
    ]);

    if (!texto) {
        return [];
    }

    return texto
        .split(/\r?\n/)
        .map(linha => linha.trim())
        .filter(Boolean);
}

function desfazerMudanca(
    idTarefa = null
) {
    garantirArvoreLimpa();

    const alvo =
        encontrarCommitSeverino(
            idTarefa
        );

    const arquivos =
        arquivosDoCommit(
            alvo.hash
        );

    try {
        executarGit([
            "-c",
            "commit.gpgsign=false",
            "revert",
            "--no-edit",
            alvo.hash
        ]);
    } catch (erro) {
        executarGit(
            [
                "revert",
                "--abort"
            ],
            {
                permitirErro: true
            }
        );

        executarGit(
            [
                "reset",
                "--hard",
                "HEAD"
            ],
            {
                permitirErro: true
            }
        );

        throw new Error(
            [
                `Não consegui desfazer ${alvo.idTarefa} automaticamente.`,
                "O Git encontrou um conflito e a reversão foi cancelada sem deixar alterações pela metade.",
                erro.message
            ].join("\n")
        );
    }

    return {
        idTarefa: alvo.idTarefa,
        descricao: alvo.assunto,
        arquivos,
        commitOriginal: alvo.hash,
        commitReversao:
            obterCommitAtual()
    };
}

module.exports = {
    garantirRepositorioGit,
    garantirArvoreLimpa,
    obterCommitAtual,
    criarBackup,
    restaurarBackup,
    registrarMudancaConcluida,
    desfazerMudanca
};
