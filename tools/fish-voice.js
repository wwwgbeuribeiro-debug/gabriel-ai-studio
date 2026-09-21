require("dotenv").config();

const fs = require("fs");
const path = require("path");

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const FISH_API_KEY =
    process.env.FISH_API_KEY;

const FISH_VOICE_ID =
    process.env.FISH_VOICE_ID;

if (!FISH_API_KEY) {
    console.error(
        "❌ FISH_API_KEY não encontrada no .env"
    );

    process.exit(1);
}

if (!FISH_VOICE_ID) {
    console.error(
        "❌ FISH_VOICE_ID não encontrada no .env"
    );

    process.exit(1);
}

// ==========================================
// GERAR VOZ
// ==========================================

async function gerarVoz(texto, arquivoSaida) {

    console.log(
        "\n🎙️ Jairo: gerando narração..."
    );

    const resposta =
        await fetch(
            "https://api.fish.audio/v1/tts",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${FISH_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "model":
                        "s2.1-pro-free"
                },

                body: JSON.stringify({
                    text: texto,

                    reference_id:
                        FISH_VOICE_ID,

                    format:
                        "mp3"
                })
            }
        );

    if (!resposta.ok) {

        const erro =
            await resposta.text();

        throw new Error(
            `Fish Audio respondeu ${resposta.status}: ${erro}`
        );
    }

    const audio =
        Buffer.from(
            await resposta.arrayBuffer()
        );

    fs.writeFileSync(
        arquivoSaida,
        audio
    );

    console.log(
        "\n✅ Voz criada:"
    );

    console.log(
        arquivoSaida
    );

    return arquivoSaida;
}

// ==========================================
// TESTE DO JAIRO
// ==========================================

async function testar() {

    const pasta =
        path.join(
            process.cwd(),
            "output",
            "audio"
        );

    fs.mkdirSync(
        pasta,
        {
            recursive: true
        }
    );

    const arquivo =
        path.join(
            pasta,
            "jairo-teste.mp3"
        );

    const texto = `
[excited] Beleza! O site já está pronto.

Agora eu vou assumir o navegador e mostrar
o que foi criado.

Primeiro eu testo a ferramenta de criação.

Depois navego pelo catálogo,
seleciono um produto,
adiciono ao carrinho
e verifico o checkout.

[confident] Tudo isso sem ninguém tocar no mouse.
`;

    await gerarVoz(
        texto,
        arquivo
    );
}

testar()
    .catch(erro => {

        console.error(
            "\n❌ Erro na voz do Jairo:"
        );

        console.error(
            erro.message
        );

        process.exitCode = 1;
    });
    