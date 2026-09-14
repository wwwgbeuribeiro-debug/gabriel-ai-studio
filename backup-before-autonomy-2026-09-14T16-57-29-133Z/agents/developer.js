const { usarIA } = require("../tools/ai");

const {
    listarArquivos,
    lerArquivo
} = require("../tools/files");

const {
    criarTarefa,
    adicionarProgresso,
    registrarArquivos,
    atualizarStatus,
    definirProximoPasso
} = require("../tools/memory");

const {
    emitirEvento
} = require("../tools/events");


async function developer(tarefa) {

    console.log("💻 Severino recebeu a tarefa:");
    console.log(tarefa);

    emitirEvento(
        "Severino",
        "inicio",
        `Recebeu a tarefa: ${tarefa}`
    );


    // ========================================
    // 1. CRIA A MEMÓRIA DA TAREFA
    // ========================================

    const tarefaMemoria = criarTarefa(
        tarefa,
        "Severino"
    );

    console.log(
        `💾 Memória criada: ${tarefaMemoria.id}`
    );

    emitirEvento(
        "Severino",
        "memoria",
        `Memória criada: ${tarefaMemoria.id}`
    );


    adicionarProgresso(
        tarefaMemoria.id,
        "Severino iniciou a investigação."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "investigando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Escolher os arquivos necessários para a tarefa."
    );


    // ========================================
    // 2. OBSERVA O PROJETO
    // ========================================

    emitirEvento(
        "Severino",
        "investigacao",
        "Investigando a estrutura do projeto..."
    );


    const raiz = listarArquivos(".");
    const agents = listarArquivos("agents");
    const tools = listarArquivos("tools");


    console.log(
        "👀 Severino está investigando o projeto..."
    );


    adicionarProgresso(
        tarefaMemoria.id,
        "Estrutura inicial do projeto analisada."
    );


    // ========================================
    // 3. ESCOLHE OS ARQUIVOS
    // ========================================

    emitirEvento(
        "Severino",
        "analise",
        "Escolhendo quais arquivos precisa analisar..."
    );


    const decisao = await usarIA(`
Você é Severino, o agente desenvolvedor da equipe.

Seu identificador interno é DEV.

Você está investigando um projeto Node.js.

TAREFA:
${tarefa}

ESTRUTURA PRINCIPAL:
${raiz}

PASTA AGENTS:
${agents}

PASTA TOOLS:
${tools}

Escolha somente os arquivos realmente necessários
para executar a tarefa.

Responda SOMENTE com os caminhos dos arquivos,
um por linha.

Exemplo:

server.js
agents/coordinator.js
agents/developer.js

Não escreva explicações.
`);


    const arquivosEscolhidos = decisao
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean);


    console.log(
        "🔎 Severino decidiu analisar:"
    );


    arquivosEscolhidos.forEach(arquivo => {

        console.log(
            "   📄",
            arquivo
        );

    });


    emitirEvento(
        "Severino",
        "arquivos",
        `Selecionou ${arquivosEscolhidos.length} arquivo(s) para análise.`
    );


    // ========================================
    // 4. REGISTRA OS ARQUIVOS NA MEMÓRIA
    // ========================================

    adicionarProgresso(
        tarefaMemoria.id,
        `Arquivos escolhidos: ${arquivosEscolhidos.join(", ")}`
    );

    registrarArquivos(
        tarefaMemoria.id,
        arquivosEscolhidos
    );

    atualizarStatus(
        tarefaMemoria.id,
        "analisando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Ler e analisar o conteúdo dos arquivos selecionados."
    );


    // ========================================
    // 5. LÊ OS ARQUIVOS REAIS
    // ========================================

    let contexto = "";


    for (const arquivo of arquivosEscolhidos) {

        emitirEvento(
            "Severino",
            "arquivo",
            `Lendo ${arquivo}`
        );


        const conteudo =
            lerArquivo(arquivo);


        contexto += `

===== ${arquivo} =====

${conteudo}

`;
    }


    adicionarProgresso(
        tarefaMemoria.id,
        "Arquivos escolhidos foram lidos."
    );


    definirProximoPasso(
        tarefaMemoria.id,
        "Gerar a análise final usando os arquivos lidos."
    );


    // ========================================
    // 6. GERA A ANÁLISE FINAL
    // ========================================

    emitirEvento(
        "Severino",
        "ia",
        "Gerando análise final..."
    );


    const resultado = await usarIA(`
Você é Severino, agente desenvolvedor.

Execute a tarefa usando exclusivamente os arquivos
reais que você investigou.

TAREFA:

${tarefa}


ARQUIVOS ANALISADOS:

${contexto}


REGRAS:

- Não invente arquivos.
- Não invente código que afirma ter encontrado.
- Diferencie fatos observados de sugestões.
- Explique de maneira clara.
- Se faltar informação, diga exatamente o que falta.
`);


    // ========================================
    // 7. FINALIZA A TAREFA
    // ========================================

    adicionarProgresso(
        tarefaMemoria.id,
        "Severino concluiu a análise."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "concluida"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        null
    );


    console.log(
        `💾 Progresso salvo na tarefa: ${tarefaMemoria.id}`
    );


    emitirEvento(
        "Severino",
        "concluido",
        "Análise concluída."
    );


    return resultado;
}


module.exports = developer;