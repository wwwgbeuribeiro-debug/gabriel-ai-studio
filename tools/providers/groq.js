const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function usarGroq(prompt) {

    const resposta = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        model: "openai/gpt-oss-20b"
    });

    return resposta.choices[0].message.content.trim();
}

module.exports = {
    usarGroq
};