const fs = require("fs");
const path = require("path");

const caminhoMemoria = path.join(
    __dirname,
    "..",
    "memory",
    "tasks.json"
);


// Lê todas as tarefas salvas
function carregarMemoria() {

    try {

        const dados = fs
            .readFileSync(caminhoMemoria, "utf8")
            .trim();

        // Se o arquivo estiver vazio, começa com memória vazia
        if (!dados) {
            return {};
        }

        return JSON.parse(dados);

    } catch (erro) {

        console.log(
            "⚠️ Não foi possível carregar a memória."
        );

        return {};
    }
}


// Salva todas as tarefas
function salvarMemoria(memoria) {

    fs.writeFileSync(
        caminhoMemoria,
        JSON.stringify(memoria, null, 2),
        "utf8"
    );
}


// Cria uma nova tarefa
function criarTarefa(descricao, agente) {

    const memoria = carregarMemoria();

    const id = `task-${Date.now()}`;

    memoria[id] = {

        id: id,

        descricao: descricao,

        agente: agente,

        status: "iniciada",

        progresso: [],

        arquivosAnalisados: [],

        decisoes: [],

        proximoPasso: null,

        criadaEm: new Date().toISOString(),

        atualizadaEm: new Date().toISOString()
    };

    salvarMemoria(memoria);

    return memoria[id];
}


// Busca uma tarefa pelo ID
function buscarTarefa(id) {

    const memoria = carregarMemoria();

    return memoria[id] || null;
}


// Adiciona informação ao progresso
function adicionarProgresso(id, texto) {

    const memoria = carregarMemoria();

    if (!memoria[id]) {
        return false;
    }

    memoria[id].progresso.push(texto);

    memoria[id].atualizadaEm =
        new Date().toISOString();

    salvarMemoria(memoria);

    return true;
}


// Registra os arquivos analisados
function registrarArquivos(id, arquivos) {

    const memoria = carregarMemoria();

    if (!memoria[id]) {
        return false;
    }

    memoria[id].arquivosAnalisados = arquivos;

    memoria[id].atualizadaEm =
        new Date().toISOString();

    salvarMemoria(memoria);

    return true;
}


// Atualiza o status da tarefa
function atualizarStatus(id, status) {

    const memoria = carregarMemoria();

    if (!memoria[id]) {
        return false;
    }

    memoria[id].status = status;

    memoria[id].atualizadaEm =
        new Date().toISOString();

    salvarMemoria(memoria);

    return true;
}


// Define qual será o próximo passo
function definirProximoPasso(id, proximoPasso) {

    const memoria = carregarMemoria();

    if (!memoria[id]) {
        return false;
    }

    memoria[id].proximoPasso = proximoPasso;

    memoria[id].atualizadaEm =
        new Date().toISOString();

    salvarMemoria(memoria);

    return true;
}


module.exports = {
    carregarMemoria,
    criarTarefa,
    buscarTarefa,
    adicionarProgresso,
    registrarArquivos,
    atualizarStatus,
    definirProximoPasso
};