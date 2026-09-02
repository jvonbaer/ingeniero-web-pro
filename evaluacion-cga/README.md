# Evaluación de Habilidades — Escuela de Fútbol CGA

Aplicación para evaluar a los jugadores de la Escuela de Fútbol del **Club Gimnástico Alemán** de Temuco, seguir su evolución en el tiempo y entregar a cada apoderado un informe en PDF.

- **Se llena como una encuesta**, pensada para usarse de pie en la cancha, desde teléfono o tablet.
- **Los datos se acumulan**: cada evaluación nueva se suma al historial y se compara con las anteriores.
- **Gráfico de tela de araña** que superpone hasta tres evaluaciones para ver el avance de un vistazo.
- **Informe en una hoja A4 vertical** que se imprime o se guarda como PDF desde el propio navegador.
- **Pedido de camisetas** sobre la misma base de jugadores: número único por categoría, nombre estampado, talla y estado de pago.
- Identidad visual del CGA, rama Fútbol: Rojo CGA, Negro Carbón, Amarillo DFB, tipografía Barlow.

---

## Índice

1. [Probar la aplicación en 2 minutos](#1-probar-la-aplicación-en-2-minutos)
2. [Cómo se usa](#2-cómo-se-usa)
3. [Cómo se calculan los puntajes](#3-cómo-se-calculan-los-puntajes)
4. [Por qué las evaluaciones siguen siendo comparables](#4-por-qué-las-evaluaciones-siguen-siendo-comparables)
5. [Dónde publicarla: opciones gratuitas y muy económicas](#5-dónde-publicarla-opciones-gratuitas-y-muy-económicas)
6. [Modo nube con Supabase](#6-modo-nube-con-supabase)
7. [Poner el escudo oficial](#7-poner-el-escudo-oficial)
8. [Estructura del proyecto](#8-estructura-del-proyecto)
9. [Cuidado con los datos de menores](#9-cuidado-con-los-datos-de-menores)

---

## 1. Probar la aplicación en 2 minutos

Requiere Node.js 20 o superior.

```bash
cd evaluacion-cga
npm install
npm run dev
```

Abra la dirección que aparece en la consola, entre a **Datos → Cargar ejemplo** y después a la ficha de *Matías Rodríguez*: verá la tela de araña con tres evaluaciones y podrá abrir el informe.

Sin configurar nada, la aplicación guarda todo en el propio dispositivo. Para compartir la información entre varios entrenadores, vea la [sección 6](#6-modo-nube-con-supabase).

---

## 2. Cómo se usa

### Crear la ficha de un jugador

**Jugadores → + Nuevo jugador**. Se piden nombre, fecha de nacimiento, categoría, posición, pie hábil, altura, dorsal, fecha de ingreso y los datos del apoderado.

- El **código de seguimiento** se genera solo con el formato `CGA-F-AA-000` (`AA` = año de nacimiento). Se puede escribir uno propio si el club ya tiene su numeración.
- La **foto** tiene dos caminos, ambos disponibles en el formulario y en la ficha del jugador:
  - **Tomar foto** abre un visor de cámara con vista previa y botón de disparo. Funciona igual en el
    teléfono o la tablet —parte con la cámara trasera y se puede cambiar a la frontal— que en el
    computador con la webcam. Antes de guardar muestra la captura, con opción de repetirla.
  - **Subir archivo** abre la galería del teléfono o el explorador del computador.

  En la ficha del jugador la foto **queda guardada en el momento**, sin pasar por el formulario ni
  por un botón de confirmar. La aplicación la reduce y recodifica antes de guardarla, así una foto
  de 4 MB queda en unos 70 KB.

  > El visor de cámara necesita que el sitio esté servido por **https** — es una exigencia del
  > navegador, no de la aplicación. En la dirección de Netlify o Vercel ya lo está, y en
  > `localhost` también. Si abre la aplicación por http, el visor avisa y queda disponible
  > *Subir archivo*.

### Evaluar

**Ficha del jugador → Nueva evaluación**. La evaluación es una encuesta de ocho pantallas:

| Pantalla | Contenido |
|---|---|
| 1 | Fecha, temporada y entrenador que evalúa |
| 2 a 7 | Una categoría por pantalla, con sus sub-puntos |
| 8 | Observaciones para los padres y próximos objetivos |

Cada sub-punto se responde tocando un número del 1 al 5 (*Inicial · En progreso · Aceptable · Bueno · Destacado*). Volver a tocar la misma opción la deselecciona, para dejar en blanco algo que no se pudo observar ese día.

Detalles pensados para el uso real:

- **Se guarda solo al cambiar de pantalla.** Si se corta el internet o se cierra la tablet a mitad de camino, no se pierde nada; la evaluación queda como borrador y se retoma después desde la ficha.
- **"Copiar puntajes anteriores"** parte desde la evaluación previa para corregir sólo lo que cambió, en vez de responder 26 preguntas de cero.
- El pie muestra el **porcentaje respondido** en todo momento.

### Evaluar en papel, cuando falla todo lo demás

En la cancha se cae el internet, se acaba la batería o la tablet se queda en el auto. Para eso hay
una hoja imprimible con la pauta completa:

1. **Ficha del jugador → Hoja en papel** imprime la pauta que le corresponde por su categoría, con
   el nombre y el código ya puestos. Desde **Parámetros → Imprimir hoja** sale la versión en blanco,
   para fotocopiar.
2. Se evalúa con lápiz: una **X** en el casillero del 1 al 5 de cada sub-punto.
3. De vuelta, en **Nueva evaluación** toque **Ver todo en una pantalla**: aparecen todas las
   categorías juntas y se transcriben los números de corrido, sin recorrer las ocho pantallas.
4. En el cierre, **adjunte la foto o el escaneo de la hoja**. Queda guardado junto a la evaluación
   como respaldo de lo que se marcó a mano.

> La aplicación **no lee los números de la imagen**. Eso sería reconocimiento de escritura a mano
> sobre una hoja arrugada y marcada con lápiz en la cancha, que no es confiable: un 4 leído como 1
> corrompe el historial del niño sin que nadie se entere. Los puntajes se transcriben a mano —para
> eso está la vista compacta— y el escaneo queda como el papel de respaldo.

La imagen se guarda **aparte de la evaluación**, y se lee sólo cuando alguien abre esa evaluación.
Si viajara dentro del registro, la aplicación cargaría varios megabytes en cada arranque, porque al
abrirse trae todas las evaluaciones de la escuela.

### Entregar el informe

**Ficha → Informe** (o se abre solo al finalizar). El botón **Imprimir / Guardar PDF** abre el diálogo del navegador; hay que elegir *Guardar como PDF*, orientación **vertical** y activar **Gráficos de fondo**. El resultado es una hoja A4 vertical.

Si la ficha tiene el correo del apoderado, el botón **Escribir al apoderado** abre el correo con el asunto y el mensaje ya redactados, listo para adjuntar el PDF.

> El informe reserva un espacio fijo para las observaciones (380 caracteres) y para cada objetivo
> (68). La pantalla de cierre muestra cuántos quedan: es el largo que entra sin que el PDF corte la
> frase. Si cambia las alturas de esos bloques en `src/styles/informe.css`, ajuste también los topes
> de `src/pages/Evaluar.tsx`.

### Ajustar qué se evalúa

**Parámetros** tiene tres partes:

**Cuerpo técnico.** El listado de evaluadores que aparece al empezar una evaluación. Se elige de una lista en vez de escribir el nombre, porque escribirlo a mano termina con «Andrés», «andres mercado» y «A. Mercado» conviviendo en la misma base. Si aparece alguien que no está, se agrega desde la propia evaluación y queda disponible para todos.

**Qué pauta usa cada categoría.** Una tabla que asigna una pauta a cada categoría de edad. Al abrir una evaluación, la aplicación mira la categoría del jugador y levanta la pauta asignada: el entrenador no la elige ni puede equivocarse.

**Contenido de las pautas.** Ahí se crean, duplican y editan las pautas: secciones, sub-puntos, pesos y etiquetas de la escala.

Viene una de fábrica, **Escuela de Fútbol**, que es la pauta del cuerpo técnico: siete secciones y 84 sub-puntos, todos en escala de 1 a 5. La usan todas las categorías de edad.

| # | Sección | Sub-puntos | |
|---|---|---|---|
| 1 | Asistencia y compromiso | 6 | |
| 2 | Técnica individual | 25 | en 5 subsecciones: conducción, control, pase, regate, finalización |
| 3 | Iniciación táctica | 21 | en 4 subsecciones: ataque, defensa, comprensión del juego, evaluación durante el partido |
| 4 | Capacidades físicas y motrices | 8 | |
| 5 | Aspectos psicológicos y actitudinales | 10 | |
| 6 | Conducta y valores | 8 | |
| 7 | Creatividad y capacidad de aprendizaje | 6 | |

**El puntaje de una sección con subsecciones es el promedio de los promedios de sus subsecciones**, no el promedio de sus sub-puntos. Es lo que dice la pauta —cada subsección trae su propio «Promedio ___ / 5»— y evita que dentro de «Técnica» pese cinco veces más lo que tiene cinco veces más preguntas. Las siete secciones pesan igual entre sí.

Dos sub-puntos se responden con nombres propios en vez de números pelados: «Participación» va de *Muy baja* a *Muy alta*, y «Toma de decisiones» de *Necesita mucha ayuda* a *Excelente*. Se definen en el campo `etiquetas` del sub-punto.

> Si la escuela quiere una versión recortada para las categorías chicas, **duplique esta pauta y desactive los sub-puntos que no correspondan**, en vez de escribir una nueva desde cero. Los puntajes se guardan contra el identificador del sub-punto, así que una pauta duplicada mantiene el historial comparable; una escrita de nuevo parte de cero. Por lo mismo: renombrar un sub-punto es inofensivo, cambiarle el identificador equivale a borrarlo.

### Camisetas

**Camisetas**. Es el pedido de la temporada, armado sobre las mismas fichas que se evalúan: no hay que volver a escribir a los niños en ninguna parte.

Cada camiseta guarda **número, nombre estampado, talla, precio, lo abonado y si ya se entregó**. Todo se elige en una sola ventana, con la espalda de la camiseta dibujada arriba para ver cómo va a quedar el estampado antes de mandarlo.

**El número no se puede repetir dentro de una categoría y una temporada.** La aplicación lo revisa antes de guardar y dice quién lo tiene tomado; en el modo nube, además, la propia base lo rechaza (`unique (temporada, categoria, numero)`), que es lo que salva la situación cuando dos entrenadores inscriben al mismo tiempo desde teléfonos distintos. Al costado, el **mapa de números** muestra el 1 al 99 de la categoría elegida con los tomados marcados.

Otras reglas que conviene tener claras:

- **Una camiseta por jugador y temporada.** Al inscribir sólo aparecen los jugadores activos que todavía no la tienen.
- **La categoría se copia al inscribir**, no se sigue leyendo de la ficha. Si el niño sube de SUB-10 a SUB-12 el año siguiente, el pedido del año pasado no cambia de casillero ni choca con el número de otro compañero. Cuando eso pasa, la fila lo avisa con una marca *hoy SUB-12*.
- **El dorsal de la ficha queda mandado por el pedido vigente.** Ese campo se escribía a mano y era justamente el que dejaba números repetidos; ahora lo fija la única lista que los controla.
- **El nombre estampado se pasa a mayúsculas y se corta en 12 caracteres** mientras se escribe, que es lo que entra legible sobre el número. Si otro niño de la misma categoría eligió el mismo nombre, la ventana lo advierte —se puede, pero llegan dos camisetas iguales—.
- **El estado de pago no se guarda: se deduce** del precio y de lo abonado. Así no queda mintiendo cuando alguien corrige un monto.
- El botón **Cobrar** de cada fila registra el pago completo en el momento, y la casilla de **Entrega** se va tildando mientras se reparte en la cancha. El medio de pago queda *Sin registrar* a propósito: es un dato que hay que completar, no adivinar.

**Descargar pedido (CSV)** baja una fila por camiseta —categoría, número, estampado, talla, jugador, saldo, entrega— para mandársela al proveedor o revisarla en Excel. La tarjeta **Cuántas de cada talla** es el recuento que el proveedor pide para cotizar.

> **Lo que este apartado no es.** No es un sistema de cobranzas: registra si la camiseta está pagada y cuánto falta, y hasta ahí. Las cuotas de la escuela, los planes y los avisos de vencimiento viven en el registro de socios (`socios-cga`), que es otra aplicación con otra base. Meter acá la cobranza mensual sería duplicar ese sistema a medias.

### Respaldos

**Datos**. Descarga un respaldo completo en un archivo (jugadores + evaluaciones + camisetas + parámetros) y también una **planilla CSV** con una fila por evaluación, que se abre directo en Excel o Google Sheets.

> En modo local, descargue un respaldo al terminar cada jornada de evaluaciones y guárdelo en el Drive del club. Es la única copia que existe.

---

## 3. Cómo se calculan los puntajes

1. Cada sub-punto se responde de 1 a 5 y se convierte a escala 100: `valor ÷ 5 × 100`. Un 4 son 80 puntos; un 5, 100.
2. El **puntaje de la categoría** es el promedio de sus sub-puntos **respondidos**. Los que quedaron en blanco no cuentan, ni a favor ni en contra.
3. El **puntaje general** es el promedio de las categorías, ponderado por el peso de cada una. En la pauta competitiva, Técnica y Táctico pesan 1,25 y las demás 1; en la formativa el peso se corre hacia Social y Disciplina.
4. El **nivel** sale del puntaje:

| Puntaje | Nivel |
|---|---|
| 90 – 100 | Excelente |
| 75 – 89 | Avanzado |
| 60 – 74 | Intermedio |
| 40 – 59 | En desarrollo |
| 0 – 39 | Inicial |

Los pesos y los sub-puntos se editan desde **Parámetros**; los cortes de nivel están en `src/domain/scoring.ts`.

---

## 4. Por qué las evaluaciones siguen siendo comparables

Es la parte delicada de un sistema que se usa durante años: la rúbrica va a cambiar, y aun así las evaluaciones viejas tienen que seguir sirviendo.

- Cada evaluación guarda la **versión de la rúbrica** con la que se levantó y sus respuestas **por identificador de sub-punto**, no por posición en una lista.
- Al **agregar** un sub-punto, las evaluaciones antiguas simplemente no lo tienen: su categoría se sigue promediando con los que sí respondieron.
- Al **desactivar** uno, deja de contar hacia adelante y las evaluaciones viejas conservan su puntaje tal como se calculó.
- Al **agregar una categoría**, aparece un eje nuevo en la tela de araña; las evaluaciones anteriores lo muestran vacío, sin inventar un valor.
- Al **cambiar de pauta** —porque el niño subió de categoría— el historial se vuelve a medir contra la pauta de la evaluación más reciente, que es la vara con la que se lo está mirando hoy. La ficha avisa cuántas evaluaciones anteriores venían de otra pauta.

En la práctica: se pueden afinar los parámetros temporada a temporada, y separarlos por categoría, sin perder la comparación con lo ya registrado.

Los respaldos del formato antiguo —cuando había una sola rúbrica para toda la escuela— se cargan igual: la aplicación los convierte al vuelo, dejando esa rúbrica como una pauta llamada «General» asignada a todas las categorías, que es exactamente el comportamiento que tenían.

---

## 5. Dónde publicarla: opciones gratuitas y muy económicas

La aplicación compila a archivos estáticos, así que sirve cualquier hosting de sitios estáticos. Estas son las alternativas, de la más simple a la más completa:

### Recomendación

**Netlify (gratis) + Supabase (gratis)**. Es la combinación con mejor relación esfuerzo/resultado: conecta el repositorio, publica solo en cada cambio, entrega HTTPS y dominio, y Supabase resuelve la base compartida y las cuentas del cuerpo técnico sin administrar servidores. Costo: **0**, salvo que quiera un dominio propio (~USD 12 al año).

| Opción | Costo | Cuándo conviene |
|---|---|---|
| **Netlify** | Gratis (100 GB/mes) | Recomendada. Conectar el repositorio y listo: el archivo `netlify.toml` de este repositorio ya trae la configuración. |
| **Vercel** | Gratis (uso personal) | Equivalente a Netlify. En el panel, fije *Root Directory* = `evaluacion-cga`. |
| **Cloudflare Pages** | Gratis, sin tope de ancho de banda | La mejor si prevé mucho tráfico. Build: `npm run build`, salida: `dist`. |
| **GitHub Pages** | Gratis | Sirve porque la aplicación usa rutas relativas y navegación por `#`. Suba el contenido de `dist/` a la rama `gh-pages`. |
| **Sólo en las tablets del club** | Gratis | Sin publicar nada: `npm run build` y abrir `dist/index.html`. Cada dispositivo con sus propios datos, sincronizados a mano con los respaldos. |

### Sobre la base de datos

| Opción | Costo | Comentario |
|---|---|---|
| **Sin base** (modo local) | 0 | Ya funciona. Los datos viven en el dispositivo y se mueven con respaldos. Bien para un entrenador con una tablet. |
| **Supabase** | Gratis hasta 500 MB | Recomendada apenas haya más de un entrenador. Incluye las cuentas de acceso. Con fotos de 60 KB, 500 MB alcanzan para miles de fichas. El plan pagado son USD 25/mes y no debería hacer falta. |
| **Neon, Turso** | Gratis | Alternativas válidas, pero habría que programar el acceso y las cuentas; Supabase trae ambas cosas resueltas. |

### Sobre el envío a los apoderados

El PDF lo genera el navegador, así que no hay ningún costo ni servicio asociado. Para enviarlo:

- **Manual** (recomendado para empezar): el botón *Escribir al apoderado* abre el correo redactado; sólo hay que adjuntar el PDF. Costo 0.
- **Por WhatsApp**: guardar el PDF y compartirlo desde el teléfono. Es lo que más usan los apoderados en Chile.
- **Envío masivo automático**: requiere un servicio de correo (Resend o Brevo tienen planes gratuitos de unos 100 correos al día, suficiente para una escuela) y programar la generación del PDF en el servidor. Vale la pena sólo si llegan a ser más de cien informes por temporada.

---

## 6. Modo nube con Supabase

1. Cree un proyecto gratuito en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pegue el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútelo. Crea las tablas, activa la seguridad por fila y agrega las vistas de consulta. Compruébelo en **Table Editor**: deben aparecer `jugadores`, `evaluaciones`, `camisetas`, `rubrica` y `hojas`.
3. **Authentication → Users → Add user**: una cuenta por entrenador, con *Auto Confirm User* activado. No hay registro abierto; las cuentas las crea el club.
4. **Project Settings → API**: copie el `Project URL` y la clave `anon public`. La `service_role` no se usa y no debe salir del servidor.
5. Conecte la aplicación por cualquiera de los dos caminos:
   - **Desde la aplicación** (recomendado si publicó arrastrando la carpeta a Netlify): entre a **Datos → Conexión con la nube**, pegue los dos valores y conecte. No hay que recompilar. La conexión queda guardada en ese navegador, así que se repite una vez por dispositivo.
   - **En el build**: copie `.env.example` como `.env` con esos dos valores, o cárguelos en Netlify como variables de entorno, y vuelva a publicar.
6. Al entrar, la aplicación pide correo y clave, y la etiqueta de la barra superior cambia de *Este dispositivo* a **Nube compartida**.

Para pasar los datos que ya tenía en una tablet: **Datos → Descargar respaldo** en modo local, y **Datos → Cargar respaldo** una vez conectado a la nube.

> **Si la nube ya estaba funcionando antes de las camisetas**, vuelva a correr `supabase/schema.sql` completo: es idempotente y sólo agrega la tabla `camisetas` y su vista. Mientras no lo haga, la aplicación sigue trabajando igual que siempre —el pedido aparece vacío— y avisa qué correr recién cuando alguien intenta guardar una camiseta.

Dos vistas quedan listas para consultar en SQL o bajar como CSV desde el propio Supabase, sin entender el `jsonb`: **`v_puntajes`**, una fila por sub-punto respondido, y **`v_camisetas`**, el pedido con el jugador, el apoderado y el saldo al lado del número.

---

## 7. El escudo

El escudo del club —la cruz de las cuatro F, el *Turnerkreuz* de los clubes de gimnasia alemanes,
dentro del anillo— está **dibujado como SVG en `src/components/Marca.tsx`**, no incrustado como
imagen. Eso permite pintarlo en tres variantes según el fondo, y que se imprima como vector:

| Variante | Dónde se usa |
|---|---|
| `color` | Anillo en Gris Círculo, cruz en Rojo CGA. Fondos claros: hoja en papel, pantalla de acceso |
| `blanco` | Barra superior e informe, que van sobre Negro Carbón |
| `negro` | Marca de agua, y disponible para fotocopias |

> **La geometría está reconstruida a ojo desde el logotipo del club, no es el archivo oficial.** Es
> fiel en estructura y proporciones, pero si el club tiene el vectorial original conviene usar ese.
> Basta dejarlo en `public/brand/` con el nombre de la variante y la aplicación lo prefiere sin
> tocar nada más:
>
> - `escudo-cga.svg` — versión a color
> - `escudo-cga-blanco.svg` — para fondos oscuros
> - `escudo-cga-negro.svg` — monocromo
>
> El favicon (`public/brand/favicon.svg`) repite el mismo trazado a mano, porque es un archivo
> suelto y no puede compartir el componente. Si cambia uno, cambie el otro.

## 8. Estructura del proyecto

```
evaluacion-cga/
├── src/
│   ├── config/pautas.ts         Pautas de fábrica, asignaciones y cuerpo técnico
│   ├── domain/
│   │   ├── types.ts             Modelo de datos
│   │   ├── scoring.ts           Cálculo de puntajes, niveles y códigos
│   │   └── camisetas.ts         Reglas del pedido: números, tallas, pagos
│   ├── data/
│   │   ├── store.ts             Contrato de persistencia
│   │   ├── localDriver.ts       Guardado en el dispositivo (IndexedDB)
│   │   ├── supabaseDriver.ts    Guardado en la nube
│   │   ├── sesion.tsx           Control de acceso del modo nube
│   │   ├── DatosContext.tsx     Estado de la aplicación
│   │   ├── migrar.ts            Conversión de respaldos del formato 1 al 2
│   │   └── seed.ts              Datos de demostración
│   ├── components/
│   │   ├── RadarChart.tsx       Tela de araña en SVG
│   │   ├── Marca.tsx            Escudo y marca de agua
│   │   ├── Iconos.tsx           Iconos monocromos de categoría
│   │   ├── Foto.tsx             Compresión de imágenes y acciones de foto
│   │   └── Camara.tsx           Visor de cámara (teléfono y webcam)
│   ├── pages/                   Jugadores, ficha, encuesta, informe, hoja en papel, camisetas, parámetros
│   ├── styles/
│   │   ├── tokens.css           Paleta y tipografía CGA (fuente única de color)
│   │   ├── informe.css          Maqueta A4 vertical del informe
│   │   ├── hoja.css             Hoja de evaluación para llenar a mano
│   │   └── print.css            Reglas de impresión
│   └── fuentes/                 Barlow (la repone `npm install`, no se versiona)
├── scripts/preparar-fuentes.mjs Descarga las tipografías al proyecto
└── supabase/schema.sql          Esquema, seguridad y vista de consulta
```

Decisiones que conviene conocer antes de tocar el código:

- **El gráfico es SVG escrito a mano**, sin librería de gráficos. Pesa unos kilobytes, se imprime como vector —nítido a cualquier tamaño— y no hay una dependencia externa que se rompa en dos años.
- **El PDF lo genera el navegador** con `@media print`, sin librerías de PDF. Es lo que hace que el informe salga idéntico a lo que se ve en pantalla.
- **Las tipografías van dentro del proyecto**, no desde Google Fonts: la escuela evalúa a pie de cancha, donde la señal es mala o no hay. Como son archivos binarios, no se versionan: `npm install` las descarga con `scripts/preparar-fuentes.mjs`, y si no hay conexión en ese momento el script deja el proyecto apuntando al CDN de Google para que la compilación nunca se caiga.
- **Los iconos son dibujos propios, no emoji.** El emoji cambia según el sistema operativo y varios se pintan en azul, un color que la identidad del CGA reserva a Natación.
- **Las camisetas son un registro aparte, no campos de la ficha.** El pedido se repite cada temporada y el número cambia de dueño; con campos sueltos en la ficha, el pedido nuevo borraría el anterior y nadie podría revisar quién pagó el año pasado.
- **`camisetas` es la única tabla que saca campos del `jsonb` a columnas propias** (`temporada`, `categoria`, `numero`). No es una inconsistencia: sobre esas tres va el índice único, y la última palabra sobre un número repetido tiene que tenerla la base, no la pantalla.

---

## 9. Cuidado con los datos de menores

La aplicación guarda nombres, fotos, fechas de nacimiento y correos de apoderados de niños y niñas. Vale la pena tenerlo presente:

- En **modo nube**, la base rechaza toda lectura sin sesión iniciada (políticas RLS en `supabase/schema.sql`). La clave `anon` que viaja dentro del sitio no alcanza para ver nada.
- En **modo local**, los datos quedan en el navegador del dispositivo: conviene que la tablet tenga clave de bloqueo.
- Los **respaldos y planillas** que se descargan sí van en claro. El `.gitignore` impide que lleguen al repositorio por accidente; guárdelos en una carpeta del club con acceso restringido, no en un correo reenviado.
- Antes de publicar cualquier foto o informe fuera del círculo del apoderado, pida autorización a la familia.
