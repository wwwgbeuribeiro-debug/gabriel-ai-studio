const { usarIA } = require("../tools/ai");

const {
    criarTarefa,
    adicionarProgresso,
    atualizarStatus,
    definirProximoPasso,
    carregarMemoria
} = require("../tools/memory");

const {
    emitirEvento,
    listarEventosSeguros
} = require("../tools/events");

function montarContextoReal() {
    const eventosReais = listarEventosSeguros(30);
    const memoria = carregarMemoria();
    const tarefasConcluidas = Object.values(memoria)
        .filter(t => t.status === "concluida")
        .slice(-10);

    let contexto = "--- EVENTOS REAIS RECENTES DO STUDIO ---\n";
    if (eventosReais.length === 0) {
        contexto += "Nenhum evento registrado ainda.\n";
    } else {
        eventosReais.forEach(e => {
            contexto += `[${e.horario}] ${e.agente} (${e.tipo}): ${e.mensagem}\n`;
        });
    }

    contexto += "\n--- TAREFAS CONCLUÍDAS RECENTEMENTE ---\n";
    if (tarefasConcluidas.length === 0) {
        contexto += "Nenhuma tarefa concluída registrada.\n";
    } else {
        tarefasConcluidas.forEach(t => {
            contexto += `- [${t.agente}] Tarefa: ${t.descricao} | Progresso: ${(t.progresso || []).join(" -> ")}\n`;
        });
    }

    const padroesSensiveis = [
        /\.env/i,
        /api[_-]?key/i,
        /secret/i,
        /password|senha/i,
        /token/i,
        /credential|credencial/i
    ];

    const linhas = contexto.split("\n");
    const linhasSeguras = linhas.filter(linha => !padroesSensiveis.some(p => p.test(linha)));

    return linhasSeguras.join("\n");
}

async function content(tarefa) {
    console.log("🎬 Jairo recebeu a tarefa:");
    console.log(tarefa);

    emitirEvento(
        "Jairo",
        "inicio",
        `Recebeu a tarefa: ${tarefa}`
    );

    const tarefaMemoria = criarTarefa(
        tarefa,
        "Jairo"
    );

    emitirEvento(
        "Jairo",
        "memoria",
        `Memória criada: ${tarefaMemoria.id}`
    );

    adicionarProgresso(
        tarefaMemoria.id,
        "Jairo iniciou a criação do conteúdo."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "criando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Planejar o conteúdo solicitado."
    );

    emitirEvento(
        "Jairo",
        "planejamento",
        "Planejando o conteúdo..."
    );

    adicionarProgresso(
        tarefaMemoria.id,
        "Jairo iniciou o planejamento."
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Coletar contexto dos eventos reais do sistema."
    );

    const contextoReal = montarContextoReal();

    emitirEvento(
        "Jairo",
        "contexto",
        "Contexto de eventos e tarefas reais do sistema coletado."
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Gerar o conteúdo com a IA."
    );

    emitirEvento(
        "Jairo",
        "ia",
        "Criando conteúdo com IA..."
    );

    const resposta = await usarIA(`
Você é Jairo, o agente de conteúdo da equipe.

Sua especialidade é:
- roteiros para vídeos
- Reels
- posts
- legendas
- ideias de conteúdo
- comunicação para redes sociais

Execute a tarefa recebida de forma objetiva e prática.

IMPORTANTE:
- Utilize as informações reais do contexto do studio (eventos de Carlos, Severino e tarefas concluídas) para basear seu conteúdo em trabalho realmente executado.
- Não invente funcionalidades do Gabriel AI Studio.
- Quando a tarefa depender de fatos sobre o projeto que você não recebeu, diga que precisa dos eventos ou dados reais do sistema.
- Não apresente como existente algo que não foi confirmado.
- NUNCA exponha credenciais, chaves de API, arquivos .env ou dados sensíveis.

CONTEXTO REAL DO STUDIO (EVENTOS E TRABALHO EXECUTADO):
${contextoReal}

TAREFA:
${tarefa}
`);

    adicionarProgresso(
        tarefaMemoria.id,
        "Jairo concluiu o conteúdo."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "concluida"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        null
    );

    emitirEvento(
        "Jairo",
        "concluido",
        "Conteúdo concluído."
    );

    return resposta;
}

module.exports = content;
