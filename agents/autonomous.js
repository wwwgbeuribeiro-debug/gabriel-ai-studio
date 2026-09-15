const { usarIA } = require("../tools/ai");
const { emitirEvento } = require("../tools/events");

const developer = require("./developer");
const content = require("./content");

const MAX_ETAPAS_PLANO = 3;
const MAX_ETAPAS_TOTAL = 4;


function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function deveExecutarAutonomo(tarefa) {

    const texto = normalizar(tarefa);

    const chamouCarlos =
        /^carlos\b/.test(texto);

    const pediuAutonomia =
        /\bobjetivo\b/.test(texto) ||
        /\bautonom/.test(texto) ||
        /\bsozinh/.test(texto) ||
        /\bvarias etapas\b/.test(texto) ||
        /\bcontinue ate\b/.test(texto) ||
        /\btrabalhe ate\b/.test(texto);

    return (
        chamouCarlos &&
        pediuAutonomia
    );
}


function limparObjetivo(tarefa) {

    return String(tarefa || "")
        .replace(
            /^carlos\s*[,;:\-]?\s*/i,
            ""
        )
        .replace(
            /^objetivo\s*[:\-]?\s*/i,
            ""
        )
        .trim();
}


function nomeAgente(codigo) {

    if (codigo === "DEV") {
        return "Severino";
    }

    if (codigo === "CONTENT") {
        return "Jairo";
    }

    return codigo;
}


function agenteValido(agente) {

    return [
        "DEV",
        "CONTENT"
    ].includes(
        String(agente || "")
            .trim()
            .toUpperCase()
    );
}


function extrairJSON(resposta) {

    let texto =
        String(resposta || "")
            .trim();

    texto =
        texto
            .replace(
                /^```(?:json)?\s*/i,
                ""
            )
            .replace(
                /```\s*$/i,
                ""
            )
            .trim();

    const inicio =
        texto.indexOf("{");

    const fim =
        texto.lastIndexOf("}");

    if (
        inicio === -1 ||
        fim === -1 ||
        fim <= inicio
    ) {

        throw new Error(
            "A IA nao retornou JSON valido."
        );
    }

    return JSON.parse(
        texto.slice(
            inicio,
            fim + 1
        )
    );
}


function tarefaExigeAutorizacao(tarefa) {

    const texto =
        normalizar(tarefa);

    const padroes = [
        /\bgit\s+push\b/,
        /\bdeploy\b/,
        /\bpublicar\b/,
        /\bpostar\b/,
        /\benviar\s+(mensagem|email|e-mail)\b/,
        /\bcomprar\b/,
        /\bpagar\b/,
        /\bassinar\b/,
        /\bapagar\s+banco\b/,
        /\bdeletar\s+banco\b/,
        /\bexcluir\s+conta\b/,
        /\.env\b/,
        /\bapi[_ -]?key\b/,
        /\bcredencial\b/,
        /\bsenha\b/
    ];

    return padroes.some(
        padrao =>
            padrao.test(texto)
    );
}


function escolherFallback(objetivo) {

    const texto =
        normalizar(objetivo);

    const palavrasConteudo = [
        "video",
        "reels",
        "roteiro",
        "instagram",
        "tiktok",
        "post",
        "legenda",
        "conteudo"
    ];

    const ehConteudo =
        palavrasConteudo.some(
            palavra =>
                texto.includes(palavra)
        );

    return ehConteudo
        ? "CONTENT"
        : "DEV";
}


function resumirResultado(
    resultado,
    limite = 900
) {

    const texto =
        String(
            resultado ?? ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if (
        texto.length <= limite
    ) {
        return texto;
    }

    return (
        texto.slice(
            0,
            limite
        ) +
        "..."
    );
}



function montarTarefaComContexto(
    objetivo,
    etapa,
    historico
) {

    if (
        !Array.isArray(historico) ||
        historico.length === 0
    ) {

        return etapa.tarefa;
    }


    const anteriores =
        historico
            .slice(-2)
            .map(
                item =>
                    `ETAPA ${item.numero} - ${item.nome}
TAREFA EXECUTADA:
${item.tarefa}

RESULTADO REAL:
${item.resultado}`
            )
            .join("\n\n");


    return `
OBJETIVO GERAL:
${objetivo}

SUA ETAPA AGORA:
${etapa.tarefa}

CONTEXTO REAL DAS ETAPAS ANTERIORES:
${anteriores}

REGRAS:
- Continue a partir dos resultados acima.
- Nao repita trabalho ja concluido.
- Nao invente resultados anteriores.
- Use os arquivos, decisoes e conclusoes encontrados anteriormente.
- Se o contexto mostrar que a etapa ja foi resolvida, valide o resultado em vez de refazer tudo.
`.trim();
}


async function criarPlano(objetivo) {

    console.log(
        "Carlos esta criando um plano autonomo..."
    );

    emitirEvento(
        "Carlos",
        "autonomia",
        "Criando plano de execucao autonoma."
    );

    try {

        const resposta =
            await usarIA(`
Voce e Carlos, coordenador de uma equipe de agentes.

Seu trabalho e transformar UM OBJETIVO em pequenas etapas executaveis.

AGENTES:

DEV
Nome: Severino
Pode analisar projeto, codigo e arquivos.
Pode implementar, corrigir, alterar e testar codigo.

CONTENT
Nome: Jairo
Pode criar conteudo, roteiro e video a partir de fatos reais.

REGRAS:

- Gere no maximo ${MAX_ETAPAS_PLANO} etapas.
- Cada etapa pertence a apenas um agente.
- Nao invente ferramentas.
- Nao crie etapas desnecessarias.
- Para objetivo tecnico, prefira DEV.
- So use CONTENT quando o objetivo realmente envolver conteudo ou video.
- Nao faca deploy.
- Nao faca git push.
- Nao publique nada externamente.
- Nao mexa em .env, senhas, tokens ou credenciais.
- Nao inclua explicacoes fora do JSON.

Responda SOMENTE neste formato:

{
  "etapas": [
    {
      "agente": "DEV",
      "tarefa": "descricao objetiva da etapa",
      "motivo": "por que esta etapa existe"
    }
  ]
}

OBJETIVO:
${objetivo}
`);

        const dados =
            extrairJSON(resposta);

        if (
            !Array.isArray(
                dados.etapas
            )
        ) {
            throw new Error(
                "Plano sem lista de etapas."
            );
        }

        const etapas =
            dados.etapas
                .slice(
                    0,
                    MAX_ETAPAS_PLANO
                )
                .map(
                    etapa => ({
                        agente:
                            String(
                                etapa.agente || ""
                            )
                                .trim()
                                .toUpperCase(),

                        tarefa:
                            String(
                                etapa.tarefa || ""
                            )
                                .trim(),

                        motivo:
                            String(
                                etapa.motivo || ""
                            )
                                .trim()
                    })
                )
                .filter(
                    etapa =>
                        agenteValido(
                            etapa.agente
                        ) &&
                        etapa.tarefa
                );

        if (
            etapas.length === 0
        ) {
            throw new Error(
                "Plano sem etapas validas."
            );
        }

        return etapas;

    } catch (erro) {

        console.log(
            "Planejamento por IA falhou. Usando plano seguro de uma etapa."
        );

        emitirEvento(
            "Carlos",
            "autonomia",
            "Planejamento por IA indisponivel; usando fallback seguro."
        );

        return [
            {
                agente:
                    escolherFallback(
                        objetivo
                    ),

                tarefa:
                    objetivo,

                motivo:
                    "Executar o objetivo diretamente."
            }
        ];
    }
}


async function executarAgente(
    agente,
    tarefa,
    numero,
    tarefaParaAutorizacao = tarefa
) {

    const codigo =
        String(agente)
            .trim()
            .toUpperCase();

    if (
        !agenteValido(codigo)
    ) {
        throw new Error(
            `Agente invalido: ${agente}`
        );
    }

    if (
        tarefaExigeAutorizacao(
            tarefaParaAutorizacao
        )
    ) {

        throw new Error(
            "Esta etapa exige autorizacao manual e nao sera executada automaticamente."
        );
    }

    const nome =
        nomeAgente(codigo);

    console.log("");
    console.log(
        `=== ETAPA ${numero}: ${nome} ===`
    );
    console.log(tarefa);

    emitirEvento(
        "Carlos",
        "autonomia",
        `Etapa ${numero} enviada para ${nome}.`
    );

    let resultado;

    if (
        codigo === "DEV"
    ) {

        resultado =
            await developer(
                tarefa
            );

    } else {

        resultado =
            await content(
                tarefa
            );
    }

    emitirEvento(
        "Carlos",
        "autonomia",
        `Etapa ${numero} concluida por ${nome}.`
    );

    return {
        numero,
        agente: codigo,
        nome,
        tarefa,
        resultado:
            resumirResultado(
                resultado
            )
    };
}


async function revisarObjetivo(
    objetivo,
    historico
) {

    const resumo =
        historico
            .map(
                item =>
                    `ETAPA ${item.numero} - ${item.nome}
TAREFA: ${item.tarefa}
RESULTADO: ${item.resultado}`
            )
            .join("\n\n");

    try {

        emitirEvento(
            "Carlos",
            "autonomia",
            "Revisando se o objetivo foi concluido."
        );

        const resposta =
            await usarIA(`
Voce e Carlos, coordenador.

Avalie se o OBJETIVO foi atendido com base SOMENTE nos resultados executados.

Se estiver suficiente, responda:

{
  "status": "CONCLUIDO",
  "motivo": "resumo curto"
}

Se ainda faltar UMA acao concreta, responda:

{
  "status": "CONTINUAR",
  "agente": "DEV",
  "tarefa": "uma unica acao necessaria",
  "motivo": "o que ainda falta"
}

O agente tambem pode ser CONTENT.

REGRAS:

- Nao invente que algo foi executado.
- Nao proponha deploy ou git push.
- Nao proponha publicacao externa.
- Nao acesse credenciais.
- Proponha no maximo UMA etapa adicional.
- Responda SOMENTE JSON.

OBJETIVO:
${objetivo}

EXECUCAO:
${resumo}
`);

        const dados =
            extrairJSON(
                resposta
            );

        const status =
            String(
                dados.status || ""
            )
                .trim()
                .toUpperCase();

        if (
            status === "CONCLUIDO"
        ) {

            return {
                status:
                    "CONCLUIDO",

                motivo:
                    String(
                        dados.motivo ||
                        "Objetivo atendido."
                    )
            };
        }

        if (
            status === "CONTINUAR" &&
            agenteValido(
                String(
                    dados.agente || ""
                ).toUpperCase()
            ) &&
            String(
                dados.tarefa || ""
            ).trim()
        ) {

            return {
                status:
                    "CONTINUAR",

                agente:
                    String(
                        dados.agente
                    )
                        .trim()
                        .toUpperCase(),

                tarefa:
                    String(
                        dados.tarefa
                    )
                        .trim(),

                motivo:
                    String(
                        dados.motivo || ""
                    )
                        .trim()
            };
        }

        return {
            status:
                "CONCLUIDO",

            motivo:
                "Revisao nao encontrou uma etapa adicional valida."
        };

    } catch (erro) {

        emitirEvento(
            "Carlos",
            "autonomia",
            "Revisao automatica indisponivel."
        );

        return {
            status:
                "REVISAO_INDISPONIVEL",

            motivo:
                "As etapas planejadas foram executadas, mas a revisao por IA nao ficou disponivel."
        };
    }
}


function montarResultadoFinal(
    objetivo,
    historico,
    revisao
) {

    const linhas = [
        "OBJETIVO AUTONOMO FINALIZADO",
        "",
        `Objetivo: ${objetivo}`,
        "",
        `Etapas executadas: ${historico.length}`
    ];

    for (
        const item of historico
    ) {

        linhas.push("");
        linhas.push(
            `${item.numero}. ${item.nome}`
        );

        linhas.push(
            `Tarefa: ${item.tarefa}`
        );

        linhas.push(
            `Resultado: ${item.resultado}`
        );
    }

    linhas.push("");
    linhas.push(
        `Revisao de Carlos: ${revisao.motivo}`
    );

    return linhas.join("\n");
}


async function executarObjetivoAutonomo(
    tarefaOriginal
) {

    const objetivo =
        limparObjetivo(
            tarefaOriginal
        );

    if (!objetivo) {

        throw new Error(
            "Carlos recebeu modo autonomo sem objetivo."
        );
    }

    console.log("");
    console.log(
        "=========================================="
    );
    console.log(
        "CARLOS - MODO AUTONOMO"
    );
    console.log(
        "=========================================="
    );
    console.log(objetivo);

    emitirEvento(
        "Carlos",
        "autonomia",
        "Modo autonomo iniciado."
    );

    const plano =
        await criarPlano(
            objetivo
        );

    console.log("");
    console.log(
        `Carlos criou ${plano.length} etapa(s).`
    );

    plano.forEach(
        (
            etapa,
            indice
        ) => {

            console.log(
                `${indice + 1}. ${nomeAgente(
                    etapa.agente
                )}: ${etapa.tarefa}`
            );
        }
    );

    const historico = [];

    for (
        let i = 0;
        i < plano.length;
        i++
    ) {

        const tarefaComContexto =
            montarTarefaComContexto(
                objetivo,
                plano[i],
                historico
            );


        const resultado =
            await executarAgente(
                plano[i].agente,
                tarefaComContexto,
                historico.length + 1,
                plano[i].tarefa
            );

        historico.push(
            resultado
        );
    }

    let revisao =
        await revisarObjetivo(
            objetivo,
            historico
        );

    if (
        revisao.status ===
            "CONTINUAR" &&
        historico.length <
            MAX_ETAPAS_TOTAL
    ) {

        console.log("");
        console.log(
            "Carlos encontrou uma etapa que ainda falta."
        );

        console.log(
            revisao.motivo
        );

        const extra =
            await executarAgente(
                revisao.agente,
                revisao.tarefa,
                historico.length + 1,
                revisao.tarefa
            );

        historico.push(
            extra
        );

        revisao = {
            status:
                "RODADA_EXTRA_EXECUTADA",

            motivo:
                "Carlos identificou uma pendencia e executou uma rodada adicional."
        };
    }

    emitirEvento(
        "Carlos",
        "autonomia",
        `Objetivo autonomo encerrado apos ${historico.length} etapa(s).`
    );

    return montarResultadoFinal(
        objetivo,
        historico,
        revisao
    );
}


module.exports = {
    deveExecutarAutonomo,
    executarObjetivoAutonomo
};