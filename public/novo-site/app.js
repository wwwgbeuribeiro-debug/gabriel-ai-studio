const hamburger=document.getElementById('hamburger');
const nav=document.getElementById('nav');
hamburger.addEventListener('click',()=>{nav.classList.toggle('show');});

document.getElementById('contactForm').addEventListener('submit',function(e){
  e.preventDefault();
  alert('Mensagem enviada com sucesso!');
  this.reset();
});