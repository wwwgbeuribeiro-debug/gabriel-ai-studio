const { usarIA } = require("../tools/ai");

const {
    listarProjeto,
    arquivoExiste,
    lerArquivo,
    escreverArquivo,
    criarBackup,
    restaurarBackup,
    resolverCaminhoSeguro
} = require("../tools/workspace");

const {
    testarAlteracoes
} = require("../tools/tester");

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

const MAX_ARQUIVOS_CONTEXTO = 12;
const MAX_CARACTERES_ARQUIVO = 16000;
const MAX_CARACTERES_CONTEXTO = 70000;
const MAX_TENTATIVAS_CORRECAO = 3;

function tarefaPedeAlteracao(tarefa) {
    const texto = tarefa.toLowerCase();

    const palavras = [
        "implemente",
        "implementar",
        "crie",
        "criar",
        "altere",
        "alterar",
        "modifique",
        "modificar",
        "corrija",
        "corrigir",
        "conserte",
        "consertar",
        "melhore",
        "melhorar",
        "adicione",
        "adicionar",
        "remova",
        "remover",
        "refatore",
        "refatorar",
        "atualize",
        "atualizar",
        "substitua",
        "substituir"
    ];

    return palavras.some(
        palavra => texto.includes(palavra)
    );
}

function limparLinhaArquivo(linha) {
    return linha
        .replace(/^[-*•\d.)\s]+/, "")
        .replace(/^ARQUIVO:\s*/i, "")
        .replace(/`/g, "")
        .trim();
}

function extrairJSON(texto) {
    const limpo = texto
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");

    if (inicio === -1 || fim === -1) {
        throw new Error(
            "A IA não devolveu um JSON válido."
        );
    }

    return JSON.parse(
        limpo.slice(inicio, fim + 1)
    );
}

async function pedirJSON(prompt) {
    let resposta = await usarIA(prompt);

    try {
        return extrairJSON(resposta);
    } catch {
        resposta = await usarIA(`
A resposta abaixo deveria ser JSON puro e válido,
mas veio em formato incorreto.

CORRIJA SOMENTE O FORMATO.
Não mude a intenção da resposta.
Não use markdown.
Não use blocos de código.
Responda somente com um objeto JSON válido.

RESPOSTA ORIGINAL:
${resposta}
`);

        return extrairJSON(resposta);
    }
}

function montarContexto(arquivos) {
    let contexto = "";

    for (const arquivo of arquivos) {
        if (!arquivoExiste(arquivo)) {
            continue;
        }

        let conteudo = lerArquivo(arquivo);

        if (
            conteudo.length >
            MAX_CARACTERES_ARQUIVO
        ) {
            conteudo =
                conteudo.slice(
                    0,
                    MAX_CARACTERES_ARQUIVO
                ) +
                "\n\n[ARQUIVO TRUNCADO PARA ECONOMIZAR CONTEXTO]";
        }

        const bloco = `

===== ${arquivo} =====

${conteudo}
`;

        if (
            contexto.length + bloco.length >
            MAX_CARACTERES_CONTEXTO
        ) {
            break;
        }

        contexto += bloco;
    }

    return contexto;
}

async function escolherArquivos(
    tarefa,
    estrutura
) {
    const resposta = await usarIA(`
Você é Severino, desenvolvedor do Gabriel AI Studio.

Escolha somente os arquivos existentes que precisa ler
para entender a tarefa abaixo.

TAREFA:
${tarefa}

ARQUIVOS DISPONÍVEIS:
${estrutura.join("\n")}

REGRAS:
- Escolha no máximo ${MAX_ARQUIVOS_CONTEXTO} arquivos.
- Não escolha .env, chaves, credenciais ou node_modules.
- Não invente caminhos.
- Responda somente com um caminho por linha.
- Sem explicações.
`);

    const escolhidos = resposta
        .split("\n")
        .map(limparLinhaArquivo)
        .filter(Boolean)
        .filter(arquivo =>
            arquivoExiste(arquivo)
        )
        .slice(0, MAX_ARQUIVOS_CONTEXTO);

    if (escolhidos.length === 0) {
        return estrutura
            .filter(arquivo =>
                [
                    "server.js",
                    "agents/coordinator.js",
                    "agents/developer.js",
                    "public/app.js"
                ].includes(arquivo)
            )
            .slice(0, MAX_ARQUIVOS_CONTEXTO);
    }

    return [...new Set(escolhidos)];
}

function validarMudancas(mudancas) {
    if (!Array.isArray(mudancas)) {
        throw new Error(
            "A IA não forneceu uma lista de alterações."
        );
    }

    if (mudancas.length === 0) {
        throw new Error(
            "Nenhuma alteração foi proposta."
        );
    }

    if (mudancas.length > 12) {
        throw new Error(
            "A alteração tentou modificar arquivos demais de uma vez."
        );
    }

    return mudancas.map(item => {
        if (
            !item ||
            typeof item.path !== "string" ||
            typeof item.content !== "string"
        ) {
            throw new Error(
                "Formato de alteração inválido."
            );
        }

        const { relativo } =
            resolverCaminhoSeguro(item.path);

        return {
            path: relativo,
            content: item.content
        };
    });
}

function formatarTestes(teste) {
    return teste.resultados
        .map(item =>
            `${item.sucesso ? "OK" : "ERRO"} - ${item.arquivo}: ${item.detalhes}`
        )
        .join("\n");
}

async function developer(tarefa) {
    console.log("💻 Severino recebeu a tarefa:");
    console.log(tarefa);

    emitirEvento(
        "Severino",
        "inicio",
        `Recebeu a tarefa: ${tarefa}`
    );

    const tarefaMemoria = criarTarefa(
        tarefa,
        "Severino"
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
        "Mapear o projeto e escolher os arquivos necessários."
    );

    emitirEvento(
        "Severino",
        "investigacao",
        "Mapeando o projeto..."
    );

    const estrutura = listarProjeto();

    emitirEvento(
        "Severino",
        "analise",
        "Escolhendo arquivos para investigar..."
    );

    const arquivosEscolhidos =
        await escolherArquivos(
            tarefa,
            estrutura
        );

    registrarArquivos(
        tarefaMemoria.id,
        arquivosEscolhidos
    );

    adicionarProgresso(
        tarefaMemoria.id,
        `Arquivos escolhidos: ${arquivosEscolhidos.join(", ")}`
    );

    for (const arquivo of arquivosEscolhidos) {
        emitirEvento(
            "Severino",
            "arquivo",
            `Lendo ${arquivo}`
        );
    }

    const contexto =
        montarContexto(arquivosEscolhidos);

    const deveAlterar =
        tarefaPedeAlteracao(tarefa);

    if (!deveAlterar) {
        atualizarStatus(
            tarefaMemoria.id,
            "analisando"
        );

        emitirEvento(
            "Severino",
            "ia",
            "Gerando análise final..."
        );

        const resultado = await usarIA(`
Você é Severino, desenvolvedor do Gabriel AI Studio.

Analise a tarefa usando somente os arquivos reais abaixo.

TAREFA:
${tarefa}

ARQUIVOS ANALISADOS:
${contexto}

REGRAS:
- Não invente arquivos ou funcionalidades.
- Diferencie fatos observados de sugestões.
- Seja claro e objetivo.
- Se faltar informação, diga exatamente o que falta.
`);

        adicionarProgresso(
            tarefaMemoria.id,
            "Análise concluída."
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
            "Severino",
            "concluido",
            "Análise concluída."
        );

        return resultado;
    }

    // ========================================
    // MODO AUTÔNOMO DE ALTERAÇÃO
    // ========================================

    atualizarStatus(
        tarefaMemoria.id,
        "planejando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Criar um plano seguro de alteração."
    );

    emitirEvento(
        "Severino",
        "plano",
        "Criando plano de implementação..."
    );

    const plano = await pedirJSON(`
Você é Severino, desenvolvedor responsável por alterar
com segurança o Gabriel AI Studio.

TAREFA:
${tarefa}

ARQUIVOS REAIS ANALISADOS:
${contexto}

ESTRUTURA DO PROJETO:
${estrutura.join("\n")}

Crie um plano pequeno e objetivo.
Não faça alterações ainda.

Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "o que será feito",
  "arquivos": ["arquivo1.js", "arquivo2.js"],
  "passos": ["passo 1", "passo 2"]
}

REGRAS:
- Não use .env, credenciais, chaves ou node_modules.
- Prefira poucas alterações de cada vez.
- Não invente funcionalidades fora da tarefa.
`);

    adicionarProgresso(
        tarefaMemoria.id,
        `Plano criado: ${plano.resumo || "sem resumo"}`
    );

    emitirEvento(
        "Severino",
        "edicao",
        "Preparando alterações no código..."
    );

    const proposta = await pedirJSON(`
Você é Severino, desenvolvedor do Gabriel AI Studio.

Implemente a tarefa abaixo.

TAREFA:
${tarefa}

PLANO:
${JSON.stringify(plano, null, 2)}

ARQUIVOS REAIS DISPONÍVEIS:
${contexto}

ESTRUTURA DO PROJETO:
${estrutura.join("\n")}

Responda SOMENTE com JSON válido no formato:
{
  "resumo": "resumo da implementação",
  "changes": [
    {
      "path": "caminho/do/arquivo.js",
      "content": "CONTEÚDO COMPLETO DO ARQUIVO"
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Cada content deve conter o arquivo COMPLETO, não um patch.
- Pode criar arquivos novos quando necessário.
- Não altere .env, credenciais, chaves, .git ou node_modules.
- Preserve funcionalidades existentes que não fazem parte da tarefa.
- Use somente Node.js e dependências já existentes, a menos que seja impossível.
- Não execute comandos.
- Não inclua markdown fora do JSON.
`);

    let mudancas =
        validarMudancas(proposta.changes);

    const arquivosAlterados = mudancas.map(
        item => item.path
    );

    emitirEvento(
        "Severino",
        "backup",
        `Criando backup de ${arquivosAlterados.length} arquivo(s)...`
    );

    const backup = criarBackup(
        tarefaMemoria.id,
        arquivosAlterados
    );

    adicionarProgresso(
        tarefaMemoria.id,
        `Backup criado antes das alterações: ${backup.pastaBackup}`
    );

    try {
        for (const mudanca of mudancas) {
            escreverArquivo(
                mudanca.path,
                mudanca.content
            );

            emitirEvento(
                "Severino",
                "edicao",
                `Alterou ${mudanca.path}`
            );
        }

        let tentativa = 1;
        let teste = null;

        while (
            tentativa <=
            MAX_TENTATIVAS_CORRECAO
        ) {
            atualizarStatus(
                tarefaMemoria.id,
                "testando"
            );

            emitirEvento(
                "Severino",
                "teste",
                `Executando validação ${tentativa}/${MAX_TENTATIVAS_CORRECAO}...`
            );

            teste = await testarAlteracoes(
                arquivosAlterados
            );

            if (teste.sucesso) {
                break;
            }

            if (
                tentativa >=
                MAX_TENTATIVAS_CORRECAO
            ) {
                break;
            }

            emitirEvento(
                "Severino",
                "correcao",
                "Encontrei erro. Tentando corrigir automaticamente..."
            );

            adicionarProgresso(
                tarefaMemoria.id,
                `Teste ${tentativa} falhou: ${formatarTestes(teste)}`
            );

            const contextoAtual =
                montarContexto(
                    arquivosAlterados
                );

            const correcao = await pedirJSON(`
Você é Severino corrigindo uma implementação que falhou
na validação local.

TAREFA ORIGINAL:
${tarefa}

ERROS DOS TESTES:
${formatarTestes(teste)}

ARQUIVOS ATUAIS:
${contextoAtual}

Responda SOMENTE com JSON válido:
{
  "resumo": "o que foi corrigido",
  "changes": [
    {
      "path": "arquivo.js",
      "content": "CONTEÚDO COMPLETO CORRIGIDO"
    }
  ]
}

REGRAS:
- Corrija somente o necessário.
- Não toque em .env, credenciais ou node_modules.
- content deve ser o arquivo completo.
- Não use markdown fora do JSON.
`);

            const correcoes =
                validarMudancas(
                    correcao.changes
                );

            for (const mudanca of correcoes) {
                if (
                    !arquivosAlterados.includes(
                        mudanca.path
                    )
                ) {
                    throw new Error(
                        `A correção tentou alterar um novo arquivo fora do backup: ${mudanca.path}`
                    );
                }

                escreverArquivo(
                    mudanca.path,
                    mudanca.content
                );

                emitirEvento(
                    "Severino",
                    "correcao",
                    `Corrigiu ${mudanca.path}`
                );
            }

            tentativa++;
        }

        if (!teste || !teste.sucesso) {
            emitirEvento(
                "Severino",
                "rollback",
                "Validação falhou. Restaurando os arquivos originais..."
            );

            restaurarBackup(backup);

            atualizarStatus(
                tarefaMemoria.id,
                "erro"
            );

            definirProximoPasso(
                tarefaMemoria.id,
                "Revisar manualmente o erro antes de tentar novamente."
            );

            throw new Error(
                `Não consegui validar a alteração após ${MAX_TENTATIVAS_CORRECAO} tentativas. O backup original foi restaurado.`
            );
        }

        adicionarProgresso(
            tarefaMemoria.id,
            `Alterações validadas: ${arquivosAlterados.join(", ")}`
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
            "Severino",
            "concluido",
            "Implementação concluída e validada."
        );

        const precisaReiniciar =
            arquivosAlterados.some(arquivo =>
                arquivo === "server.js" ||
                arquivo.startsWith("agents/") ||
                arquivo.startsWith("tools/")
            );

        return [
            proposta.resumo ||
                "Implementação concluída.",
            "",
            `Arquivos alterados: ${arquivosAlterados.join(", ")}`,
            `Testes: ${formatarTestes(teste)}`,
            precisaReiniciar
                ? "Reinício do servidor recomendado para carregar alterações de backend."
                : "As alterações já podem ser usadas sem reiniciar o backend."
        ].join("\n");

    } catch (erro) {
        // Se o erro ocorreu antes de um rollback explícito,
        // tentamos voltar ao estado original.
        try {
            restaurarBackup(backup);
        } catch {
            // Evita esconder o erro principal.
        }

        atualizarStatus(
            tarefaMemoria.id,
            "erro"
        );

        emitirEvento(
            "Severino",
            "erro",
            erro.message
        );

        throw erro;
    }
}

module.exports = developer;
