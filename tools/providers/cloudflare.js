const MODELO_CLOUDFLARE =
    process.env.CLOUDFLARE_AI_MODEL ||
    "@cf/openai/gpt-oss-20b";


function cloudflareDisponivel() {

    return Boolean(
        process.env.CLOUDFLARE_API_TOKEN &&
        process.env.CLOUDFLARE_ACCOUNT_ID
    );
}


async function usarCloudflare(prompt) {

    if (
        !cloudflareDisponivel()
    ) {

        throw new Error(
            "CLOUDFLARE_NAO_CONFIGURADO"
        );
    }


    const accountId =
        process.env
            .CLOUDFLARE_ACCOUNT_ID;


    const url =
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;


    const resposta =
        await fetch(
            url,
            {
                method:
                    "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        model:
                            MODELO_CLOUDFLARE,

                        messages: [
                            {
                                role:
                                    "user",

                                content:
                                    String(prompt)
                            }
                        ],

                        temperature:
                            0.2,

                        max_tokens:
                            4096
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
                `Cloudflare HTTP ${resposta.status}`
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
            "Cloudflare retornou resposta vazia."
        );
    }


    return conteudo.trim();
}


module.exports = {
    usarCloudflare,
    cloudflareDisponivel
};