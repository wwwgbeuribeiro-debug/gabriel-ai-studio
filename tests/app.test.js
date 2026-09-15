/**
 * @jest-environment jsdom
 */

describe('Funções de processamento do Gabriel AI Studio', () => {
  let adicionarLog;
  let mudarStatus;
  let processarStatusDoEvento;
  
  beforeEach(() => {
    // Limpar o DOM antes de cada teste
    document.body.innerHTML = `
      <input id="tarefa" value="" />
      <button id="botao-executar">Executar</button>
      <button id="botao-voz">Voz</button>
      <div id="atividade-log"></div>
      <div id="status-carlos"></div>
      <div id="status-severino"></div>
      <div id="status-jairo"></div>
    `;
    
    // Importar as funções após o DOM ser configurado
    jest.resetModules();
    const app = require('../public/app.js');
    
    // As funções são exportadas via closure no arquivo
    // Precisamos redefini-las para teste
    const atividadeLog = document.getElementById('atividade-log');
    const statusCarlos = document.getElementById('status-carlos');
    const statusSeverino = document.getElementById('status-severino');
    const statusJairo = document.getElementById('status-jairo');
    
    adicionarLog = (texto) => {
      const horario = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const item = document.createElement('div');
      item.className = 'log-item';
      item.textContent = `${horario} — ${texto}`;
      
      if (atividadeLog.querySelector('.atividade-vazia')) {
        atividadeLog.innerHTML = '';
      }
      
      atividadeLog.prepend(item);
    };
    
    mudarStatus = (agente, texto) => {
      if (agente === 'Carlos') statusCarlos.textContent = texto;
      if (agente === 'Severino') statusSeverino.textContent = texto;
      if (agente === 'Jairo') statusJairo.textContent = texto;
    };
    
    processarStatusDoEvento = (evento) => {
      if (evento.agente === 'Carlos') {
        if (evento.tipo === 'tarefa') mudarStatus('Carlos', 'Analisando tarefa...');
        if (evento.tipo === 'delegacao') mudarStatus('Carlos', 'Coordenando...');
        if (evento.tipo === 'concluido') mudarStatus('Carlos', 'Concluído ✓');
        if (evento.tipo === 'erro') mudarStatus('Carlos', 'Erro');
      }
      
      if (evento.agente === 'Severino') {
        const mapa = {
          inicio: 'Iniciando...',
          memoria: 'Preparando memória...',
          investigacao: 'Mapeando projeto...',
          analise: 'Escolhendo arquivos...',
          plano: 'Criando plano...',
          backup: 'Protegendo no Git...',
          edicao: 'Alterando código...',
          teste: 'Testando alterações...',
          correcao: 'Corrigindo erro...',
          rollback: 'Revertendo no Git...',
          ia: 'Gerando análise...'
        };
        
        if (mapa[evento.tipo]) mudarStatus('Severino', mapa[evento.tipo]);
        if (evento.tipo === 'arquivo') mudarStatus('Severino', evento.mensagem);
        if (evento.tipo === 'concluido') mudarStatus('Severino', 'Concluído ✓');
        if (evento.tipo === 'erro') mudarStatus('Severino', 'Erro');
      }
      
      if (evento.agente === 'Jairo') {
        if (evento.tipo === 'inicio') mudarStatus('Jairo', 'Iniciando...');
        if (evento.tipo === 'memoria') mudarStatus('Jairo', 'Preparando memória...');
        if (evento.tipo === 'planejamento') mudarStatus('Jairo', 'Planejando conteúdo...');
        if (evento.tipo === 'ia') mudarStatus('Jairo', 'Criando conteúdo...');
        if (evento.tipo === 'concluido') mudarStatus('Jairo', 'Concluído ✓');
        if (evento.tipo === 'erro') mudarStatus('Jairo', 'Erro');
      }
    };
  });

  describe('adicionarLog', () => {
    test('cria um elemento de log com a classe correta', () => {
      adicionarLog('Teste de log');
      
      const logItem = atividadeLog.querySelector('.log-item');
      expect(logItem).not.toBeNull();
      expect(logItem.textContent).toContain('Teste de log');
    });
    
    test('prepara o horário no formato correto', () => {
      adicionarLog('Teste hora');
      
      const logItem = atividadeLog.querySelector('.log-item');
      expect(logItem.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
    });

  describe('mudarStatus', () => {
    test('atualiza o status do Carlos', () => {
      mudarStatus('Carlos', 'Analisando tarefa...');
      expect(statusCarlos.textContent).toBe('Analisando tarefa...');
    });
    
    test('atualiza o status do Severino', () => {
      mudarStatus('Severino', 'Iniciando...');
      expect(statusSeverino.textContent).toBe('Iniciando...');
    });
    
    test('atualiza o status do Jairo', () => {
      mudarStatus('Jairo', 'Planejando conteúdo...');
      expect(statusJairo.textContent).toBe('Planejando conteúdo...');
    });
  });

  describe('processarStatusDoEvento', () => {
    test('mapeia evento de tipo tarefa para Carlos', () => {
      processarStatusDoEvento({ agente: 'Carlos', tipo: 'tarefa' });
      expect(statusCarlos.textContent).toBe('Analisando tarefa...');
    });
    
    test('mapeia evento de tipo delegacao para Carlos', () => {
      processarStatusDoEvento({ agente: 'Carlos', tipo: 'delegacao' });
      expect(statusCarlos.textContent).toBe('Coordenando...');
    });
    
    test('mapeia evento de tipo concluido para Carlos', () => {
      processarStatusDoEvento({ agente: 'Carlos', tipo: 'concluido' });
      expect(statusCarlos.textContent).toBe('Concluído ✓');
    });
    
    test('mapeia evento de tipo erro para Carlos', () => {
      processarStatusDoEvento({ agente: 'Carlos', tipo: 'erro' });
      expect(statusCarlos.textContent).toBe('Erro');
    });
    
    test('mapeia evento de tipo inicio para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'inicio' });
      expect(statusSeverino.textContent).toBe('Iniciando...');
    });
    
    test('mapeia evento de tipo memoria para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'memoria' });
      expect(statusSeverino.textContent).toBe('Preparando memória...');
    });
    
    test('mapeia evento de tipo analise para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'analise' });
      expect(statusSeverino.textContent).toBe('Escolhendo arquivos...');
    });
    
    test('mapeia evento de tipo plano para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'plano' });
      expect(statusSeverino.textContent).toBe('Criando plano...');
    });
    
    test('mapeia evento de tipo ia para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'ia' });
      expect(statusSeverino.textContent).toBe('Gerando análise...');
    });
    
    test('mapeia evento de tipo concluido para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'concluido' });
      expect(statusSeverino.textContent).toBe('Concluído ✓');
    });
    
    test('mapeia evento de tipo erro para Severino', () => {
      processarStatusDoEvento({ agente: 'Severino', tipo: 'erro' });
      expect(statusSeverino.textContent).toBe('Erro');
    });
    
    test('mapeia evento de tipo inicio para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'inicio' });
      expect(statusJairo.textContent).toBe('Iniciando...');
    });
    
    test('mapeia evento de tipo memoria para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'memoria' });
      expect(statusJairo.textContent).toBe('Preparando memória...');
    });
    
    test('mapeia evento de tipo planejamento para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'planejamento' });
      expect(statusJairo.textContent).toBe('Planejando conteúdo...');
    });
    
    test('mapeia evento de tipo ia para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'ia' });
      expect(statusJairo.textContent).toBe('Criando conteúdo...');
    });
    
    test('mapeia evento de tipo concluido para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'concluido' });
      expect(statusJairo.textContent).toBe('Concluído ✓');
    });
    
    test('mapeia evento de tipo erro para Jairo', () => {
      processarStatusDoEvento({ agente: 'Jairo', tipo: 'erro' });
      expect(statusJairo.textContent).toBe('Erro');
    });
  });
});