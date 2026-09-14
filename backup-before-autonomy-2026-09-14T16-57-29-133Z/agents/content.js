const { usarIA } = require("../tools/ai");

const {
    criarTarefa,
    adicionarProgresso,
    atualizarStatus,
    definirProximoPasso
} = require("../tools/memory");

const {
    emitirEvento
} = require("../tools/events");


async function content(tarefa) {

    console.log("🎬 Jairo recebeu a tarefa:");
    console.log(tarefa);


    // ========================================
    // 1. INÍCIO
    // ========================================

    emitirEvento(
        "Jairo",
        "inicio",
        `Recebeu a tarefa: ${tarefa}`
    );


    // ========================================
    // 2. CRIA MEMÓRIA
    // ========================================

    const tarefaMemoria = criarTarefa(
        tarefa,
        "Jairo"
    );


    console.log(
        `💾 Memória criada: ${tarefaMemoria.id}`
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


    // ========================================
    // 3. PLANEJAMENTO
    // ========================================

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
        "Gerar o conteúdo com a IA."
    );


    // ========================================
    // 4. GERA O CONTEÚDO
    // ========================================

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

Quando a tarefa envolver conteúdo sobre o Gabriel AI Studio,
não invente funcionalidades que o sistema ainda não possui.

TAREFA:

${tarefa}
`);


    // ========================================
    // 5. FINALIZA
    // ========================================

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


    console.log(
        `💾 Progresso salvo na tarefa: ${tarefaMemoria.id}`
    );


    return resposta;
}


module.exports = content;