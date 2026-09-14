const campoTarefa =
    document.getElementById("tarefa");

const botaoExecutar =
    document.getElementById("botao-executar");

const botaoVoz =
    document.getElementById("botao-voz");

const atividadeLog =
    document.getElementById("atividade-log");

const statusCarlos =
    document.getElementById("status-carlos");

const statusSeverino =
    document.getElementById("status-severino");

const statusJairo =
    document.getElementById("status-jairo");

let ultimoEventoId = 0;

function adicionarLog(texto) {
    const horario =
        new Date().toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    const item =
        document.createElement("div");

    item.className = "log-item";
    item.textContent =
        `${horario} — ${texto}`;

    if (
        atividadeLog.querySelector(
            ".atividade-vazia"
        )
    ) {
        atividadeLog.innerHTML = "";
    }

    atividadeLog.prepend(item);
}

function mudarStatus(agente, texto) {
    if (agente === "Carlos") {
        statusCarlos.textContent = texto;
    }

    if (agente === "Severino") {
        statusSeverino.textContent = texto;
    }

    if (agente === "Jairo") {
        statusJairo.textContent = texto;
    }
}

function voltarParaLivre(
    agentes,
    atraso = 4000
) {
    setTimeout(() => {
        agentes.forEach(agente =>
            mudarStatus(
                agente,
                "Livre"
            )
        );
    }, atraso);
}

function processarStatusDoEvento(evento) {
    if (evento.agente === "Carlos") {
        if (evento.tipo === "tarefa") {
            mudarStatus(
                "Carlos",
                "Analisando tarefa..."
            );
        }

        if (evento.tipo === "delegacao") {
            mudarStatus(
                "Carlos",
                "Coordenando..."
            );
        }

        if (evento.tipo === "concluido") {
            mudarStatus(
                "Carlos",
                "Concluído ✓"
            );

            voltarParaLivre(["Carlos"]);
        }

        if (evento.tipo === "erro") {
            mudarStatus(
                "Carlos",
                "Erro"
            );
        }
    }

    if (evento.agente === "Severino") {
        const mapa = {
            inicio: "Iniciando...",
            memoria: "Preparando memória...",
            investigacao: "Mapeando projeto...",
            analise: "Escolhendo arquivos...",
            plano: "Criando plano...",
            backup: "Criando backup...",
            edicao: "Alterando código...",
            teste: "Testando alterações...",
            correcao: "Corrigindo erro...",
            rollback: "Restaurando backup...",
            ia: "Gerando análise..."
        };

        if (mapa[evento.tipo]) {
            mudarStatus(
                "Severino",
                mapa[evento.tipo]
            );
        }

        if (evento.tipo === "arquivo") {
            mudarStatus(
                "Severino",
                evento.mensagem
            );
        }

        if (evento.tipo === "concluido") {
            mudarStatus(
                "Severino",
                "Concluído ✓"
            );

            voltarParaLivre(["Severino"]);
        }

        if (evento.tipo === "erro") {
            mudarStatus(
                "Severino",
                "Erro"
            );
        }
    }

    if (evento.agente === "Jairo") {
        if (evento.tipo === "inicio") {
            mudarStatus(
                "Jairo",
                "Iniciando..."
            );
        }

        if (evento.tipo === "memoria") {
            mudarStatus(
                "Jairo",
                "Preparando memória..."
            );
        }

        if (evento.tipo === "planejamento") {
            mudarStatus(
                "Jairo",
                "Planejando conteúdo..."
            );
        }

        if (evento.tipo === "ia") {
            mudarStatus(
                "Jairo",
                "Criando conteúdo..."
            );
        }

        if (evento.tipo === "concluido") {
            mudarStatus(
                "Jairo",
                "Concluído ✓"
            );

            voltarParaLivre(["Jairo"]);
        }

        if (evento.tipo === "erro") {
            mudarStatus(
                "Jairo",
                "Erro"
            );
        }
    }
}

async function atualizarEventos() {
    try {
        const resposta =
            await fetch("/api/eventos");

        const eventos =
            await resposta.json();

        const novosEventos =
            eventos.filter(
                evento =>
                    evento.id > ultimoEventoId
            );

        novosEventos.forEach(evento => {
            adicionarLog(
                `${evento.agente}: ${evento.mensagem}`
            );

            processarStatusDoEvento(evento);

            ultimoEventoId = Math.max(
                ultimoEventoId,
                evento.id
            );
        });
    } catch (erro) {
        console.log(
            "Não foi possível buscar os eventos."
        );
    }
}

async function executarTarefa() {
    const tarefa =
        campoTarefa.value.trim();

    if (!tarefa) {
        return;
    }

    botaoExecutar.disabled = true;
    botaoExecutar.textContent =
        "Executando...";

    mudarStatus(
        "Carlos",
        "Recebendo tarefa..."
    );

    adicionarLog(
        `Nova tarefa: ${tarefa}`
    );

    try {
        const resposta = await fetch(
            "/api/tarefa",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    tarefa
                })
            }
        );

        const dados =
            await resposta.json();

        if (!resposta.ok) {
            adicionarLog(
                `Erro: ${dados.erro}`
            );

            mudarStatus(
                "Carlos",
                "Erro"
            );

            return;
        }

        adicionarLog(
            "Tarefa concluída."
        );

        if (dados.resultado) {
            const resumo = String(
                dados.resultado
            );

            adicionarLog(
                `Resultado: ${resumo.slice(0, 700)}${resumo.length > 700 ? "..." : ""}`
            );
        }
    } catch (erro) {
        adicionarLog(
            "Erro de comunicação com o servidor."
        );

        mudarStatus(
            "Carlos",
            "Erro"
        );
    } finally {
        botaoExecutar.disabled = false;
        botaoExecutar.textContent =
            "▶ Executar tarefa";
    }
}

botaoExecutar.addEventListener(
    "click",
    executarTarefa
);

botaoVoz.addEventListener(
    "click",
    () => {
        adicionarLog(
            "🎙️ Reconhecimento de voz será ativado em breve."
        );
    }
);

setInterval(
    atualizarEventos,
    500
);

atualizarEventos();
