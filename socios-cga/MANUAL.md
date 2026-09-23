# Manual — Socios y Escuelas CGA

Guía completa del sistema de socios, ramas y escuelas del **Club Gimnástico Alemán** de Temuco.
Está escrita para quien lo va a usar en el mesón, no para quien programa.

- La **Parte 1** dice dónde vive cada cosa.
- La **Parte 2** es la puesta en marcha: se hace **una sola vez**, y la hace el administrador.
- La **Parte 3** es la instalación en cada computador: **cinco minutos por equipo**.
- La **Parte 4** es el manual de uso diario. Es la que hay que leer para trabajar.

> **Antes de empezar, complete estos tres datos y comparta el manual con ellos puestos:**
>
> | | |
> |---|---|
> | Dirección del sistema | `_______________________________________` |
> | Quién lo administra | `_______________________________________` |
> | A quién llamar si algo falla | `_______________________________________` |

---

## Índice

**Parte 1 · Dónde vive cada cosa**
- [1.1 Las tres piezas](#11-las-tres-piezas)
- [1.2 Qué pasa si se pierde algo](#12-qué-pasa-si-se-pierde-algo)

**Parte 2 · Puesta en marcha (una sola vez)**
- [2.1 Crear la base de datos](#21-crear-la-base-de-datos)
- [2.2 Crear las tablas](#22-crear-las-tablas)
- [2.3 Crear las cuentas](#23-crear-las-cuentas)
- [2.4 Publicar la aplicación](#24-publicar-la-aplicación)
- [2.5 Conectar y revisar](#25-conectar-y-revisar)
- [2.6 Cargar los planes reales](#26-cargar-los-planes-reales)
- [2.7 Encender los avisos automáticos](#27-encender-los-avisos-automáticos)
- [2.8 Lista de comprobación](#28-lista-de-comprobación)

**Parte 3 · Instalación en cada computador**
- [3.1 Los cinco minutos](#31-los-cinco-minutos)
- [3.2 Dejarlo como una aplicación](#32-dejarlo-como-una-aplicación)
- [3.3 En tablet o teléfono](#33-en-tablet-o-teléfono)
- [3.4 Lo que no hay que hacer](#34-lo-que-no-hay-que-hacer)

**Parte 4 · Manual de uso**
- [4.1 Las cinco palabras del sistema](#41-las-cinco-palabras-del-sistema)
- [4.2 Inscribir a un niño nuevo](#42-inscribir-a-un-niño-nuevo)
- [4.3 Inscribir al hermano](#43-inscribir-al-hermano)
- [4.4 Registrar un pago](#44-registrar-un-pago)
- [4.5 La rutina de cobranza](#45-la-rutina-de-cobranza)
- [4.6 Cargar o cambiar un plan](#46-cargar-o-cambiar-un-plan)
- [4.7 Una actividad puntual](#47-una-actividad-puntual)
- [4.8 Suspender, retirar o eliminar](#48-suspender-retirar-o-eliminar)
- [4.9 Quién hizo qué](#49-quién-hizo-qué)
- [4.10 Sacar la información a planilla](#410-sacar-la-información-a-planilla)
- [4.11 Rutinas recomendadas](#411-rutinas-recomendadas)
- [4.12 Cuando algo no funciona](#412-cuando-algo-no-funciona)

---

# Parte 1 · Dónde vive cada cosa

## 1.1 Las tres piezas

El sistema no está instalado en ningún computador del club: **vive en internet**, y cada equipo
entra a verlo con su navegador. Son tres piezas, y conviene saber cuál es cuál.

```
   Computador de secretaría  ┐
   Computador de tesorería   ├──► LA APLICACIÓN ──► LA BASE DE DATOS
   Tablet de la cancha       ┘     (el sitio web)      (donde viven los datos)
                                                              ▲
                                          EL AVISADOR ────────┘
                                     (manda los correos solo, cada día)
```

| Pieza | Qué es | Dónde está | Quién la administra |
|---|---|---|---|
| **La aplicación** | Las pantallas que se usan: personas, planes, cobranzas, pagos | En una dirección web (Netlify o Vercel). Se abre con el navegador; no se instala nada | El administrador del club |
| **La base de datos** | Los datos de verdad: socios, apoderados, inscripciones, pagos | En Supabase, una base PostgreSQL en la nube | El administrador del club |
| **El avisador** | Una tarea que corre sola una vez al día y manda los correos de renovación | En GitHub Actions | El administrador del club |

Tres consecuencias prácticas:

1. **Todos ven lo mismo, al instante.** Si secretaría inscribe a un niño, tesorería lo ve en su
   pantalla al recargar. No hay archivos que pasarse ni versiones distintas.
2. **No hay nada que respaldar en los computadores.** Si se rompe uno, se entra desde otro y está
   todo. Lo que sí hay que respaldar es la base (ver [1.2](#12-qué-pasa-si-se-pierde-algo)).
3. **Sin internet no se entra.** Para eso está el modo «este computador», que sirve de emergencia
   pero **no comparte nada con nadie**. No es donde se lleva el registro real.

## 1.2 Qué pasa si se pierde algo

| Si se pierde… | Consecuencia | Qué hacer |
|---|---|---|
| Un computador | Ninguna: los datos no estaban ahí | Entrar desde otro equipo |
| La clave de una persona | Sólo esa persona no entra | El administrador se la cambia en Supabase → Authentication |
| La dirección del sitio | No se entra hasta recordarla | Anotarla arriba en este manual y en la pizarra del mesón |
| **La base de datos** | **Se pierde todo** | Por eso: **una vez al mes**, entrar a *Datos → Descargar respaldo* y guardar el archivo en el Drive del club |

> El respaldo mensual es la única tarea de mantención del sistema. Toma treinta segundos y es lo
> que separa un susto de un desastre.

---

# Parte 2 · Puesta en marcha (una sola vez)

Esto lo hace **una persona, una vez**. Toma alrededor de una hora la primera vez. Todo lo que se usa
es gratuito.

## 2.1 Crear la base de datos

1. Entrar a **supabase.com** y crear una cuenta con el correo institucional del club.
2. **New project**.
3. Nombre: `cga-socios`. Contraseña de base de datos: una larga, **guardarla en el gestor de claves
   del club**. Región: **South America (São Paulo)**, la más cercana.
4. Esperar los dos o tres minutos que tarda en levantarse.

## 2.2 Crear las tablas

1. En el menú de la izquierda: **SQL Editor → New query**.
2. Abrir el archivo `socios-cga/supabase/schema.sql` del repositorio, copiarlo **entero** y pegarlo.
3. **Run**.

Debe terminar sin errores en rojo (los avisos amarillos que dicen *skipping* son normales). Esto
crea las tablas, la seguridad, la bitácora y las vistas de consulta.

> Este mismo archivo se puede volver a correr más adelante, cuando el sistema se actualice: no
> borra nada, sólo agrega lo que falte.

## 2.3 Crear las cuentas

**Authentication → Users → Add user**, una por cada persona que vaya a usar el sistema. Marcar
**Auto Confirm User**.

- **Una cuenta por persona. Nunca una cuenta compartida.**
- Correo real de cada quien; la clave inicial se la entrega el administrador y la persona la cambia.

Esto no es burocracia: el sistema anota a nombre de quién queda cada dato que se ingresa, y con una
cuenta común esa información deja de servir para algo.

## 2.4 Publicar la aplicación

La forma más simple, si el club tiene el repositorio en GitHub:

1. Entrar a **netlify.com**, *Add new site → Import an existing project*.
2. Elegir el repositorio.
3. En **Base directory** escribir `socios-cga`. Lo demás viene configurado.
4. **Deploy**. En un par de minutos entrega una dirección del tipo
   `https://socios-cga.netlify.app`.

Esa dirección es la que van a usar todos. Se puede cambiar por una más corta en *Site settings →
Change site name*.

## 2.5 Conectar y revisar

1. Abrir la dirección publicada.
2. Ir a **Datos → Conexión con la nube**.
3. En Supabase: **Project Settings → API**. Copiar **Project URL** y la clave **anon public**
   (la larga, *no* la `service_role`), y pegarlas.
4. **Conectar con la nube**. La página se recarga y ahora pide correo y clave.
5. Entrar con una cuenta y volver a **Datos → Revisar la instalación**. Escribir la dirección, la
   clave anónima, un correo y su clave, y pulsar **Revisar**.

La revisión prueba una por una las seis cosas que tienen que estar bien y dice cuál falta. **No
siga hasta que todas estén en verde.**

## 2.6 Cargar los planes reales

**Planes → + Nuevo plan**, uno por cada cosa que el club cobra: la cuota de socio, las
mensualidades de cada rama, los aranceles de las escuelas.

Conviene tener a mano, para cada uno: valor, matrícula si tiene, cada cuánto se paga, cupos, edades,
horarios, descuentos (hermanos, socio, pago anual) y el texto de las condiciones.

> Cargue los planes **antes** de empezar a inscribir gente: al inscribir hay que elegir uno.

## 2.7 Encender los avisos automáticos

Sólo si el club quiere que los correos de renovación salgan solos. Se hace en GitHub, en
**Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Ídem, la clave **service_role** (esta sí es secreta: no va en ningún computador) |
| `RESEND_API_KEY` | Crear cuenta gratis en **resend.com** → API Keys |
| `REMITENTE` | `Club Gimnástico Alemán <avisos@dominiodelclub.cl>` |

Para probar sin enviarle nada a nadie: pestaña **Actions → Avisos de renovación CGA → Run
workflow**, marcando *ensayo*. Muestra a quién le habría escrito.

Mientras no se cargue `RESEND_API_KEY`, la tarea corre en ensayo y no manda correos. Los avisos por
WhatsApp siempre se mandan a mano, desde la pantalla de Cobranzas.

## 2.8 Lista de comprobación

- [ ] El proyecto de Supabase está creado y el esquema corrió sin errores
- [ ] Hay una cuenta por cada persona que va a usar el sistema
- [ ] La aplicación está publicada y la dirección está anotada
- [ ] *Revisar la instalación* muestra todo en verde
- [ ] Los planes reales están cargados con sus valores y condiciones
- [ ] (Opcional) Los avisos automáticos están configurados y probados en ensayo
- [ ] La dirección y el nombre del administrador están escritos al principio de este manual

---

# Parte 3 · Instalación en cada computador

**No se instala ningún programa.** Lo que hay que hacer en cada equipo es dejar el acceso a mano y
que la persona entre con su cuenta.

## 3.1 Los cinco minutos

1. Abrir el navegador. Sirve **Chrome, Edge, Firefox o Safari**, en versión reciente.
2. Escribir la dirección del sistema (la de la Parte 2) y entrar.
3. Guardarla en **favoritos** (Ctrl + D, o Cmd + D en Mac).
4. Escribir el **correo y la clave propios** y entrar.
5. Comprobar que arriba a la derecha aparece **su propio correo**. Si aparece el de otra persona,
   pulsar *Salir* y entrar con el suyo.

Eso es todo. No hay que repetir nada la próxima vez: el navegador recuerda la sesión.

> **Si la pantalla no pide correo y clave**, ese computador está guardando los datos sólo en sí
> mismo: falta conectarlo. Vaya a *Datos → Conexión con la nube* y pegue los dos valores que
> entrega el administrador (la dirección del proyecto y la clave anónima). Es la única cosa que
> puede haber que repetir por equipo.

## 3.2 Dejarlo como una aplicación

Para que quede un ícono en el escritorio, igual que un programa:

- **Chrome o Edge**: con el sistema abierto, menú **⋮** (arriba a la derecha) → *Guardar y
  compartir* o *Aplicaciones* → **Instalar esta página como aplicación**. Queda un ícono en el
  escritorio y se abre en su propia ventana, sin barra de direcciones.
- **Safari (Mac)**: menú *Archivo → Añadir al Dock*.

## 3.3 En tablet o teléfono

Funciona igual: la pantalla se acomoda sola. Para dejar el ícono:

- **Android (Chrome)**: menú **⋮** → *Añadir a pantalla de inicio*.
- **iPhone o iPad (Safari)**: botón *Compartir* → *Añadir a pantalla de inicio*.

Útil para consultar en la cancha o en la piscina quién está al día.

## 3.4 Lo que no hay que hacer

| No | Por qué |
|---|---|
| Compartir una cuenta entre varias personas | El sistema anota a nombre de quién queda cada dato; con una cuenta común esa información no sirve |
| Dejar la sesión abierta en un computador de acceso público | Cualquiera vería los datos de los socios y de los niños |
| Usar el modo «este computador» para el registro real | Esos datos no salen de ese navegador y no los ve nadie más |
| Anotar la clave en un papel pegado a la pantalla | — |

---

# Parte 4 · Manual de uso

## 4.1 Las cinco palabras del sistema

| Palabra | Qué significa |
|---|---|
| **Persona** | Cualquiera: un niño de la escuela, su madre, un socio vitalicio. Todos van en la misma lista |
| **Vínculo** | La relación entre una persona y el adulto que responde por ella. Ahí se marca **quién paga** |
| **Plan** | Lo que el club cobra: cuota de socio, mensualidad de una rama, arancel de una escuela, actividad puntual |
| **Inscripción** | Una persona metida en un plan, a un precio acordado y con alguien que paga |
| **Pago** | Plata recibida, que cubre un período. De los pagos sale la fecha del próximo vencimiento |

La idea clave: **el niño y su madre son dos personas unidas por un vínculo**. Por eso, desde el niño
se llega a quién paga, y desde la madre se llega a todos sus hijos y a todo lo que debe.

## 4.2 Inscribir a un niño nuevo

**Personas → + Nueva persona**

1. **Nombres y apellidos.**
2. **RUT.** Se puede escribir con o sin puntos. Si el sistema dice que no es válido, hay un dígito
   mal escrito: revíselo antes de seguir. Si es extranjero sin RUT, use el campo *Documento*.
3. **Fecha de nacimiento.** Debajo aparece la edad; si es menor de 18, el sistema lo avisa.
4. **Contacto**: correo y teléfono del niño si los tiene; si no, se dejan vacíos (los avisos van al
   apoderado).
5. **Adulto responsable** — es obligatorio en menores:
   - Si la madre o el padre **ya están en el sistema** (por ejemplo, porque tienen otro hijo
     inscrito), escriba dos letras de su nombre o su RUT en el buscador y elíjalo de la lista.
     **Esto es importante: así queda una sola ficha suya, con los dos hijos colgando.**
   - Si no está, pulse *No está en el sistema: crear su ficha* y complete lo que tenga a mano. Con
     el nombre basta para guardar; el correo se puede agregar después.
   - Elija la relación (madre, padre, apoderado…).
6. **Salud y emergencia**: contacto de emergencia, previsión, alergias o lesiones. Es lo que el
   entrenador necesita saber en la cancha.
7. **Autoriza el uso de su imagen**: márquelo **sólo si hay autorización firmada**.
8. **Guardar ficha.**

Ya en la ficha del niño: **+ Inscribir en un plan** → elegir el plan, confirmar **quién paga** (el
sistema propone al adulto marcado como pagador), la fecha de inicio, los descuentos que
correspondan, y listo.

> **No me deja guardar.** Si es menor de edad y no enlazó a ningún adulto, el sistema no lo permite:
> sin eso no habría a quién cobrarle ni a quién avisarle. Enlace a alguien, aunque sea sólo con el
> nombre.

## 4.3 Inscribir al hermano

Es el caso más frecuente y el que hay que hacer bien.

1. **Personas → + Nueva persona**, con los datos del segundo hijo.
2. En *Adulto responsable*, **búsquelo en el sistema** y elija a la misma madre o padre. No lo cree
   de nuevo.
3. Guardar, y desde la ficha inscribirlo en su plan.
4. Al inscribir, si el plan tiene **descuento por hermanos**, márquelo: el valor se recalcula solo.

Resultado: en la ficha de la madre aparecen **los dos hijos**, lo que paga por cada uno y su
**carga mensual total**. En la ficha de cada niño aparece su hermano.

## 4.4 Registrar un pago

Desde la ficha de la persona, o desde **Cobranzas**, botón **Registrar pago**.

El sistema ya viene con todo puesto: el monto acordado y el período que corresponde cobrar. En el
caso normal sólo hay que revisar y confirmar.

- **Concepto**: *cuota del período* es lo habitual. *Matrícula* es para el cobro de una sola vez al
  entrar, y **no corre la fecha de renovación**.
- **Período desde / hasta**: qué mes (o trimestre, o año) está cubriendo ese pago. El aviso verde
  dice hasta cuándo queda cubierta la inscripción y cuál pasa a ser el próximo vencimiento.
- **Medio y comprobante**: número de transferencia o boleta, para poder buscarlo después.
- **Recibido por**: quién lo recibió en el club.

Al guardar, el estado de esa inscripción cambia solo: de *vencida* o *por vencer* a **al día**.

> **Un pago mal cargado se anula** desde *Pagos → Anular*. La inscripción vuelve exactamente al
> estado que tenía antes.

## 4.5 La rutina de cobranza

**Cobranzas**, una vez a la semana. Tiene cuatro pestañas:

| Pestaña | Qué hacer |
|---|---|
| **Vencidas** | Escribirles hoy. Son cuotas que ya se pasaron de fecha |
| **Por vencer** | Recordatorio amable. Entran acá cinco días antes (o los que se haya configurado) |
| **Próximos 30 días** | Sólo para prever el mes; no requiere acción |
| **Sin contacto** | **Arreglar primero.** El pagador no tiene correo ni teléfono, así que ningún aviso lo alcanza |

Cada fila dice a quién avisarle y por qué, y trae dos botones:

- **Correo** — abre el correo con el texto ya escrito. Sólo hay que enviarlo.
- **WhatsApp** — abre el chat con el mismo mensaje.

En los dos casos el sistema anota que se avisó, para que no le llegue el mismo recordatorio dos
veces a la misma persona.

> Si los **avisos automáticos** están encendidos, los correos salen solos cada mañana y esta
> pantalla queda para los casos que necesitan una llamada o un WhatsApp.

## 4.6 Cargar o cambiar un plan

**Planes → + Nuevo plan**, o *Editar* en uno existente.

Lo importante de entender: **cambiar el precio de un plan no cambia lo que ya está cobrándose**. Al
inscribir a alguien, el valor queda copiado dentro de su inscripción. Si en marzo la mensualidad
sube, quien se inscribió en enero sigue con lo que se le prometió, hasta que alguien lo cambie a
mano en su ficha.

Es a propósito: evita que un ajuste de precios altere de golpe lo acordado con cien familias.

Para **dejar de ofrecer** un plan, desmarque *Plan vigente*: desaparece al inscribir, pero se
conserva todo lo cobrado. Los planes con inscripciones **no se pueden eliminar**, porque sus pagos
quedarían sin explicación.

## 4.7 Una actividad puntual

Un campeonato, una salida a la montaña, una clínica. Se maneja igual que todo lo demás:

1. **Planes → + Nuevo plan**, tipo **Actividad puntual**, periodicidad **Pago único**, con su valor,
   sus cupos y sus condiciones.
2. Inscribir a cada participante desde su ficha. La *fecha de inicio* es la fecha de la actividad o
   el plazo de pago.
3. Los que no han pagado aparecen en Cobranzas como *por pagar*; cuando pagan, quedan **pagados** y
   no vuelven a vencer.

Al final, en **Pagos** se filtra por esas fechas y se ve lo recaudado.

## 4.8 Suspender, retirar o eliminar

Tres cosas distintas:

| Situación | Qué hacer | Qué pasa |
|---|---|---|
| Se lesionó y vuelve en dos meses | En su ficha, **Suspender** la inscripción | Deja de generar cobros y avisos. Se reactiva con un clic |
| Se fue del club | Editar la ficha y desmarcar **Sigue participando en el club** | Desaparece del listado y de las cobranzas; se conserva su historial |
| Ficha creada por error | **Eliminar esta ficha** | Sólo funciona si no tiene pagos registrados |

**Una ficha con pagos no se puede borrar.** Esos pagos son la contabilidad del club. El sistema lo
explica y ofrece marcarla como retirada, que es lo que se necesita en la práctica.

## 4.9 Quién hizo qué

**Bitácora**, en el menú.

Cada alta, cambio y baja queda anotada con **quién la hizo, cuándo y qué cambió exactamente**. Se
filtra por persona, por tipo de dato, por acción y por fechas, y se exporta a planilla.

- ¿Quién cambió el valor de esta inscripción? → La bitácora muestra
  `tesoreria@club.cl · modificó inscripciones · Valor: $28.000 → $22.400`, con fecha y hora.
- ¿Cuándo se creó esta ficha y quién la creó? → En la ficha misma, tarjeta *Quién registró esta
  ficha*, con enlace a su historial completo.

La bitácora **la escribe la base de datos, no la aplicación**: toma el correo de la sesión, así que
nadie puede firmar con el nombre de otro, y **no se puede corregir ni borrar** desde el sistema.

## 4.10 Sacar la información a planilla

| Qué | Dónde | Qué trae |
|---|---|---|
| **Nómina completa** | Datos → *Descargar nómina (CSV)* | Una fila por persona: sus datos, sus apoderados, quién le paga, en qué está inscrita, su estado de cuotas y quién la registró |
| **Pagos de un período** | Pagos → *Exportar CSV* | Todos los pagos del rango, con socio, pagador, plan, período y medio |
| **Bitácora** | Bitácora → *Exportar CSV* | Los movimientos filtrados, con el detalle de cada cambio |
| **Respaldo completo** | Datos → *Descargar respaldo* | Todo el sistema en un archivo, para guardar |

Los CSV se abren directamente en Excel o Google Sheets, con las tildes correctas.

## 4.11 Rutinas recomendadas

| Cuándo | Qué |
|---|---|
| **Cada día** | Mirar el número rojo junto a *Cobranzas* en el menú: es lo que está vencido o por vencer |
| **Cada semana** | Recorrer *Cobranzas → Vencidas* y *Por vencer*. Revisar *Sin contacto* y completar los que falten |
| **Cada mes** | *Datos → Descargar respaldo* y guardarlo en el Drive del club. Sacar la planilla de pagos del mes para el directorio |
| **Cada temporada** | Revisar los planes: valores, cupos, vigencias y condiciones |

## 4.12 Cuando algo no funciona

| Síntoma | Qué pasa | Solución |
|---|---|---|
| «Correo o clave incorrectos» | La clave está mala, o la cuenta no existe | Que el administrador la revise en Supabase → Authentication |
| «La sesión caducó» | Pasó mucho tiempo | Pulsar *Salir* y volver a entrar |
| «La hora de este dispositivo no coincide» | El reloj del computador está desajustado | Poner fecha y hora en automático |
| «No hay conexión con el servidor» | Se cayó internet | Revisar la señal; los datos están a salvo en la base |
| No entra y antes sí entraba | Supabase pausa los proyectos gratuitos tras una semana sin uso | El administrador entra a Supabase y pulsa *Restore project* |
| No aparece la pantalla de correo y clave | Ese computador no está conectado a la base compartida | *Datos → Conexión con la nube* |
| No me deja guardar a un menor | Falta enlazarlo a un adulto responsable | Enlazar a la madre, el padre o el apoderado |
| No me deja eliminar una ficha | Tiene pagos registrados o paga por otros | Marcarla como retirada, o reasignar el pagador |
| No me deja eliminar un plan | Tiene inscripciones | Desmarcar *Plan vigente* |
| Falta algo que yo cargué | Alguien lo modificó o lo borró | **Bitácora**: ahí está quién, cuándo y qué cambió |

Si nada de esto lo resuelve, el administrador tiene una herramienta de diagnóstico:
**Datos → Revisar la instalación**, que prueba una por una las seis cosas que deben estar bien y
dice cuál falta.
