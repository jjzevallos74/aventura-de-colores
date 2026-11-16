// "El sorteo se realizará el 4 de diciembre" con la hora de Lima
window.textoFechaSorteo = function (iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const dia = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' });
  const h = d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' });
  return {
    titulo: `🎲 El sorteo se realizará el ${dia}`,
    detalle: `Desde las ${h} (hora de Lima). Ese día entras y sacas tu nombre.`,
  };
};
