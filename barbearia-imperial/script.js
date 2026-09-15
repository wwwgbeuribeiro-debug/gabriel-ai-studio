document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav');

    menuToggle.addEventListener('click', () => {
        const isOpen = nav.style.display === 'flex';
        nav.style.display = isOpen ? 'none' : 'flex';
    });
});