=====================================================================
NOTES.txt — DOCUMENTO MAESTRO DEL PROYECTO "ACNIMBUS"
App de participación para el aula (tormenta de palabras + escalas)
Versión FINAL. Última actualización: renombrado a ACnimbus.
=====================================================================

1 · IDENTIDAD Y UBICACIÓN
---------------------------------------------------------------------
- Nombre de la app (visible): ACnimbus (antes se llamaba "Chubasco";
  se renombró cambiando ~10 textos en index.html y app.js).
- Marca visual: gota coral (#FF5D3A) + lluvia; estética "papel de aula".
- URL pública: https://d003-adriancerda.github.io/Lluvia1/
- Repositorio: github.com/d003-adriancerda/Lluvia1 (público, rama main,
  GitHub Pages activado en /root). LOS 3 ARCHIVOS DEL REPO SON LA
  FUENTE DE VERDAD. Usuario GitHub: d003-adriancerda.
- Firebase (backend): proyecto "lluvia1-925b4" (cuenta de Google del
  usuario). La configuración (6 valores firebaseConfig) está pegada en
  la sección 3 de app.js y es pública por diseño (la seguridad real
  viven en las reglas de Firestore).

2 · PILA TECNOLÓGICA
---------------------------------------------------------------------
- HTML5 + CSS3 + JavaScript vanilla (ES6+). Sin frameworks, sin build.
- Archivos: index.html, style.css, app.js (solo tres).
- Firebase SDK "compat" 10.12.2 por CDN (app + firestore).
- QR por CDN: qrcodejs 1.0.0 (cdnjs), con fallback si falla.
- Google Fonts: "Fraunces" (títulos serif) + "Space Grotesk" (UI).
- Web Audio API para TODOS los sonidos (sin archivos de audio).
- Almacenamiento navegador: sessionStorage = identidad por pestaña
  (profesor/alumno/clave); localStorage = tema, sonido, música,
  historial de sesiones.

3 · ESTILO (resumen para mantener coherencia en futuros cambios)
---------------------------------------------------------------------
- Fondo crema con textura de puntos; bordes tinta 1.5px; sombras duras
  desplazadas (nada de gradientes).
- Paleta: coral #FF5D3A, teal #0E9594, mostaza #F3A712, petróleo
  #2E6F95, frambuesa #D1465F, verde #6FA540.
- MODO OSCURO completo y persistente (botón luna/sol). El QR y el PNG
  exportado SIEMPRE salen en claro a propósito.
- Lluvia ambiental visual en canvas (se desactiva en proyector,
  impresión y prefers-reduced-motion).
- Título de portada: "La clase opina." (el usuario lo pidió así).

4 · FUNCIONALIDADES IMPLEMENTADAS (estado final)
---------------------------------------------------------------------
PROFESOR:
- Acceso protegido con clave: TEACHER_PASS en app.js sección 1.
  Valor actual: 'PROFE-2025'. Overlay de clave generado por JS.
  Se recuerda por pestaña (sessionStorage). También protege "Abrir"
  en el historial.
- Crear sesión: título + EDITOR DE PREGUNTAS POR TARJETAS (hasta 10).
  Cada pregunta elige tipo: "Palabra" o "Escala 1–5" (con etiquetas
  opcionales para el 1 y el 5). Se pueden mezclar tipos en una sesión.
- Reglas por sesión: máx. respuestas por alumno (1-10, defecto 3),
  permitir repetidas (switch), anónimas (switch), palabras bloqueadas
  (hasta 50, match por substring normalizado, sin tildes/mayúsculas).
- Panel en directo: código copiable, QR (con enlace #ABC-123),
  badge de estado, estadísticas animadas, navegación por chips,
  tormenta de palabras, resultados, consola con: Abrir/Pausar/Reanudar,
  Cerrar pregunta, Siguiente, Reiniciar (2 pasos), Resultados,
  Lluvia demo (respuestas simuladas reales, solo tipo palabra),
  Votación (toggle, solo tipo palabra), Proyector (fullscreen con
  música y tormenta), Exportar CSV (BOM + ";"), Imprimir/PDF (todas
  las preguntas, con media/mediana en escalas y puntos ●),
  Exportar PNG (canvas 1600x900 estilo papel, con estrellas de votos),
  Finalizar sesión (2 pasos).
- HISTORIAL de sesiones en la portada (máx. 20, con clave profKey
  guardada localmente).
- SONIDO DE GOTAS: al llegar respuestas nuevas (Web Audio, pitch
  aleatorio 650-1200Hz). Botón altavoz; preferencia persistente.
  OJO: requiere primer clic en la página tras recargar (norma de
  los navegadores).
- MÚSICA DE FONDO: Nocturne Op. 9 No. 2 de Chopin (dominio público)
  SINTETIZADO con Web Audio (doble oscilador con envolvente de piano;
  frase de apertura de 4 compases en bucle) + ruido gris tipo lluvia
  muy suave debajo. Botón ♪ en la cabecera; preferencia persistente;
  suena también en Proyector. Vive en el bloque que empieza con
  /* --- Música de fondo: Nocturne Op. 9... (reemplazó los acordes
  Am-F-C-G que no gustaron). Ajustes rápidos documentados abajo (§8).
- TORMENTA: palabras agrupadas por clave normalizada (NUNCA se repite
  una palabra: crece). Tamaño √frecuencia con rango ampliado; cuando
  una palabra recibe otra respuesta hace un "pulso" animado (clase
  .growing, keyframes word-grow inyectados por JS). Espiral áurea sin
  solapes. Estrella ★N en palabras votadas. Clic → tooltip con
  recuento, %, votos, autores (si no anónima) y eliminar.
- VOTACIONES: el profesor activa "Votación" en preguntas de palabra;
  cada alumno reparte 3 votos (maxVotes en settings). Las más votadas
  lucen ★N en tormenta, tabla, tooltip, CSV, PDF y PNG.
- ESCALA 1–5: el alumno ve 5 botones grandes (+ etiquetas de extremos).
  Resultados: distribución 1-5 con barras, media, mediana, mín, máx,
  y DIAGRAMA DE CAJA Y BIGOTES SVG con un punto por alumno.
ALUMNO:
- Entra por código (ABC-123, tolera sin guion) o QR (auto-entrada por
  URL con hash). Nombre opcional si la sesión no es anónima.
- Pantalla minimalista con estados amables (espera/pausa/cerrada),
  confirmación animada al enviar, contador 0/40, "mis palabras",
  caja de votación cuando está activa.
- CONFINSADO: el botón "Volver al inicio" está oculto por JS
  ($('#btn-join-home').hidden = true). Salir solo devuelve a la
  pantalla de código. Nunca ve el panel del profesor.
SEGURIDAD:
- Tres capas: (1) TEACHER_PASS para abrir el panel (interfaz);
  (2) profKey aleatoria por sesión + REGLAS DE FIRESTORE que exigen
  esa clave en toda escritura de gestión (las sesiones legacy sin
  profKey siguen permitiendo escribir); (3) saneado de entradas
  (40 chars, sin URLs, regex Unicode; nombres 24 chars), cooldown
  1200ms, límite de respuestas, palabras bloqueadas.
- Borrado SIEMPRE lógico (deleted:true); las reglas prohíben delete.
- Nunca innerHTML con datos de usuario (solo textContent/escHTML).

5 · MODELO DE DATOS (Firestore)
---------------------------------------------------------------------
sessions/{CÓDIGO}: { title, settings{maxPerStudent, allowRepeated,
  anonymous, blocked[], maxVotes:3}, current, ended, createdAt,
  profKey (8 chars; sesiones nuevas) }
sessions/{CÓDIGO}/questions/{qid}: { text, type:'word'|'scale',
  status:'waiting'|'open'|'paused'|'closed', order, scaleMin?,
  scaleMax?, voting? }
responses/{id}: { code, qid, text, key, authorId, authorName|null,
  ts, deleted? }   (colección RAÍZ)
votes/{id}: { code, qid, voterId, key, ts, deleted? }  (colección RAÍZ)
REGLAS: function sessionAbierta = doc sin profKey; writes de gestión
exigen request.resource.data.profKey correcto; read/create abiertos;
delete false. Colecciones: sessions (y subcolección questions),
responses, votes.

6 · ESTRUCTURA DE app.js (12 secciones — para localizar código rápido)
---------------------------------------------------------------------
1  Constantes y utilidades (T_KEY, TEACHER_PASS, MAX_LEN 40,
   COOLDOWN 1200, normalizeKey, sanitizeAnswer/Name)
2  Toasts e iconos SVG inline
3  Store Firebase (config, watchSession con 4 onSnapshot, CRUD,
   profKey, soft deletes)
4  Router de vistas y estado
4bis Tema oscuro + gotas de sonido + MÚSICA (bloque Chopin: MELODY,
   BASS, CHORDS, pianoNote, scheduleLoop, startRainNoise, start/stop,
   botón ♪ inyectado junto al altavoz)
4ter Lluvia ambiental visual + estilos del pulso de crecimiento
4cuarto Cerradura TEACHER_PASS (overlay)
5  Fondo decorativo de portada
6  Editor de preguntas (tarjetas) + crear sesión
6bis Historial de sesiones
7  Panel del profesor (renderLive + consola)
8  Tormenta (computeWords, findSpot espiral áurea, clase WordStorm,
   pulso .growing, tooltip)
9  Resultados/gráficos (barras, puntos, donut, escala+boxplot),
   CSV, PDF
10 Alumno (join, renderStudent selectivo por firma, escala, votos)
11 Lluvia demo
11bis QR, Proyector, PNG
12 Arranque (init: restaura alumno/profesor, autoJoin por URL)

7 · CÓMO RETOMAR CON UNA IA (prompt recomendado)
---------------------------------------------------------------------
Pegar este NOTES.txt + (si se va a modificar) el archivo afectado
copiado del repo. Frase tipo: "Este es el documento maestro de mi app
ACnimbus publicada en GitHub Pages. Con estos archivos, hazme el
siguiente ajuste: ...". Para cambios grandes, pedir el archivo
COMPLETO (este usuario prefiere archivos enteros para pegar, o
cambios en bloques pequeños si el archivo es muy largo, PEGANDO EN
2 PARTES para evitar cortes — ya pasó una vez con app.js).
CAMBIOS DE TEXTO permitidos pendientes: portada/botones en index.html
(vista home) y mensajes entre comillas en app.js.
ADVERTENCIA conocida: al pegar en GitHub el editor puede cortar
archivos largos → verificar SIEMPRE que el final del archivo es
  if (!autoJoinFromURL()) showView('home');
  })();
y que existe "12 · ARRANQUE".

8 · AJUSTES FINOS DOCUMENTADOS (números exactos)
---------------------------------------------------------------------
- Volumen del piano: en startMusic, musicMaster.gain.value = 0.9
  (subir a 1.2 / bajar a 0.6).
- Quitar la lluvia bajo el piano: en startRainNoise, g.gain.value
  de 0.03 a 0.
- Tempo del nocturne: TEMPO_8TH = 0.36 (más lento 0.42 / rápido 0.30).
- Volumen de las gotas: en playDrop, pico 0.12 (subir a 0.28).
- Tamaño máx. de palabra en la tormenta: maxS = clamp(H*0.20,48,96).
- Cambiar la clave de profesor: const TEACHER_PASS (sección 1).
- Claves internas 'chubasco:*' en localStorage/sessionStorage: NO
  renombrar salvo cambio sincronizado en index.html <head> (rompería
  tema/sonido/historial guardados).

9 · DECISIONES TOMADAS (no deshacer sin consultarlo)
---------------------------------------------------------------------
- PWA NO implementada a propósito (caché problemática).
- QR y PNG siempre en tema claro (escaneabilidad/impresión).
- Música sintetizada con Web Audio, nunca grabaciones (derechos).
- Lluvia demo escribe respuestas reales (visibles en todos).
- Proyector mantiene la música activa.
- Nombre de repo "Lluvia1" no coincide con nombre visible: da igual,
  no se ve nunca.
- Render del alumno SELECTIVO por firma: las sincronías entrantes no
  borran lo que el alumno está escribiendo.

10 · LISTO PARA PRÓXIMOS PROYECTOS (otras apps de aula)
---------------------------------------------------------------------
Lista de ideas entregada al usuario (mismas estética y arquitectura):
1 Semáforo de comprensión (recomendada, la más simple)
2 Rueda de la suerte justa (sorteo con memoria)
3 Buzón anónimo con votos
4 Ticket de salida (recomendada, comparte arquitectura con ACnimbus)
5 Muro de post-its arrastrables
6 Glosario vivo votado
7 Línea de tiempo colaborativa
8 Flashcards de la clase
9 Debate a dos orillas
10 Verdadero/Falso relámpago
11 Termómetro de aula diario
12 Ruta de aprendizaje (confianza por tema)
13 Misiones colectivas
14 Quiz tipo Kahoot propio
Para empezar una nueva app: abrir conversación nueva, pegar este
NOTES.txt y decir qué app se quiere, pidiendo reutilizar estética
y patrones de ACnimbus.

=====================================================================
FIN DEL DOCUMENTO — ACNIMBUS, proyecto completado y en producción.
=====================================================================
