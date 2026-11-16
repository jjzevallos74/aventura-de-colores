// Lista de deseos con 4 cuadrados. Tienda: Ripley Perú (soles).
(function () {
  // Búsquedas por género: h = masculino, m = femenino
  const CATEGORIAS = [
    { emoji: '🎧', nombre: 'Tecnología', ripley: { h: 'audifonos', m: 'audifonos' } },
    { emoji: '☕', nombre: 'Hogar y termos', ripley: { h: 'termo', m: 'termo' } },
    { emoji: '🌸', nombre: 'Perfumes', ripley: { h: 'perfume hombre', m: 'perfume mujer' } },
    { emoji: '👜', nombre: 'Billeteras y accesorios', ripley: { h: 'billetera hombre', m: 'cartera mujer' } },
  ];
  const consulta = (c, tienda, genero) => c[tienda][genero === 'm' ? 'm' : 'h'];
  const tiendaPorPais = () => 'ripley';
  const NOMBRE_TIENDA = { ripley: 'Ripley' };

  // ---------- Enlaces con el rango de precio ----------
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
  const urlTienda = (tienda, busqueda, r) => urlRipley(busqueda, r);
  function textoRango(tienda, r) {
    if (!r || !(r.minPEN || r.maxPEN)) return '';
    if (r.minPEN && r.minPEN === r.maxPEN) return `S/ ${r.minPEN}`;
    return r.minPEN && r.maxPEN ? `S/ ${r.minPEN} – S/ ${r.maxPEN}` : `hasta S/ ${r.maxPEN || r.minPEN}`;
  }

  // Nombre del producto desde el enlace
  function nombreDesdeLink(link) {
    try {
      const u = new URL(link);
      if (!/ripley\.com\.pe$/i.test(u.hostname)) return '';
      const slug = u.pathname.split('/').filter(Boolean).pop() || '';
      if (!/-(pmp\d+|\d{8,}p?)$/i.test(slug)) return '';
      let n = decodeURIComponent(slug).replace(/-(pmp\d+|\d{8,}p?)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      n = n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      return n.slice(0, 60);
    } catch { return ''; }
  }

  // De un texto pegado o compartido ("Mira esto en Ripley: Nombre https://simple.ripley.com.pe/...") saca el enlace y un posible nombre
  function separarCompartido(texto) {
    const s = String(texto || '');
    const m = s.match(/https?:\/\/[^\s"'<>]+/i);
    if (!m) return { link: '', titulo: '' };
    const titulo = s.replace(m[0], ' ')
      .replace(/(mira (este|esta|esto)[^:!]*[:!]?|echa un vistazo[^:!]*[:!]?|en ripley[^:!]*[:!]?|ripley per[uú])/gi, ' ')
      .replace(/[“”"]/g, '').replace(/\s+/g, ' ').replace(/^[\s:!,.\-|]+|[\s:!,.\-|]+$/g, '').trim();
    return { link: m[0].replace(/[).,]+$/, ''), titulo: titulo.length >= 4 ? titulo.slice(0, 60) : '' };
  }
  window.separarCompartido = separarCompartido;
  const esDeTienda = (l) => /^https:\/\/([\w-]+\.)*ripley\.com\.pe\//i.test(l);
  async function infoEnlace(link) {
    const r = await fetch('/api/info-enlace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ link }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No pude leer ese enlace.');
    return j;
  }

  // Palabras clave para buscar el equivalente en la otra tienda
  const claves = (texto) => texto.split(/\s+/).filter((w) => w.length > 1).slice(0, 6).join(' ');

  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function boton(texto, href, clase) {
    const a = el('a', 'boton peq ' + clase, texto);
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  // ---------- "¿Qué te gustaría recibir?": 4 cuadrados ----------
  // opciones: { pais, rango }   -> devuelve un objeto con leer() y pais(nuevoPais)
  window.cuadrosDeseos = function (contenedor, iniciales, opciones) {
    const o = { ...opciones };
    const slots = [null, null, null, null];
    (iniciales || []).forEach((d, n) => { const s = Number.isInteger(d.slot) ? d.slot : n; if (s < 4) slots[s] = { texto: d.texto || '', link: d.link || '' }; });
    let activo = -1;

    contenedor.textContent = '';
    const nota = el('p', 'ayuda izq');
    const grid = el('div', 'cuadros');
    const editor = el('div', 'editor-deseo oculto');
    contenedor.append(nota, grid, editor);

    function pintar() {
      const tienda = tiendaPorPais(o.pais);
      const rango = textoRango(tienda, o.rango);
      nota.textContent = `Toca un cuadrado: se abre ${NOMBRE_TIENDA[tienda]} con ideas${rango ? ' de ' + rango : ''}. Elige un regalo, toca Compartir → Copiar enlace y vuelve aquí a pegarlo.`;
      grid.textContent = '';
      CATEGORIAS.forEach((c, i) => {
        const b = el('button', 'cuadro' + (slots[i] ? ' lleno' : '') + (activo === i ? ' activo' : ''));
        b.type = 'button';
        b.append(el('span', 'cuadro-emoji', slots[i] ? '✅' : c.emoji), el('span', 'cuadro-cat', c.nombre),
          el('span', 'cuadro-estado', slots[i] ? slots[i].texto : `Ver ideas en ${NOMBRE_TIENDA[tienda]}`));
        b.addEventListener('click', () => abrir(i, !slots[i]));
        grid.appendChild(b);
      });
    }

    function abrir(i, irATienda, recibido) {
      const tienda = tiendaPorPais(o.pais);
      const c = CATEGORIAS[i];
      const url = urlTienda(tienda, consulta(c, tienda, o.genero), o.rango);
      if (irATienda) window.open(url, '_blank', 'noopener');
      activo = i;
      const d = recibido || slots[i] || { texto: '', link: '' };
      editor.textContent = '';
      editor.classList.remove('oculto');
      editor.appendChild(el('div', 'editor-t', `${c.emoji} ${c.nombre}`));
      const lblL = el('label', null, `Enlace del regalo que elegiste en ${NOMBRE_TIENDA[tienda]}`);
      const pegar = el('button', 'sec ancho-total', '📋 Pegar el enlace copiado'); pegar.type = 'button';
      const como = el('p', 'ayuda izq', `En ${NOMBRE_TIENDA[tienda]}, abre el regalo y toca Compartir → Copiar enlace. Luego vuelve aquí y toca este botón: el nombre se llena solo.`);
      const estado = el('small', 'ayuda izq');
      const link = el('input'); link.type = 'url'; link.inputMode = 'url'; link.placeholder = 'https://simple.ripley.com.pe/…'; link.value = d.link;
      const lblN = el('label', null, 'Nombre del regalo');
      const nombre = el('input'); nombre.maxLength = 60; nombre.placeholder = 'Se llena solo con el enlace, o escríbelo'; nombre.value = d.texto;
      const fila = el('div', 'fila2');
      const ok = el('button', 'sec', 'Guardar opción'); ok.type = 'button';
      const ver = boton('', url, 'fant');
      const ponerNombre = (n) => { if (n && (!nombre.value || nombre.dataset.auto)) { nombre.value = n; nombre.dataset.auto = '1'; } };
      // "Ver": abre el regalo elegido; si aún no hay, abre las ideas de la tienda
      const pintarVer = () => {
        const l = link.value.trim();
        if (esDeTienda(l)) { ver.href = l; ver.textContent = '🛍️ Ver mi regalo'; }
        else { ver.href = url; ver.textContent = `🛍️ Ver ideas en ${NOMBRE_TIENDA[tienda]}`; }
      };
      let ultimo = '';
      async function procesar(texto) {
        const { link: l, titulo } = separarCompartido(texto);
        if (!l) { pintarVer(); return; }
        link.value = l; ponerNombre(nombreDesdeLink(l) || titulo); pintarVer();
        if (!esDeTienda(l) || l === ultimo) return;
        ultimo = l;
        estado.textContent = '⏳ Buscando el nombre del regalo…';
        try {
          const j = await infoEnlace(l);
          if (link.value.trim() !== l) return;
          link.value = j.link; ultimo = j.link; pintarVer();
          if (j.nombre) { ponerNombre(j.nombre); estado.textContent = '✅ Listo. Revisa el nombre y toca "Guardar opción".'; }
          else estado.textContent = nombre.value ? '' : 'No pude leer el nombre: escríbelo tú (ej. "Perfume Versace Eros").';
        } catch (e) { estado.textContent = e.message; }
      }
      link.addEventListener('paste', () => setTimeout(() => procesar(link.value), 0));
      link.addEventListener('change', () => procesar(link.value));
      link.addEventListener('input', () => { ponerNombre(nombreDesdeLink(link.value.trim())); pintarVer(); });
      nombre.addEventListener('input', () => { delete nombre.dataset.auto; });
      pegar.addEventListener('click', async () => {
        try {
          const t = await navigator.clipboard.readText();
          if (!/https?:\/\//i.test(t)) { estado.textContent = 'No hay un enlace copiado. En la tienda toca Compartir → Copiar enlace.'; return; }
          procesar(t);
        } catch { estado.textContent = 'Tu celular no dejó pegar automáticamente: mantén presionado el cuadro del enlace y elige "Pegar".'; link.focus(); }
      });
      pintarVer();
      if (recibido && recibido.link) { nombre.dataset.auto = recibido.texto ? '1' : ''; procesar(`${recibido.texto || ''} ${recibido.link}`); }
      fila.append(ver, ok);
      const quitar = el('button', 'fant peq', 'Quitar esta opción'); quitar.type = 'button';
      quitar.style.marginTop = '10px';
      const aviso = el('div', 'msg error oculto');
      ok.addEventListener('click', () => {
        const l = link.value.trim(), t = nombre.value.trim();
        if (!l && !t) { aviso.textContent = 'Pega el enlace o escribe el nombre del regalo.'; aviso.classList.remove('oculto'); return; }
        if (l && !esDeTienda(l)) { aviso.textContent = 'El enlace debe ser de Ripley (simple.ripley.com.pe).'; aviso.classList.remove('oculto'); return; }
        if (l && !t) { aviso.textContent = 'Este enlace no trae el nombre: escríbelo (ej. "Audífonos Sony").'; aviso.classList.remove('oculto'); nombre.focus(); return; }
        slots[i] = { texto: t, link: l };
        cerrar();
        if (o.alCambiar) o.alCambiar();
      });
      quitar.addEventListener('click', () => { slots[i] = null; cerrar(); if (o.alCambiar) o.alCambiar(); });
      editor.append(lblL, pegar, como, link, estado, lblN, nombre, fila);
      if (slots[i]) editor.appendChild(quitar);
      editor.appendChild(aviso);
      pintar();
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function cerrar() { activo = -1; editor.classList.add('oculto'); editor.textContent = ''; pintar(); }

    pintar();
    return {
      leer: () => slots.map((d, slot) => (d ? { slot, texto: d.texto, link: d.link } : null)).filter(Boolean),
      pais: (p) => { o.pais = p; cerrar(); },
      // Regalo compartido desde la app de Ripley: elige en qué cuadrado ponerlo
      recibir: (texto, titulo) => {
        const { link: l, titulo: t } = separarCompartido(texto);
        if (!l) return false;
        const d = { link: l, texto: (titulo && titulo.length > 3 && !/^https?:/i.test(titulo) ? titulo : t).slice(0, 60) };
        activo = -1; pintar();
        editor.textContent = ''; editor.classList.remove('oculto');
        editor.appendChild(el('div', 'editor-t', '🎁 ¿En qué cuadrado pones este regalo?'));
        if (d.texto) editor.appendChild(el('p', 'ayuda izq', d.texto));
        const g = el('div', 'cuadros');
        CATEGORIAS.forEach((c, i) => {
          const b = el('button', 'cuadro'); b.type = 'button';
          b.append(el('span', 'cuadro-emoji', c.emoji), el('span', 'cuadro-cat', c.nombre), el('span', 'cuadro-estado', slots[i] ? 'Reemplaza: ' + slots[i].texto : 'Vacío'));
          b.addEventListener('click', () => abrir(i, false, d));
          g.appendChild(b);
        });
        editor.appendChild(g);
        setTimeout(() => editor.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        return true;
      },
      rango: (r) => { o.rango = r; pintar(); },
      genero: (g) => { o.genero = g; },
    };
  };

  // ---------- Lo que ve quien regala ----------
  // opciones: { pais (de quien regala), rango }
  window.mostrarDeseos = function (contenedor, deseos, opciones) {
    const o = opciones || {};
    contenedor.textContent = '';
    if (!deseos || !deseos.length) return false;
    const mia = tiendaPorPais(o.pais);
    const rango = textoRango(mia, o.rango);
    contenedor.appendChild(el('p', 'ayuda izq', `Tú compras en ${NOMBRE_TIENDA[mia]}${rango ? ' (' + rango + ')' : ''}.`));
    deseos.forEach((d) => {
      const c = CATEGORIAS[d.slot] || {};
      const item = el('div', 'deseo-item');
      item.appendChild(el('div', 'deseo-cat', `${c.emoji || '🎁'} ${c.nombre || 'Regalo'}`));
      item.appendChild(el('div', 'deseo-titulo', d.texto));
      const fila = el('div', 'fila-tiendas');
      const tiendaDeseo = 'ripley';
      if (d.link) fila.appendChild(boton(`🔗 Ver lo que eligió en ${NOMBRE_TIENDA[tiendaDeseo]}`, d.link, tiendaDeseo === mia ? 'sec ancho-total' : 'fant ancho-total'));
      if (d.link && tiendaDeseo !== mia) {
        fila.appendChild(boton(`🔍 Buscar el equivalente en ${NOMBRE_TIENDA[mia]}`, urlTienda(mia, claves(d.texto), o.rango), 'sec ancho-total'));
      } else if (!d.link) {
        fila.appendChild(boton(`🔍 Buscar en ${NOMBRE_TIENDA[mia]}`, urlTienda(mia, claves(d.texto), o.rango), 'sec ancho-total'));
      }
      item.appendChild(fila);
      contenedor.appendChild(item);
    });
    return true;
  };

  // ---------- Ideas generales (si alguien no dejó lista) ----------
  window.mostrarIdeas = function (contenedor, opciones) {
    const o = opciones || {};
    const mia = tiendaPorPais(o.pais);
    contenedor.textContent = '';
    const rango = textoRango(mia, o.rango);
    contenedor.appendChild(el('p', 'ayuda izq', `Ideas en ${NOMBRE_TIENDA[mia]}${rango ? ' (' + rango + ')' : ''}:`));
    const grid = el('div', 'cuadros');
    CATEGORIAS.forEach((c) => {
      const a = el('a', 'cuadro');
      a.href = urlTienda(mia, consulta(c, mia, o.genero), o.rango); a.target = '_blank'; a.rel = 'noopener';
      a.append(el('span', 'cuadro-emoji', c.emoji), el('span', 'cuadro-cat', c.nombre), el('span', 'cuadro-estado', 'Ver ideas'));
      grid.appendChild(a);
    });
    contenedor.appendChild(grid);
  };
})();
