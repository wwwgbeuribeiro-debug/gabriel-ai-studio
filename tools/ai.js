const { GoogleGenAI } = require("@google/genai");
const { usarGroq } = require("./providers/groq");
const { usarOpenRouter } = require("./providers/openrouter");

const FORCAR_GROQ = false;

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function usarGemini(prompt) {

   

    const resposta = await gemini.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });

    return resposta.text.trim();
}

async function usarIA(prompt) {
        if (FORCAR_GROQ) {
        console.log("🧪 TESTE: simulando Gemini indisponível.");
        console.log("🔄 Mudando automaticamente para Groq...");

        const resposta = await usarGroq(prompt);

        console.log("🟢 Groq respondeu.");

        return resposta;
    }

    // MOTOR 1 — GEMINI
    try {

        console.log("🧠 Tentando Gemini...");

        const resposta = await usarGemini(prompt);

        console.log("🟢 Gemini respondeu.");

        return resposta;

    } catch (erro) {

        // Gemini sem cota
        if (erro.status === 429) {

            console.log("🔴 Gemini atingiu o limite.");
            console.log("🔄 Mudando automaticamente para Groq...");

        }

        // Gemini temporariamente ocupado
        else if (erro.status === 503) {

            console.log("🟡 Gemini está ocupado.");
            console.log("⏳ Tentando novamente em 5 segundos...");

            await esperar(5000);

            try {

                const resposta = await usarGemini(prompt);

                console.log("🟢 Gemini respondeu na segunda tentativa.");

                return resposta;

            } catch (segundoErro) {

                console.log("🔄 Gemini continua indisponível.");
                console.log("Mudando para Groq...");
            }

        } else {

            console.log("⚠️ Gemini apresentou um erro.");
            console.log("🔄 Tentando Groq...");
        }
    }

    // MOTOR 2 — GROQ
try {

    console.log("🧠 Tentando Groq...");

    const resposta = await usarGroq(prompt);

    console.log("🟢 Groq respondeu.");

    return resposta;

} catch (erro) {

    console.log("🔴 Groq também falhou.");

    console.log(
        "🔄 Mudando automaticamente para OpenRouter..."
    );
}


try {

    console.log("🧠 Tentando OpenRouter...");

    const resposta = await usarOpenRouter(prompt);

    console.log("🟢 OpenRouter respondeu.");

    return resposta;

} catch (erro) {

    console.log("🔴 OpenRouter também falhou.");

    throw new Error(
        "Todos os provedores de IA estão indisponíveis."
    );
}
}

module.exports = {
    usarIA
};