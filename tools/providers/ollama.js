const OLLAMA_URL =
    process.env.OLLAMA_URL ||
    "http://localhost:11434";

const OLLAMA_MODEL =
    process.env.OLLAMA_MODEL ||
    "qwen2.5-coder:3b";


async function usarOllama(prompt) {
    const resposta = await fetch(
        `${OLLAMA_URL}/api/generate`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: String(prompt || ""),
                stream: false
            })
        }
    );

    if (!resposta.ok) {
        throw new Error(
            `Ollama HTTP ${resposta.status}`
        );
    }

    const dados =
        await resposta.json();

    const texto =
        typeof dados.response === "string"
            ? dados.response.trim()
            : "";

    if (!texto) {
        throw new Error(
            "Ollama retornou resposta vazia."
        );
    }

    return texto;
}


async function disponivel() {
    try {
        const resposta = await fetch(
            `${OLLAMA_URL}/api/tags`
        );

        return resposta.ok;
    } catch {
        return false;
    }
}


module.exports = {
    usarOllama,
    disponivel,
    modelo: OLLAMA_MODEL
};