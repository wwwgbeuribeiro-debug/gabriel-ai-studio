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

function removerChamadaDoAgente(tarefa) {
    return tarefa
        .trim()
        .replace(
            /^jairo\s*[,;:\-?]\s*/i,
            ""
        )
        .replace(
            /^por favor\s*[,;:\-?]\s*/i,
            ""
        )
        .trim();
}

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
    // Remove a chamada ao agente no início da tarefa, se houver.
    // Ex.: "Jairo, faça um reel" -> "faça um reel"
    const tarefaProcessada = removerChamadaDoAgente(tarefa);

    console.log("🎬 Jairo recebeu a tarefa:");
    console.log(tarefaProcessada);

    emitirEvento(
        "Jairo",
        "inicio",
        `Recebeu a tarefa: ${tarefaProcessada}`
    );

    const tarefaMemoria = criarTarefa(
        tarefaProcessada,
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

REGRAS RÍGIDAS DE SEPARAÇÃO ENTRE FATOS E SUGESTÕES:

1. FATOS CONFIRMADOS: Informações que existem nos eventos reais do sistema (Carlos, Severino, tarefas concluídas) devem ser apresentadas como FATOS CONFIRMADOS, sem qualquer rótulo adicional.

2. SUGESTÕES DE GRAVAÇÃO: Qualquer cena, comando, fala, arquivo, tela, ação ou comportamento que NÃO exista nos eventos reais do sistema devem ser OBRIGATORIAMENTE rotulados como [SUGESTÃO DE GRAVAÇÃO]. Isto inclui:
   - Comandos que não foram dados por Carlos ou Severino
   - Falas que não foram ditas
   - Arquivos que não foram criados
   - Telas ou interfaces que não foram mostradas
   - Ações que não foram executadas
   - Funcionalidades do Gabriel AI Studio que não estão documentadas nos eventos reais

3. PROIBIÇÃO DE INVENÇÃO: É estritamente proibido inventar:
   - Comandos, instruções ou pedidos que não existem nos eventos reais
   - Falas, diálogos ou conversas que não ocorreram
   - Arquivos, telas ou interfaces que não existem ou não foram mencionadas
   - Funcionalidades, ferramentas ou recursos do Gabriel AI Studio que não estejam confirmados nos eventos reais
   - Ações, comportamentos ou resultados que não foram executados

4. COMANDOS NÃO EXISTENTES: Se um comando exato não existir nos eventos reais, ele NÃO pode ser apresentado como executado. Deve ser escrito como [SUGESTÃO DE GRAVAÇÃO] indicando que precisa ser gravado.

5. FALAS NÃO CONFIRMADAS: Se uma fala exata não constar nos eventos reais, ela deve ser apresentada apenas como [SUGESTÃO DE GRAVAÇÃO] para ser dita, jamais como fato ocorrido.

6. DADOS INSUFICIENTES: Quando a tarefa depender de fatos sobre o projeto que você não recebeu nos eventos reais, diga explicitamente que precisa dos eventos ou dados reais do sistema. Não invente contexto.

7. NUNCA exponha credenciais, chaves de API, arquivos .env ou dados sensíveis.

CLASSIFICAÇÃO OBRIGATÓRIA NA SAÍDA:
- Tudo que for baseado em eventos reais deve aparecer sem rótulos especiais (são fatos confirmados).
- Tudo que for sugestão, ideia, ou algo que NÃO está nos eventos reais deve conter a tag [SUGESTÃO DE GRAVAÇÃO] antes do item.
- Nunca misture fatos confirmados com sugestões sem a devida rotulação.

CONTEXTO REAL DO STUDIO (EVENTOS E TRABALHO EXECUTADO):
${contextoReal}

TAREFA:
${tarefaProcessada}
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
