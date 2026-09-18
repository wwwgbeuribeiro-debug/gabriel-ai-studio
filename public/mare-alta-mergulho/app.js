document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const toggleBtn = document.getElementById('toggle-gallery');
    toggleBtn.addEventListener('click', () => {
        gallery.style.display = gallery.style.display === 'none' ? 'flex' : 'none';
    });

    const form = document.getElementById('contact-form');
    const feedback = document.getElementById('form-feedback');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const mensagem = document.getElementById('mensagem').value.trim();
        if (!nome || !email || !mensagem) {
            feedback.textContent = 'Por favor, preencha todos os campos.';
            feedback.style.color = 'red';
            return;
        }
        feedback.textContent = 'Mensagem enviada com sucesso!';
        feedback.style.color = 'green';
        form.reset();
    });

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});