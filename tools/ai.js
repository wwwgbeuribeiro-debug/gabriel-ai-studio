const {
    GoogleGenAI
} = require("@google/genai");

const {
    usarMistral,
    mistralDisponivel
} = require("./providers/mistral");

const {
    usarCloudflare,
    cloudflareDisponivel
} = require("./providers/cloudflare");

const FORCAR_GROQ =
    false;

// Mapa de cooldowns em memória: { [nomeProvedor]: timestampExpiracao }
const cooldowns = {};

function setCooldown(nome) {
    // 10 minutos em milissegundos
    cooldowns[nome] = Date.now() + 10 * 60 * 1000;
    console.log(`🔴 ${nome} atingiu limite. Cooldown iniciado por 10 minutos.`);
}

function isInCooldown(nome) {
    const expiracao = cooldowns[nome];
    return expiracao && Date.now() < expiracao;
}

function esperar(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function chaveConfigurada(nome) {

    return Boolean(
        process.env[nome]
    );
}

function erroCurto(erro) {

    if (!erro) {
        return "erro desconhecido";
    }


    const status =
        erro.status ||
        erro.statusCode;

    if (status) {
        return `HTTP ${status}`;
    }

    return String(
        erro.message ||
        erro
    )
        .replace(
            /\s+/g,
            " "
        )
        .slice(
            0,
            120
        );
}

async function usarGemini(prompt) {

    if (
        !chaveConfigurada(
            "GEMINI_API_KEY"
        )
    ) {

        throw new Error(
            "GEMINI_NAO_CONFIGURADO"
        );
    }


    const gemini =
        new GoogleGenAI({
            apiKey:
                process.env
                    .GEMINI_API_KEY
        });

    const resposta =
        await gemini.models
            .generateContent({
                model:
                    "gemini-3.6-flash",

                contents:
                    prompt
            });

    const texto =
        resposta?.text;

    if (
        !texto ||
        !String(texto).trim()
    ) {

        throw new Error(
            "Gemini retornou resposta vazia."
        );
    }

    return String(
        texto
    ).trim();
}

async function usarGroqLazy(prompt) {

    if (
        !chaveConfigurada(
            "GROQ_API_KEY"
        )
    ) {

        throw new Error(
            "GROQ_NAO_CONFIGURADO"
        );
    }


    const {
        usarGroq
    } = require("./providers/groq");

    return usarGroq(
        prompt
    );
}

async function usarOpenRouterLazy(
    prompt
) {

    if (
        !chaveConfigurada(
            "OPENROUTER_API_KEY"
        )
    ) {

        throw new Error(
            "OPENROUTER_NAO_CONFIGURADO"
        );
    }

    const {
        usarOpenRouter
    } = require(
        "./providers/openrouter"
    );

    return usarOpenRouter(
        prompt
    );
}

async function tentarProvider({
    nome,
    disponivel,
    executar
}) {

    if (isInCooldown(nome)) {
        console.log(`⚪ ${nome} em cooldown. Pulando...`);
        return {
            sucesso: false,
            pulado: true
        };
    }

    if (!disponivel()) {

        console.log(
            `⚪ ${nome} não configurado. Pulando...`
        );

        return {
            sucesso: false,
            pulado: true
        };
    }


    try {

        console.log(
            `🧠 Tentando ${nome}...`
        );

        const resposta =
            await executar();

        console.log(
            `🟢 ${nome} respondeu.`
        );

        return {
            sucesso: true,
            resposta
        };

    } catch (erro) {

        console.log(
            `🔴 ${nome} falhou: ${erroCurto(
                erro
            )}`
        );

        if (erro.status === 429) {
            setCooldown(nome);
        }

        return {
            sucesso: false,
            erro
        };
    }
}

async function tentarGemini(
    prompt
) {

    if (
        !chaveConfigurada(
            "GEMINI_API_KEY"
        )
    ) {

        console.log(
            "⚪ Gemini não configurado. Pulando..."
        );

        return null;
    }

    if (isInCooldown("Gemini")) {
        console.log("⚪ Gemini em cooldown. Pulando...");
        return null;
    }

    try {

        console.log(
            "🧠 Tentando Gemini..."
        );

        const resposta =
            await usarGemini(
                prompt
            );

        console.log(
            "🟢 Gemini respondeu."
        );

        return resposta;

    } catch (erro) {

        if (
            erro.status === 429
        ) {

            console.log(
                "🔴 Gemini atingiu o limite."
            );
            setCooldown("Gemini");
            return null;
        }

        if (
            erro.status === 503
        ) {

            console.log(
                "🟡 Gemini está ocupado."
            );

            console.log(
                "⏳ Tentando novamente em 5 segundos..."
            );

            await esperar(
                5000
            );

            try {

                const resposta =
                    await usarGemini(
                        prompt
                    );

                console.log(
                    "🟢 Gemini respondeu na segunda tentativa."
                );

                return resposta;

            } catch (segundoErro) {

                console.log(
                    `🔴 Gemini continua indisponível: ${erroCurto(
                        segundoErro
                    )}`
                );

                return null;
            }
        }

        console.log(
            `🔴 Gemini falhou: ${erroCurto(
                erro
            )}`
        );

        return null;
    }
}

async function usarIA(prompt) {

    if (FORCAR_GROQ) {

        console.log(
            "🧪 TESTE: simulando Gemini indisponível."
        );

        return usarGroqLazy(
            prompt
        );
    }

    // =====================================
    // 1. GEMINI
    // =====================================

    const gemini =
        await tentarGemini(
            prompt
        );

    if (gemini) {
        return gemini;
    }

    // =====================================
    // 2. GROQ
    // =====================================

    const groq =
        await tentarProvider({
            nome:
                "Groq",

            disponivel:
                () =>
                    chaveConfigurada(
                        "GROQ_API_KEY"
                    ),

            executar:
                () =>
                    usarGroqLazy(
                        prompt
                    )
        });

    if (groq.sucesso) {
        return groq.resposta;
    }

    // =====================================
    // 3. MISTRAL
    // =====================================

    const mistral =
        await tentarProvider({
            nome:
                "Mistral",

            disponivel:
                mistralDisponivel,

            executar:
                () =>
                    usarMistral(
                        prompt
                    )
        });

    if (mistral.sucesso) {
        return mistral.resposta;
    }

    // =====================================
    // 4. CLOUDFLARE
    // =====================================

    const cloudflare =
        await tentarProvider({
            nome:
                "Cloudflare",

            disponivel:
                cloudflareDisponivel,

            executar:
                () =>
                    usarCloudflare(
                        prompt
                    )
        });

    if (
        cloudflare.sucesso
    ) {
        return cloudflare.resposta;
    }

    // =====================================
    // 5. OPENROUTER
    // =====================================

    const openrouter =
        await tentarProvider({
            nome:
                "OpenRouter",

            disponivel:
                () =>
                    chaveConfigurada(
                        "OPENROUTER_API_KEY"
                    ),

            executar:
                () =>
                    usarOpenRouterLazy(
                        prompt
                    )
        });

    if (
        openrouter.sucesso
    ) {
        return openrouter.resposta;
    }

    throw new Error(
        "Todos os provedores de IA configurados estão indisponíveis."
    );
}

function statusProvedores() {

    return {
        Gemini:
            chaveConfigurada(
                "GEMINI_API_KEY"
            ),

        Groq:
            chaveConfigurada(
                "GROQ_API_KEY"
            ),

        Mistral:
            mistralDisponivel(),

        Cloudflare:
            cloudflareDisponivel(),

        OpenRouter:
            chaveConfigurada(
                "OPENROUTER_API_KEY"
            )
    };
}

module.exports = {
    usarIA,
    statusProvedores
};