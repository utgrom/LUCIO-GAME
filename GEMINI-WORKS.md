# Registro de Cambios y Trabajo Realizado — Lucio Lootbox Clicker

Este documento detalla todas las características, sistemas, animaciones, correcciones de interfaz y herramientas de desarrollo implementadas en el proyecto desde el inicio del desarrollo del módulo de **Ambu (Amvorguezo)** hasta la evolución a **Ambu Niño**.

---

## 1. Módulo y Ciclo de Vida de Ambu Bebé (`baby`)

### 1.1. Desbloqueo por Producción Histórica
- **Criterio corregido:** El huevo misterioso no requiere tener 50.000 Mantecas en el saldo actual, sino haber producido un total histórico acumulado de `50.000` Mantecas (`stats.totalMantecasEarned >= 50000`). Si el jugador gasta sus mantecas, el progreso histórico se conserva y el huevo se desbloquea correctamente.
- **Notificación Toast de descubrimiento:** Al alcanzar la cuota histórica, se dispara una notificación de descubrimiento (*"Entre las barras de Manteca, distingues un huevo misterioso..."*).

### 1.2. Incubación y Mecánica de Eclosión
- **Coste de incubación:** `250.000` Mantecas.
- **Mecánica de 15 golpes:** Tras el pago, el cascarón requiere 15 toques para abrirse, con progresión de fisuras visuales:
  - 0–4 golpes: `Ambu_1.png` (huevo intacto).
  - 5–9 golpes: `Ambu_1_1.png` (primera grieta).
  - 10–14 golpes: `Ambu_1_2.png` (grieta avanzada).
  - 15 golpes: `Ambu_1_3.png` (a punto de romper).
- **Animación de nacimiento:** Al llegar al golpe 15, se dispara una animación de compresión y estiramiento elástico (`@keyframes ambu-egg-birth` / `triggerBirth`), seguida por la aparición de Ambu Bebé (`@keyframes ambu-baby-arrive`).
- **Toast de bienvenida:** *"NUEVO COMPAÑERO: Ambu bebé se ha unido a ti. Parece hambriento, curioso y cargado de una energía extraña."*

### 1.3. Producción Pasiva Centralizada y Banco Offline
- **Tasa pasiva base (Bebé):** 1 tap cada `1.000 ms` (1 tap/s).
- **Cálculo derivado centralizado:** `GameState.getPassiveRate()` centraliza la fórmula para sincronizar la economía online, la acumulación offline y la UI sin redundancias ni discrepancias.
- **Banco Offline (Bebé):** Capacidad equivalente a `3 horas` de producción pasiva (`ratePerSecond * 3 * 3600 = 10.800 🧈` con base 1).
- **Recolección manual:** Barra de progreso y botón de **Recoger** en la pantalla principal de tap.
- **Anti-Cheat (Rollback Protection):** Los retrocesos en el reloj del dispositivo generan una deuda de tiempo (`timeDebtMs`) que congela la producción offline hasta que el desfase temporal es amortizado de forma natural.

---

## 2. Sistema de Animaciones y Renderizado de Ambu

### 2.1. Respiración Idle Continua
- Implementada mediante `@keyframes ambu-baby-breathe` con deformación vertical/horizontal suave (`scale(0.985, 1.025)`) y duración configurable (por defecto `4.0s`).
- Funciona de forma no intrusiva tanto en Ambu Bebé como en Ambu Niño.

### 2.2. Sistema de Parpadeo Natural (Natural Blinking)
- **Duración fija de ojos cerrados:** Establecida estrictamente en `160 ms` para una sensación orgánica.
- **Distribución de probabilidad realista:**
  - `70%`: Parpadeo común (pausa de 2.5s a 4.5s).
  - `20%`: Parpadeo rápido (pausa de 1.0s a 2.5s).
  - `10%`: Parpadeo largo (pausa de 4.5s a 8.0s).
- **Doble parpadeo (15% de probabilidad):** Secuencia de parpadeo doble con pausa intermedia corta (100ms a 250ms).

### 2.3. Optimización GPU de Parpadeo (Eliminación de Frame Drops)
- **Problema previo:** El intercambio de `img.src` provocaba micro-latencias y pérdidas de fotogramas aleatorias debido a la recarga de textura del motor del navegador.
- **Solución implementada:** Se integró una capa superpuesta permanente (`[data-ambu-sprite-closed]`) con aceleración por hardware (`opacity: 0` / `opacity: 1`), garantizando `0 ms` de latencia y eliminando el 100% de parpadeos no mostrados.

### 2.4. Fondo Difuminado 100% Estático
- Se separó por completo la imagen difuminada de fondo en la vista de Tap (`[data-tap-ambu-backdrop]`) de la lógica activa de parpadeos y animaciones.
- Muestra de forma fija y limpia la criatura actual (`Ambu_1.png`, `Ambu_2.png` o `Ambu_3.png`) sin overlays ni timers redundantes.

---

## 3. Formateo de Grandes Números (hasta el Decillón $10^{33}$)

### 3.1. Escalado a partir de 1 Millón
- Para cifras $< 1.000.000$: Formato estándar de enteros con separadores de miles (ej. `950.000 🧈`).
- Para cifras $\ge 1.000.000$: Se escala el número dividiéndolo por su orden de magnitud y mostrando `3 decimales` (ej. `10,000` con el subtítulo `Millones de 🧈` debajo).

### 3.2. Tabla de Órdenes de Magnitud Implementada
| Exponente | Rango | Subtítulo |
|---|---|---|
| $10^6$ | $1.000.000$ a $999.999.999$ | `Millones de 🧈` |
| $10^9$ | $10^9$ a $10^{12}-1$ | `Billones de 🧈` |
| $10^{12}$ | $10^{12}$ a $10^{15}-1$ | `Trillones de 🧈` |
| $10^{15}$ | $10^{15}$ a $10^{18}-1$ | `Cuatrillones de 🧈` |
| $10^{18}$ | $10^{18}$ a $10^{21}-1$ | `Quintillones de 🧈` |
| $10^{21}$ | $10^{21}$ a $10^{24}-1$ | `Sextillones de 🧈` |
| $10^{24}$ | $10^{24}$ a $10^{27}-1$ | `Septillones de 🧈` |
| $10^{27}$ | $10^{27}$ a $10^{30}-1$ | `Octillones de 🧈` |
| $10^{30}$ | $10^{30}$ a $10^{33}-1$ | `Nonillones de 🧈` |
| $10^{33}$ | $10^{33}+$ | `Decillones de 🧈` |

### 3.3. Consulta de Cifra Exacta
- Al hacer clic o tocar la tarjeta de mantecas (`.wallet-card` o `.ambu-wallet`), se despliega una notificación Toast interactiva indicando la cifra sin redondear:
  - *"Cantidad exacta de mantecas: 10.000.000 🧈"*

---

## 4. Evolución a Ambu Niño (`child`)

### 4.1. Parámetros y Costes
- **Coste de evolución:** `10.000.000` Mantecas.
- **Tasa pasiva:** 1 tap cada `900 ms` (~1,11 taps/s).
- **Capacidad offline extendida:** `6 horas` (`ratePerSecond * 6 * 3600 = 24.000 🧈` con base 1).

### 4.2. Botón y Modal de Evolución
- **Botón `EVOLUCIÓN`:** Barra destacada con gradiente dorado y destellos entre el contador de mantecas y Ambu (visible únicamente en etapa Bebé).
- **Modal de Crecimiento (`[data-ambu-evolution-dialog]`):**
  - **Lore:** *"Con una dieta basada en grasas, Ambu ha duplicado su tamaño. Su consciencia se desarrolla y sus sentidos se agudizan, despertando cierta curiosidad por los lucios..."*
  - **Beneficios:**
    - `1 tap cada 1s ➔ 1 tap cada 0,9s`
    - `Límite de mantecas offline 3 hs ➔ 6 hs`
    - `✦ "Ambu despierta curiosidad por los Lucios..." Desbloquea las auras.`
  - **Botón de compra:** `Evolucionar · 10.000.000 🧈` con validación de saldo en tiempo real.

### 4.3. Efectos y Transformación
- **Animación de destello:** `@keyframes ambu-evolve-flare` y método `triggerEvolution` en `AmbuRenderer`.
- **Notificación Toast:** *"Ambu ha crecido y ahora es Ambu Niño."*
- **Subtítulo en vista de Ambu:** *"Ha crecido y tiene una curiosidad arrolladora"*.
- **Sprite:** Actualizado a `Ambu_3.png` y parpadeo con `Ambu_3_closedEyes.png`.
- **Formato de tarjeta de producción:** `1 Tap / 0,9s (<mantecas> 🧈/s)`.
- **Diálogo de información (Lore & Stats):** Actualizado dinámicamente con la historia y estadísticas de Ambu Niño.
- **Persistencia:** Guardado inmediato y supervivencia total a recargas o importaciones.

---

## 5. Ajustes de Interfaz, Consistencia y UX

- **Consistencia Desktop / Mobile:** Ajuste del escalado de botones, fuentes y tarjetas de notificación para asegurar proporciones uniformes en pantallas de PC y dispositivos móviles.
- **Claridad en tasa pasiva:** Formato explícito `1 Tap / s (<mantecas> 🧈/s)` para evitar confusión entre pulsos y cantidad de mantecas.
- **Toasts unificados:** Sistema de notificaciones no intrusivo con soporte para tonos temáticos (`discovery`, `success`, `warning`, `error`).
- **Accesibilidad y navegación:** Soporte para teclado (Tab / Enter), atributos `aria-live`, etiquetas semánticas y diálogos accesibles.

---

## 6. Playground Visual (`playground.html` & `js/playground.js`)

Se integró una suite de experimentación visual aislada en la Sección 03 del Playground:
- Selector de todas las etapas de Ambu (`egg`, `crack1`, `crack2`, `crack3`, `baby`, `child`).
- Controles de respiración (activación y slider de velocidad de ciclo).
- Disparadores rápidos: Parpadeo simple, doble parpadeo, bloqueo manual de ojos cerrados (`Hold`), animación de tap, ejecución de eclosión y ejecución de evolución.
- Monitoreo en tiempo real de estados del renderizador (frecuencia, tiempo hasta el siguiente parpadeo, estado de parpadeo).

---

## 7. Pruebas Automatizadas y Calidad de Código

- Se añadieron aserciones completas en [`tests/game-smoke.ps1`](file:///d:/PROYECTS/LUCIO%20GAME/tests/game-smoke.ps1) ejecutadas directamente sobre Chrome/Edge Headless vía Chrome DevTools Protocol (CDP).
- **Cobertura probada:**
  - Descubrimiento por mantecas históricas.
  - Incubación, 15 golpes y eclosión.
  - Producción pasiva online y banco offline con anti-cheat.
  - Parpadeo por GPU y respiración idle.
  - Escalado de números grandes y pop-up de cifra exacta.
  - Rechazo de evolución con $<10\text{M}$ y compra exitosa con $10\text{M}$.
  - Nuevas tasas (900ms, 6h) y persistencia en recarga.
  - Validación en Playground de todas las etapas.
- **Resultado:** 100% de pruebas pasadas exitosamente sin errores en consola ni excepciones de runtime.
