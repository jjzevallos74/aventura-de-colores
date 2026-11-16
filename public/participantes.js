// Lista de participantes: negro = aún no conoce a su elegido; gris = ya lo conoce.
// Solo muestra nombres. Nunca quién le regala a quién.
(function () {
  window.listaParticipantes = function (contenedor) {
    contenedor.textContent = '';
    const titulo = document.createElement('h2'); titulo.textContent = '👥 Participantes';
    const leyenda = document.createElement('div'); leyenda.className = 'leyenda';
    const ul = document.createElement('ul'); ul.className = 'lista-part';
    const resumen = document.createElement('p'); resumen.className = 'ayuda izq';
    contenedor.append(titulo, resumen, leyenda, ul);

    async function cargar() {
      try {
        const j = await (await fetch('/api/participantes')).json();
        const ps = j.participantes || [];
        ul.textContent = '';
        const listos = ps.filter((p) => p.conoce).length;
        if (!j.sorteoRealizado) {
          resumen.textContent = `${ps.length} inscritos. El sorteo todavía no está abierto.`;
          leyenda.textContent = '';
        } else {
          resumen.textContent = `${listos} de ${ps.length} ya sacaron su nombre.`;
          leyenda.innerHTML = '<span class="ley negro">● Todavía no saca su nombre</span><span class="ley gris">● Ya sacó su nombre</span>';
        }
        if (!ps.length) { const li = document.createElement('li'); li.className = 'vacio'; li.textContent = 'Todavía no hay nadie inscrito.'; ul.appendChild(li); }
        for (const p of ps) {
          const li = document.createElement('li');
          li.className = p.conoce ? 'gris' : 'negro';
          const n = document.createElement('span'); n.className = 'np'; n.textContent = p.nombre;
          const e = document.createElement('span'); e.className = 'ep';
          e.textContent = !j.sorteoRealizado ? 'Inscrito' : p.conoce ? '✓ Ya sacó su nombre' : 'Todavía no saca su nombre';
          li.append(n, e);
          ul.appendChild(li);
        }
      } catch { resumen.textContent = 'No se pudo cargar la lista.'; }
    }
    cargar();
    setInterval(() => { if (!document.hidden) cargar(); }, 20000);
    return { recargar: cargar };
  };
})();
