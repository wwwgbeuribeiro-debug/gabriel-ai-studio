async function usarOpenRouter(prompt) {

    const resposta = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: "openrouter/free",

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        }
    );

    if (!resposta.ok) {

        const erro = await resposta.text();

        throw new Error(
            `OpenRouter erro ${resposta.status}: ${erro}`
        );
    }

    const dados = await resposta.json();

    return dados.choices[0].message.content.trim();
}


module.exports = {
    usarOpenRouter
};