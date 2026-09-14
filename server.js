require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const coordinator = require("./agents/coordinator");

// Nosso "rádio interno"
const { listarEventos } = require("./tools/events");

const PORTA = 3000;


// ========================================
// ESTADO ATUAL DO STUDIO
// ========================================

const estado = {

    tarefaAtual: null,

    agentes: {
        Carlos: "livre",
        Severino: "livre",
        Jairo: "livre"
    },

    motores: {
        Gemini: "disponivel",
        Groq: "disponivel",
        OpenRouter: "disponivel"
    },

    memoria: "ativa"
};


// ========================================
// SERVIR ARQUIVOS DA PASTA PUBLIC
// ========================================

function servirArquivo(res, arquivo, tipo) {

    const caminho = path.join(
        __dirname,
        "public",
        arquivo
    );

    fs.readFile(caminho, (erro, conteudo) => {

        if (erro) {

            res.writeHead(404, {
                "Content-Type":
                    "text/plain; charset=utf-8"
            });

            res.end(
                "Arquivo não encontrado."
            );

            return;
        }

        res.writeHead(200, {
            "Content-Type": tipo
        });

        res.end(conteudo);
    });
}


// ========================================
// SERVIDOR
// ========================================

const servidor = http.createServer(
    async (req, res) => {


        // ====================================
        // INTERFACE PRINCIPAL
        // ====================================

        if (
            req.method === "GET" &&
            req.url === "/"
        ) {

            servirArquivo(
                res,
                "index.html",
                "text/html; charset=utf-8"
            );

            return;
        }


        // ====================================
        // CSS
        // ====================================

        if (
            req.method === "GET" &&
            req.url === "/style.css"
        ) {

            servirArquivo(
                res,
                "style.css",
                "text/css; charset=utf-8"
            );

            return;
        }


        // ====================================
        // JAVASCRIPT DO NAVEGADOR
        // ====================================

        if (
            req.method === "GET" &&
            req.url === "/app.js"
        ) {

            servirArquivo(
                res,
                "app.js",
                "application/javascript; charset=utf-8"
            );

            return;
        }


        // ====================================
        // API - STATUS DO STUDIO
        // ====================================

        if (
            req.method === "GET" &&
            req.url === "/api/status"
        ) {

            res.writeHead(200, {
                "Content-Type":
                    "application/json"
            });

            res.end(
                JSON.stringify(estado)
            );

            return;
        }


        // ====================================
        // API - EVENTOS DOS AGENTES
        // ====================================

        if (
            req.method === "GET" &&
            req.url === "/api/eventos"
        ) {

            res.writeHead(200, {
                "Content-Type":
                    "application/json"
            });

            res.end(
                JSON.stringify(
                    listarEventos()
                )
            );

            return;
        }


        // ====================================
        // API - NOVA TAREFA
        // ====================================

        if (
            req.method === "POST" &&
            req.url === "/api/tarefa"
        ) {

            let corpo = "";


            // Recebe os pedaços da mensagem
            req.on("data", parte => {

                corpo += parte;

            });


            // Quando terminar de receber
            req.on("end", async () => {

                try {

                    const dados =
                        JSON.parse(corpo);

                    const tarefa =
                        dados.tarefa?.trim();


                    // Tarefa vazia
                    if (!tarefa) {

                        res.writeHead(400, {
                            "Content-Type":
                                "application/json"
                        });

                        res.end(
                            JSON.stringify({
                                erro:
                                    "Digite uma tarefa."
                            })
                        );

                        return;
                    }


                    console.log(
                        "\n📥 Nova tarefa recebida pela interface:"
                    );

                    console.log(tarefa);


                    // Atualiza estado
                    estado.tarefaAtual =
                        tarefa;

                    estado.agentes.Carlos =
                        "trabalhando";


                    try {

                        // Envia para Carlos
                        const resultado =
                            await coordinator(tarefa);


                        // Carlos terminou
                        estado.agentes.Carlos =
                            "livre";


                        res.writeHead(200, {
                            "Content-Type":
                                "application/json"
                        });


                        res.end(
                            JSON.stringify({

                                sucesso: true,

                                resultado:
                                    resultado || null

                            })
                        );


                    } catch (erro) {

                        estado.agentes.Carlos =
                            "erro";


                        res.writeHead(500, {
                            "Content-Type":
                                "application/json"
                        });


                        res.end(
                            JSON.stringify({

                                erro:
                                    erro.message

                            })
                        );
                    }


                } catch (erro) {

                    res.writeHead(400, {
                        "Content-Type":
                            "application/json"
                    });


                    res.end(
                        JSON.stringify({

                            erro:
                                "Dados inválidos."

                        })
                    );
                }
            });


            return;
        }


        // ====================================
        // PÁGINA NÃO ENCONTRADA
        // ====================================

        res.writeHead(404, {
            "Content-Type":
                "text/plain; charset=utf-8"
        });

        res.end(
            "Página não encontrada."
        );
    }
);


// ========================================
// LIGAR O GABRIEL AI STUDIO
// ========================================

servidor.listen(PORTA, () => {

    console.log("");

    console.log(
        "🚀 Gabriel AI Studio iniciado!"
    );

    console.log(
        `🌐 Abra: http://localhost:${PORTA}`
    );

    console.log("");
});