const fs = require("fs");
const path = require("path");

const {
    usarIA,
    usarIACodigo
} = require("../tools/ai");


const PASTA_ESTADOS = path.join(
    process.cwd(),
    "memory",
    "site-iterations"
);


function garantirPastaEstados() {
    fs.mkdirSync(
        PASTA_ESTADOS,
        { recursive: true }
    );
}


function caminhoEstado(taskId) {
    return path.join(
        PASTA_ESTADOS,
        `${taskId}.json`
    );
}


function salvarEstado(estado) {
    garantirPastaEstados();

    fs.writeFileSync(
        caminhoEstado(estado.taskId),
        JSON.stringify(
            estado,
            null,
            2
        ),
        "utf8"
    );
}


function limparMarkdown(texto) {
    return String(texto || "")
        .replace(/```html/gi, "")
        .replace(/```css/gi, "")
        .replace(/```/g, "")
        .trim();
}


function extrairPacote(resposta) {
    const texto =
        limparMarkdown(resposta);

    const inicioHTML =
        texto.indexOf("===HTML===");

    const inicioCSS =
        texto.indexOf("===CSS===");

    const fim =
        texto.indexOf("===FIM===");

    if (
        inicioHTML === -1 ||
        inicioCSS === -1
    ) {
        throw new Error(
            "Qwen nao retornou HTML e CSS no formato esperado."
        );
    }

    const html = texto
        .slice(
            inicioHTML + "===HTML===".length,
            inicioCSS
        )
        .trim();

    const css = texto
        .slice(
            inicioCSS + "===CSS===".length,
            fim === -1
                ? texto.length
                : fim
        )
        .trim();

    if (html.length < 100) {
        throw new Error(
            "HTML do componente veio pequeno demais."
        );
    }

    if (css.length < 150) {
        throw new Error(
            "CSS do componente veio pequeno demais."
        );
    }

    return {
        html,
        css
    };
}


function avaliarHeroLocal({
    html,
    css
}) {
    const problemas = [];

    const htmlTexto =
        String(html || "").trim();

    const cssTexto =
        String(css || "").trim();

    // -----------------------------------------
    // TEXTO SOLTO ANTES DO PRIMEIRO ELEMENTO
    // Exemplo:
    // HTML melhorado
    // <section>...</section>
    // -----------------------------------------

    const primeiroElemento =
        htmlTexto.search(
            /<[a-z][^>]*>/i
        );

    if (primeiroElemento > 0) {
        const prefixo =
            htmlTexto
                .slice(
                    0,
                    primeiroElemento
                )
                .replace(
                    /<!--[\s\S]*?-->/g,
                    ""
                )
                .trim();

        if (prefixo) {
            problemas.push(
                "Existe texto solto antes do primeiro elemento HTML: " +
                JSON.stringify(prefixo.slice(0, 80)) +
                ". Remova esse texto."
            );
        }
    }

    // -----------------------------------------
    // IMAGENS
    // Nesta etapa nenhum asset foi fornecido.
    // Imagem relativa/local provavelmente foi inventada.
    // -----------------------------------------

    const imagens =
        [
            ...htmlTexto.matchAll(
                /<img\b[^>]*>/gi
            )
        ];

    for (const imagem of imagens) {
        const tag =
            imagem[0];

        const srcMatch =
            tag.match(
                /\bsrc\s*=\s*["']([^"']*)["']/i
            );

        if (!srcMatch) {
            problemas.push(
                "Existe uma tag img sem atributo src."
            );

            continue;
        }

        const src =
            srcMatch[1].trim();

        if (!src) {
            problemas.push(
                "Existe uma imagem com src vazio."
            );

            continue;
        }

        const externa =
            /^(https?:)?\/\//i.test(src);

        const inline =
            /^data:/i.test(src);

        if (
            !externa &&
            !inline
        ) {
            problemas.push(
                "A imagem local " +
                JSON.stringify(src) +
                " nao foi fornecida para esta tarefa. " +
                "Remova a imagem ou substitua por composicao visual feita com HTML/CSS."
            );
        }
    }

    // -----------------------------------------
    // ESTRUTURA DO HERO
    // -----------------------------------------

    if (
        !/<section\b/i.test(htmlTexto)
    ) {
        problemas.push(
            "Use uma section semantica para o hero."
        );
    }

    if (
        !/<h1\b/i.test(htmlTexto)
    ) {
        problemas.push(
            "O hero precisa ter um H1."
        );
    }

    if (
        !/<a\b|<button\b/i.test(htmlTexto)
    ) {
        problemas.push(
            "O hero precisa ter pelo menos um CTA."
        );
    }

    if (
        !/hero/i.test(htmlTexto)
    ) {
        problemas.push(
            "Use classes descritivas contendo hero."
        );
    }

    if (
        !/hero/i.test(cssTexto)
    ) {
        problemas.push(
            "O CSS precisa estilizar explicitamente o hero."
        );
    }

    if (
        !/display\s*:\s*(flex|grid)/i.test(cssTexto)
    ) {
        problemas.push(
            "Use flex ou grid para controlar o layout."
        );
    }

    if (
        !/max-width/i.test(cssTexto)
    ) {
        problemas.push(
            "Defina uma largura maxima para o conteudo."
        );
    }

    if (
        !/padding/i.test(cssTexto)
    ) {
        problemas.push(
            "Defina espacamento interno adequado."
        );
    }

    if (
        !/@media/i.test(cssTexto)
    ) {
        problemas.push(
            "Adicione comportamento responsivo."
        );
    }

    if (
        /<script\b/i.test(htmlTexto)
    ) {
        problemas.push(
            "O hero nao deve conter JavaScript nesta etapa."
        );
    }

    return [...new Set(problemas)];
}


async function revisarHeroComIA({
    briefing,
    html,
    css
}) {
    const resposta =
        await usarIACodigo(`
Voce esta atuando SOMENTE como revisor de interface.

BRIEFING:
${briefing}

HTML ATUAL:
${html}

CSS ATUAL:
${css}

Avalie o hero pelos seguintes criterios:

- hierarquia visual clara;
- titulo principal forte;
- CTA visivel;
- composicao profissional;
- aproveitamento adequado do espaco;
- alinhamento consistente;
- layout moderno;
- responsividade;
- aparencia nao deve parecer um HTML cru;
- nao deve haver espacos vazios exagerados;
- nao deve parecer um template quebrado.

IMPORTANTE:

Nao gere codigo.
Nao explique longamente.

Se estiver suficientemente bom, responda exatamente:

APROVADO

Caso contrario, responda no maximo 4 linhas,
cada uma iniciando com:

PROBLEMA:

Seja especifico.
`.trim());

    const texto =
        String(resposta || "").trim();

    if (
        /^APROVADO\b/i.test(texto)
    ) {
        return {
            aprovado: true,
            problemas: []
        };
    }

    const problemas = texto
        .split(/\r?\n/)
        .map(linha => linha.trim())
        .filter(linha =>
            /^PROBLEMA:/i.test(linha)
        )
        .map(linha =>
            linha.replace(
                /^PROBLEMA:\s*/i,
                ""
            )
        )
        .filter(Boolean);

    if (!problemas.length) {
        return {
            aprovado: false,
            problemas: [
                "O revisor nao aprovou o componente."
            ]
        };
    }

    return {
        aprovado: false,
        problemas
    };
}


async function gerarVersao({
    nome,
    briefing,
    tentativa,
    htmlAnterior,
    cssAnterior,
    problemas
}) {
    const primeira =
        !htmlAnterior;

    const prompt = primeira
        ? `
Voce e um desenvolvedor front-end.

Crie SOMENTE o HERO de um site.

PROJETO:
${nome}

BRIEFING:
${briefing}

O hero deve parecer uma secao real de um site profissional.

Requisitos:
- HTML semantico;
- H1 forte;
- texto de apoio;
- CTA principal;
- CTA secundario quando fizer sentido;
- composicao visual clara;
- classes descritivas;
- responsivo;
- CSS completo somente deste componente;
- nao use JavaScript;
- nao use frameworks;
- nao crie o resto do site;
- nao use markdown.

Retorne EXATAMENTE:

===HTML===
fragmento HTML

===CSS===
CSS completo do hero

===FIM===
`
        : `
Voce esta trabalhando NA MESMA TAREFA.

Nao recrie tudo do zero sem necessidade.

PROJETO:
${nome}

BRIEFING:
${briefing}

VERSAO ATUAL DO HTML:
${htmlAnterior}

VERSAO ATUAL DO CSS:
${cssAnterior}

PROBLEMAS ENCONTRADOS:
${problemas
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n")}

Esta e a tentativa ${tentativa}.

Melhore a versao atual corrigindo os problemas.

Mantenha o que ja estiver bom.

Nao crie outras secoes do site.
Nao use JavaScript.
Nao use frameworks.
Nao use markdown.

Retorne EXATAMENTE:

===HTML===
HTML melhorado

===CSS===
CSS melhorado

===FIM===
`;

    const resposta =
        await usarIACodigo(
            prompt.trim()
        );

    return extrairPacote(
        resposta
    );
}



async function revisarHeroComNuvem({
    briefing,
    html,
    css
}) {
    const resposta =
        await usarIA(`
Voce e um diretor de arte e desenvolvedor front-end senior.

BRIEFING:
${briefing}

HTML:
${html}

CSS:
${css}

Avalie este HERO com criterio alto.

Ele precisa parecer uma interface profissional produzida
para um cliente real, e nao apenas HTML tecnicamente correto.

CRITERIOS:
- hierarquia visual forte;
- identidade visual perceptivel;
- aparencia premium;
- composicao interessante;
- CTA principal claramente dominante;
- bom aproveitamento do espaco;
- tipografia bem trabalhada;
- responsividade;
- alinhamentos consistentes;
- nada quebrado;
- nao parecer template cru ou exercicio basico.

Se estiver realmente bom, responda exatamente:

APROVADO

Caso contrario, responda no maximo 5 linhas:

PROBLEMA: descricao especifica

Nao gere codigo nesta revisao.
`.trim());

    const texto =
        String(resposta || "").trim();

    if (/^APROVADO\b/i.test(texto)) {
        return {
            aprovado: true,
            problemas: []
        };
    }

    const problemas =
        texto
            .split(/\r?\n/)
            .map(linha => linha.trim())
            .filter(linha =>
                /^PROBLEMA:/i.test(linha)
            )
            .map(linha =>
                linha.replace(
                    /^PROBLEMA:\s*/i,
                    ""
                )
            )
            .filter(Boolean);

    return {
        aprovado: false,
        problemas:
            problemas.length
                ? problemas
                : [
                    "A revisao de nuvem nao aprovou o hero."
                ]
    };
}


async function escalonarHeroNuvem({
    nome,
    briefing,
    html,
    css,
    problemas
}) {
    console.log("");
    console.log(
        "SITE_LOOP: escalonando Hero para IA de nuvem..."
    );

    const resposta =
        await usarIA(`
Voce recebeu um componente que uma IA local tentou criar
e nao conseguiu atingir qualidade suficiente.

Sua tarefa e melhorar APENAS O HERO.

PROJETO:
${nome}

BRIEFING ORIGINAL:
${briefing}

HTML ATUAL:
${html || "(ainda sem HTML aproveitavel)"}

CSS ATUAL:
${css || "(ainda sem CSS aproveitavel)"}

PROBLEMAS IDENTIFICADOS:
${(problemas || [])
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n") || "Qualidade visual insuficiente."}

REGRAS:

- produza um Hero realmente profissional;
- mantenha o que estiver bom;
- pode reconstruir o componente se necessario;
- HTML semantico;
- visual premium;
- boa hierarquia;
- CTA principal forte;
- responsivo;
- sem frameworks;
- sem JavaScript;
- nao invente arquivos de imagem locais;
- se nao houver assets, use HTML/CSS para a composicao visual;
- nao escreva explicacoes fora dos marcadores;
- nao escreva "HTML melhorado";
- nao crie outras secoes do site.

Retorne EXATAMENTE:

===HTML===
fragmento HTML final

===CSS===
CSS final do Hero

===FIM===
`.trim());

    return extrairPacote(resposta);
}


async function criarHeroIterativo({
    nome,
    briefing,
    maxTentativas = 3,
    taskId = `site-${Date.now()}`
}) {
    let html = "";
    let css = "";
    let problemas = [];

    const estado = {
        taskId,
        tipo: "SITE_COMPONENT_ITERATION",
        componente: "hero",
        nome,
        briefing,
        status: "executando",
        tentativa: 0,
        maxTentativas,
        historico: [],
        html: "",
        css: "",
        problemas: []
    };

    salvarEstado(estado);

    for (
        let tentativa = 1;
        tentativa <= maxTentativas;
        tentativa++
    ) {
        console.log("");
        console.log(
            `SITE_LOOP: Hero tentativa ${tentativa}/${maxTentativas}`
        );

        const versao =
            await gerarVersao({
                nome,
                briefing,
                tentativa,
                htmlAnterior: html,
                cssAnterior: css,
                problemas
            });

        html = versao.html;
        css = versao.css;

        console.log(
            "SITE_LOOP: avaliacao local..."
        );

        const problemasLocais =
            avaliarHeroLocal({
                html,
                css
            });

        console.log(
            `SITE_LOOP: ${problemasLocais.length} problema(s) estrutural(is)`
        );

        console.log(
            "SITE_LOOP: revisao visual por IA..."
        );

        const revisao =
            await revisarHeroComIA({
                briefing,
                html,
                css
            });

        problemas = [
            ...problemasLocais,
            ...revisao.problemas
        ];

        const aprovado =
            problemasLocais.length === 0 &&
            revisao.aprovado;

        estado.tentativa =
            tentativa;

        estado.html =
            html;

        estado.css =
            css;

        estado.problemas =
            problemas;

        estado.historico.push({
            tentativa,
            aprovado,
            problemas: [...problemas],
            htmlChars: html.length,
            cssChars: css.length
        });

        if (aprovado) {
            estado.status =
                "aprovado";

            salvarEstado(
                estado
            );

            console.log("");
            console.log(
                "SITE_LOOP: HERO APROVADO"
            );

            return {
                taskId,
                status: "aprovado",
                componente: "hero",
                tentativa,
                html,
                css,
                problemas: []
            };
        }

        salvarEstado(
            estado
        );

        console.log(
            "SITE_LOOP: ainda nao aprovado."
        );

        problemas.forEach(
            problema => {
                console.log(
                    " - " + problema
                );
            }
        );
    }

    console.log("");
    console.log(
        "SITE_LOOP: limite local atingido."
    );

    try {
        const versaoNuvem =
            await escalonarHeroNuvem({
                nome,
                briefing,
                html,
                css,
                problemas
            });

        html =
            versaoNuvem.html;

        css =
            versaoNuvem.css;

        console.log(
            "SITE_LOOP: validando resultado da nuvem..."
        );

        const problemasLocais =
            avaliarHeroLocal({
                html,
                css
            });

        const revisaoNuvem =
            await revisarHeroComNuvem({
                briefing,
                html,
                css
            });

        const problemasFinais = [
            ...problemasLocais,
            ...revisaoNuvem.problemas
        ];

        const aprovado =
            problemasLocais.length === 0 &&
            revisaoNuvem.aprovado;

        estado.tentativa =
            maxTentativas + 1;

        estado.html =
            html;

        estado.css =
            css;

        estado.problemas =
            problemasFinais;

        estado.historico.push({
            tentativa:
                maxTentativas + 1,

            origem:
                "nuvem",

            aprovado,

            problemas:
                [...problemasFinais],

            htmlChars:
                html.length,

            cssChars:
                css.length
        });

        if (aprovado) {
            estado.status =
                "aprovado_nuvem";

            salvarEstado(
                estado
            );

            console.log("");
            console.log(
                "SITE_LOOP: HERO APROVADO APOS ESCALONAMENTO"
            );

            return {
                taskId,
                status:
                    "aprovado_nuvem",

                componente:
                    "hero",

                tentativa:
                    maxTentativas + 1,

                origem:
                    "nuvem",

                html,
                css,
                problemas: []
            };
        }

        estado.status =
            "precisa_intervencao";

        salvarEstado(
            estado
        );

        console.log("");
        console.log(
            "SITE_LOOP: nuvem respondeu, mas o Hero ainda nao passou."
        );

        return {
            taskId,
            status:
                "precisa_intervencao",

            componente:
                "hero",

            tentativa:
                maxTentativas + 1,

            origem:
                "nuvem",

            html,
            css,
            problemas:
                problemasFinais
        };

    } catch (erro) {
        estado.status =
            "precisa_escalonamento";

        estado.problemas = [
            ...problemas,
            "Falha no escalonamento para nuvem: " +
            (
                erro &&
                erro.message
                    ? erro.message
                    : String(erro)
            )
        ];

        salvarEstado(
            estado
        );

        console.log(
            "SITE_LOOP: escalonamento falhou: " +
            (
                erro &&
                erro.message
                    ? erro.message
                    : String(erro)
            )
        );

        return {
            taskId,
            status:
                "precisa_escalonamento",

            componente:
                "hero",

            tentativa:
                maxTentativas,

            html,
            css,
            problemas:
                estado.problemas
        };
    }
}


module.exports = {
    criarHeroIterativo,
    avaliarHeroLocal
};