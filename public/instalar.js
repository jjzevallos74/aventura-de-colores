// Botón "Instalar la app" (Android/Chrome) o instrucciones (iPhone).
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const caja = document.getElementById('instalar');
  if (!caja) return;
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (instalada) return;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  let evento = null;
  const t = document.createElement('div'); t.className = 'inst-t'; t.textContent = '📱 Instala la app en tu celular';
  const p = document.createElement('p'); p.className = 'ayuda izq';
  const b = document.createElement('button'); b.className = 'sec'; b.textContent = 'Instalar'; b.style.display = 'none';
  caja.append(t, p, b);
  if (ios) { p.textContent = 'En Safari toca el botón Compartir (⬆️) y luego “Agregar a pantalla de inicio”.'; caja.classList.remove('oculto'); }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); evento = e;
    p.textContent = 'Tenla a un toque, con su propio ícono, sin pasar por la tienda de apps.';
    b.style.display = ''; caja.classList.remove('oculto');
  });
  b.addEventListener('click', async () => { if (!evento) return; evento.prompt(); await evento.userChoice; evento = null; caja.classList.add('oculto'); });
})();
