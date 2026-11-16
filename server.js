// Aventura de Colores · Intercambio de Regalos — servidor (solo Perú, soles, Ripley)
// Node 18+ · dependencia única: express
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- Configuración (.env opcional) ----------
(function cargarEnv() {
  const f = path.join(__dirname, '.env');
  if (!fs.existsSync(f)) return;
  for (const linea of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'datos.json');
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

// ---------- Género ('h' = masculino, 'm' = femenino) ----------
const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const FEMENINOS = new Set(('carmen raquel isabel pilar rocio beatriz ines mercedes dolores luz ruth ester esther abigail tiffany allison ingrid karen miriam noemi belen consuelo soledad rosario maribel marisol nicole michelle jennifer evelyn katherine kathleen elizabeth lizbeth yasmin jasmine sharon lourdes gladys doris edith judith liz iris flor mabel ivonne jackeline madeleine rachel kimberly ashley patty betty angy angie kelly mary emily lucy nancy sally wendy cindy mercy shirley lily milly nelly rosy susy tammy joy magaly maggie jessie karin carol caroline jacqueline marilyn evelin janet yolanda raquel fanny estefany stephanie melany melanie leslie lesly aracely araceli nathaly nataly naty dayana deysi daisy heidy yuli yuly sandy mily mili rubi ruby genesis sol abril').split(' '));
const MASCULINOS = new Set(('luca gianluca joshua nicola elias isaias jeremias matias tobias zacarias josue rafo tony danny johnny jhonny jimmy andy billy eddy freddy fredy henry gary harry rudy willy jerry larry jeffrey anthony juanjo bryan ryan jose jesus noe ali sasha misha kenny bobby charlie jackie').split(' '));
function generoPorNombre(nombre) {
  const n = sinAcentos(nombre).split(/\s+/)[0] || '';
  if (FEMENINOS.has(n)) return 'm';
  if (MASCULINOS.has(n)) return 'h';
  if (/a$/.test(n)) return 'm';
  if (/(y|ie|i|th|elle|ette)$/.test(n)) return 'm';
  return 'h';
}
const generoValido = (g) => (g === 'h' || g === 'm' ? g : null);

// Sorteo: 4 de diciembre de 2026, 9:00 a.m. hora de Lima (UTC-5)
const FECHA_SORTEO = '2026-12-04T14:00:00.000Z';

// ---------- Almacenamiento ----------
function estadoInicial() {
  return {
    ajustes: { titulo: 'Intercambio de Regalos', presupuesto: 'S/ 50', minPEN: 50, maxPEN: 50, fechaEntrega: '', fechaSorteo: FECHA_SORTEO, inscripcionAbierta: true },
    participantes: [],
    sorteo: { realizado: false, fecha: null, asignaciones: {}, envios: {} },
    exclusiones: [],
    mensajes: [],
  };
}
let db;
function cargar() {
  try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { db = estadoInicial(); guardar(); }
  const a = db.ajustes;
  if (a.fechaSorteo === undefined) a.fechaSorteo = FECHA_SORTEO;
  a.inscripcionAbierta = true; // las inscripciones nunca se cierran
  for (const p of db.participantes || []) if (!p.genero) { p.genero = generoPorNombre(p.nombre); p.generoAuto = true; }
  if (!db.exclusiones) db.exclusiones = [];
  if (!db.mensajes) db.mensajes = [];
  if (a.minPEN === undefined) { a.minPEN = 50; a.maxPEN = 50; }
}
function guardar() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
cargar();

// Monto del regalo en soles (fijo, ej. S/ 50, o un rango)
function rango() {
  const a = db.ajustes;
  return { minPEN: a.minPEN > 0 ? a.minPEN : null, maxPEN: a.maxPEN > 0 ? a.maxPEN : null };
}
function textoPresupuesto() {
  const r = rango();
  if (!r.minPEN && !r.maxPEN) return '';
  if (r.minPEN && r.minPEN === r.maxPEN) return `S/ ${r.minPEN}`;
  return r.minPEN && r.maxPEN ? `S/ ${r.minPEN} - S/ ${r.maxPEN}` : `hasta S/ ${r.maxPEN || r.minPEN}`;
}

// ---------- Utilidades ----------
const PAISES = {
  PE: { codigo: '+51', nombre: 'Perú' },
};

// Regla 3: solo celulares de Perú
function normalizarTelefono(pais, entrada) {
  let d = String(entrada || '').replace(/\D/g, '');
  if (pais === 'PE') {
    if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
    if (!/^9\d{8}$/.test(d)) return null; // celulares peruanos: 9 dígitos, empiezan con 9
    return '+51' + d;
  }
  return null;
}
function limpiarNombre(n) {
  return String(n || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}
const claveNombre = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function hashSecreto(secreto, sal = crypto.randomBytes(16).toString('hex')) {
  return { sal, hash: crypto.scryptSync(String(secreto), sal, 32).toString('hex') };
}
function verificaSecreto(secreto, sal, hash) {
  const a = Buffer.from(crypto.scryptSync(String(secreto), sal, 32).toString('hex'));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function urlBase(req) { return PUBLIC_URL || `${req.protocol}://${req.get('host')}`; }

// Limitador simple en memoria
const contadores = new Map();
function limitar(clave, max, ventanaMs) {
  const ahora = Date.now();
  const r = contadores.get(clave) || { n: 0, desde: ahora };
  if (ahora - r.desde > ventanaMs) { r.n = 0; r.desde = ahora; }
  r.n++; contadores.set(clave, r);
  return r.n <= max;
}

// Regla 7 y 9: sorteo como un solo ciclo aleatorio.
// Cada persona regala a la siguiente del ciclo: nadie se saca a sí mismo,
// nadie se repite (cada uno da una vez y recibe una vez).
// Con exclusiones: busca al azar un solo círculo donde nadie le regale a alguien excluido.
function sortear(ids, exclusiones = []) {
  const prohibido = new Set();
  for (const [a, b] of exclusiones) { prohibido.add(a + '>' + b); prohibido.add(b + '>' + a); }
  const puede = (a, b) => a !== b && !prohibido.has(a + '>' + b);
  const mezclar = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const n = ids.length;
  for (let intento = 0; intento < 50; intento++) {
    const orden = mezclar(ids.slice());
    const camino = [orden[0]];
    const usado = new Set(camino);
    let pasos = 0;
    const buscar = () => {
      if (++pasos > 20000) return false;
      if (camino.length === n) return puede(camino[n - 1], camino[0]);
      const ult = camino[camino.length - 1];
      for (const sig of mezclar(orden.filter((x) => !usado.has(x)))) {
        if (!puede(ult, sig)) continue;
        camino.push(sig); usado.add(sig);
        if (buscar()) return true;
        camino.pop(); usado.delete(sig);
      }
      return false;
    };
    if (buscar()) {
      const asign = {};
      camino.forEach((id, i) => { asign[id] = camino[(i + 1) % n]; });
      return asign;
    }
  }
  return null;
}

// ---------- App ----------
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use('/api', (req, res, next) => { revisarSorteoAutomatico(); next(); });
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
const ip = (req) => req.ip || 'x';

// Información pública (nunca incluye resultados)
app.get('/api/info', (req, res) => {
  const a = db.ajustes;
  res.json({
    titulo: a.titulo, presupuesto: textoPresupuesto(), rango: rango(), fechaEntrega: a.fechaEntrega,
    fechaSorteo: db.sorteo.realizado ? null : a.fechaSorteo || null,
    inscripcionAbierta: !!a.inscripcionAbierta,
    totalInscritos: db.participantes.length,
    sorteoRealizado: db.sorteo.realizado,
  });
});

function validarInscripcion(body) {
  const nombre = limpiarNombre(body.nombre);
  const pais = body.pais || 'PE';
  const telefono = normalizarTelefono(pais, body.telefono);
  const pin = String(body.pin || '');
  if (!db.ajustes.inscripcionAbierta) return { error: 'La inscripción está cerrada.' };
  if (nombre.length < 2) return { error: 'Escribe tu nombre (mínimo 2 letras).' };
  if (!PAISES[pais]) return { error: 'Solo se aceptan celulares de Perú (+51).' };
  if (!telefono) return { error: 'Número no válido: celular de Perú de 9 dígitos que empieza con 9.' };
  if (!/^\d{4}$/.test(pin)) return { error: 'Tu PIN debe tener 4 dígitos.' };
  // Un mismo número puede inscribir a varias personas (p. ej. un hijo o la pareja), con nombres distintos
  if (db.participantes.filter((p) => p.telefono === telefono).length >= 6) return { error: 'Ese número ya tiene 6 personas inscritas.' };
  if (db.participantes.some((p) => claveNombre(p.nombre) === claveNombre(nombre)))
    return { error: 'Ya hay alguien inscrito con ese nombre. Agrega tu apellido o inicial.' };
  const genero = generoValido(body.genero);
  if (!genero) return { error: 'Elige Masculino o Femenino.' };
  const d = validarDeseos(body.deseos);
  if (d.error) return d;
  return { nombre, pais, telefono, pin, genero, deseos: d.deseos };
}

// Lista de deseos: hasta 4 regalos, con enlace opcional de Ripley Perú
const DOMINIOS_TIENDA = ['ripley.com.pe'];
// Nombre del producto a partir del enlace (simple.ripley.com.pe/nombre-del-producto-pmp20000647967)
function nombreDesdeLink(link) {
  try {
    const u = new URL(link);
    if (!/ripley\.com\.pe$/i.test(u.hostname)) return '';
    const slug = u.pathname.split('/').filter(Boolean).pop() || '';
    if (!/-(pmp\d+|\d{8,}p?)$/i.test(slug)) return '';
    let n = decodeURIComponent(slug).replace(/-(pmp\d+|\d{8,}p?)$/i, '').replace(/[-_]+/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    n = n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    return n.slice(0, 60);
  } catch { return ''; }
}
const tiendaDe = () => 'ripley';

function validarDeseos(lista) {
  if (lista == null) return { deseos: [] };
  if (!Array.isArray(lista)) return { error: 'Lista de regalos no válida.' };
  const deseos = [];
  const usados = new Set();
  for (const [n, item] of lista.slice(0, 4).entries()) {
    let slot = Number.isInteger(item?.slot) && item.slot >= 0 && item.slot < 4 ? item.slot : n;
    if (usados.has(slot)) slot = [0, 1, 2, 3].find((x) => !usados.has(x));
    let texto = String(item?.texto || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const crudo = String(item?.link || '').trim();
    if (!texto && !crudo) continue;
    let link = '';
    if (crudo) {
      let u;
      try { u = new URL(crudo); } catch { return { error: `El enlace de "${texto || 'tu opción'}" no es válido.` }; }
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      if (u.protocol !== 'https:' || !DOMINIOS_TIENDA.some((d) => host === d || host.endsWith('.' + d)))
        return { error: 'Los enlaces deben ser de Ripley (simple.ripley.com.pe).' };
      link = u.toString().slice(0, 500);
    }
    if (!texto && link) texto = nombreDesdeLink(link);
    if (!texto) return { error: 'Escribe el nombre del regalo que elegiste (el enlace no lo trae).' };
    usados.add(slot);
    deseos.push({ slot, texto, link, tienda: link ? tiendaDe(link) : '' });
  }
  deseos.sort((a, b) => a.slot - b.slot);
  return { deseos };
}

// ---------- Nombre y enlace limpio de un producto (Ripley) ----------
const permitido = (u) => { const h = u.hostname.toLowerCase().replace(/^www\./, ''); return u.protocol === 'https:' && DOMINIOS_TIENDA.some((d) => h === d || h.endsWith('.' + d)); };
const entidades = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, '').replace(/&gt;/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
function nombreDesdeHtml(html, host) {
  const m = html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i)
    || html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
    || html.match(/<meta[^>]+name="title"[^>]+content="([^"]+)"/i)
    || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  let t = entidades(m[1]).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*[|-]\s*Ripley.*$/i, '').replace(/^Ripley.*$/i, '');
  if (/robot|captcha|sorry|page not found|503/i.test(t)) return '';
  return t;
}
function acortarNombre(t) {
  t = t.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= 60) return t;
  const corte = t.slice(0, 60).search(/\s[|,(–-][^|,(–-]*$/);
  return (corte > 20 ? t.slice(0, corte) : t.slice(0, 60).replace(/\s+\S*$/, '')).trim();
}
function enlaceLimpio(u) {
  const host = u.hostname.toLowerCase();
  if (/ripley\.com\.pe$/.test(host)) return `https://${u.hostname}${u.pathname}`;
  return u.toString();
}
async function leerPagina(url, ua) {
  const cab = { 'user-agent': ua, 'accept-language': 'es-PE,es;q=0.9', accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
  const r = await fetch(url, { redirect: 'follow', headers: cab, signal: AbortSignal.timeout(7000) });
  return { status: r.status, html: r.ok ? (await r.text()).slice(0, 2_000_000) : '' };
}
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA_CEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function infoEnlace(crudo) {
  let u = new URL(crudo);
  if (!permitido(u)) throw new Error('El enlace debe ser de Ripley (simple.ripley.com.pe).');
  const intentos = [];
  let html = '';
  // 1) Seguir los saltos del enlace hasta la página del producto
  for (let i = 0; i < 6 && !nombreDesdeLink(u.toString()); i++) {
    const r = await fetch(u, { redirect: 'manual', headers: { 'user-agent': UA_PC }, signal: AbortSignal.timeout(7000) });
    const loc = r.headers.get('location');
    intentos.push(`salto ${r.status}`);
    if (r.status >= 300 && r.status < 400 && loc) {
      const sig = new URL(loc, u);
      if (!permitido(sig)) break;
      u = sig;
      continue;
    }
    if (r.ok) html = (await r.text()).slice(0, 2_000_000);
    break;
  }
  let nombre = nombreDesdeLink(u.toString()) || (html ? nombreDesdeHtml(html, u.hostname) : '');
  // 2) Si no salió el nombre, leer la página del producto de varias formas
  if (!nombre) {
    const pruebas = [[u.toString(), UA_CEL], [u.toString(), UA_PC]];
    for (const [url, ua] of pruebas) {
      try {
        const r = await leerPagina(url, ua);
        const n = r.html ? nombreDesdeHtml(r.html, new URL(url).hostname) : '';
        intentos.push(`${ua === UA_CEL ? 'cel' : 'pc'} ${r.status}${n ? ' ok' : ''}`);
        if (n) { nombre = n; break; }
      } catch (e) { intentos.push('error ' + e.name); }
    }
  }
  return { link: enlaceLimpio(u), nombre: acortarNombre(nombre), intentos };
}
const consultasEnlace = new Map();
app.post('/api/info-enlace', async (req, res) => {
  const ip = req.ip || 'x';
  const ahora = Date.now();
  const lista = (consultasEnlace.get(ip) || []).filter((t) => ahora - t < 3600_000);
  if (lista.length >= 60) return res.status(429).json({ error: 'Demasiadas consultas, intenta más tarde.' });
  lista.push(ahora); consultasEnlace.set(ip, lista);
  try {
    const crudo = String(req.body?.link || '').trim().slice(0, 600);
    res.json({ ok: true, ...(await infoEnlace(crudo)) });
  } catch (e) {
    res.status(400).json({ error: /Ripley/.test(e.message) ? e.message : 'No pude leer ese enlace.' });
  }
});

function registrar({ nombre, pais, telefono, pin, genero, deseos }) {
  const h = hashSecreto(pin);
  const p = { id: crypto.randomUUID(), nombre, pais, telefono, genero, pinSal: h.sal, pinHash: h.hash, intentosPin: 0, deseos: deseos || [], creado: new Date().toISOString() };
  db.participantes.push(p);
  if (db.sorteo.realizado) ubicarNuevo(p.id);
  guardar();
  return p;
}

// Inscripción después del sorteo: la persona nueva entra al círculo sin cambiarle el nombre
// a nadie que ya sacó el suyo. Se mete entre A -> B, donde A todavía no sacó su nombre: A -> nuevo -> B.
const excluidos = (x, y) => (db.exclusiones || []).some(([a, b]) => (a === x && b === y) || (a === y && b === x));
function meterEnCirculo(id) {
  const a = db.sorteo.asignaciones;
  const vio = (k) => !!db.participantes.find((x) => x.id === k)?.vio;
  const opciones = Object.keys(a).filter((k) => k !== id && !vio(k) && a[k] !== id && !excluidos(k, id) && !excluidos(id, a[k]));
  if (!opciones.length) return false;
  const dador = opciones[crypto.randomInt(opciones.length)];
  a[id] = a[dador];
  a[dador] = id;
  // Lo que el receptor le escribió a su amigo secreto (A aún no había escrito nada) ahora le llega al nuevo
  (db.mensajes || []).forEach((m) => { if (m.dador === dador) m.dador = id; });
  return true;
}
function ubicarNuevo(id) {
  db.sorteo.espera = (db.sorteo.espera || []).filter((x) => x !== id);
  if (meterEnCirculo(id)) {
    db.sorteo.espera = db.sorteo.espera.filter((x) => !meterEnCirculo(x));
    return;
  }
  db.sorteo.espera.push(id);
  // Si todos ya sacaron su nombre, las personas nuevas en espera forman su propio círculo
  if (db.sorteo.espera.length >= 2) {
    const asign = sortear(db.sorteo.espera, db.exclusiones);
    if (asign) { Object.assign(db.sorteo.asignaciones, asign); db.sorteo.espera = []; }
  }
}
const enCirculo = (p) => db.sorteo.realizado && !!db.sorteo.asignaciones[p.id];

// Reglas 3 y 4: inscripción con nombre + teléfono
app.post('/api/inscripcion', (req, res) => {
  if (!limitar('ins:' + ip(req), 40, 60 * 60e3)) return res.status(429).json({ error: 'Demasiados intentos. Espera un rato.' });
  const v = validarInscripcion(req.body || {});
  if (v.error) return res.status(400).json({ error: v.error });

  const nuevo = registrar(v);
  res.json({ ok: true, registrado: true, nombre: v.nombre, token: nuevaSesion(nuevo) });
});

// Lista pública de participantes: solo nombres y si ya conocen a su elegido (nunca quién es)
const conoce = (p) => db.sorteo.realizado && !!p.vio;
app.get('/api/participantes', (req, res) => {
  res.json({
    sorteoRealizado: db.sorteo.realizado,
    participantes: db.participantes.map((p) => ({ nombre: p.nombre, conoce: conoce(p) })),
  });
});

// Regla 8: el participante ve SOLO su resultado (teléfono + PIN propio)
// Sesión recordada en el celular: token aleatorio; el servidor guarda solo su hash
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
function nuevaSesion(p) {
  const t = crypto.randomBytes(32).toString('base64url');
  p.sesiones = [hashToken(t), ...(p.sesiones || [])].slice(0, 5);
  guardar();
  return t;
}
function autenticar(req, res) {
  const token = req.body?.token;
  if (token) {
    const h = hashToken(token);
    const p = db.participantes.find((x) => (x.sesiones || []).includes(h));
    if (p) return p;
    res.status(401).json({ error: 'Tu sesión terminó. Entra otra vez con tu número y tu PIN.', sesion: false });
    return null;
  }
  if (!limitar('ver:' + ip(req), 30, 60 * 60e3)) { res.status(429).json({ error: 'Demasiados intentos. Espera un rato.' }); return null; }
  const telefono = normalizarTelefono(req.body?.pais, req.body?.telefono);
  const delNumero = telefono ? db.participantes.filter((x) => x.telefono === telefono) : [];
  const generico = { error: 'Número o PIN incorrecto.' };
  if (!delNumero.length) { res.status(400).json(generico); return null; }
  const activos = delNumero.filter((x) => (x.intentosPin || 0) < 5);
  if (!activos.length) { res.status(423).json({ error: 'Este número quedó bloqueado por demasiados intentos. Pide ayuda al organizador.' }); return null; }
  // El PIN dice quién es; si varias personas del mismo número usan el mismo PIN, se elige por nombre
  const pin = String(req.body?.pin || '');
  let coinciden = activos.filter((x) => verificaSecreto(pin, x.pinSal, x.pinHash));
  if (!coinciden.length) { activos.forEach((x) => { x.intentosPin = (x.intentosPin || 0) + 1; }); guardar(); res.status(400).json(generico); return null; }
  if (coinciden.length > 1) {
    const elegido = coinciden.find((x) => x.id === req.body?.id);
    if (!elegido) { res.status(300).json({ elegir: coinciden.map((x) => ({ id: x.id, nombre: x.nombre })) }); return null; }
    coinciden = [elegido];
  }
  const p = coinciden[0];
  if (p.intentosPin) { p.intentosPin = 0; guardar(); }
  return p;
}

app.post('/api/mi-resultado', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  const base = { ok: true, id: p.id, nombre: p.nombre, pais: p.pais, genero: p.genero, generoAuto: !!p.generoAuto, misDeseos: p.deseos || [], pedidos: (p.pedidos || []).length, token: req.body?.token ? undefined : nuevaSesion(p),
    presupuesto: textoPresupuesto(), rango: rango(), fechaEntrega: db.ajustes.fechaEntrega, fechaSorteo: db.ajustes.fechaSorteo || null };
  if (!db.sorteo.realizado) return res.json({ ...base, pendiente: true });
  if (!enCirculo(p)) return res.json({ ...base, pendiente: true, enEspera: true, fechaSorteo: null });
  // Sorteo individual: cada quien saca su nombre cuando quiera
  if (!p.vio) return res.json({ ...base, porSacar: true });
  const rec = db.participantes.find((x) => x.id === db.sorteo.asignaciones[p.id]);
  // Solo el nombre y los deseos de la persona asignada; nada de nadie más
  res.json({ ...base, regalasA: rec ? rec.nombre : null, deseosDe: rec ? rec.deseos || [] : [] });
});

// "Sacar mi nombre": revela el nombre ya sorteado en secreto (el círculo se armó al abrir el sorteo,
// así nadie se saca a sí mismo, nadie se repite y el último nunca se queda sin opción)
app.post('/api/sacar', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  if (!db.sorteo.realizado) return res.status(400).json({ error: 'El sorteo todavía no está abierto.' });
  if (!enCirculo(p)) return res.status(400).json({ error: 'Todavía no tienes nombre asignado: falta que se inscriba alguien más.' });
  if (!p.vio) { p.vio = new Date().toISOString(); guardar(); }
  const rec = db.participantes.find((x) => x.id === db.sorteo.asignaciones[p.id]);
  res.json({ ok: true, regalasA: rec ? rec.nombre : null, deseosDe: rec ? rec.deseos || [] : [] });
});

// Cada participante puede cambiar sus deseos con su número + PIN
app.post('/api/mis-deseos', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  const d = validarDeseos(req.body?.deseos);
  if (d.error) return res.status(400).json({ error: d.error });
  if (!d.deseos.length) return res.status(400).json({ error: 'Deja al menos un regalo en tu lista.' });
  p.deseos = d.deseos;
  p.pedidos = [];
  guardar();
  res.json({ ok: true, misDeseos: p.deseos });
});

// Listas de deseos de todos (como Drawnames): visibles para los participantes con sesión.
// No dicen quién le regala a quién.
app.post('/api/listas', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  res.json({
    ok: true,
    sorteoRealizado: db.sorteo.realizado,
    listas: db.participantes.map((x) => ({
      id: x.id, nombre: x.nombre, pais: x.pais, genero: x.genero, soyYo: x.id === p.id, conoce: conoce(x),
      deseos: x.deseos || [], yaPedi: (x.pedidos || []).includes(p.id),
    })),
  });
});

// Cambiar mi género (por si la app lo adivinó mal por el nombre)
app.post('/api/mi-genero', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  const g = generoValido(req.body?.genero);
  if (!g) return res.status(400).json({ error: 'Elige Masculino o Femenino.' });
  p.genero = g; delete p.generoAuto;
  guardar();
  res.json({ ok: true, genero: g });
});

// Pedir la lista de deseos de alguien sin decir quién la pide
app.post('/api/pedir-lista', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  const x = db.participantes.find((y) => y.id === req.body?.id);
  if (!x || x.id === p.id) return res.status(400).json({ error: 'No válido.' });
  x.pedidos = [...new Set([...(x.pedidos || []), p.id])];
  guardar();
  res.json({ ok: true });
});

app.post('/api/salir', (req, res) => {
  const h = hashToken(req.body?.token || '');
  for (const p of db.participantes) if ((p.sesiones || []).includes(h)) { p.sesiones = p.sesiones.filter((x) => x !== h); guardar(); }
  res.json({ ok: true });
});

// ---------- Chat anónimo ----------
// Hilo = la pareja (quien regala -> quien recibe). Quien recibe nunca ve el nombre de quien regala.
//   "elegido": yo regalo, hablo con la persona que me tocó (veo su nombre)
//   "amigo":   yo recibo, hablo con mi amigo secreto (anónimo)
function hilos(p) {
  const a = db.sorteo.asignaciones;
  const elegido = a[p.id];
  const amigo = Object.keys(a).find((k) => a[k] === p.id);
  return { elegido, amigo };
}
function vistaChat(p) {
  const { elegido, amigo } = hilos(p);
  const leido = p.leido || {};
  const fmt = (dador, yoSoyDador) => db.mensajes
    .filter((m) => m.dador === dador)
    .map((m) => ({ texto: m.texto, fecha: m.fecha, mio: yoSoyDador ? m.autor === 'dador' : m.autor === 'receptor' }));
  const conElegido = fmt(p.id, true);
  const conAmigo = amigo ? fmt(amigo, false) : [];
  const nuevos = (lista, desde) => lista.filter((m) => !m.mio && (!desde || m.fecha > desde)).length;
  const rec = db.participantes.find((x) => x.id === elegido);
  return {
    elegido: rec ? rec.nombre : null,
    conElegido, conAmigo,
    nuevosElegido: nuevos(conElegido, leido.elegido),
    nuevosAmigo: nuevos(conAmigo, leido.amigo),
  };
}
app.post('/api/chat', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  if (!db.sorteo.realizado) return res.json({ ok: true, disponible: false });
  const marcar = req.body?.leido;
  if (marcar === 'elegido' || marcar === 'amigo') { p.leido = { ...(p.leido || {}), [marcar]: new Date().toISOString() }; guardar(); }
  const v = vistaChat(p);
  if (!p.vio) { v.elegido = null; v.conElegido = []; v.nuevosElegido = 0; } // aún no sacó su nombre
  res.json({ ok: true, disponible: true, ...v });
});
app.post('/api/chat/enviar', (req, res) => {
  const p = autenticar(req, res);
  if (!p) return;
  if (!db.sorteo.realizado) return res.status(400).json({ error: 'El chat se abre después del sorteo.' });
  if (!limitar('chat:' + p.id, 60, 60 * 60e3)) return res.status(429).json({ error: 'Muchos mensajes seguidos. Espera un rato.' });
  const texto = String(req.body?.texto || '').replace(/[<>]/g, '').trim().slice(0, 300);
  if (!texto) return res.status(400).json({ error: 'Escribe un mensaje.' });
  const { amigo } = hilos(p);
  const hilo = req.body?.hilo;
  if (hilo === 'elegido' && !p.vio) return res.status(400).json({ error: 'Primero saca tu nombre.' });
  if (hilo === 'elegido') db.mensajes.push({ dador: p.id, autor: 'dador', texto, fecha: new Date().toISOString() });
  else if (hilo === 'amigo' && amigo) db.mensajes.push({ dador: amigo, autor: 'receptor', texto, fecha: new Date().toISOString() });
  else return res.status(400).json({ error: 'Chat no válido.' });
  if (db.mensajes.length > 5000) db.mensajes = db.mensajes.slice(-5000);
  guardar();
  res.json({ ok: true, ...vistaChat(p) });
});

// ---------- Organizador (Regla 1: controla todo, nunca ve resultados) ----------
function soloOrganizador(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Falta configurar ADMIN_PASSWORD en el servidor.' });
  if (!limitar('adm:' + ip(req), 120, 15 * 60e3)) return res.status(429).json({ error: 'Demasiados intentos.' });
  const a = Buffer.from(String(req.get('x-clave-organizador') || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Clave de organizador incorrecta.' });
  next();
}

app.get('/api/org/estado', soloOrganizador, (req, res) => {
  const n = db.participantes.length;
  res.json({
    ajustes: db.ajustes,
    rango: rango(),
    exclusiones: db.exclusiones,
    urlVer: urlBase(req) + '/ver',
    participantes: db.participantes.map((p) => ({
      id: p.id, nombre: p.nombre, pais: p.pais, telefono: p.telefono, creado: p.creado, deseos: (p.deseos || []).length,
      avisado: !!db.sorteo.envios[p.id], conoce: conoce(p), genero: p.genero, generoAuto: !!p.generoAuto,
    })),
    total: n,
    esPar: n % 2 === 0,
    puedeSortear: !db.sorteo.realizado && n >= 2 && n % 2 === 0,
    sorteo: { realizado: db.sorteo.realizado, fecha: db.sorteo.fecha }, // sin asignaciones
  });
});

app.post('/api/org/ajustes', soloOrganizador, (req, res) => {
  const b = req.body || {};
  const a = db.ajustes;
  if (typeof b.titulo === 'string' && b.titulo.trim()) a.titulo = limpiarNombre(b.titulo).slice(0, 60) || a.titulo;
  const monto = (v) => { const n = Number(String(v ?? '').replace(/[^\d.]/g, '')); return n > 0 && n < 100000 ? Math.round(n * 100) / 100 : null; };
  if ('minPEN' in b) a.minPEN = monto(b.minPEN);
  if ('maxPEN' in b) a.maxPEN = monto(b.maxPEN);
  if (a.minPEN && a.maxPEN && a.minPEN > a.maxPEN) [a.minPEN, a.maxPEN] = [a.maxPEN, a.minPEN];
  if ('fechaSorteo' in b && !db.sorteo.realizado) {
    const t = b.fechaSorteo ? Date.parse(b.fechaSorteo) : NaN;
    a.fechaSorteo = Number.isFinite(t) ? new Date(t).toISOString() : '';
    a.autoError = '';
  }
  a.presupuesto = textoPresupuesto();
  if (typeof b.fechaEntrega === 'string') a.fechaEntrega = b.fechaEntrega.replace(/[<>]/g, '').trim().slice(0, 40);
  a.inscripcionAbierta = true; // las inscripciones nunca se cierran
  guardar();
  res.json({ ok: true, ajustes: a, rango: rango() });
});

app.post('/api/org/eliminar', soloOrganizador, (req, res) => {
  if (db.sorteo.realizado) return res.status(400).json({ error: 'No se puede quitar a nadie después del sorteo. Reinicia el sorteo primero.' });
  const antes = db.participantes.length;
  db.participantes = db.participantes.filter((p) => p.id !== req.body?.id);
  db.exclusiones = db.exclusiones.filter(([a, b]) => a !== req.body?.id && b !== req.body?.id);
  guardar();
  res.json({ ok: db.participantes.length < antes });
});

// Editar el nombre de un inscrito (el sorteo usa ids, así que se puede cambiar en cualquier momento)
app.post('/api/org/renombrar', soloOrganizador, (req, res) => {
  const p = db.participantes.find((x) => x.id === req.body?.id);
  if (!p) return res.status(404).json({ error: 'No existe.' });
  const nombre = limpiarNombre(req.body?.nombre);
  if (nombre.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 letras.' });
  if (db.participantes.some((x) => x.id !== p.id && claveNombre(x.nombre) === claveNombre(nombre)))
    return res.status(400).json({ error: 'Ya hay alguien inscrito con ese nombre.' });
  p.nombre = nombre;
  if (p.generoAuto) p.genero = generoPorNombre(nombre);
  guardar();
  res.json({ ok: true, nombre });
});

// Editar nombre y/o número de WhatsApp de un inscrito (conserva su PIN, su lista y su sorteo)
app.post('/api/org/editar', soloOrganizador, (req, res) => {
  const p = db.participantes.find((x) => x.id === req.body?.id);
  if (!p) return res.status(404).json({ error: 'No existe.' });
  const nombre = limpiarNombre(req.body?.nombre ?? p.nombre);
  if (nombre.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 letras.' });
  if (db.participantes.some((x) => x.id !== p.id && claveNombre(x.nombre) === claveNombre(nombre)))
    return res.status(400).json({ error: 'Ya hay alguien inscrito con ese nombre.' });
  let telefono = p.telefono, pais = p.pais;
  if (req.body?.telefono !== undefined) {
    pais = req.body?.pais || 'PE';
    if (!PAISES[pais]) return res.status(400).json({ error: 'Solo se aceptan celulares de Perú (+51).' });
    telefono = normalizarTelefono(pais, req.body.telefono);
    if (!telefono) return res.status(400).json({ error: 'Número no válido: celular de Perú de 9 dígitos que empieza con 9.' });
    if (telefono !== p.telefono && db.participantes.filter((x) => x.telefono === telefono).length >= 6)
      return res.status(400).json({ error: 'Ese número ya tiene 6 personas inscritas.' });
  }
  // Nuevo PIN (opcional): el organizador lo cambia si alguien lo olvidó; cierra sus sesiones abiertas
  const pin = String(req.body?.pin ?? '').trim();
  if (pin && !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'El PIN debe tener 4 dígitos.' });
  if (pin) { const h = hashSecreto(pin); p.pinSal = h.sal; p.pinHash = h.hash; p.sesiones = []; }
  p.nombre = nombre; p.pais = pais; p.telefono = telefono; p.intentosPin = 0;
  if (p.generoAuto) p.genero = generoPorNombre(nombre);
  guardar();
  res.json({ ok: true, nombre, pais, telefono, pinCambiado: !!pin });
});

app.post('/api/org/genero', soloOrganizador, (req, res) => {
  const p = db.participantes.find((x) => x.id === req.body?.id);
  const g = generoValido(req.body?.genero);
  if (!p || !g) return res.status(400).json({ error: 'No válido.' });
  p.genero = g; delete p.generoAuto;
  guardar();
  res.json({ ok: true });
});

// Exclusiones: parejas que no se pueden sacar entre sí (en ninguna dirección)
app.post('/api/org/exclusiones', soloOrganizador, (req, res) => {
  if (db.sorteo.realizado) return res.status(400).json({ error: 'El sorteo ya se hizo. Repite el sorteo para cambiar exclusiones.' });
  const { a, b, quitar } = req.body || {};
  const existe = (id) => db.participantes.some((p) => p.id === id);
  if (!existe(a) || !existe(b) || a === b) return res.status(400).json({ error: 'Elige dos personas distintas.' });
  const igual = ([x, y]) => (x === a && y === b) || (x === b && y === a);
  if (quitar) db.exclusiones = db.exclusiones.filter((e) => !igual(e));
  else if (!db.exclusiones.some(igual)) {
    const prueba = db.participantes.length % 2 === 0 && db.participantes.length >= 2 ? sortear(db.participantes.map((p) => p.id), [...db.exclusiones, [a, b]]) : true;
    if (!prueba) return res.status(400).json({ error: 'Con esa exclusión el sorteo sería imposible. No se agregó.' });
    db.exclusiones.push([a, b]);
  }
  guardar();
  res.json({ ok: true, exclusiones: db.exclusiones });
});

// Reglas 2, 5, 7, 9 (el aviso, regla 6, se manda por WhatsApp desde el panel)
function abrirSorteo() {
  if (db.sorteo.realizado) return { error: 'El sorteo ya se realizó.' };
  const n = db.participantes.length;
  if (n < 2) return { error: 'Se necesitan al menos 2 participantes.' };
  if (n % 2 !== 0) return { error: `Hay ${n} inscritos. La cantidad debe ser par: falta 1 persona o hay que quitar 1.` };
  const asign = sortear(db.participantes.map((p) => p.id), db.exclusiones);
  if (!asign) return { error: 'Con estas exclusiones no se puede armar el sorteo. Quita alguna exclusión.' };
  db.ajustes.autoError = '';
  db.mensajes = [];
  db.sorteo = { realizado: true, fecha: new Date().toISOString(), asignaciones: asign, envios: {} };
  guardar();
  return { ok: true };
}

// Apertura automática en la fecha del sorteo (sin esperar al organizador)
function revisarSorteoAutomatico() {
  const a = db.ajustes;
  if (db.sorteo.realizado || !a.fechaSorteo) return;
  if (Date.now() < Date.parse(a.fechaSorteo)) return;
  const r = abrirSorteo();
  if (r.error && a.autoError !== r.error) { a.autoError = r.error; guardar(); }
}
setInterval(revisarSorteoAutomatico, 30e3).unref();

app.post('/api/org/sortear', soloOrganizador, (req, res) => {
  const r = abrirSorteo();
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
});

// El organizador marca que ya le mandó el aviso por WhatsApp (el aviso no lleva el resultado)
app.post('/api/org/avisado', soloOrganizador, (req, res) => {
  if (!db.sorteo.realizado) return res.status(400).json({ error: 'Todavía no hay sorteo.' });
  const p = db.participantes.find((x) => x.id === req.body?.id);
  if (!p) return res.status(404).json({ error: 'No existe.' });
  db.sorteo.envios[p.id] = { fecha: new Date().toISOString() };
  guardar();
  res.json({ ok: true });
});

app.post('/api/org/reiniciar', soloOrganizador, (req, res) => {
  const modo = req.body?.modo;
  if (req.body?.confirmar !== 'REINICIAR') return res.status(400).json({ error: 'Escribe REINICIAR para confirmar.' });
  if (modo === 'sorteo') {
    db.sorteo = { realizado: false, fecha: null, asignaciones: {}, envios: {} };
    db.participantes.forEach((p) => { delete p.vio; delete p.leido; });
    db.mensajes = [];
    db.ajustes.inscripcionAbierta = true;
    if (db.ajustes.fechaSorteo && Date.parse(db.ajustes.fechaSorteo) <= Date.now()) db.ajustes.fechaSorteo = '';
  } else if (modo === 'todo') {
    const ajustes = { ...db.ajustes, inscripcionAbierta: true };
    db = estadoInicial(); db.ajustes = ajustes;
  } else return res.status(400).json({ error: 'Modo no válido.' });
  guardar();
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Intercambio de regalos en http://localhost:${PORT}`);
    if (!ADMIN_PASSWORD) console.warn('AVISO: define ADMIN_PASSWORD para usar el panel del organizador.');
  });
}

module.exports = { app, sortear, normalizarTelefono, nombreDesdeLink, generoPorNombre, nombreDesdeHtml, acortarNombre, enlaceLimpio, _db: () => db };
