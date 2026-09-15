const MODELO_MISTRAL =
    process.env.MISTRAL_MODEL ||
    "mistral-small-latest";


function mistralDisponivel() {

    return Boolean(
        process.env.MISTRAL_API_KEY
    );
}


async function usarMistral(prompt) {

    if (
        !mistralDisponivel()
    ) {

        throw new Error(
            "MISTRAL_NAO_CONFIGURADO"
        );
    }


    const resposta =
        await fetch(
            "https://api.mistral.ai/v1/chat/completions",
            {
                method:
                    "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.MISTRAL_API_KEY}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        model:
                            MODELO_MISTRAL,

                        messages: [
                            {
                                role:
                                    "user",

                                content:
                                    String(prompt)
                            }
                        ],

                        temperature:
                            0.2
                    })
            }
        );


    if (
        !resposta.ok
    ) {

        const corpo =
            await resposta
                .text()
                .catch(
                    () => ""
                );


        const erro =
            new Error(
                `Mistral HTTP ${resposta.status}`
            );


        erro.status =
            resposta.status;


        erro.detalhes =
            corpo.slice(
                0,
                300
            );


        throw erro;
    }


    const dados =
        await resposta.json();


    const conteudo =
        dados?.choices?.[0]?.message?.content;


    if (
        typeof conteudo !==
            "string" ||
        !conteudo.trim()
    ) {

        throw new Error(
            "Mistral retornou resposta vazia."
        );
    }


    return conteudo.trim();
}


module.exports = {
    usarMistral,
    mistralDisponivel
};