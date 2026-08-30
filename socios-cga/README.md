# Socios y Escuelas — Club Gimnástico Alemán

Registro único de socios, deportistas de ramas, alumnos de escuelas y actividades puntuales del
**Club Gimnástico Alemán** de Temuco, con sus planes, sus pagos y los avisos de renovación.

- **Una sola base para todos los computadores.** Quien atiende en secretaría, quien coordina una
  rama y quien lleva la tesorería ven exactamente lo mismo, al instante.
- **Los datos se cruzan.** El niño de la escuela de fútbol queda identificado por completo *y*
  enlazado con la madre que paga; desde ella se ve a sus dos hijos, todo lo que debe y cuándo.
- **Planes, valores y condiciones** de ramas, escuelas y actividades puntuales, cargados por el
  propio club.
- **Pagos y alarmas de renovación**: la aplicación avisa al pagador **cinco días antes** —o los que
  el club decida— por correo o por WhatsApp, y el correo se envía solo, todos los días, sin que
  nadie tenga que entrar.
- **Gratis de punta a punta** en su primera etapa: base de datos, sitio publicado y envío de
  correos, todo en planes sin costo.

---

## Índice

1. [Probarla en cinco minutos](#1-probarla-en-cinco-minutos)
2. [Cómo se usa](#2-cómo-se-usa)
3. [Cómo se calculan los vencimientos](#3-cómo-se-calculan-los-vencimientos)
4. [La base compartida en Supabase](#4-la-base-compartida-en-supabase)
5. [Publicar la aplicación](#5-publicar-la-aplicación)
6. [Los avisos automáticos](#6-los-avisos-automáticos)
7. [Qué es gratis y hasta dónde](#7-qué-es-gratis-y-hasta-dónde)
8. [Segunda etapa: el portal de apoderados](#8-segunda-etapa-el-portal-de-apoderados)
9. [Estructura del proyecto](#9-estructura-del-proyecto)
10. [Cuidado con los datos personales](#10-cuidado-con-los-datos-personales)

---

## 1. Probarla en cinco minutos

Requiere Node.js 20 o superior.

```bash
cd socios-cga
npm install
npm run dev
```

Abra la dirección que aparece en la consola, entre a **Datos → Cargar ejemplo** y después a la ficha
de *Carolina Meyer*: verá a sus dos hijos colgando de ella, lo que paga por cada uno y su carga
mensual total. En **Cobranzas** encontrará una cuota vencida y dos por vencer.

Sin configurar nada, la aplicación guarda todo en el propio computador. Para que la vean todos los
computadores del club, siga la [sección 4](#4-la-base-compartida-en-supabase).

---

## 2. Cómo se usa

### Personas: una sola tabla para todos

Socios, deportistas, alumnos, apoderados y pagadores son todos **personas**. No hay una tabla de
socios y otra de apoderados: lo que distingue a cada uno son sus relaciones. Así, una madre que
además es socia y corre trail es **una sola ficha**, no tres.

**Personas → + Nueva persona** pide:

| Bloque | Qué se guarda |
|---|---|
| Identificación | Nombres, apellidos, RUT, documento extranjero, fecha de nacimiento, sexo |
| Contacto | Correo, teléfono, dirección, comuna |
| Condición de socio | Si es socio, su número, categoría y fecha de ingreso |
| Salud y emergencia | Contacto de emergencia, previsión, alergias o lesiones, autorización de imagen |
| Adulto responsable | Con quién se cruza esta ficha |

Dos cosas que la aplicación no deja pasar:

- **El RUT se valida** con su dígito verificador y no admite repetidos. Es lo que evita que
  "Ma. José Pérez" y "María José Perez" terminen siendo dos fichas de la misma señora.
- **Un menor de edad no se puede guardar sin un adulto enlazado.** Si el adulto no está en el
  sistema, se crea en el mismo formulario; basta su nombre y después se completa. Sin ese enlace no
  hay a quién cobrarle ni a quién avisarle cuando venza la cuota, que es justamente lo que el
  sistema viene a resolver.

### El cruce: vínculos

Cada vínculo une a una persona con un adulto responsable, dice **qué relación** los une
(madre, padre, apoderado, tutor, cónyuge, hermano) y marca **quién paga** y **quién es el contacto
principal**.

De ahí sale, sin que nadie lo escriba dos veces:

- en la ficha del niño: **quiénes responden por él** y **quiénes son sus hermanos** en el club
  (los que comparten un adulto);
- en la ficha del adulto: **por quiénes responde**, **todo lo que paga** y su **carga mensual
  total**, con las cuotas anuales y trimestrales prorrateadas para poder compararlas.

Si al inscribir a un segundo hijo busca a la madre en vez de volver a escribirla, las dos fichas
apuntan a la misma persona y el cruce funciona solo.

### Planes: valores y condiciones

**Planes** es donde el club carga *qué cobra*:

| Tipo | Para qué sirve | Ejemplo |
|---|---|---|
| Cuota de socio | Membresía del club | Socio activo, $120.000 al año |
| Rama deportiva | Participación regular en una rama | Tenis adultos, mensual |
| Escuela deportiva | Formativa, con matrícula y arancel | Escuela de Fútbol, $28.000 al mes + matrícula |
| Actividad puntual | Se paga una vez y se acaba | Trail Villarrica, $25.000 |

Cada plan lleva su valor, su matrícula, su periodicidad (mensual, trimestral, semestral, anual o
pago único), sus cupos, el rango de edades, la vigencia, los **descuentos** (hermanos, socio del
club, pago anual adelantado), los **horarios** y el texto libre de **condiciones y requisitos**.

> **El precio del plan no cambia lo ya acordado.** Al inscribir a alguien, el valor y la
> periodicidad quedan *copiados* dentro de su inscripción. Si en marzo el club sube la mensualidad,
> quien se inscribió en enero conserva lo que se le prometió hasta que alguien decida cambiárselo a
> mano, en su propia ficha.

### Inscripciones

Desde la ficha de una persona, **+ Inscribir en un plan**. Ahí se elige el plan, **quién paga** (el
pagador se propone solo a partir de los vínculos), la fecha de inicio, los descuentos que
correspondan, el canal del aviso y con cuántos días de anticipación avisar.

La aplicación advierte —sin bloquear, porque el club siempre tiene excepciones— cuando la persona
queda fuera del rango de edad del plan, cuando el plan ya no tiene cupos o cuando ya está inscrita
en él.

Una inscripción se puede **suspender** (congelar por lesión, por ejemplo) y **reactivar**. Mientras
está suspendida no genera avisos ni aparece en cobranzas.

### Pagos

Cada pago dice **qué período cubre**. Al registrarlo, la aplicación propone el período siguiente al
último pagado, así que en el caso normal sólo hay que confirmar. Los pagos de **matrícula** van sin
período: se cobran una vez y no corren la fecha de renovación.

**Pagos** es el libro completo: filtros por fecha, rama, medio de pago y persona, totales por rama y
exportación a CSV para Excel o Google Sheets.

### Cobranzas

La pantalla que se mira todos los días, con cuatro pestañas:

- **Vencidas** — lo que ya se pasó de fecha.
- **Por vencer** — lo que entra en la ventana de aviso de cada inscripción.
- **Próximos 30 días** — para prever el mes.
- **Sin contacto** — las inscripciones cuyo pagador no dejó correo ni teléfono. Es el primer arreglo
  que conviene hacer: ningún aviso automático las alcanza.

Cada fila dice a quién avisarle y por qué, y trae los botones **Correo** y **WhatsApp** con el
mensaje ya redactado. Lo enviado queda registrado, para que nadie reciba el mismo aviso dos veces.

---

## 3. Cómo se calculan los vencimientos

**El vencimiento no se guarda: se deduce de los pagos.**

> Una inscripción vence **al día siguiente del último período pagado**. Si todavía no hay ningún
> pago, vence el día en que empezó.

Es una decisión deliberada. Guardar además una fecha de vencimiento suelta obligaría a mantener dos
verdades sincronizadas, y bastaría que alguien corrigiera un pago mal cargado para que quedaran
diciendo cosas distintas. Así, anular un pago devuelve la inscripción exactamente al estado
anterior, sin tocar nada más.

De esa fecha salen los cuatro estados:

| Estado | Cuándo |
|---|---|
| **Al día** | Falta más que la ventana de aviso |
| **Por vencer** | Vence dentro de la ventana de aviso (5 días por omisión) |
| **Vencida** | Ya pasó la fecha |
| **Pagada** | Actividad puntual ya cobrada; no vuelve a vencer |

La misma regla está escrita dos veces, a propósito: en `src/domain/cobros.ts` para la aplicación, y
en la vista `v_cobranzas` de `supabase/schema.sql` para el envío automático de correos y para
cualquiera que quiera consultar la base desde SQL. Si cambia una, cambie la otra.

---

## 4. La base compartida en Supabase

Esto es lo que convierte la aplicación en un sistema para varios computadores. Supabase entrega
gratis una base PostgreSQL, las cuentas de acceso y el respaldo. Son cuatro pasos, una sola vez.

### 4.1 Crear el proyecto

1. Entre a [supabase.com](https://supabase.com) y cree una cuenta (sirve la del club).
2. **New project**. Elija un nombre —`cga-socios`—, una contraseña de base de datos (guárdela) y la
   región **South America (São Paulo)**, que es la más cercana.
3. Espere el par de minutos que tarda en levantarse.

### 4.2 Crear las tablas

1. En el menú de la izquierda, **SQL Editor → New query**.
2. Abra el archivo `socios-cga/supabase/schema.sql` de este repositorio, cópielo entero y péguelo.
3. **Run**.

Crea las seis tablas, sus índices, las políticas de seguridad y las dos vistas de consulta. Se puede
volver a ejecutar las veces que haga falta sin romper nada ni perder datos.

### 4.3 Crear las cuentas

**Authentication → Users → Add user**, una por cada persona que vaya a usar el sistema. Marque
**Auto Confirm User** para no tener que pasar por el correo de confirmación.

Sin cuenta no se ve nada: las políticas del esquema rechazan toda lectura sin sesión iniciada.

### 4.4 Conectar la aplicación

En **Project Settings → API** están los dos valores que hacen falta: **Project URL** y la clave
**anon public**. Hay dos formas de usarlos:

- **Desde la propia aplicación** (lo más simple): entre a **Datos → Conexión con la nube**, pegue
  los dos valores y listo. Queda guardado en ese navegador; hay que repetirlo una vez en cada
  computador del club.
- **Al compilar**: copie `.env.example` como `.env`, complete `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`, y vuelva a publicar. Así todos los computadores quedan conectados sin
  tocar nada.

> **La clave «anon public» está hecha para ir dentro del sitio web, a la vista de todos.** Lo que
> protege los datos no es esconderla: son las políticas del esquema, que rechazan cualquier lectura
> sin sesión. La que **nunca** debe salir de los secretos del repositorio es la otra, la
> `service_role` de la [sección 6](#6-los-avisos-automáticos).

### 4.5 Comprobar que quedó bien

**Datos → Revisar la instalación** prueba una por una las cosas que hay que dejar hechas —que el
proyecto responde, que las tablas existen, que sin sesión no se ve nada, que la cuenta entra, que se
puede leer y que se puede escribir— y dice cuál falta y qué hacer. La prueba de escritura guarda un
plan de prueba y lo borra solo.

### 4.6 Trabajar con los datos desde Supabase

Las columnas de la base son de verdad, no un bloque JSON. Desde **Table Editor** se puede ordenar
por apellido, corregir un teléfono o bajar un CSV sin ayuda de nadie. Y en **SQL Editor** hay dos
vistas listas:

- `v_cobranzas` — una fila por inscripción con su vencimiento, su estado y a quién avisarle.
- `v_grupo_familiar` — quién responde por quién, en tabla plana.

Al final de `schema.sql` hay tres consultas de ejemplo, entre ellas la de los menores sin ningún
adulto enlazado.

---

## 5. Publicar la aplicación

La aplicación son archivos estáticos: sirve cualquier hosting gratuito. `npm run build` deja todo en
`socios-cga/dist/`.

| Dónde | Cómo | Costo |
|---|---|---|
| **Netlify** (recomendado) | *Add new site → Import an existing project*, elija el repositorio y ponga `socios-cga` como **Base directory**. El archivo `netlify.toml` hace el resto. | Gratis |
| **Netlify Drop** | Arrastre la carpeta `dist` a [app.netlify.com/drop](https://app.netlify.com/drop). Sin cuenta, sin Git. | Gratis |
| **Vercel** | Importe el repositorio y ponga `socios-cga` como **Root Directory**. `vercel.json` hace el resto. | Gratis |
| **GitHub Pages** | Publique el contenido de `dist`. La aplicación usa rutas relativas y `HashRouter`, así que funciona también dentro de una subcarpeta. | Gratis |

Después de publicar, entre una vez a **Datos → Conexión con la nube** en cada computador (salvo que
haya compilado con el archivo `.env`).

> Para una dirección propia —`socios.cga.cl`— hay que comprar el dominio (unos $10.000 al año) y
> apuntarlo; el hosting sigue siendo gratis.

---

## 6. Los avisos automáticos

Hay dos vías, y conviene entender por qué son dos.

### Correo: automático, todos los días

El archivo `avisos/enviar.mjs` hace exactamente lo que haría alguien entrando a Cobranzas y pulsando
**Correo** en cada fila. Lo ejecuta solo, una vez al día, la tarea programada
`.github/workflows/avisos-cga.yml`, que corre en GitHub Actions —gratuito— a las 12:00 UTC (08:00 en
Temuco en invierno, 09:00 en verano).

Para dejarlo andando, cargue los secretos en **Settings → Secrets and variables → Actions → New
repository secret** del repositorio:

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → clave **service_role** |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys (plan gratuito) |
| `REMITENTE` | `Club Gimnástico Alemán <avisos@sudominio.cl>` |
| `RESPONDER_A` | *(opcional)* correo del club para las respuestas |

Mientras falte `RESEND_API_KEY`, la tarea corre en **modo ensayo**: lista a quién habría que
avisarle y no envía nada. Sirve para probar sin molestar a nadie —también a mano, desde la pestaña
*Actions → Avisos de renovación CGA → Run workflow*, marcando *ensayo*.

Tres cosas que hace el script y conviene saber:

- **No recalcula nada**: lee la vista `v_cobranzas`, la misma regla que usa la aplicación.
- **No repite avisos**: el envío queda anotado en la base *antes* de mandar el correo, contra un
  índice único por (inscripción, vencimiento). Aunque la tarea corra los cinco días previos —o dos
  veces a la vez— se envía un correo, no cinco.
- **Los errores quedan a la vista**: un envío fallido se registra con estado `error` y deja la tarea
  en rojo en GitHub, que es la única señal que llega sin que nadie entre a mirar.

> Sobre el remitente: para que los correos no caigan en spam hay que verificar un dominio en Resend
> (tres registros DNS, unos minutos). Mientras tanto se puede usar `onboarding@resend.dev`, que
> funciona para probar pero no para escribirle a las familias.

### WhatsApp y SMS: a mano, desde Cobranzas

Enviar WhatsApp o SMS automáticamente **no tiene una vía gratuita**: la API oficial de WhatsApp
Business cobra por conversación y exige una cuenta de empresa verificada, y los SMS en Chile se
cobran por mensaje. Prometer lo contrario sería mentir.

Lo que sí hace la aplicación es dejarlo en un clic: el botón **WhatsApp** de cada fila abre el chat
con el mensaje ya escrito, y el envío queda registrado igual que un correo. Para veinte o treinta
avisos al mes, es cuestión de minutos.

Si más adelante el club quiere WhatsApp automático, el camino es contratar la API de WhatsApp
Business (a través de Twilio, 360dialog o similar) y agregarle al script un segundo canal: la
estructura ya está: cada inscripción guarda su canal preferido.

---

## 7. Qué es gratis y hasta dónde

| Pieza | Plan gratuito | Alcanza para |
|---|---|---|
| **Supabase** | 500 MB de base, 50.000 usuarios activos al mes | Decenas de miles de personas y pagos: un club de este tamaño no se acerca al límite |
| **Netlify / Vercel** | 100 GB de tráfico al mes | Muy por sobre el uso de un equipo interno |
| **GitHub Actions** | Ilimitado en repositorios públicos; 2.000 minutos al mes en privados | Esta tarea usa menos de un minuto al día |
| **Resend** | 3.000 correos al mes, 100 al día | Un club con 300 familias envía del orden de 60 avisos al mes |

Dos advertencias honestas:

1. **Supabase pausa los proyectos gratuitos tras una semana sin ninguna consulta.** Se reactivan
   desde el panel con *Restore project*, pero mientras están en pausa la aplicación no entra. En un
   club que lo usa todos los días no ocurre; si el uso fuera estacional, conviene el plan de pago
   (unos 25 dólares al mes) o dejar la tarea diaria de avisos, que basta para mantenerlo despierto.
2. **Los respaldos automáticos son del plan de pago.** Por eso está **Datos → Descargar respaldo**:
   un archivo con todo, para guardar en el Drive del club. Vale la pena hacerlo una vez al mes.

---

## 8. Segunda etapa: el portal de apoderados

La idea es que el pagador entre con su correo y vea lo suyo: qué tiene inscrito cada hijo, qué pagó,
qué le vence y —lo más pedido— **reserve los horarios de su plan**.

Lo que ya está construido y sirve de base:

- Los **horarios** viven dentro de cada plan (día, hora, lugar).
- Los **vínculos** ya dicen quién puede ver a quién: un apoderado ve a las personas a su cargo.
- Las **inscripciones** ya dicen a qué tiene derecho cada uno y hasta cuándo está al día.

Lo que falta, y no es menor:

1. Una tabla `reservas` (inscripción, horario, fecha, estado) con el tope de cupos por sesión.
2. **Acceso por enlace mágico** para los apoderados: Supabase lo trae incluido, pero hay que
   enlazar cada cuenta con su ficha de persona (una columna `auth_id` en `personas`).
3. **Políticas de seguridad distintas**: hoy toda cuenta con sesión ve todo, lo que está bien para
   el equipo del club y es inaceptable para un apoderado. Hay que escribir políticas que limiten
   cada consulta a la propia familia.
4. La aplicación del portal, que puede ser este mismo sitio con otra pantalla de entrada y
   permisos distintos, o una app instalable desde el navegador.

No se hizo ahora a propósito: sin el registro cargado y las cuotas al día, un portal no tiene qué
mostrar.

---

## 9. Estructura del proyecto

```
socios-cga/
├── README.md                     Este archivo
├── .env.example                  Variables de la nube y del envío de avisos
├── netlify.toml, vercel.json     Publicación en un clic
├── avisos/
│   └── enviar.mjs                Envío diario de avisos (sin dependencias)
├── supabase/
│   └── schema.sql                Tablas, seguridad y vistas de consulta
└── src/
    ├── domain/                   Las reglas del club, sin pantalla ni base de datos
    │   ├── types.ts              Personas, vínculos, planes, inscripciones, pagos
    │   ├── rut.ts                Dígito verificador y formato del RUT
    │   ├── fechas.ts             Edades, períodos y vencimientos
    │   ├── cobros.ts             Qué debe cada quién y cuándo
    │   ├── familia.ts            El cruce: responsables, hermanos, pagadores
    │   └── avisos.ts             A quién avisar, por dónde y con qué texto
    ├── data/                     Dónde se guarda
    │   ├── store.ts              Contrato único de persistencia
    │   ├── localDriver.ts        IndexedDB, este computador
    │   ├── supabaseDriver.ts     La base compartida
    │   ├── mapeo.ts              Objetos ↔ filas de PostgreSQL
    │   ├── diagnostico.ts        Revisión de la instalación
    │   └── ejemplo.ts            Datos de demostración
    ├── pages/                    Las pantallas
    └── styles/                   Identidad visual del CGA
```

La aplicación no sabe si está hablando con IndexedDB o con Supabase: los dos cumplen el mismo
contrato (`src/data/store.ts`). Por eso se puede empezar a cargar datos hoy en un computador y pasar
a la base compartida mañana, sin perder nada: se descarga el respaldo y se sube con **Cargar
respaldo**.

### Identidad visual

Rojo CGA `#C8102E`, Negro Carbón `#1C1C1C`, Gris Círculo `#5A5A5A`, Amarillo Alemán `#EAAA00`, y
tipografía Barlow. Los colores de rama —Amarillo DFB en Fútbol, Verde Bosque en Outdoor & Trail, Oro
Oscuro en Tenis, Azul Agua en Natación— aparecen **sólo** en el punto de la insignia que identifica
a cada rama, nunca como color de una pantalla: en una lista donde conviven tenis y natación, teñirla
del color de una sería atribuirle el sistema entero a esa rama. Todos los colores viven en
`src/styles/tokens.css`; ningún otro archivo lleva un color escrito a mano.

El escudo se dibuja en SVG a partir del logotipo oficial. Si el club entrega el archivo vectorial,
déjelo en `public/brand/` como `escudo-cga.svg` (y `escudo-cga-blanco.svg` para los fondos oscuros)
y la aplicación lo usará en vez del dibujo.

---

## 10. Cuidado con los datos personales

Este registro contiene RUT, direcciones, teléfonos, previsión de salud y observaciones médicas de
socios y de **menores de edad**. Eso obliga a algunas cosas, más allá de lo que diga la ley:

- **Cada persona con su cuenta.** No comparta una sola cuenta entre todos: si hay que quitarle el
  acceso a alguien, se borra la suya y nadie más se entera.
- **El acceso lo dan las políticas, no el secreto.** La clave `anon` va dentro del sitio y no
  alcanza para leer nada sin sesión. La `service_role` **jamás** debe salir de los secretos del
  repositorio: quien la tenga puede leer y escribir todo.
- **Pida lo que necesita y nada más.** La ficha permite guardar observaciones de salud porque un
  entrenador tiene que saber que un niño usa inhalador; no es el lugar para un diagnóstico completo.
- **La autorización de imagen se marca sólo si está firmada**, y en menores la firma el apoderado.
- **Los respaldos también son datos.** El archivo que baja de *Datos → Descargar respaldo* trae todo
  en claro: guárdelo en el Drive del club, no en el escritorio de un computador compartido.
- **La normativa chilena cambió.** A la ley 19.628 sobre protección de la vida privada se suma la
  ley 21.719, que crea la Agencia de Protección de Datos Personales y entra en vigencia a fines de
  2026, con obligaciones más exigentes para quien trata datos de menores. Antes de abrir el portal
  de apoderados de la segunda etapa, conviene revisar con el directorio qué se informa a las
  familias y qué se les pide autorizar.
