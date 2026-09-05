NOTES.md — Estado del proyecto Chubasco
Qué es
App web educativa de "tormenta de palabras" para el aula. Nombre visible: Chubasco.El profesor lanza preguntas, los alumnos responden desde su dispositivo y las palabrascaen en una nube animada en la pantalla del profesor.

Archivos (V1 + Paquete Aula, funcionando)
index.html — 5 vistas: inicio, config profesor, live profesor, join alumno, alumno.Incluye botón QR y overlay QR, interfaz del modo proyector, botones Proyector y Exportar PNG.
style.css — identidad propia: fondo papel, Fraunces + Space Grotesk, paleta de 6 colores,botones con sombra dura. Incluye estilos del overlay QR y del modo proyector.
app.js — 13 secciones. Claves:· Store = localStorage + BroadcastChannel (sync en tiempo real entre pestañas)· T_KEY/S_KEY en sessionStorage (profesor/alumno por pestaña)· WordStorm: espiral áurea anti-solapamientos, tamaño según frecuencia· Seguridad: sanitizeAnswer/sanitizeName, MAX_LEN 40, cooldown 1200ms· CSV (BOM + ";"), impresión/PDF, lluvia demo, confirmación en dos pasos· Sección 11bis: QR (buildJoinURL + autoJoinFromURL con #ABC-123), modo proyector (enterProjector/exitProjector), exportar nube a PNG 1600x900 (exportStormPNG)
Estado
V1 + Paquete Aula (QR, proyector, PNG) terminados y publicados en GitHub Pages:https://TUUSUARIO.github.io/Lluvia1/ ← (sustituir TUUSUARIO por el usuario real de GitHub)El repositorio se llama "Lluvia1" (nombre elegido por el usuario; el código no depende de él).El QR genera enlaces del tipo https://TUUSUARIO.github.io/Lluvia1/#ABC-123

Pendiente (mejoras acordadas, NO implementadas)
Orden pactado:

✅ HECHO: QR del código de sesión + modo proyector + exportar nube a PNG
Palabras bloqueadas por el profesor + historial de sesiones
Modo oscuro + sonido de gotas (Web Audio) + lluvia ambiental de fondo
PWA instalable (manifest.json + sw.js, 2 archivos nuevos)
(Futuro) Votaciones en directo — requiere pasar a V2 Firebase
V2 multiusuario (diseñada, sin implementar)
Firestore: sessions/{code} + subcolecciones questions y responses.Sustituir la sección 3 de app.js (Store). El 90% del código no cambia.Mapping V1→V2 documentado en la conversación original.El QR ya está preparado: con Firebase funcionará el acceso real multi-dispositivo.

Cómo retomar
Pegar este NOTES.md + los archivos que se vayan a modificar.Pedir solo los bloques nuevos, NO regenerar lo existente.El usuario prefiere recibir ARCHIVOS COMPLETOS para copiar y pegar,no parches con "busca esta línea y reemplázala".