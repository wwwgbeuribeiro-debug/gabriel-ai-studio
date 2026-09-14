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
- Não invente funcionalidades do Gabriel AI Studio.
- Quando a tarefa depender de fatos sobre o projeto que você
  não recebeu, diga que precisa dos eventos ou dados reais do sistema.
- Não apresente como existente algo que não foi confirmado.

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
