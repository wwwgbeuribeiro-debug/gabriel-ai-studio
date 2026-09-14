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


// ========================================
// LOG VISUAL
// ========================================

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


// ========================================
// ALTERAR STATUS VISUAL
// ========================================

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


// ========================================
// INTERPRETAR EVENTOS REAIS
// ========================================

function processarStatusDoEvento(evento) {

    // -------------------------
    // CARLOS
    // -------------------------

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
                "Coordenando"
            );
        }
    }


    // -------------------------
    // SEVERINO
    // -------------------------

    if (evento.agente === "Severino") {

        if (evento.tipo === "inicio") {

            mudarStatus(
                "Severino",
                "Iniciando..."
            );
        }


        if (evento.tipo === "memoria") {

            mudarStatus(
                "Severino",
                "Preparando memória..."
            );
        }


        if (evento.tipo === "investigacao") {

            mudarStatus(
                "Severino",
                "Investigando projeto..."
            );
        }


        if (evento.tipo === "analise") {

            mudarStatus(
                "Severino",
                "Escolhendo arquivos..."
            );
        }


        if (evento.tipo === "arquivos") {

            mudarStatus(
                "Severino",
                "Arquivos selecionados"
            );
        }


        if (evento.tipo === "arquivo") {

            mudarStatus(
                "Severino",
                evento.mensagem
            );
        }


        if (evento.tipo === "ia") {

            mudarStatus(
                "Severino",
                "Gerando análise..."
            );
        }


        if (evento.tipo === "concluido") {

            mudarStatus(
                "Severino",
                "Concluído ✓"
            );

            mudarStatus(
                "Carlos",
                "Concluído ✓"
            );


            // Depois de alguns segundos,
            // os dois voltam para Livre.

            setTimeout(() => {

                mudarStatus(
                    "Severino",
                    "Livre"
                );

                mudarStatus(
                    "Carlos",
                    "Livre"
                );

            }, 4000);
        }
    }


    // -------------------------
    // JAIRO
    // -------------------------

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

        mudarStatus(
            "Carlos",
            "Concluído ✓"
        );


        setTimeout(() => {

            mudarStatus(
                "Jairo",
                "Livre"
            );

            mudarStatus(
                "Carlos",
                "Livre"
            );

        }, 4000);
    }
}


// ========================================
// BUSCAR EVENTOS
// ========================================

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


            processarStatusDoEvento(
                evento
            );


            ultimoEventoId =
                Math.max(
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


// ========================================
// EXECUTAR TAREFA
// ========================================

async function executarTarefa() {

    const tarefa =
        campoTarefa.value.trim();


    if (!tarefa) {
        return;
    }


    botaoExecutar.disabled = true;

    botaoExecutar.textContent =
        "Executando...";


    adicionarLog(
        `Nova tarefa: ${tarefa}`
    );


    try {

        const resposta =
            await fetch(
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


// ========================================
// BOTÕES
// ========================================

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


// ========================================
// INICIAR INTERFACE
// ========================================

setInterval(
    atualizarEventos,
    500
);


atualizarEventos();
}