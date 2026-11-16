# Aventura de Colores · Intercambio de Regalos 🎁

App web de amigo secreto (copia de la app de Navidad, adaptada): solo Perú (+51), precios en soles, ideas y enlaces de Ripley.

## Páginas

| Dirección | Para quién | Qué hace |
|---|---|---|
| `/` | Participantes | Inscripción (nombre, género, celular de Perú, PIN) |
| `/ver` | Participantes | "Mi intercambio": sacar mi nombre, chat secreto, listas de deseos y mi lista |
| `/ideas` | Todos | Ideas en Ripley dentro del monto |
| `/organizador` | Organizador | Ajustes, lista, sorteo, avisos por WhatsApp, reinicio |

## Reglas

- **Monto:** S/ 50 (editable en el panel; mismo valor en mínimo y máximo = monto fijo).
- **Tienda:** Ripley Perú (simple.ripley.com.pe). Con monto fijo de S/ 50 las búsquedas van de S/ 40 a S/ 60.
- **Sorteo:** se abre solo el 4 de diciembre de 2026 a las 9:00 a.m. (hora de Lima). Cada uno saca su nombre.
- **Inscripción:** nunca se cierra. Quien llega después del sorteo entra al círculo sin cambiar a nadie que ya vio su nombre.
- **Organizador:** controla todo pero nunca ve quién le regala a quién.

## Variables (Railway)

- `ADMIN_PASSWORD` — clave del organizador
- `DATA_FILE` — `/data/datos.json` (volumen montado en `/data`)
- `PUBLIC_URL` — `https://${{RAILWAY_PUBLIC_DOMAIN}}`

## Probar

```bash
npm install
npm start
npm test
```
