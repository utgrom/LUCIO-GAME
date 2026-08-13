# Lucio Lootbox Clicker

Juego clicker web, mobile-first y sin build tools. El jugador genera Mantecas, compra mochilas, descubre Lucios normales y Shiny, y aumenta permanentemente su producción por tap.

## Ejecutar localmente

Sirve la carpeta raíz con cualquier servidor estático. Por ejemplo:

```powershell
python -m http.server 8765
```

- Juego: `http://127.0.0.1:8765/index.html`
- Playground: `http://127.0.0.1:8765/playground.html`
- Debug del juego: `http://127.0.0.1:8765/index.html?debug=1`

No abras los HTML mediante `file://`: audio, caché y algunos recursos del navegador requieren un origen HTTP.

## Arquitectura

- `index.html`, `css/game.css`, `js/game.js`: interfaz y coordinación del juego.
- `playground.html`, `css/playground.css`, `js/playground.js`: laboratorio de FX y aperturas.
- `js/config.js`: balance, probabilidades, presets y timings compartidos.
- `js/lucio-renderer.js`, `css/effects.css`: renderer visual compartido.
- `js/backpack-renderer.js`, `css/opening.css`: máquina y presentación de apertura compartidas.
- `js/game-state.js`: economía y estado puro, sin dependencia del DOM.
- `js/save.js`: validación y persistencia en `localStorage`.
- `js/collection.js`: categorías, duplicados, compactación y fade.
- `js/audio.js`: sonidos, pooling, mute y desbloqueo móvil.
- `js/debug.js`, `css/debug.css`: banco de pruebas opcional del juego.

## Herramientas de desarrollo

El panel `?debug=1` permite ajustar Mantecas, conceder variantes, poblar duplicados, forzar drops, abrir mochilas gratis y probar probabilidades temporales. No se monta en la URL normal.

## Guardado

El save contiene Mantecas, cantidades de las 12 variantes y estadísticas. La producción por tap nunca se guarda: se deriva siempre de `GAME_CONFIG`, por lo que los cambios de balance se aplican también a partidas existentes.

Las compras son transaccionales: el precio se descuenta, el reward se determina y se guarda antes de comenzar la animación. Recargar durante una apertura no pierde ni duplica el premio.

## Pruebas

Con el servidor local activo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\game-smoke.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\browser-smoke.ps1
```

La primera prueba cubre el juego y la segunda protege el playground compartido.

También existe `tests/game-browser-smoke.js`, usado para verificar el recorrido completo en 320×568, 390×844 y escritorio con Playwright. Requiere Playwright disponible en `NODE_PATH` y acepta URL, ancho y alto como argumentos.
