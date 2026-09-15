const contentCore =
    require("./content-core");

const {
    gerarVideoAtividade
} = require("../tools/video");

const {
    emitirEvento
} = require("../tools/events");


function pedidoDeVideo(tarefa) {

    const texto =
        String(tarefa || "")
            .toLowerCase();

    const mencionaVideo =
        /\b(vídeo|video|mp4|reel|reels)\b/i
            .test(texto);

    const pedeCriacao =
        /\b(faça|faca|crie|criar|gere|gerar|produza|produzir|monte|montar|entregue|entregar)\b/i
            .test(texto);

    return (
        mencionaVideo &&
        pedeCriacao
    );
}


async function content(tarefa) {

    if (!pedidoDeVideo(tarefa)) {
        return contentCore(tarefa);
    }

    console.log(
        "🎬 Jairo recebeu pedido de vídeo real."
    );

    emitirEvento(
        "Jairo",
        "video",
        "Preparando vídeo a partir da memória real."
    );

    try {

        const resultado =
            await gerarVideoAtividade({
                limiteFatos: 5
            });

        emitirEvento(
            "Jairo",
            "concluido",
            `Vídeo gerado: ${resultado.relativo}`
        );

        return [
            "✅ Vídeo gerado pelo Jairo.",
            "",
            `Arquivo: ${resultado.relativo}`,
            `Fatos reais usados: ${resultado.fatos}`,
            `Duração aproximada: ${resultado.duracao}s`
        ].join("\n");

    } catch (erro) {

        emitirEvento(
            "Jairo",
            "erro",
            `Falha ao gerar vídeo: ${erro.message}`
        );

        throw erro;
    }
}


module.exports = content;
