// Buscador de regalos: ¿hombre o mujer? -> ¿qué edad? -> ideas con enlace a Ripley Perú, dentro del monto del intercambio.
(function () {
  // g: h = hombre, m = mujer, x = cualquiera · e: grupos de edad
  // edades: n (12 y menos), t (12-18), j (18-25), a (25-35), b (35-50), c (50+)
  const TODAS = ['n', 't', 'j', 'a', 'b', 'c'];
  const ADULTOS = ['j', 'a', 'b', 'c'];
  const CATALOGO = [
    // Hombre
    { e: '👛', n: 'Billetera de cuero', g: 'h', ed: ['t', ...ADULTOS], amz: 'leather wallet men', fal: 'billetera hombre' },
    { e: '🔋', n: 'Batería portátil para celular', g: 'x', ed: ['t', ...ADULTOS], amz: 'portable power bank', fal: 'bateria portatil' },
    { e: '🚗', n: 'Compresor de aire para llantas', g: 'h', ed: ['a', 'b', 'c'], amz: 'portable tire inflator', fal: 'compresor de aire auto' },
    { e: '🧢', n: 'Gorra', g: 'h', ed: ['t', ...ADULTOS], amz: 'baseball cap men', fal: 'gorra hombre' },
    { e: '⏰', n: 'Reloj despertador digital', g: 'x', ed: ['t', ...ADULTOS], amz: 'digital alarm clock wood', fal: 'reloj despertador' },
    { e: '🧦', n: 'Medias divertidas', g: 'x', ed: TODAS, amz: 'funny socks gift', fal: 'medias divertidas' },
    { e: '🧰', n: 'Juego de herramientas', g: 'h', ed: ['a', 'b', 'c'], amz: 'home tool kit', fal: 'set de herramientas' },
    { e: '🪒', n: 'Kit para barba', g: 'h', ed: ['j', 'a', 'b', 'c'], amz: 'beard grooming kit', fal: 'kit barba' },
    { e: '🔦', n: 'Linterna recargable', g: 'h', ed: ['a', 'b', 'c'], amz: 'rechargeable flashlight', fal: 'linterna recargable' },
    { e: '🥩', n: 'Set de parrilla', g: 'h', ed: ['a', 'b', 'c'], amz: 'bbq grill tool set', fal: 'set parrilla' },
    { e: '🎽', n: 'Camiseta deportiva', g: 'h', ed: ['t', 'j', 'a', 'b'], amz: 'athletic shirt men', fal: 'polo deportivo hombre' },
    { e: '🧴', n: 'Colonia o perfume para hombre', g: 'h', ed: ['t', ...ADULTOS], amz: 'cologne for men', fal: 'perfume hombre' },
    // Mujer
    { e: '🌸', n: 'Perfume', g: 'm', ed: ['t', ...ADULTOS], amz: 'perfume for women', fal: 'perfume mujer' },
    { e: '🧖', n: 'Set de cuidado de la piel', g: 'm', ed: ['t', ...ADULTOS], amz: 'skincare gift set', fal: 'set cuidado facial' },
    { e: '🧣', n: 'Bufanda', g: 'm', ed: ADULTOS, amz: 'scarf women', fal: 'bufanda mujer' },
    { e: '💍', n: 'Aretes o collar', g: 'm', ed: ['t', ...ADULTOS], amz: 'earrings necklace set women', fal: 'aretes mujer' },
    { e: '👜', n: 'Bolso pequeño', g: 'm', ed: ['t', ...ADULTOS], amz: 'crossbody bag women', fal: 'cartera mujer' },
    { e: '🕯️', n: 'Velas aromáticas', g: 'm', ed: ADULTOS, amz: 'scented candles gift set', fal: 'velas aromaticas' },
    { e: '💄', n: 'Set de maquillaje', g: 'm', ed: ['t', 'j', 'a', 'b'], amz: 'makeup gift set', fal: 'set maquillaje' },
    { e: '🛌', n: 'Pijama', g: 'm', ed: TODAS, amz: 'pajama set women', fal: 'pijama mujer' },
    { e: '📒', n: 'Agenda o planner', g: 'm', ed: ['t', 'j', 'a', 'b'], amz: 'planner 2027', fal: 'agenda 2027' },
    { e: '🌿', n: 'Difusor de aromas', g: 'm', ed: ADULTOS, amz: 'essential oil diffuser', fal: 'difusor de aromas' },
    { e: '💅', n: 'Set de manicure', g: 'm', ed: ['t', ...ADULTOS], amz: 'manicure set', fal: 'set manicure' },
    // Para cualquiera
    { e: '🎧', n: 'Audífonos inalámbricos', g: 'x', ed: ['t', ...ADULTOS], amz: 'wireless earbuds', fal: 'audifonos inalambricos' },
    { e: '🔊', n: 'Parlante Bluetooth', g: 'x', ed: ['t', ...ADULTOS], amz: 'bluetooth speaker', fal: 'parlante bluetooth' },
    { e: '☕', n: 'Termo de acero', g: 'x', ed: ['t', ...ADULTOS], amz: 'insulated tumbler', fal: 'termo' },
    { e: '🍫', n: 'Caja de chocolates', g: 'x', ed: TODAS, amz: 'chocolate gift box', fal: 'chocolates regalo' },
    { e: '🎲', n: 'Juego de mesa', g: 'x', ed: TODAS, amz: 'family board game', fal: 'juego de mesa' },
    { e: '🧩', n: 'Rompecabezas', g: 'x', ed: TODAS, amz: '1000 piece puzzle', fal: 'rompecabezas' },
    { e: '📚', n: 'Libro', g: 'x', ed: TODAS, amz: 'bestseller books', fal: 'libro' },
    { e: '🪴', n: 'Planta en maceta', g: 'x', ed: ADULTOS, amz: 'indoor plant pot', fal: 'macetero' },
    { e: '💡', n: 'Lámpara LED', g: 'x', ed: ['n', 't', 'j', 'a'], amz: 'led desk lamp', fal: 'lampara led' },
    { e: '🔌', n: 'Cargador inalámbrico', g: 'x', ed: ['t', ...ADULTOS], amz: 'wireless charger', fal: 'cargador inalambrico' },
    { e: '🧸', n: 'Manta suave', g: 'x', ed: TODAS, amz: 'sherpa throw blanket', fal: 'manta polar' },
    { e: '🥤', n: 'Botella de agua', g: 'x', ed: TODAS, amz: 'water bottle', fal: 'botella de agua' },
    { e: '🫘', n: 'Kit de café', g: 'x', ed: ADULTOS, amz: 'coffee gift set', fal: 'cafetera' },
    { e: '✈️', n: 'Almohada de viaje', g: 'x', ed: ['j', 'a', 'b', 'c'], amz: 'travel pillow', fal: 'almohada de viaje' },
    { e: '🎁', n: 'Tarjeta de regalo', g: 'x', ed: ['t', ...ADULTOS], amz: 'gift card', fal: 'gift card' },
    // Niños y adolescentes
    { e: '🧱', n: 'Bloques para armar', g: 'x', ed: ['n'], amz: 'building blocks kids', fal: 'bloques armar' },
    { e: '🐻', n: 'Peluche', g: 'x', ed: ['n'], amz: 'plush toy', fal: 'peluche' },
    { e: '🎨', n: 'Kit de arte', g: 'x', ed: ['n', 't'], amz: 'art kit kids', fal: 'set de arte' },
    { e: '🏎️', n: 'Carro a control remoto', g: 'x', ed: ['n', 't'], amz: 'remote control car', fal: 'carro control remoto' },
    { e: '⚽', n: 'Pelota', g: 'x', ed: ['n', 't'], amz: 'soccer ball', fal: 'pelota de futbol' },
    { e: '🎒', n: 'Mochila', g: 'x', ed: ['n', 't', 'j'], amz: 'backpack', fal: 'mochila' },
    { e: '🌈', n: 'Luces LED para el cuarto', g: 'x', ed: ['t', 'j'], amz: 'led strip lights bedroom', fal: 'luces led' },
    { e: '📱', n: 'Accesorios para celular', g: 'x', ed: ['t', 'j'], amz: 'phone accessories', fal: 'accesorios celular' },
  ];
  const GENEROS = [{ v: 'm', t: 'Mujer' }, { v: 'h', t: 'Hombre' }, { v: 'x', t: 'Ninguna de las anteriores' }];
  const EDADES = [
    { v: 'n', t: '12 años o menos' }, { v: 't', t: '12 a 18 años' }, { v: 'j', t: '18 a 25 años' },
    { v: 'a', t: '25 a 35 años' }, { v: 'b', t: '35 a 50 años' }, { v: 'c', t: '50 años o más' },
  ];
  const ETQ_GEN = { m: 'Mujer', h: 'Hombre', x: 'Cualquiera' };
  const ETQ_EDAD = { n: '12 o menos', t: '12–18', j: '18–25', a: '25–35', b: '35–50', c: '50+' };

  // Enlaces con rango (mismo criterio que ideas.js)
  // Ripley acepta un rango de precio libre (minPrice / maxPrice). Monto fijo (ej. S/ 50): busca de S/ 40 a S/ 60.
  function urlRipley(busqueda, r) {
    let u = 'https://simple.ripley.com.pe/search/' + encodeURIComponent(busqueda);
    if (r && (r.minPEN || r.maxPEN)) {
      const fijo = r.minPEN && r.minPEN === r.maxPEN;
      const min = fijo ? Math.max(1, r.minPEN - 10) : r.minPEN || 0;
      const max = fijo ? r.maxPEN + 10 : r.maxPEN || '';
      u += `?minPrice=${min}&maxPrice=${max}&page=1`;
    }
    return u;
  }

  function el(tag, clase, texto) { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; }

  // Hoja inferior reutilizable
  function hoja(titulo) {
    const fondo = el('div', 'hoja-fondo');
    const h = el('div', 'hoja');
    const cab = el('div', 'hoja-cab');
    const t = el('h2', null, titulo);
    const x = el('button', 'hoja-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
    cab.append(t, x);
    const cuerpo = el('div', 'hoja-cuerpo');
    const pie = el('div', 'hoja-pie');
    h.append(cab, cuerpo, pie);
    fondo.appendChild(h);
    document.body.appendChild(fondo);
    document.body.classList.add('sin-scroll');
    const cerrar = () => { fondo.remove(); document.body.classList.remove('sin-scroll'); };
    x.onclick = cerrar;
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
    return { cuerpo, pie, cerrar, titulo: t };
  }
  window.hojaInferior = hoja;

  // opciones: { nombre, pais (de quien compra), rango }
  window.buscadorRegalos = function (opciones) {
    const o = opciones || {};
    const nombreTienda = 'Ripley';
    const quien = o.nombre || 'tu amigo secreto';
    const H = hoja(`Buscador de regalos para ${quien}`);
    const estado = { genero: o.genero === 'h' || o.genero === 'm' ? o.genero : null, edad: null, texto: '' };

    function opcionesPaso(pregunta, lista, clave, alSeguir, atras) {
      H.cuerpo.textContent = ''; H.pie.textContent = '';
      H.cuerpo.appendChild(el('p', 'hoja-pregunta', pregunta));
      for (const op of lista) {
        const b = el('button', 'opcion' + (estado[clave] === op.v ? ' elegida' : ''), op.t); b.type = 'button';
        b.onclick = () => { estado[clave] = op.v; [...H.cuerpo.querySelectorAll('.opcion')].forEach((x) => x.classList.remove('elegida')); b.classList.add('elegida'); seguir.disabled = false; };
        H.cuerpo.appendChild(b);
      }
      if (atras) { const a = el('button', 'fant atras', '‹'); a.type = 'button'; a.setAttribute('aria-label', 'Atrás'); a.onclick = atras; H.pie.appendChild(a); }
      const seguir = el('button', 'sec', 'Continuar ›'); seguir.type = 'button'; seguir.disabled = !estado[clave];
      seguir.onclick = alSeguir;
      H.pie.appendChild(seguir);
      H.pie.classList.toggle('con-atras', !!atras);
    }
    const paso1 = () => opcionesPaso(`¿${quien} es…?`, GENEROS, 'genero', paso2);
    const paso2 = () => opcionesPaso(`¿Qué edad tiene ${quien}?`, EDADES, 'edad', resultados, paso1);
    if (estado.genero) { paso2(); return; } // ya sabemos si es hombre o mujer

    function resultados() {
      H.pie.textContent = ''; H.pie.classList.remove('con-atras');
      H.cuerpo.textContent = '';
      const busc = el('input', 'busca'); busc.placeholder = '🔍 Buscar en las ideas…'; busc.value = estado.texto;
      const chips = el('div', 'filtros');
      const nota = el('p', 'ayuda izq');
      const grid = el('div', 'grid-regalos');
      H.cuerpo.append(busc, chips, nota, grid);

      function pintar() {
        chips.textContent = '';
        const chip = (txt, quitar) => {
          const c = el('button', 'filtro', txt + (quitar ? '  ✕' : '')); c.type = 'button';
          if (quitar) c.onclick = () => { quitar(); pintar(); }; else c.disabled = true;
          chips.appendChild(c);
        };
        if (estado.genero && estado.genero !== 'x') chip(ETQ_GEN[estado.genero], () => { estado.genero = null; });
        if (estado.edad) chip(ETQ_EDAD[estado.edad] + ' años', () => { estado.edad = null; });
        const r = o.rango;
        if (r && r.minPEN) chip(r.minPEN === r.maxPEN ? `S/ ${r.minPEN}` : `S/ ${r.minPEN} – S/ ${r.maxPEN}`);
        const q = estado.texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const lista = CATALOGO.filter((i) =>
          (!estado.genero || estado.genero === 'x' || i.g === 'x' || i.g === estado.genero) &&
          (!estado.edad || i.ed.includes(estado.edad)) &&
          (!q || i.n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
        nota.textContent = `${lista.length} ideas. Cada una abre ${nombreTienda} con el presupuesto del intercambio; los precios los ves en la tienda.`;
        grid.textContent = '';
        for (const i of lista) {
          const a = el('a', 'tarjeta-regalo');
          a.href = urlRipley(i.fal, o.rango);
          a.target = '_blank'; a.rel = 'noopener';
          const img = el('div', 'regalo-img', i.e);
          const flecha = el('span', 'regalo-ir', '→');
          img.appendChild(flecha);
          a.append(img, el('div', 'regalo-n', i.n), el('div', 'regalo-t', 'Ver en ' + nombreTienda));
          grid.appendChild(a);
        }
        if (!lista.length) grid.appendChild(el('p', 'ayuda', 'No hay ideas con esos filtros. Quita alguno.'));
      }
      busc.addEventListener('input', () => { estado.texto = busc.value; pintar(); });
      pintar();
    }
    paso1();
  };
})();
