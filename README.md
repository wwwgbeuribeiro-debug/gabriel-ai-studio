# Gabriel AI Studio

Projeto experimental criado para estudar, na prática, como agentes de IA podem trabalhar em conjunto para executar tarefas, desenvolver projetos e gerar conteúdo.

## Objetivo

O principal objetivo deste projeto é aprender desenvolvimento e inteligência artificial através da prática.

Uma das regras que defini para o projeto foi tentar utilizar, sempre que possível, ferramentas, modelos e APIs gratuitas, buscando entender como montar uma arquitetura funcional sem depender inicialmente de serviços pagos.

## Agentes

### Carlos — Coordenador

Responsável por receber as tarefas, identificar qual agente deve executá-las e acompanhar o andamento do trabalho.

### Severino — Desenvolvimento

Responsável por analisar arquivos, desenvolver funcionalidades, corrigir problemas e executar tarefas relacionadas ao código.

### Jairo — Conteúdo e Demonstração

Responsável por utilizar informações do projeto para criar demonstrações, navegar em interfaces e produzir conteúdos como vídeos.

## Funcionalidades

O projeto já possui experimentos e implementações envolvendo:

- Coordenação entre agentes
- Memória de tarefas
- Roteamento automático
- Uso de diferentes modelos de IA
- Fallback quando um provedor fica indisponível
- IA local
- Checkpoints com Git
- Recuperação após erros
- Automação de navegador
- Planejamento de ações
- Geração de demonstrações
- Narração e criação de vídeos
- Governança e controle das ações dos agentes

## Demonstrações

A pasta `demos` contém experimentos utilizados para testar e demonstrar algumas capacidades dos agentes.

Esses scripts não representam necessariamente o comportamento padrão do sistema. Algumas demonstrações possuem ações específicas para permitir a reprodução dos testes.

## Tecnologias

- Node.js
- JavaScript
- Git
- Playwright
- Modelos de IA via API
- Modelos de IA locais

## Configuração

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` utilizando as variáveis necessárias para os provedores que deseja utilizar.

As chaves e credenciais reais não fazem parte deste repositório.

## Segurança

O projeto ainda está em desenvolvimento e a camada de segurança e governança dos agentes continua sendo aprimorada.

Algumas funcionalidades experimentais podem permitir ações no sistema local, por isso o uso deve ser feito em ambiente controlado.

## Status

Projeto em desenvolvimento.

Estou utilizando este projeto como laboratório para estudar programação, inteligência artificial, agentes autônomos, automação e arquitetura de sistemas.

Feedbacks e sugestões são bem-vindos.
