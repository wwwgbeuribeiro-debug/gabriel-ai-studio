const { usarIA } = require('../tools/ai');

const { carregarAtividade } = require('../tools/activity');

const {
    criarTarefa,
    adicionarProgresso,
    atualizarStatus,
    definirProximoPasso,
    carregarMemoria
} = require('../tools/memory');

const {
    emitirEvento,
    listarEventosSeguros
} = require('../tools/events');

const LIMITE_EVENTOS_RECENTES = 30;
const LIMITE_ATIVIDADE_RECENTE = 120;
const LIMITE_TAREFAS_CONCLUIDAS = 10;
const AGENTES_DE_FATOS_REAIS = new Set(['Carlos', 'Severino']);

function removerChamadaDoAgente(tarefa) {
    return tarefa
        .trim()
        .replace(
            /^jairo\s*[,;:\-?]\s*/i,
            ''
        )
        .replace(
            /^por favor\s*[,;:\-?]\s*/i,
            ''
        )
        .trim();
}

function normalizarTexto(texto) {
    return String(texto ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}

function agenteReal(agente) {
    return AGENTES_DE_FATOS_REAIS.has(
        normalizarTexto(agente)
    );
}

function eSensivel(texto) {
    const padroesSensiveis = [
        /\.env/i,
        /api[_-]?key/i,
        /secret/i,
        /password|senha/i,
        /token/i,
        /credential|credencial/i
    ];

    return padroesSensiveis.some(padrao =>
        padrao.test(normalizarTexto(texto))
    );
}

function fatosSaoDuplicados(atual, existente) {
    if (
        normalizarTexto(atual.agente).toLowerCase() !==
        normalizarTexto(existente.agente).toLowerCase()
    ) {
        return false;
    }

    if (
        normalizarTexto(atual.tipo).toLowerCase() !==
        normalizarTexto(existente.tipo).toLowerCase()
    ) {
        return false;
    }

    const mensagemAtual = normalizarTexto(atual.mensagem).toLowerCase();
    const mensagemExistente = normalizarTexto(existente.mensagem).toLowerCase();

    return (
        mensagemAtual === mensagemExistente ||
        mensagemAtual.startsWith(mensagemExistente) ||
        mensagemExistente.startsWith(mensagemAtual)
    );
}

function chaveFato(fonte, fato) {
    const agente = normalizarTexto(fato.agente).toLowerCase();
    const tipo = normalizarTexto(fato.tipo).toLowerCase();
    const mensagem = normalizarTexto(fato.mensagem).toLowerCase();

    if (fonte === 'tarefa concluída') {
        return [
            'tarefa-concluida',
            agente,
            mensagem
        ].join('|');
    }

    return [
        agente,
        tipo,
        mensagem
    ].join('|');
}

function converterTarefaEmFato(tarefa) {
    const progresso = Array.isArray(tarefa.progresso)
        ? tarefa.progresso
            .map(normalizarTexto)
            .filter(Boolean)
            .join(' -> ')
        : '';

    return {
        agente: normalizarTexto(tarefa.agente),
        tipo: 'tarefa concluída',
        mensagem: progresso
            ? `Tarefa: ${normalizarTexto(tarefa.descricao)} | Progresso: ${progresso}`
            : `Tarefa: ${normalizarTexto(tarefa.descricao)}`,
        horario: normalizarTexto(tarefa.atualizadaEm || tarefa.criadaEm)
    };
}

function formatarFato(fato) {
    const horario = fato.horario ? `[${fato.horario}] ` : '';
    const tipo = fato.tipo ? ` (${fato.tipo})` : '';

    return `${horario}${fato.agente}${tipo}: ${fato.mensagem}\n`;
}

function montarContextoReal() {
    const eventosAtuais = listarEventosSeguros(LIMITE_EVENTOS_RECENTES)
        .filter(evento =>
            agenteReal(evento.agente) &&
            !eSensivel(evento.mensagem)
        );

    const atividadePersistente = carregarAtividade()
        .filter(registro =>
            agenteReal(registro.agente) &&
            !eSensivel(registro.mensagem)
        )
        .slice(-LIMITE_ATIVIDADE_RECENTE);

    const memoria = carregarMemoria();
    const tarefasConcluidas = Object.values(memoria)
        .filter(tarefa =>
            tarefa &&
            tarefa.status === 'concluida' &&
            agenteReal(tarefa.agente)
        )
        .sort((a, b) =>
            String(a.atualizadaEm || a.criadaEm || '')
                .localeCompare(
                    String(b.atualizadaEm || b.criadaEm || '')
                )
        )
        .slice(-LIMITE_TAREFAS_CONCLUIDAS)
        .map(converterTarefaEmFato)
        .filter(fato => !eSensivel(fato.mensagem));

    const fatos = [];
    const vistos = new Set();

    function adicionarFato(fonte, fato) {
        if (!fato) {
            return;
        }

        const fatoPadronizado = {
            agente: normalizarTexto(fato.agente),
            tipo: normalizarTexto(fato.tipo || 'registro'),
            mensagem: normalizarTexto(fato.mensagem),
            fonte,
            horario: normalizarTexto(fato.horario)
        };

        if (
            !agenteReal(fatoPadronizado.agente) ||
            !fatoPadronizado.mensagem ||
            eSensivel(fatoPadronizado.mensagem)
        ) {
            return;
        }

        const chave = chaveFato(fonte, fatoPadronizado);
        const duplicado = fatos.some(fatoExistente =>
            fatosSaoDuplicados(fatoPadronizado, fatoExistente)
        );

        if (vistos.has(chave) || duplicado) {
            return;
        }

        vistos.add(chave);
        fatos.push(fatoPadronizado);
    }

    eventosAtuais.forEach(evento => {
        adicionarFato('evento atual', evento);
    });

    atividadePersistente.forEach(registro => {
        adicionarFato('memória persistente', registro);
    });

    tarefasConcluidas.forEach(tarefa => {
        adicionarFato('tarefa concluída', tarefa);
    });

    const eventosListados = fatos.filter(fato => fato.fonte === 'evento atual');
    const atividadeListada = fatos.filter(fato => fato.fonte === 'memória persistente');
    const tarefasListadas = fatos.filter(fato => fato.fonte === 'tarefa concluída');

    let contexto = `--- TOTAL DE FATOS REAIS ENCONTRADOS: ${fatos.length} ---\n`;
    contexto += 'A contagem considera apenas registros únicos de Carlos e Severino, após remover duplicidades entre eventos atuais, memória persistente e tarefas concluídas.\n\n';

    contexto += '--- EVENTOS REAIS RECENTES DO STUDIO ---\n';
    if (eventosListados.length === 0) {
        contexto += 'Nenhum evento atual seguro de Carlos ou Severino registrado.\n';
    } else {
        eventosListados.forEach(fato => {
            contexto += formatarFato(fato);
        });
    }

    contexto += '\n--- FATOS RECENTES DA MEMÓRIA PERSISTENTE (memory/activity.json) ---\n';
    if (atividadeListada.length === 0) {
        contexto += 'Nenhum fato recente de Carlos ou Severino encontrado em memory/activity.json que não duplicasse os eventos atuais.\n';
    } else {
        atividadeListada.forEach(fato => {
            contexto += formatarFato(fato);
        });
    }

    contexto += '\n--- TAREFAS CONCLUÍDAS RECENTEMENTE ---\n';
    if (tarefasListadas.length === 0) {
        contexto += 'Nenhuma tarefa concluída de Carlos ou Severino registrada.\n';
    } else {
        tarefasListadas.forEach(fato => {
            contexto += formatarFato(fato);
        });
    }

    return {
        contexto,
        totalFatosReais: fatos.length
    };
}

async function content(tarefa) {
    // Remove a chamada ao agente no início da tarefa, se houver.
    // Ex.: 'Jairo, faça um reel' -> 'faça um reel'
    const tarefaProcessada = removerChamadaDoAgente(tarefa);

    console.log('🎬 Jairo recebeu a tarefa:');
    console.log(tarefaProcessada);

    emitirEvento(
        'Jairo',
        'inicio',
        `Recebeu a tarefa: ${tarefaProcessada}`
    );

    const tarefaMemoria = criarTarefa(
        tarefaProcessada,
        'Jairo'
    );

    emitirEvento(
        'Jairo',
        'memoria',
        `Memória criada: ${tarefaMemoria.id}`
    );

    adicionarProgresso(
        tarefaMemoria.id,
        'Jairo iniciou a criação do conteúdo.'
    );

    atualizarStatus(
        tarefaMemoria.id,
        'criando'
    );

    definirProximoPasso(
        tarefaMemoria.id,
        'Planejar o conteúdo solicitado.'
    );

    emitirEvento(
        'Jairo',
        'planejamento',
        'Planejando o conteúdo...'
    );

    adicionarProgresso(
        tarefaMemoria.id,
        'Jairo iniciou o planejamento.'
    );

    definirProximoPasso(
        tarefaMemoria.id,
        'Coletar contexto dos eventos atuais e da memória persistente.'
    );

    const contextoReal = montarContextoReal();

    emitirEvento(
        'Jairo',
        'contexto',
        `Contexto real coletado: ${contextoReal.totalFatosReais} fato(s) de Carlos e Severino.`
    );

    definirProximoPasso(
        tarefaMemoria.id,
        'Gerar o conteúdo com a IA.'
    );

    emitirEvento(
        'Jairo',
        'ia',
        'Criando conteúdo com IA...'
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

ORIGEM DOS FATOS:

- Antes de produzir conteúdo, consulte o CONTEXTO REAL DO STUDIO abaixo.
- Esse contexto combina eventos atuais, fatos recentes de memory/activity.json e tarefas concluídas.
- Ele foi filtrado para usar somente registros reais de Carlos e Severino como fatos do trabalho executado.
- A contagem informada considera fatos únicos, com duplicidades removidas entre eventos atuais e memória persistente.

REGRAS RÍGIDAS DE SEPARAÇÃO ENTRE FATOS E SUGESTÕES:

1. FATOS CONFIRMADOS: Informações presentes no CONTEXTO REAL DO STUDIO devem ser apresentadas como FATOS CONFIRMADOS, sem qualquer rótulo adicional.

2. SUGESTÕES DE GRAVAÇÃO: Qualquer cena, comando, fala, arquivo, tela, ação ou comportamento que NÃO exista no CONTEXTO REAL DO STUDIO deve ser OBRIGATORIAMENTE rotulados como [SUGESTÃO DE GRAVAÇÃO]. Isto inclui:
   - Comandos que não foram dados por Carlos ou Severino
   - Falas que não foram ditas
   - Arquivos que não foram criados
   - Telas ou interfaces que não foram mostradas
   - Ações que não foram executadas
   - Funcionalidades do Gabriel AI Studio que não estão documentadas nos fatos reais fornecidos

3. PROIBIÇÃO DE INVENÇÃO: É estritamente proibido inventar:
   - Comandos, instruções ou pedidos que não existem nos fatos reais fornecidos
   - Falas, diálogos ou conversas que não ocorreram
   - Arquivos, telas ou interfaces que não existem ou não foram mencionados
   - Funcionalidades, ferramentas ou recursos do Gabriel AI Studio que não estejam confirmados nos fatos reais fornecidos
   - Ações, comportamentos ou resultados que não foram executados

4. COMANDOS NÃO EXISTENTES: Se um comando exato não existir nos fatos reais fornecidos, ele NÃO pode ser apresentado como executado. Deve ser escrito como [SUGESTÃO DE GRAVAÇÃO] indicando que precisa ser gravado.

5. FALAS NÃO CONFIRMADAS: Se uma fala exata não constar nos fatos reais fornecidos, ela deve ser apresentada apenas como [SUGESTÃO DE GRAVAÇÃO] para ser dita, jamais como fato ocorrido.

6. DADOS INSUFICIENTES: Antes de produzir conteúdo, verifique a quantidade e o detalhe dos fatos reais informados. Se o total for 0, ou se os fatos disponíveis não sustentarem a tarefa sem invenção, diga explicitamente que há dados reais insuficientes e peça eventos ou dados reais do sistema. Não invente contexto, comandos, falas, telas, arquivos, ações ou resultados.

7. NUNCA exponha credenciais, chaves de API, arquivos .env ou dados sensíveis.

CLASSIFICAÇÃO OBRIGATÓRIA NA SAÍDA:
- Tudo que for baseado em fatos reais fornecidos deve aparecer sem rótulos especiais (são fatos confirmados).
- Tudo que for sugestão, ideia, ou algo que NÃO está nos fatos reais fornecidos deve conter a tag [SUGESTÃO DE GRAVAÇÃO] antes do item.
- Nunca misture fatos confirmados com sugestões sem a devida rotulação.

FATOS REAIS DISPONÍVEIS:
- Total de fatos reais encontrados: ${contextoReal.totalFatosReais}
- Se esse total ou o contexto detalhado não forem suficientes para a tarefa, declare dados reais insuficientes em vez de inventar.

CONTEXTO REAL DO STUDIO (EVENTOS ATUAIS, MEMÓRIA PERSISTENTE E TRABALHO EXECUTADO):
${contextoReal.contexto}

TAREFA:
${tarefaProcessada}
`);

    adicionarProgresso(
        tarefaMemoria.id,
        'Jairo concluiu o conteúdo.'
    );

    atualizarStatus(
        tarefaMemoria.id,
        'concluida'
    );

    definirProximoPasso(
        tarefaMemoria.id,
        null
    );

    emitirEvento(
        'Jairo',
        'concluido',
        'Conteúdo concluído.'
    );

    return resposta;
}

module.exports = content;
