const { carregarAtividade, salvarAtividade } = require("./activity");

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

function emitirRegistro(agente, tipo, mensagem) {
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

    // Persistir de forma assíncrona e não bloqueante
    setImmediate(() => persistirAtividade(evento));

    return evento;
}

function persistirAtividade(evento) {
    // Verifica se é sensível
    if (eSensivel(evento.mensagem)) {
        return;
    }

    // Cria um objeto resumido
    const registro = {
        agente: evento.agente,
        tipo: evento.tipo,
        horario: evento.horario,
        mensagem: evento.mensagem.slice(0, 200) // Trunca a mensagem
    };

    // Carrega o histórico existente
    let historico = carregarAtividade();
    historico.push(registro);

    // Salva de volta
    salvarAtividade(historico);
}

function listarEventos() {
    return eventos;
}

function eSensivel(texto) {
    if (!texto || typeof texto !== "string") return false;
    const padroesSensiveis = [
        /\.env/i,
        /api[_-]?key/i,
        /secret/i,
        /password|senha/i,
        /token/i,
        /credential|credencial/i,
        /bearer\s+[a-z0-9_\-\.]+/i,
        /chaves?/i
    ];
    return padroesSensiveis.some(p => p.test(texto));
}

function listarEventosSeguros(limite = 50) {
    return eventos
        .filter(evento => {
            const msg = evento.mensagem || "";
            return !eSensivel(msg);
        })
        .slice(-limite);
}

module.exports = {
    emitirRegistro,
    listarEventos,
    listarEventosSeguros
};
module.exports.emitirEvento = module.exports.emitirRegistro;
