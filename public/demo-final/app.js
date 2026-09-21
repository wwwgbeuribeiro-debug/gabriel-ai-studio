// BuildFlow AI - Dashboard & Workflow Engine Script

// Initial State Data
let workflows = [
    {
        id: 'wf-1',
        title: 'Gerador de Resumos de Código',
        category: 'automation',
        model: 'Gemini 1.5 Pro',
        trigger: 'Evento de Git',
        status: 'active',
        description: 'Analisa commits em repositórios Git e gera changelogs semânticos e resumos para a equipe.',
        runs: 342,
        lastRun: 'Há 5 minutos'
    },
    {
        id: 'wf-2',
        title: 'Agente de Atendimento IA',
        category: 'agent',
        model: 'GPT-4o',
        trigger: 'Webhook HTTP',
        status: 'active',
        description: 'Classifica mensagens de suporte e responde dúvidas frequentes de clientes em tempo real.',
        runs: 890,
        lastRun: 'Há 2 minutos'
    },
    {
        id: 'wf-3',
        title: 'Pipeline de SEO & Copywriting',
        category: 'content',
        model: 'Claude 3.5 Sonnet',
        trigger: 'Agendamento (Cron)',
        status: 'paused',
        description: 'Cria artigos de blog otimizados para busca com base em palavras-chave semanais.',
        runs: 120,
        lastRun: 'Ontem às 18:00'
    },
    {
        id: 'wf-4',
        title: 'Extrator de Insights de Vendas',
        category: 'data',
        model: 'Llama 3 70B',
        trigger: 'Webhook HTTP',
        status: 'active',
        description: 'Processa planilhas de conversão e identifica gargalos e oportunidades de vendas.',
        runs: 130,
        lastRun: 'Há 1 hora'
    }
];

// DOM Elements Reference
const grid = document.getElementById('workflows-grid');
const emptyState = document.getElementById('empty-state');
const workflowCount = document.getElementById('workflow-count');
const statActiveCount = document.getElementById('stat-active-count');
const statExecutions = document.getElementById('stat-executions');

// Filter Inputs
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const statusFilter = document.getElementById('status-filter');
const sortFilter = document.getElementById('sort-filter');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('modal-close');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnEmptyCreate = document.getElementById('btn-empty-create');
const btnRefresh = document.getElementById('btn-refresh');
const workflowForm = document.getElementById('workflow-form');

// Category labels map
const categoryNames = {
    automation: 'Automação',
    content: 'Conteúdo',
    data: 'Análise Dados',
    agent: 'Agente IA'
};

// Render Workflows
function renderWorkflows() {
    const searchVal = searchInput.value.trim().toLowerCase();
    const catVal = categoryFilter.value;
    const statVal = statusFilter.value;
    const sortVal = sortFilter.value;

    let filtered = workflows.filter(wf => {
        const matchesSearch = wf.title.toLowerCase().includes(searchVal) ||
                              wf.description.toLowerCase().includes(searchVal) ||
                              wf.model.toLowerCase().includes(searchVal);
        const matchesCat = catVal === 'all' || wf.category === catVal;
        const matchesStatus = statVal === 'all' || wf.status === statVal;

        return matchesSearch && matchesCat && matchesStatus;
    });

    // Sort logic
    if (sortVal === 'newest') {
        filtered.reverse();
    } else if (sortVal === 'name') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Update Counts & Stats
    workflowCount.textContent = filtered.length;
    updateStats();

    if (filtered.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map(wf => `
        <article class="workflow-card status-${wf.status}">
            <div>
                <div class="wf-top">
                    <span class="wf-category-badge">${categoryNames[wf.category] || wf.category}</span>
                    <span class="wf-status-badge ${wf.status}">
                        ${wf.status === 'active' ? '● Ativo' : wf.status === 'paused' ? '⏸ Pausado' : '⚠️ Erro'}
                    </span>
                </div>
                <h3 class="wf-title">${escapeHtml(wf.title)}</h3>
                <p class="wf-desc">${escapeHtml(wf.description)}</p>
            </div>

            <div>
                <div class="wf-meta">
                    <div class="wf-meta-item">🧠 ${escapeHtml(wf.model)}</div>
                    <div class="wf-meta-item">⚡ ${escapeHtml(wf.trigger)}</div>
                </div>

                <div class="wf-actions">
                    <button class="btn-icon-action" onclick="toggleStatus('${wf.id}')" title="Alternar Ativo/Pausado">
                        ${wf.status === 'active' ? '⏸' : '▶'}
                    </button>
                    <button class="btn-icon-action" onclick="runWorkflow('${wf.id}')" title="Executar Agora">
                        🚀
                    </button>
                    <button class="btn-icon-action danger" onclick="deleteWorkflow('${wf.id}')" title="Excluir Workflow">
                        🗑️
                    </button>
                </div>
            </div>
        </article>
    `).join('');
}

// Helper: Escape HTML to avoid XSS
function escapeHtml(str) {
    return str.replace(/[&< beauty>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

// Update Stats Dashboard
function updateStats() {
    const activeCount = workflows.filter(w => w.status === 'active').length;
    statActiveCount.textContent = activeCount;

    const totalRuns = workflows.reduce((acc, curr) => acc + (curr.runs || 0), 0);
    statExecutions.textContent = totalRuns.toLocaleString('pt-BR');
}

// Actions Logic
window.toggleStatus = function(id) {
    const wf = workflows.find(item => item.id === id);
    if (wf) {
        wf.status = wf.status === 'active' ? 'paused' : 'active';
        renderWorkflows();
        showToast(`Workflow "${wf.title}" agora está ${wf.status === 'active' ? 'Ativo' : 'Pausado'}.`, 'info');
    }
};

window.runWorkflow = function(id) {
    const wf = workflows.find(item => item.id === id);
    if (wf) {
        wf.runs += 1;
        wf.lastRun = 'Agora mesmo';
        renderWorkflows();
        showToast(`Workflow "${wf.title}" executado com sucesso!`, 'success');
    }
};

window.deleteWorkflow = function(id) {
    const wfIndex = workflows.findIndex(item => item.id === id);
    if (wfIndex !== -1) {
        const title = workflows[wfIndex].title;
        workflows.splice(wfIndex, 1);
        renderWorkflows();
        showToast(`Workflow "${title}" removido.`, 'warning');
    }
};

// Modal Handlers
function openModal() {
    modalOverlay.classList.remove('hidden');
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    workflowForm.reset();
}

// Form Submission
workflowForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('wf-title').value.trim();
    const category = document.getElementById('wf-category').value;
    const model = document.getElementById('wf-model').value;
    const trigger = document.getElementById('wf-trigger').value;
    const status = document.getElementById('wf-status').value;
    const description = document.getElementById('wf-description').value.trim();

    if (!title || !category) {
        showToast('Por favor, preencha os campos obrigatórios.', 'warning');
        return;
    }

    const newWf = {
        id: 'wf-' + Date.now(),
        title,
        category,
        model,
        trigger,
        status,
        description: description || 'Sem descrição cadastrada.',
        runs: 0,
        lastRun: 'Ainda não executado'
    };

    workflows.unshift(newWf);
    closeModal();
    renderWorkflows();
    showToast(`Workflow "${title}" criado com sucesso!`, 'success');
});

// Toast System
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Event Listeners
btnOpenModal.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);
if (btnEmptyCreate) btnEmptyCreate.addEventListener('click', openModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        closeModal();
    }
});

btnRefresh.addEventListener('click', () => {
    renderWorkflows();
    showToast('Dados sincronizados com o agente.', 'success');
});

// Filter Listeners
searchInput.addEventListener('input', renderWorkflows);
categoryFilter.addEventListener('change', renderWorkflows);
statusFilter.addEventListener('change', renderWorkflows);
sortFilter.addEventListener('change', renderWorkflows);

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    renderWorkflows();
});
