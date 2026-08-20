# GDD — MatencaClicker / Lucio Lootbox Clicker

> Documento vivo de diseño y hoja de ruta.
>
> Última actualización: 14 de agosto de 2026.

## 1. Propósito del documento

Este documento reúne dos cosas que deben permanecer diferenciadas:

- el estado jugable actual, denominado provisionalmente **MatencaClicker v1**;
- el diseño previsto para las actualizaciones v2, v3 y v4.

La implementación existente sigue mostrando el nombre **Lucio Lootbox Clicker**. El nombre final del juego —incluida la grafía MatencaClicker/MantecaClicker— todavía debe confirmarse.

### Estados usados en el GDD

- **Implementado:** existe actualmente en el juego y fue probado.
- **Decidido:** forma parte del diseño futuro acordado, aunque todavía no esté programado.
- **Provisional:** define una dirección de diseño, pero admite cambios al prototipar.
- **Balance pendiente:** la mecánica está decidida, pero sus números no son definitivos.

Los números presentados como ejemplos no deben copiarse a la configuración de producción hasta convertirlos explícitamente en valores de balance.

---

## 2. Concepto general

MatencaClicker es un juego incremental web, mobile-first, centrado en producir **Mantecas**, abrir mochilas y coleccionar criaturas.

La fantasía general crece por capas:

1. el jugador produce Mantecas mediante taps;
2. gasta Mantecas para abrir mochilas y obtener Lucios;
3. los Lucios aumentan la producción, pero también se convierten en recursos estratégicos;
4. Amvorguezo introduce producción pasiva, crianza y auras fabricadas mediante sacrificios;
5. expediciones y combates convierten la colección en equipos y decisiones de riesgo;
6. los Gabos y el Gabrario agregan una economía de efectos positivos y negativos configurable por el jugador.

El objetivo no es castigar cada decisión con cálculos de rentabilidad visibles. La interfaz debe explicar con claridad **qué otorga una mejora y cuál es su precio**. El jugador decide si desea optimizar, coleccionar o simplemente avanzar para descubrir el siguiente desbloqueo.

---

## 3. Pilares de diseño

### 3.1 Progreso visible

Siempre debe existir algo reconocible por desbloquear: una criatura, etapa, aura, región, mochila, marca o nueva interacción entre sistemas.

### 3.2 Colección con utilidad

Los duplicados no son residuos. Producen Mantecas, pueden ser destinados a expediciones o consumirse en progresiones permanentes.

### 3.3 Sacrificios significativos

Perder producción temporal o permanente puede doler, pero debe desbloquear una mejora clara o una pieza importante de progreso. No es necesario mostrar un cálculo de recuperación de inversión.

### 3.4 Juego incremental de baja exigencia

Las decisiones pueden tener profundidad, pero no deben depender de reflejos ni de ventanas de reacción cortas. El combate será sencillo y por turnos; las expediciones serán asincrónicas.

### 3.5 Combinaciones emergentes

Las auras y efectos deben combinarse mediante reglas comprensibles. En producción no se crearán “resonancias” arbitrarias sólo para declarar qué combinación es correcta: los buenos combos deben emerger de sus efectos individuales.

Las resonancias explícitas se reservan para el combate, donde pueden aportar identidad táctica y legibilidad.

### 3.6 Costes y probabilidades configurables

Balance, probabilidades, límites, duraciones y efectos deben vivir en configuración central. La presentación nunca debe ser la fuente de verdad.

---

## 4. Glosario

| Término | Definición |
|---|---|
| Mantecas | Moneda principal. Se obtiene por tap y, desde v2, mediante producción pasiva de Amvorguezo. |
| Lucio | Criatura coleccionable de uno de seis materiales. Cada copia aporta producción por tap mientras está disponible. |
| Lucio Shiny | Variante excepcional de un material. Tiene bonus propio y no se calcula mediante una fórmula sobre el Lucio normal. |
| Mochila | Lootbox comprada con Mantecas. La Normal, Grande y Mega poseen precios y probabilidades diferentes. |
| Amvorguezo | Criatura que se cría desde un huevo, produce Mantecas pasivamente y asimila Lucios para crear auras. |
| Aura material | Mejora permanente desbloqueada sacrificando Lucios de un material. Puede equiparse y también determina el séquito de combate. |
| Lucio Multimaterial | Lucio especial de final de progresión de Amvorguezo. Su primer ejemplar se crea mediante un gran sacrificio y luego entra al sistema de drops. |
| Expedición | Actividad asincrónica y parcialmente ciega a la que se envían Lucios junto con una ración de Mantecas. |
| Gabo | Criatura obtenida principalmente mediante expediciones. Al ser desplegada en el Gabrario aporta un beneficio y una desventaja acumulables. |
| Gabo Puro | Equivalente excepcional del Gabo. Conserva su beneficio y no posee desventaja. No se denomina “Shiny”. |
| Gabrario | Habitación/corral donde los Gabos desplegados se mueven y convocan sus efectos. Tiene capacidad limitada. |
| Morgryn | Alma azul que habita una armadura y administra el Gabrario. Consume Gabos para evolucionar y desbloquear mejoras. |
| Marca mágica | Modificador global del Gabrario. Sólo una puede estar activa y cambiarla impone una espera. |

---

## 5. Hoja de ruta

| Versión | Tema central | Estado |
|---|---|---|
| v1 | Clicker, mochilas, 12 Lucios, colección y playground | Implementado |
| v2 | Huevo, crianza de Amvorguezo y auras de material | En progreso (Huevo, eclosión, Ambu bebé, producción pasiva 1 tap/s, banco offline 3h y anti-cheat implementados; auras y etapas niño a maestro pendientes) |
| v3 | Expediciones asincrónicas y combate simple por turnos | Diseño en definición |
| v4 | Gabos, Gabrario, Morgryn y auras Gábicas | Diseño en definición |

Cada actualización debe ser jugable por sí sola. No debe requerirse implementar v4 para que v2 tenga una progresión satisfactoria.

---

# Parte I — MatencaClicker v1

## 6. Estado actual

La v1 es una web estática sin build tools. Utiliza HTML, CSS, JavaScript y `localStorage`. Funciona en teléfono y escritorio.

### 6.1 Loop principal

```text
Tap
  ↓
Ganar Mantecas
  ↓
Comprar mochila
  ↓
Abrir y revelar Lucio
  ↓
Sumar una copia a la colección
  ↓
Aumentar permanentemente las Mantecas por tap
```

### 6.2 Producción por tap

El jugador comienza con **1 Manteca por tap**.

```text
Mantecas por tap = producción base
                   + Σ(copias disponibles × bonus individual)
```

En v1 todas las copias obtenidas están disponibles. A partir de v2/v3 la fórmula deberá excluir las copias sacrificadas y las enviadas a expedición.

El valor por tap es derivado. No se guarda en el save.

### 6.3 Lucios implementados

| Variante | Bonus por tap |
|---|---:|
| Bronce | +1 |
| Plata | +3 |
| Oro | +5 |
| Rubí | +10 |
| Diamante | +20 |
| Cósmico | +30 |
| Bronce Shiny | +31 |
| Plata Shiny | +33 |
| Oro Shiny | +35 |
| Rubí Shiny | +40 |
| Diamante Shiny | +50 |
| Cósmico Shiny | +60 |

Los seis Shiny son entradas de balance independientes. Que hoy sus valores se parezcan a `material + 30` no constituye una regla.

### 6.4 Mochilas implementadas

| Mochila | Precio | Shiny |
|---|---:|---:|
| Normal | 50 Mantecas | 2% |
| Grande | 1.000 Mantecas | 5% |
| Mega | 10.000 Mantecas | 10% |

#### Probabilidad de material

| Material | Normal | Grande | Mega |
|---|---:|---:|---:|
| Bronce | 55% | 35% | 20% |
| Plata | 25% | 30% | 25% |
| Oro | 12% | 18% | 22% |
| Rubí | 5% | 10% | 15% |
| Diamante | 2,5% | 5,5% | 12% |
| Cósmico | 0,5% | 1,5% | 6% |

El material y la propiedad Shiny se sortean por separado. El reward queda determinado antes de reproducir la apertura.

### 6.5 Apertura

La secuencia implementada es:

```text
Entrada de mochila
  ↓
Tres taps con shake
  ↓
Mochila abierta
  ↓
Lucio Mistery
  ↓
Cambio al drop real
  ↓
Nombre y bonus
  ↓
Confirmación explícita
```

La entrada y el reveal admiten skip. Una vez visible el resultado, sólo el botón **Confirmar** cierra la secuencia.

El Lucio Mistery conserva la geometría de la animación y se reemplaza por el resultado durante el reveal mediante fade.

#### Timings efectivos por reward

| Reward | Subida | Reveal | Punto de cambio Mistery |
|---|---:|---:|---:|
| Normal, Bronce–Oro | 1.400 ms | 1.500 ms | 0,35 |
| Normal, Rubí–Cósmico | 1.400 ms | 1.500 ms | 0,65 |
| Shiny, Bronce–Rubí | 2.400 ms | 3.000 ms | 0,65 |
| Shiny, Diamante–Cósmico | 2.400 ms | 3.000 ms | 0,95 |

Parámetros comunes actuales:

| Parámetro | Valor |
|---|---:|
| Entrada | 760 ms |
| Shake | 16 px, 310 ms, 5° |
| Escala de impacto | 1,08 |
| Flash | 660 ms, intensidad 0,85 |
| Apertura | 650 ms |
| Delay antes del Lucio | 680 ms |
| Distancia de subida | 30 px |
| Bounce final | 1,15 |
| Fade Mistery/drop | 480 ms |

### 6.6 Renderer visual

Un único renderer compone los Lucios de apertura, colección y playground. Sus capas son:

```text
Glow de silueta
  ↓
Sprite base
  ↓
Overlay del material
  ↓
Destellos normales
  ↓
Modificador Shiny: borde, destellos Shiny, shine sweep y pulsación propia
```

El glow se aplica sobre el sprite base. Los destellos normales y Shiny son overlays. El canvas visual posee margen suficiente para que el idle y los efectos no se recorten.

Los rayos se descartaron del modificador Shiny. El shiny genérico actual se configura por separado del preset de cada material.

### 6.7 Colección

- Las categorías no aparecen hasta ser descubiertas.
- El orden fijo es: seis normales y luego seis Shiny.
- Cada duplicado se representa visualmente.
- A partir de un umbral, las copias reducen su separación.
- En colecciones grandes, las últimas copias se desvanecen y terminan en una elipsis.
- La cantidad real siempre se conserva en el encabezado.

La v3 añadirá un estado y una vista **En expedición** sin borrar el descubrimiento histórico de la categoría.

### 6.8 Sonido

| Evento | Audio |
|---|---|
| Tap productivo | `popsound.ogg` |
| Interfaz | `tapsound.ogg` |
| Cada tap de mochila | `backpackshake.mp3` |
| Apertura de mochila | `openbackpacksound.ogg` |
| Reveal Bronce–Oro | `lucioprizerevealsfx.ogg` |
| Reveal Rubí–Cósmico | `betterlucioprizerevealsfx.ogg` |
| Reveal de cualquier Shiny | `evenbetterlucioprizerevealsfx.ogg` |
| Aparición de Mistery para un futuro Shiny | `shinysfx.mp3` |

El mute se guarda localmente y los sonidos de taps rápidos utilizan voces superpuestas.

### 6.9 Persistencia y herramientas

El save v1 almacena:

- Mantecas actuales;
- cantidades de las 12 variantes;
- taps totales;
- mochilas abiertas;
- Mantecas históricas ganadas y gastadas;
- versión de save.

El playground permite ajustar efectos y aperturas. El modo `?debug=1` permite conceder recursos, forzar drops y alterar probabilidades sin exponer esas herramientas en el juego normal.

### 6.10 Arquitectura actual

| Archivo/sistema | Responsabilidad |
|---|---|
| `index.html`, `css/game.css`, `js/game.js` | Interfaz y coordinación del juego |
| `playground.html`, `css/playground.css`, `js/playground.js` | Laboratorio de FX y aperturas |
| `js/config.js` | Balance, probabilidades, presets y timings |
| `js/lucio-renderer.js`, `css/effects.css` | Renderer compartido de Lucios |
| `js/backpack-renderer.js`, `css/opening.css` | Máquina de estados de apertura |
| `js/game-state.js` | Economía y acciones sin dependencia del DOM |
| `js/save.js` | Validación, migración y `localStorage` |
| `js/collection.js` | Colección, compactación y fade |
| `js/audio.js` | Audio, pooling y mute |
| `js/debug.js`, `css/debug.css` | Herramientas opcionales de desarrollo |

---

# Parte II — Update v2: Amvorguezo y auras

## 7. Objetivo de v2

**Decidido.** La v2 agrega un segundo gran destino para las Mantecas y convierte a los duplicados de Lucio en un recurso de progresión permanente.

El jugador compra un huevo, lo alimenta, lo hace eclosionar y cría a Amvorguezo. A partir de bebé, Amvorguezo produce Mantecas pasivamente. Al crecer, aprende a asimilar materiales y equipar auras.

## 8. Loop de crianza

```text
Comprar huevo con Mantecas
  ↓
Alimentar el huevo con Mantecas
  ↓
Pagar/completar la eclosión
  ↓
Amvorguezo bebé produce pasivamente
  ↓
Invertir Mantecas para crecer
  ↓
Sacrificar Lucios para fabricar auras
  ↓
Equipar auras y modificar producción/combate
```

Los pasos de huevo, alimentación y eclosión son gastos impulsados inicialmente por la curiosidad. La producción comienza recién al nacer.

### 8.1 Primer hito: del hallazgo a Ambu Bebé

**Implementado.** El primer contacto con Ambu sigue esta secuencia:

1. Al alcanzar por primera vez `50.000` Mantecas producidas históricamente (`stats.totalMantecasEarned`), se descubre el huevo. El hallazgo es permanente aunque el saldo actual se gaste o disminuya.
2. Se muestra una sola vez el mensaje en toast: “Entre las barras de Manteca, distingues un huevo misterioso...”.
3. Se habilita desde Tap una flecha destacada con el icono del huevo que abre la vista de Ambu.
4. Tocar el huevo antes de pagar sólo lo agita; no da recursos ni progreso.
5. Eclosionarlo cuesta `250.000` Mantecas.
6. Después del pago se requieren `15` golpes persistentes al cascarón:
   - golpes `0–4`: `Ambu_1.png`;
   - golpes `5–9`: `Ambu_1_1.png`;
   - golpes `10–14`: `Ambu_1_2.png`;
   - golpe `15`: `Ambu_1_3.png`.
7. Tras el golpe 15, el huevo se estira y comprime antes de transformarse en `Ambu_2.png`, desbloqueando a **Ambu Bebé**.
8. Al nacer, se presenta un PopUp de bienvenida:
   - *NUEVO COMPAÑERO: Ambu bebé se ha unido a ti. Parece hambriento, curioso y cargado de una energía extraña.*
9. En la vista de Ambu bebé se muestra la tarjeta de producción pasiva (`1 Tap / s`) y un botón circular de información (`assets/UI/AmbuInfoButton.png`) que despliega la descripción y estadísticas de la criatura.

El pago, cada golpe, el nacimiento, las Mantecas pasivas y el banco offline se guardan inmediatamente. Una recarga no puede duplicar el coste, perder golpes ni alterar la progresión.

## 9. Etapas de Amvorguezo

| Etapa | Producción y sistemas | Estado |
|---|---|---|
| Huevo | Se descubre con 50k históricas, se compra por 250k y se eclosiona con 15 taps. | Implementado |
| Bebé | Comienza la producción pasiva (1 tap cada 1.000 ms), banco offline de 3 horas, respiración y parpadeo GPU. | Implementado |
| Niño | Cuesta 10.000.000 Mantecas. Aumenta producción pasiva a 1 tap cada 900 ms, banco offline de 6 horas, sprite `Ambu_3.png` y fondo estático. Prepara el sistema de auras. | Implementado |
| Joven | Permite mejorar auras a nivel 2 y mejora su capacidad de combate. | Decidido |
| Adulto | Permite equipar dos auras simultáneamente y mejora su capacidad de combate. | Decidido |
| Maestro | Desbloquea auras nivel 3, creación del Lucio Multimaterial, auras Gábicas de v4 y nuevas ventajas de combate. | Decidido |

Ambu Bebé ejecuta un pulso equivalente al valor actual de un tap cada `1.000 ms`. Ambu Niño reduce ese intervalo a `900 ms` (~1,11 taps/s) y extiende el banco offline a 6 horas.

## 10. Producción pasiva y offline

**Implementado (etapas Bebé y Niño).** Amvorguezo es el responsable de la producción pasiva y offline. Los Lucios aportan al valor por tap.

La cifra mostrada como **Mantecas/s** es siempre una tasa final derivada centralizada (`GameState.getPassiveRate()`), no un valor fijo ni un simple contador de taps. Conceptualmente:

```text
Pulsos por segundo = 1.000 / intervalo actual en milisegundos

Producción pasiva base = valor actual por tap
                         × pulsos por segundo

Mantecas/s finales = producción pasiva base
                     × modificadores de velocidad
                     × modificadores de producción pasiva
                     × otros efectos explícitos
```

La economía expone una única función centralizada (`GameState.getPassiveRate()`) para calcular esta tasa final. La interfaz, la acumulación online, la producción offline y las futuras recompensas consultan esa misma función, evitando duplicar fórmulas o guardar `Mantecas/s` como un dato independiente.

**Detalle del sistema implementado:**
- **Bebé**: intervalo de `1.000 ms` (1 tap/s) y capacidad offline de 3 horas (`ratePerSecond * 3 * 3600`).
- **Niño**: coste de evolución de `10.000.000 🧈`, intervalo de `900 ms` (~1,11 taps/s) y capacidad offline de 6 horas (`ratePerSecond * 6 * 3600`).
- **Formateo de Grandes Números**: a partir de 1.000.000, los contadores de Mantecas se abrevian con 3 decimales (ej. `10,000` con subtítulo `Millones de 🧈`), escalando cada 3 ceros hasta `Decillones` ($10^{33}$). Al pulsar el contador se muestra un toast con la cifra exacta sin redondear.
- **Acumulación Online**: bucle continuo vía `requestAnimationFrame` que acredita Mantecas al saldo activo.
- **Banco Offline**: acumulación de tiempo en segundo plano con botón manual de **Recoger**.
- **Anti-Cheat (Rollback)**: los retrocesos del reloj del dispositivo se registran como deuda temporal (`timeDebtMs`) que debe amortizarse antes de generar nuevas Mantecas offline.

## 11. Auras de material

Amvorguezo obtiene un aura consumiendo Lucios y asimilando su material. El sacrificio reduce de inmediato las copias disponibles y, por lo tanto, la producción por tap aportada por ellas.

La interfaz debe mostrar:

- efecto de la mejora;
- precio en Lucios;
- copias disponibles antes de confirmar;
- una confirmación clara por tratarse de un consumo irreversible.

No debe mostrar obligatoriamente cuánto tiempo tardará el jugador en recuperar el coste.

### 11.1 Niveles

| Nivel | Requisito general | Uso productivo | Séquito de combate previsto |
|---|---|---|---|
| Aura I | Amvorguezo Niño; Lucios normales del material | Efecto base | 3 Lucios normales del material |
| Aura II | Amvorguezo Joven; más Lucios normales | Efecto mejorado | 5 Lucios normales del material |
| Aura III | Amvorguezo Maestro; Lucios Shiny | Efecto de final de juego | 5 Lucios Shiny del material |

Los números de sacrificio todavía no están fijados. Ejemplos conversados como “25 Bronce” o “50 Bronce” ilustran la UX, no el balance final.

### 11.2 Equipamiento

- Niño y Joven: un espacio activo.
- Adulto y Maestro: dos espacios activos.
- Las auras desbloqueadas permanecen disponibles para intercambiarse.
- Una aura no equipada conserva su progreso, pero no aplica sus efectos activos.
- La interfaz debe permitir comparar el efecto de las auras antes de cambiar.

El coste o enfriamiento para intercambiar auras normales no está definido. No debe añadirse sin una decisión de balance.

### 11.3 Identidad de cada material

Las seis auras deben tener una función productiva y una función de combate coherentes con su material. El detalle todavía está pendiente.

Ejemplo de presentación, no de balance definitivo:

```text
Bronce I
Multiplica ×1,25 la producción pasiva de Mantecas.
Precio: 25 Lucios Bronce.
```

### 11.4 Resonancias

- **Producción:** no existen resonancias predefinidas. Las combinaciones nacen de las reglas individuales.
- **Combate:** dos auras equipadas sí pueden desbloquear una resonancia o interacción táctica específica.

## 12. Amvorguezo Maestro y Lucio Multimaterial

### 12.1 Acceso a Maestro

**Decidido.** Desbloquear todas las auras materiales de nivel 2 habilita la evolución a Amvorguezo Maestro.

### 12.2 Gran sacrificio

Una vez Maestro, Amvorguezo ofrece una opción extraordinaria:

1. sacrificar todas las auras materiales construidas;
2. obtener el primer **Lucio Multimaterial**;
3. registrar ese Lucio en la colección;
4. desbloquear permanentemente su aparición futura como drop;
5. habilitar la fabricación del aura Multimaterial.

Amvorguezo no deja de ser Maestro tras el sacrificio. Las auras se pierden y deben reconstruirse, por lo que sus beneficios desaparecen hasta volver a fabricarlas.

### 12.3 Alcance pendiente

Todavía debe definirse:

- probabilidad del Lucio Multimaterial;
- qué mochilas pueden contenerlo;
- si se resuelve como material propio o como reemplazo posterior al roll normal;
- bonus por tap;
- existencia o no de una variante excepcional equivalente a Shiny;
- efecto productivo y habilidad de combate de su aura.

Por ahora no se asume que exista un Multimaterial Shiny.

## 13. Criterios de finalización de v2

La v2 estará completa cuando:

- el huevo pueda comprarse, alimentarse y eclosionar;
- Amvorguezo produzca Mantecas pasivas y offline de forma persistente;
- todas las etapas hasta Adulto tengan progresión funcional;
- las seis auras I y II puedan fabricarse, equiparse y cambiarse;
- Adulto permita dos espacios;
- Maestro y el gran sacrificio estén disponibles;
- el Lucio Multimaterial pueda registrarse y entrar al loot futuro;
- el save v1 migre sin pérdida de colección ni Mantecas.

---

# Parte III — Update v3: expediciones y combate

## 14. Objetivo de v3

La v3 convierte la colección en una fuente de decisiones temporales. Se divide en dos sistemas relacionados pero distintos:

- expediciones asincrónicas, protagonizadas por equipos elegidos por el jugador;
- combates por turnos, encabezados por Amvorguezo y definidos por sus auras.

No habrá mecánicas rítmicas ni pruebas de reflejos.

## 15. Expediciones

### 15.1 Flujo

```text
Elegir destino
  ↓
Revisar duración, información disponible y riesgo
  ↓
Elegir equipo de Lucios
  ↓
Pagar ración de Mantecas
  ↓
Esperar el tiempo de expedición
  ↓
Recibir informe y recompensas
```

Las expediciones son “blind” en el sentido de que el jugador conoce indicios, dificultad y riesgo, pero no el resultado exacto. La preparación y la composición del equipo importan.

### 15.2 Lucios ocupados

**Decidido.** Todo Lucio enviado queda temporalmente ocupado y deja de aportar producción por tap hasta regresar.

La regla se aplica por copia, sin excepciones:

- un Lucio normal enviado deja de producir;
- un Lucio Shiny enviado también deja de producir;
- el bonus se resta al comenzar la expedición y vuelve al finalizarla;
- el Lucio sigue contando como descubierto y como propiedad total del jugador.

La colección tendrá una pestaña o filtro **En expedición**. Cada categoría debe diferenciar al menos:

```text
Total poseído
Disponible
En expedición
```

No se ha decidido que un fallo de expedición destruya permanentemente Lucios. Hasta que se acuerde lo contrario, el riesgo afecta resultados y recompensas, no la propiedad de las unidades.

### 15.3 Coste de ración

Cada expedición consume Mantecas como ración. El coste puede depender de:

- duración;
- región;
- dificultad;
- tamaño del equipo.

La ración se paga al partir y funciona como sink adicional de Mantecas.

### 15.4 Propiedades de los Lucios

Cada material tendrá propiedades útiles para interpretar el riesgo de una expedición. Sus atributos exactos quedan pendientes. La selección debe ser comprensible sin requerir simulaciones externas.

### 15.5 Recompensas posibles

- progreso y desbloqueo de nuevas zonas del mapa;
- mochilas corruptas;
- recursos o modificadores de expedición;
- encuentros o recompensas especiales propios de una región.

El sistema de recompensas de v3 debe quedar preparado para incorporar Gabos. Sus drops se activarán junto con v4, cuando el recurso ya tenga uso en el Gabrario, salvo que se decida lanzar antes una colección-preview. Una vez activos, su obtención será mucho más lenta que la apertura de mochilas de Lucios.

## 16. Combate por turnos

### 16.1 Grupo

Amvorguezo lidera el combate. Las auras equipadas determinan qué materiales puede controlar y, por lo tanto, qué séquito lleva.

| Aura equipada | Séquito previsto |
|---|---|
| Nivel I | 3 Lucios normales del material |
| Nivel II | 5 Lucios normales del material |
| Nivel III | 5 Lucios Shiny del material |

Con dos auras, lleva dos tipos de Lucio. El séquito expresa la asimilación lograda por Amvorguezo al fabricar el aura.

**Provisional:** el séquito de combate se genera a partir del aura y no vuelve a descontar copias de la colección. Fabricar el aura ya fue el coste de asimilación. Esta regla deberá confirmarse al prototipar.

### 16.2 Turno básico

Las acciones base son:

- **Atacar**;
- **Defender**;
- **Habilidad Lucio**, determinada por el material/aura.

El jugador elige una acción sin presión de tiempo. La profundidad surge de:

- leer la intención o patrón del enemigo;
- decidir cuándo atacar o defender;
- administrar habilidades;
- elegir auras antes de la batalla;
- aprovechar resonancias de combate entre dos materiales.

### 16.3 Resonancias de combate

Las resonancias son efectos explícitos de parejas de auras. Sólo se aplican en combate y no añaden multiplicadores ocultos a la economía.

Su objetivo es:

- dar identidad a los equipos de doble aura;
- hacer útiles combinaciones que no sean las mejores para producir Mantecas;
- incentivar la reconstrucción y colección de múltiples auras.

### 16.4 Mochilas corruptas

Las mochilas corruptas son recompensas especiales de mapa, expedición o combate. Pueden contener Lucios que no aparecen en las tres mochilas comunes.

No se incorpora por defecto una etapa adicional de purificación de mochila. El reward puede entregarse directamente después de su apertura.

La lista de Lucios especiales, sus probabilidades y su relación con los Gabos quedan pendientes.

## 17. Criterios de finalización de v3

La v3 estará completa cuando:

- exista un mapa con al menos una progresión corta de destinos;
- se puedan crear equipos, pagar raciones e iniciar expediciones persistentes;
- las copias enviadas dejen de producir y aparezcan en **En expedición**;
- recargar la página no pierda timers, asignaciones ni recompensas;
- exista al menos un encuentro de combate completo por turnos;
- las seis auras tengan una habilidad de combate legible;
- el doble espacio de Adulto produzca equipos con dos materiales;
- las recompensas incluyan mochilas corruptas y posean el punto de extensión necesario para los Gabos de v4.

---

# Parte IV — Update v4: Gabos, Morgryn y Gabrario

## 18. Objetivo de v4

La v4 agrega una colección más lenta y estratégica. Los Gabos no se limitan a acumularse: el jugador elige cuáles despliega en una habitación viva y acepta simultáneamente sus beneficios y desventajas.

El sistema se apoya en tres fantasías:

- **coleccionar** Gabos mediante expediciones;
- **administrar** un corral mágico con capacidad limitada;
- **despertar** a Morgryn sacrificando parte de esa colección.

## 19. Gabos

### 19.1 Obtención

- Se obtienen principalmente mediante expediciones.
- Su cadencia es mucho menor que la de los Lucios.
- Pueden existir distintos tipos con efectos propios.
- Las probabilidades exactas dependen de región, dificultad y recompensa.

### 19.2 Efectos duales

Cada Gabo común posee:

- un beneficio pequeño;
- una desventaja pequeña;
- ambos se acumulan normalmente con otras copias desplegadas.

Ejemplo de escala, no balance final:

```text
Por cada Gabo de un tipo:
+1% de resistencia
-0,5% de producción
```

Con 50 copias desplegadas, antes de marcas u otros modificadores:

```text
+50% de resistencia
-25% de producción
```

El tope natural del apilamiento es la capacidad del Gabrario. Se prefieren efectos unitarios pequeños y visibles antes que un límite oculto por tipo.

### 19.3 Gabos Puros

Los Gabos excepcionales se llaman **Gabos Puros**, no Gabos Shiny.

- Conservan el beneficio de su tipo.
- No poseen desventaja.
- Su probabilidad de obtención es muy baja.
- Siguen ocupando un espacio del Gabrario.
- No necesitan purificación.

Un Gabrario compuesto únicamente por Gabos Puros y optimizado con una marca amplificadora es un objetivo extremo de final de juego. Su dificultad de obtención forma parte de la fantasía y no debe neutralizarse sólo porque su resultado sea muy potente.

## 20. Gabrario

### 20.1 Presentación

El Gabrario es una ventana separada de la colección de Lucios. Visualmente es una gran habitación o corral.

Desde la colección de Gabos, el jugador puede:

- enviar una copia al Gabrario;
- retirar una copia del Gabrario;
- ver qué Gabos están activos;
- revisar el total combinado de beneficios y desventajas;
- comprobar capacidad usada y máxima.

Los PNG de los Gabos desplegados se mueven libremente por la habitación mediante animaciones sencillas. Este movimiento es principalmente estético y no debe condicionar el cálculo de efectos.

### 20.2 Regla de activación

Sólo los Gabos presentes en el Gabrario aplican sus hechizos. Retirar una copia elimina inmediatamente tanto su beneficio como su desventaja.

La capacidad fuerza decisiones de composición. Si el límite fuera 50, el jugador podría desplegar como máximo 50 copias combinadas, no 50 de cada tipo.

### 20.3 Resumen de efectos

La UI debe mostrar por separado:

- contribución positiva total;
- contribución negativa total;
- modificación causada por la marca activa;
- resultado efectivo final;
- Gabos Puros y comunes desplegados.

No debe ocultar las desventajas dentro de un único “poder total”.

## 21. Morgryn

### 21.1 Concepto

Morgryn es el alma azul de un ser que reside en una armadura. Es el administrador diegético del Gabrario y una segunda progresión de mascota, paralela a Amvorguezo.

Morgryn se alimenta sacrificando Gabos. Esos Gabos se eliminan de la colección disponible.

### 21.2 Evolución visual

La progresión conceptual es:

1. alma dormida dentro de una armadura caída;
2. el alma y la armadura comienzan a brillar;
3. casco flotante;
4. casco con manos flotantes;
5. torso flotante;
6. cuerpo completo con armadura;
7. forma máxima con un brillo del alma mucho más potente.

Los nombres, costes y cortes exactos entre etapas son balance pendiente.

### 21.3 Mejoras de Morgryn

Al evolucionar, Morgryn permite:

- aumentar gradualmente la capacidad del Gabrario;
- desbloquear marcas mágicas;
- acceder, al máximo, a sacrificios de excedentes y auras Gábicas.

La distribución exacta de cada desbloqueo entre las siete apariencias todavía no está fijada.

## 22. Marcas mágicas

Sólo una marca puede estar activa. Después de cambiarla, deben transcurrir **10 minutos** antes de poder cambiar nuevamente.

La espera debe persistir al cerrar o recargar el juego.

### 22.1 Marca amplificadora

Propuesta numérica actual:

- beneficios del Gabrario ×1,5;
- desventajas del Gabrario ×2.

Esto interpreta “50% más de beneficios y 100% más de desventajas”. Los multiplicadores siguen sujetos a balance.

### 22.2 Marca reductora

Propuesta numérica actual:

- reduce en 10% la magnitud de todos los efectos negativos del Gabrario;
- los beneficios permanecen sin cambios.

En fórmula: desventajas ×0,9.

### 22.3 Marca purificadora

Durante 10 minutos:

- elimina los efectos negativos de los Gabos afectados;
- conserva sus beneficios;
- al terminar, los Gabos purificados mueren y se eliminan de la colección.

La purificación es artificial y, por eso, fatal. No convierte permanentemente un Gabo común en Gabo Puro.

Antes de implementar deben resolverse estas interacciones:

- si afecta a los Gabos Puros presentes;
- si sólo marca a las copias desplegadas al activarse o también a las añadidas durante los 10 minutos;
- si retirar un Gabo purificado evita o no su muerte.

La implementación debe impedir que retirar y volver a colocar copias cancele accidentalmente una sentencia de purificación ya aceptada.

## 23. Morgryn máximo y excedentes

Una vez maximizado Morgryn, los Gabos adicionales mantienen dos usos:

### 23.1 Conversión a Mantecas

El jugador puede sacrificar Gabos para recibir una cantidad de Mantecas equivalente a cierto número de minutos de producción pasiva.

**Balance pendiente:** minutos por tipo/rareza, fuente exacta de la tasa pasiva usada en el cálculo y existencia de límites o enfriamientos.

### 23.2 Auras Gábicas

Los Gabos pueden sacrificarse para fabricar auras Gábicas para Amvorguezo.

- Sólo Amvorguezo Maestro puede utilizarlas.
- No poseen niveles I, II y III.
- Algunas potencian el Gabrario.
- Otras aportan directamente a la producción de Mantecas.
- Sus recetas pueden requerir tipos o cantidades específicas de Gabos.

Las auras Gábicas ocupan espacios de aura de Amvorguezo salvo que el balance futuro defina una ranura especial.

## 24. Criterios de finalización de v4

La v4 estará completa cuando:

- exista una colección persistente de Gabos comunes y Puros;
- los Gabos puedan desplegarse y retirarse del Gabrario;
- sus efectos positivos y negativos se acumulen correctamente;
- la capacidad impida exceder el máximo;
- el corral muestre los PNG con movimiento liviano y buen rendimiento móvil;
- Morgryn pueda alimentarse y recorrer todas sus etapas;
- las tres marcas funcionen con cooldown persistente;
- la purificación resuelva de forma segura el temporizador y la muerte de copias;
- los excedentes puedan convertirse en Mantecas o auras Gábicas;
- el save migre desde las versiones anteriores sin duplicar ni perder recursos.

---

# Parte V — Reglas compartidas e implementación futura

## 25. Estados de inventario

La v1 sólo guarda una cantidad por variante. Eso no será suficiente a partir de v2.

Cada familia de criatura debe distinguir conceptualmente:

```text
Descubierto históricamente
Poseído actualmente
Disponible
Ocupado/asignado
Consumido históricamente
```

### 25.1 Lucios

```text
Disponibles = poseídos - en expedición - otras reservas temporales
```

- Sacrificar para un aura reduce `poseídos` de forma permanente.
- Enviar a expedición sólo aumenta `en expedición` temporalmente.
- Una categoría descubierta nunca vuelve a ocultarse aunque `poseídos` llegue a cero.
- Sólo las copias disponibles aportan producción por tap.

### 25.2 Gabos

```text
Disponibles = poseídos - desplegados - reservados por actividad
```

- Desplegar en el Gabrario no consume la copia.
- Alimentar a Morgryn, purificar hasta la muerte, convertir en Mantecas o fabricar un aura sí la consume.
- Un Gabo Puro debe identificarse independientemente del tipo base.

## 26. Fórmulas económicas conceptuales

### 26.1 Tap

```text
Tap = baseTap
      + Σ(Lucios disponibles × bonus por tap)
      aplicado luego por los modificadores activos correspondientes
```

### 26.2 Producción pasiva

```text
Pasiva = producción base de la etapa de Amvorguezo
          × modificadores de auras equipadas
          × modificadores activos del Gabrario
          × otros modificadores explícitos
```

El orden exacto de suma y multiplicación deberá centralizarse para evitar resultados distintos entre UI, offline y recompensas expresadas en “minutos de producción”.

### 26.3 Efectos del Gabrario

```text
Beneficio bruto = Σ(beneficio unitario × copias activas)
Desventaja bruta = Σ(desventaja unitaria × copias activas)

Resultado = aplicar marca activa
            + modificadores de auras Gábicas
            + reglas específicas del sistema afectado
```

## 27. Fuentes y destinos de recursos

| Recurso | Fuentes principales | Destinos principales |
|---|---|---|
| Mantecas | Tap, Amvorguezo, conversión de Gabos | Mochilas, huevo, crianza, raciones |
| Lucios | Mochilas comunes, Multimaterial, mochilas corruptas | Producción, expediciones, auras |
| Lucios Shiny | Mochilas con roll excepcional | Producción, expediciones, auras III |
| Gabos | Expediciones y contenido de mapa | Gabrario, Morgryn, conversión, auras Gábicas |
| Gabos Puros | Drops extremadamente raros de expedición | Gabrario óptimo y posibles recetas futuras |

## 28. Reglas de temporizadores

Todo timer de minutos u horas debe guardar un timestamp absoluto, no un contador dependiente de que la pestaña permanezca abierta.

Esto se aplica a:

- producción offline;
- expediciones;
- cooldown de marcas;
- purificación;
- cualquier hatch o crecimiento temporizado futuro.

Al cargar el save, el juego debe resolver de manera determinista el tiempo transcurrido.

## 29. Migración del save

Antes de v2 debe crearse una versión nueva del save con migración desde v1.

**Implementado en el primer hito de v2:** el esquema sube a `saveVersion: 2` y añade un bloque persistente `ambu` con etapa (`locked`, `egg`, `hatching` o `baby`), golpes de eclosión, estado de la notificación y marcas temporales de descubrimiento/nacimiento. La migración conserva Mantecas, colección y estadísticas de v1.

Campos conceptuales futuros:

```text
discoveredLucios
ownedLucios
expeditionAssignments
amvorguezo
unlockedAuras
equippedAuras
passiveProductionTimestamp
expeditions
ownedGabos
deployedGabos
morgryn
activeGabrarioMark
gabrarioMarkCooldownUntil
purificationAssignments
mapProgress
```

Los nombres definitivos pueden cambiar. Las invariantes importantes son:

- no confundir “descubierto” con “cantidad actual”;
- no guardar valores derivados como producción total;
- evitar duplicaciones al resolver recompensas o timers después de recargar;
- migrar el save v1 conservando Mantecas, estadísticas y las 12 cantidades actuales.

## 30. UX de sacrificios y asignaciones

### Sacrificio permanente

Debe mostrar una confirmación explícita con:

- recurso y cantidad consumida;
- efecto o desbloqueo obtenido;
- cantidad restante;
- aviso de que no puede deshacerse.

### Asignación temporal

Debe mostrar:

- copias que quedarán ocupadas;
- producción que se suspenderá mientras dure;
- duración;
- coste de ración;
- forma de recuperar las copias.

No es necesario calcular el punto exacto de recuperación de inversión de una mejora permanente.

## 31. Rendimiento visual

- Los Lucios y Gabos en colecciones o habitaciones numerosas deben usar efectos simplificados.
- Movimiento de Gabos: preferentemente `transform` y `opacity`, sin simulación física costosa.
- El número de nodos visibles puede limitarse sin alterar la cantidad real.
- Las aperturas y escenas con un único protagonista pueden usar efectos más caros.
- El Gabrario deberá probarse con la capacidad máxima antes de fijar el número final.

## 32. Contenido visual y sonoro pendiente

### v2

- huevo y estados de incubación;
- Amvorguezo en seis etapas jugables más su estado de huevo;
- iconos de las seis auras y sus niveles;
- Lucio Multimaterial y efectos propios;
- sonidos de alimentación, hatch, evolución y aura.

### v3

- mapa y destinos;
- iconos/propiedades de expedición;
- enemigos y escenarios de combate;
- mochilas corruptas y Lucios especiales;
- sonidos de partida, regreso y turnos.

### v4

- tipos de Gabo comunes y Puros;
- habitación del Gabrario;
- siete estados visuales de Morgryn;
- iconos y efectos de marcas mágicas;
- animaciones y sonidos de purificación, sacrificio y evolución.

---

## 33. Decisiones de balance pendientes

### v2

- costes de huevo, alimentación, eclosión y crecimiento;
- producción pasiva de cada etapa;
- límite y fórmula offline;
- coste y efecto productivo/combatiente de cada aura I–III;
- coste o ausencia de coste al cambiar auras;
- reglas completas del Lucio Multimaterial.

### v3

- atributos de los seis materiales en expedición;
- número máximo de Lucios por equipo;
- duración, ración y riesgos por región;
- consecuencias exactas del fracaso;
- estadísticas de combate y habilidades;
- parejas y efectos de resonancia;
- tabla de drops de Gabos y mochilas corruptas.

### v4

- tipos de Gabo y valores unitarios;
- capacidad inicial y aumentos de Morgryn;
- costes de las siete etapas;
- orden de desbloqueo de marcas;
- valores finales de las tres marcas;
- interacción entre purificación, retirada y Gabos Puros;
- minutos de producción obtenidos al sacrificar excedentes;
- recetas y efectos de auras Gábicas.

---

## 34. Preguntas de producto pendientes

1. ¿El nombre final será Lucio Lootbox Clicker, MatencaClicker o MantecaClicker?
2. ¿El séquito de combate creado por un aura es una manifestación sin coste adicional o requiere reservar Lucios actuales?
3. Cuando Amvorguezo acompaña una expedición, ¿su producción pasiva también se suspende o sólo se ocupan los Lucios enviados?
4. ¿Una expedición fallida puede causar alguna pérdida permanente o sólo peores recompensas?
5. ¿Cómo entra el Lucio Multimaterial al loot después del primer desbloqueo?
6. ¿La marca purificadora afecta a Gabos Puros y qué copias quedan condenadas al activarla?
7. ¿Las auras Gábicas utilizan los espacios normales o un espacio especial de Maestro?
8. ¿“Gabo” será el nombre definitivo de la especie y “Gabrario” la grafía definitiva de la habitación?

---

## 35. Historial de decisiones consolidadas

### v1

- El playground se conserva como herramienta separada del juego real.
- Los efectos Shiny son genéricos y se suman al material.
- Los rayos Shiny se descartaron.
- El reveal usa Lucio Mistery y luego cambia al drop real sin alterar la geometría original.
- Los drops raros y Shiny poseen timings más lentos.
- El audio se integró por evento de apertura y rareza.

### Diseño futuro

- Sacrificar Lucios para auras es una mecánica deseada.
- Las mejoras explican efecto y precio, no rentabilidad calculada.
- Niño equipa una aura; Adulto, dos; Joven mejora a nivel II; Maestro desbloquea nivel III.
- Las combinaciones económicas son emergentes; las resonancias explícitas son de combate.
- Todas las auras II permiten evolucionar a Maestro.
- Maestro puede sacrificar sus auras para crear y desbloquear el Lucio Multimaterial.
- Las expediciones son asincrónicas, consumen raciones y ocupan Lucios.
- Todo Lucio enviado deja de producir, sea normal o Shiny.
- El combate es simple y por turnos.
- Los Gabos aplican beneficio y desventaja acumulables sólo cuando están en el Gabrario.
- La capacidad del Gabrario es el límite principal de apilamiento.
- Morgryn consume Gabos, aumenta la capacidad y desbloquea marcas.
- Los Gabos Puros no tienen desventaja y son extremadamente raros.
- La purificación artificial elimina desventajas temporalmente y termina matando a los Gabos afectados.
- Morgryn máximo permite convertir excedentes en Mantecas o auras Gábicas para Amvorguezo Maestro.
