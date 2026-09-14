const eventos = [];
let ultimoId = Date.now();

function gerarId() {
    const agora = Date.now();

    ultimoId = Math.max(
        ultimoId + 1,
        agora
    );

    return ultimoId;
}

function emitirEvento(agente, tipo, mensagem) {
    const evento = {
        id: gerarId(),
        agente,
        tipo,
        mensagem,
        horario: new Date().toISOString()
    };

    eventos.push(evento);

    if (eventos.length > 200) {
        eventos.shift();
    }

    console.log(
        `📡 ${agente}: ${mensagem}`
    );

    return evento;
}

function listarEventos() {
    return eventos;
}

module.exports = {
    emitirEvento,
    listarEventos
};
