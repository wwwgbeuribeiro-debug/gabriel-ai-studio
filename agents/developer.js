const { usarIA } = require("../tools/ai");

const {
    listarProjeto,
    arquivoExiste,
    lerArquivo,
    escreverArquivo,
    resolverCaminhoSeguro
} = require("../tools/workspace");

const {
    criarBackup,
    restaurarBackup,
    registrarMudancaConcluida,
    desfazerMudanca
} = require("../tools/git-workspace");

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


function tarefaPedeDesfazer(tarefa) {
    let texto = tarefa
        .toLowerCase()
        .trim();

    // Remove apenas a chamada ao agente no inÃ­cio.
    // Ex.: "Severino, desfaÃ§a..." -> "desfaÃ§a..."
    texto = texto.replace(
        /^severino\s*[,;:\-]?\s*/,
        ""
    );

    // Permite comeÃ§ar educadamente sem mudar a intenÃ§Ã£o.
    texto = texto.replace(
        /^por favor\s*[,;:\-]?\s*/,
        ""
    );

    const comandosDeDesfazer = [
        /^(desfaÃ§a|desfaca|desfazer|reverta|reverter)\b/,
        /^(rollback|undo)(?:\s|$)/,
        /^(quero|preciso|pode|poderia|gostaria de)\s+(?:que\s+vocÃª\s+)?(desfaÃ§a|desfaca|desfazer|reverta|reverter)\b/,
        /^volte\s+(?:Ã |a)\s+(?:Ãºltima|ultima)\s+(?:alteraÃ§Ã£o|alteracao|mudanÃ§a|mudanca)\b/,
        /^restaure\s+(?:a\s+)?(?:Ãºltima|ultima)\s+(?:alteraÃ§Ã£o|alteracao|mudanÃ§a|mudanca)\b/
    ];

    return comandosDeDesfazer.some(
        padrao => padrao.test(texto)
    );
}

function extrairIdTarefa(tarefa) {
    const encontrado = tarefa.match(
        /task-\d+/i
    );

    return encontrado
        ? encontrado[0].toLowerCase()
        : null;
}

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


function tarefaSomenteLeitura(tarefa) {

    const texto = tarefa
        .toLowerCase()
        .trim();

    const padroes = [

        /\bnÃ£o\s+(?:altere|modifique|edite|mude|crie|remova|apague|escreva|salve)\b/,

        /\bnao\s+(?:altere|modifique|edite|mude|crie|remova|apague|escreva|salve)\b/,

        /\bsem\s+(?:alterar|modificar|editar|mudar|criar|remover|apagar|escrever|salvar)\b/,

        /\bsomente\s+(?:analise|anÃ¡lise|investigue|explique|liste|diga|verifique|revise)\b/,

        /\bapenas\s+(?:analise|anÃ¡lise|investigue|explique|liste|diga|verifique|revise)\b/,

        /\bmodo\s+(?:somente\s+leitura|leitura|read[- ]?only)\b/

    ];

    return padroes.some(
        padrao => padrao.test(texto)
    );
}


function removerChamadaDoAgente(tarefa) {
    return tarefa
        .trim()
        .replace(
            /^severino\s*[,;:\-]?\s*/i,
            ""
        )
        .replace(
            /^por favor\s*[,;:\-]?\s*/i,
            ""
        )
        .trim();
}

function detectarCriacaoArquivoSimples(tarefa) {
    const texto = removerChamadaDoAgente(tarefa);

    const encontrado = texto.match(
        /^(?:crie|criar)\s+(?:um\s+)?arquivo\s+["'`]?([^\s"'`]+)["'`]?\s+com\s+(?:a\s+)?(?:frase|texto|conteÃºdo|conteudo)\s+([\s\S]+)$/i
    );

    if (!encontrado) {
        return null;
    }

    const caminho = encontrado[1]
        .trim()
        .replace(/[,;:]+$/, "");

    let conteudo = encontrado[2].trim();

    const paresAspas = [
        ['"', '"'],
        ["'", "'"],
        ['`', '`']
    ];

    for (const [inicio, fim] of paresAspas) {
        if (
            conteudo.startsWith(inicio) &&
            conteudo.endsWith(fim) &&
            conteudo.length >= 2
        ) {
            conteudo = conteudo.slice(1, -1);
            break;
        }
    }

    return {
        path: caminho,
        content: conteudo
    };
}

function extrairMudancasDaProposta(proposta) {
    if (!proposta || typeof proposta !== "object") {
        return null;
    }

    const candidatos = [
        proposta.changes,
        proposta.mudancas,
        proposta.alteracoes,
        proposta.arquivos,
        proposta.files
    ];

    const lista = candidatos.find(
        item => Array.isArray(item)
    );

    if (!lista) {
        return null;
    }

    return lista.map(item => {
        if (!item || typeof item !== "object") {
            return item;
        }

        return {
            path:
                item.path ??
                item.caminho ??
                item.arquivo ??
                item.file,
            content:
                item.content ??
                item.conteudo ??
                item.texto ??
                item.code
        };
    });
}

function limparLinhaArquivo(linha) {
    return linha
        .replace(/^[-*â€¢\d.)\s]+/, "")
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
            "A IA nÃ£o devolveu um JSON vÃ¡lido."
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
A resposta abaixo deveria ser JSON puro e vÃ¡lido,
mas veio em formato incorreto.

CORRIJA SOMENTE O FORMATO.
NÃ£o mude a intenÃ§Ã£o da resposta.
NÃ£o use markdown.
NÃ£o use blocos de cÃ³digo.
Responda somente com um objeto JSON vÃ¡lido.

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
VocÃª Ã© Severino, desenvolvedor do Gabriel AI Studio.

Escolha somente os arquivos existentes que precisa ler
para entender a tarefa abaixo.

TAREFA:
${tarefa}

ARQUIVOS DISPONÃVEIS:
${estrutura.join("\n")}

REGRAS:
- Escolha no mÃ¡ximo ${MAX_ARQUIVOS_CONTEXTO} arquivos.
- NÃ£o escolha .env, chaves, credenciais ou node_modules.
- NÃ£o invente caminhos.
- Responda somente com um caminho por linha.
- Sem explicaÃ§Ãµes.
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
            "A IA nÃ£o forneceu uma lista de alteraÃ§Ãµes."
        );
    }

    if (mudancas.length === 0) {
        throw new Error(
            "Nenhuma alteraÃ§Ã£o foi proposta."
        );
    }

    if (mudancas.length > 12) {
        throw new Error(
            "A alteraÃ§Ã£o tentou modificar arquivos demais de uma vez."
        );
    }

    return mudancas.map(item => {
        if (
            !item ||
            typeof item.path !== "string" ||
            typeof item.content !== "string"
        ) {
            throw new Error(
                "Formato de alteraÃ§Ã£o invÃ¡lido."
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
    console.log("ðŸ’» Severino recebeu a tarefa:");
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
        `MemÃ³ria criada: ${tarefaMemoria.id}`
    );


    // ========================================
    // MODO DESFAZER / ROLLBACK MANUAL
    // ========================================

    if (tarefaPedeDesfazer(tarefa)) {
        atualizarStatus(
            tarefaMemoria.id,
            "revertendo"
        );

        definirProximoPasso(
            tarefaMemoria.id,
            "Localizar a alteraÃ§Ã£o registrada no Git e criar uma reversÃ£o segura."
        );

        try {
            const idAlvo =
                extrairIdTarefa(tarefa);

            emitirEvento(
                "Severino",
                "rollback",
                idAlvo
                    ? `Localizando a alteraÃ§Ã£o ${idAlvo}...`
                    : "Localizando a Ãºltima alteraÃ§Ã£o concluÃ­da..."
            );

            const desfeita =
                desfazerMudanca(idAlvo);

            emitirEvento(
                "Severino",
                "rollback",
                `Revertendo pelo Git ${desfeita.arquivos.length} arquivo(s) da tarefa ${desfeita.idTarefa}...`
            );

            const teste = await testarAlteracoes(
                desfeita.arquivos.filter(arquivo =>
                    arquivoExiste(arquivo)
                )
            );

            adicionarProgresso(
                tarefaMemoria.id,
                `AlteraÃ§Ã£o ${desfeita.idTarefa} desfeita. Arquivos: ${desfeita.arquivos.join(", ")}`
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
                `AlteraÃ§Ã£o ${desfeita.idTarefa} desfeita com sucesso.`
            );

            return [
                `AlteraÃ§Ã£o desfeita: ${desfeita.idTarefa}`,
                `Arquivos restaurados/removidos: ${desfeita.arquivos.join(", ")}`,
                teste.resultados.length > 0
                    ? `ValidaÃ§Ã£o: ${formatarTestes(teste)}`
                    : "ValidaÃ§Ã£o: nÃ£o havia arquivos restantes que precisassem ser testados."
            ].join("\n");
        } catch (erro) {
            atualizarStatus(
                tarefaMemoria.id,
                "erro"
            );

            definirProximoPasso(
                tarefaMemoria.id,
                "Revisar o histÃ³rico de alteraÃ§Ãµes antes de tentar novamente."
            );

            emitirEvento(
                "Severino",
                "erro",
                erro.message
            );

            throw erro;
        }
    }

    // ========================================
    // TAREFAS SIMPLES E DETERMINÃSTICAS
    // ========================================

    const somenteLeitura =
        tarefaSomenteLeitura(tarefa);

    const criacaoSimples =
        detectarCriacaoArquivoSimples(tarefa);

    if (!somenteLeitura && criacaoSimples) {
        const caminhoSeguro =
            resolverCaminhoSeguro(
                criacaoSimples.path
            ).relativo;

        atualizarStatus(
            tarefaMemoria.id,
            "planejando"
        );

        emitirEvento(
            "Severino",
            "plano",
            `Tarefa simples detectada: criar ${caminhoSeguro}`
        );

        const backup = criarBackup(
            tarefaMemoria.id,
            [caminhoSeguro]
        );

        emitirEvento(
            "Severino",
            "backup",
            `Checkpoint Git confirmado em ${backup.commit.slice(0, 8)}.`
        );

        try {
            escreverArquivo(
                caminhoSeguro,
                criacaoSimples.content
            );

            emitirEvento(
                "Severino",
                "edicao",
                `Criou ${caminhoSeguro}`
            );

            emitirEvento(
                "Severino",
                "teste",
                "Validando o arquivo criado..."
            );

            const teste = await testarAlteracoes(
                [caminhoSeguro]
            );

            if (!teste.sucesso) {
                restaurarBackup(backup);

                throw new Error(
                    `A validaÃ§Ã£o falhou. O checkpoint Git foi restaurado. ${formatarTestes(teste)}`
                );
            }

            registrarMudancaConcluida({
                idTarefa: tarefaMemoria.id,
                descricao: tarefa,
                backup,
                arquivos: [caminhoSeguro]
            });

            adicionarProgresso(
                tarefaMemoria.id,
                `Arquivo ${caminhoSeguro} criado e registrado no histÃ³rico.`
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
                `Arquivo ${caminhoSeguro} criado e validado.`
            );

            return [
                `Arquivo criado: ${caminhoSeguro}`,
                `ValidaÃ§Ã£o: ${formatarTestes(teste)}`,
                `Para desfazer: Severino, desfaÃ§a a Ãºltima alteraÃ§Ã£o.`
            ].join("\n");
        } catch (erro) {
            try {
                restaurarBackup(backup);
            } catch {
                // Preserva o erro principal.
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

    adicionarProgresso(
        tarefaMemoria.id,
        "Severino iniciou a investigaÃ§Ã£o."
    );

    atualizarStatus(
        tarefaMemoria.id,
        "investigando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Mapear o projeto e escolher os arquivos necessÃ¡rios."
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
        !somenteLeitura &&
        tarefaPedeAlteracao(tarefa);

    if (somenteLeitura) {

        adicionarProgresso(
            tarefaMemoria.id,
            "Modo somente leitura confirmado. Nenhum arquivo serÃ¡ alterado."
        );

        emitirEvento(
            "Severino",
            "analise",
            "Modo somente leitura: nenhum arquivo serÃ¡ alterado."
        );
    }

    if (!deveAlterar) {
        atualizarStatus(
            tarefaMemoria.id,
            "analisando"
        );

        emitirEvento(
            "Severino",
            "ia",
            "Gerando anÃ¡lise final..."
        );

        const resultado = await usarIA(`
VocÃª Ã© Severino, desenvolvedor do Gabriel AI Studio.

Analise a tarefa usando somente os arquivos reais abaixo.

TAREFA:
${tarefa}

ARQUIVOS ANALISADOS:
${contexto}

REGRAS:
- NÃ£o invente arquivos ou funcionalidades.
- Diferencie fatos observados de sugestÃµes.
- Seja claro e objetivo.
- Se faltar informaÃ§Ã£o, diga exatamente o que falta.
`);

        adicionarProgresso(
            tarefaMemoria.id,
            "AnÃ¡lise concluÃ­da."
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
            "AnÃ¡lise concluÃ­da."
        );

        return resultado;
    }

    // ========================================
    // MODO AUTÃ”NOMO DE ALTERAÃ‡ÃƒO
    // ========================================

    atualizarStatus(
        tarefaMemoria.id,
        "planejando"
    );

    definirProximoPasso(
        tarefaMemoria.id,
        "Criar um plano seguro de alteraÃ§Ã£o."
    );

    emitirEvento(
        "Severino",
        "plano",
        "Criando plano de implementaÃ§Ã£o..."
    );

    const plano = await pedirJSON(`
VocÃª Ã© Severino, desenvolvedor responsÃ¡vel por alterar
com seguranÃ§a o Gabriel AI Studio.

TAREFA:
${tarefa}

ARQUIVOS REAIS ANALISADOS:
${contexto}

ESTRUTURA DO PROJETO:
${estrutura.join("\n")}

Crie um plano pequeno e objetivo.
NÃ£o faÃ§a alteraÃ§Ãµes ainda.

Responda SOMENTE com JSON vÃ¡lido neste formato:
{
  "resumo": "o que serÃ¡ feito",
  "arquivos": ["arquivo1.js", "arquivo2.js"],
  "passos": ["passo 1", "passo 2"]
}

REGRAS:
- NÃ£o use .env, credenciais, chaves ou node_modules.
- Prefira poucas alteraÃ§Ãµes de cada vez.
- NÃ£o invente funcionalidades fora da tarefa.
`);

    adicionarProgresso(
        tarefaMemoria.id,
        `Plano criado: ${plano.resumo || "sem resumo"}`
    );

    emitirEvento(
        "Severino",
        "edicao",
        "Preparando alteraÃ§Ãµes no cÃ³digo..."
    );

    const proposta = await pedirJSON(`
VocÃª Ã© Severino, desenvolvedor do Gabriel AI Studio.

Implemente a tarefa abaixo.

TAREFA:
${tarefa}

PLANO:
${JSON.stringify(plano, null, 2)}

ARQUIVOS REAIS DISPONÃVEIS:
${contexto}

ESTRUTURA DO PROJETO:
${estrutura.join("\n")}

Responda SOMENTE com JSON vÃ¡lido no formato:
{
  "resumo": "resumo da implementaÃ§Ã£o",
  "changes": [
    {
      "path": "caminho/do/arquivo.js",
      "content": "CONTEÃšDO COMPLETO DO ARQUIVO"
    }
  ]
}

REGRAS OBRIGATÃ“RIAS:
- Cada content deve conter o arquivo COMPLETO, nÃ£o um patch.
- Pode criar arquivos novos quando necessÃ¡rio.
- NÃ£o altere .env, credenciais, chaves, .git ou node_modules.
- Preserve funcionalidades existentes que nÃ£o fazem parte da tarefa.
- Use somente Node.js e dependÃªncias jÃ¡ existentes, a menos que seja impossÃ­vel.
- NÃ£o execute comandos.
- NÃ£o inclua markdown fora do JSON.
`);

    let mudancas =
        validarMudancas(
            extrairMudancasDaProposta(proposta)
        );

    const arquivosAlterados = mudancas.map(
        item => item.path
    );

    emitirEvento(
        "Severino",
        "backup",
        `Protegendo ${arquivosAlterados.length} arquivo(s) com checkpoint Git...`
    );

    const backup = criarBackup(
        tarefaMemoria.id,
        arquivosAlterados
    );

    adicionarProgresso(
        tarefaMemoria.id,
        `Checkpoint Git antes das alteraÃ§Ãµes: ${backup.commit}`
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
                `Executando validaÃ§Ã£o ${tentativa}/${MAX_TENTATIVAS_CORRECAO}...`
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
VocÃª Ã© Severino corrigindo uma implementaÃ§Ã£o que falhou
na validaÃ§Ã£o local.

TAREFA ORIGINAL:
${tarefa}

ERROS DOS TESTES:
${formatarTestes(teste)}

ARQUIVOS ATUAIS:
${contextoAtual}

Responda SOMENTE com JSON vÃ¡lido:
{
  "resumo": "o que foi corrigido",
  "changes": [
    {
      "path": "arquivo.js",
      "content": "CONTEÃšDO COMPLETO CORRIGIDO"
    }
  ]
}

REGRAS:
- Corrija somente o necessÃ¡rio.
- NÃ£o toque em .env, credenciais ou node_modules.
- content deve ser o arquivo completo.
- NÃ£o use markdown fora do JSON.
`);

            const correcoes =
                validarMudancas(
                    extrairMudancasDaProposta(correcao)
                );

            for (const mudanca of correcoes) {
                if (
                    !arquivosAlterados.includes(
                        mudanca.path
                    )
                ) {
                    throw new Error(
                        `A correÃ§Ã£o tentou alterar um novo arquivo fora do backup: ${mudanca.path}`
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
                "ValidaÃ§Ã£o falhou. Restaurando o checkpoint Git..."
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
                `NÃ£o consegui validar a alteraÃ§Ã£o apÃ³s ${MAX_TENTATIVAS_CORRECAO} tentativas. O checkpoint Git foi restaurado.`
            );
        }

        registrarMudancaConcluida({
            idTarefa: tarefaMemoria.id,
            descricao:
                proposta.resumo || tarefa,
            backup,
            arquivos: arquivosAlterados
        });

        adicionarProgresso(
            tarefaMemoria.id,
            `AlteraÃ§Ãµes validadas e registradas para possÃ­vel desfazer: ${arquivosAlterados.join(", ")}`
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
            "ImplementaÃ§Ã£o concluÃ­da e validada."
        );

        const precisaReiniciar =
            arquivosAlterados.some(arquivo =>
                arquivo === "server.js" ||
                arquivo.replace(/\\/g, "/").startsWith("agents/") ||
                arquivo.replace(/\\/g, "/").startsWith("tools/")
            );

        return [
            proposta.resumo ||
                "ImplementaÃ§Ã£o concluÃ­da.",
            "",
            `Arquivos alterados: ${arquivosAlterados.join(", ")}`,
            `Testes: ${formatarTestes(teste)}`,
            precisaReiniciar
                ? "ReinÃ­cio do servidor recomendado para carregar alteraÃ§Ãµes de backend."
                : "As alteraÃ§Ãµes jÃ¡ podem ser usadas sem reiniciar o backend."
        ].join("\n");

    } catch (erro) {
        // Se o erro ocorreu antes de um rollback explÃ­cito,
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

