const eventos = [];

function emitirEvento(agente, tipo, mensagem) {

    const evento = {
        id: Date.now(),
        agente,
        tipo,
        mensagem,
        horario: new Date().toISOString()
    };

    eventos.push(evento);

    // Evita acumular eventos para sempre
    if (eventos.length > 100) {
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