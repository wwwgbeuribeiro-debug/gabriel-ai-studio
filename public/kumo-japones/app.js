// Menu mobile toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav ul');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('show');
});

// Formulário de contato (placeholder)
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Mensagem enviada!');
        contactForm.reset();
    });
}