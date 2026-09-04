# Manual del administrador — Quién entra y qué puede hacer

Escuela de Fútbol · Club Gimnástico Alemán de Temuco

Guía corta para dar y quitar acceso al sistema de evaluación. Está escrita para
quien administra el club, no para quien programa.

> **Complete estos datos antes de guardar o compartir este manual:**
>
> | | |
> |---|---|
> | Dirección del sistema | `_______________________________________` |
> | Proyecto en Supabase | `_______________________________________` |
> | Quién administra | `_______________________________________` |

---

## Índice

1. [Las tres cosas que conviene no confundir](#1-las-tres-cosas-que-conviene-no-confundir)
2. [Agregar un entrenador nuevo](#2-agregar-un-entrenador-nuevo)
3. [Nombrar o quitar un administrador](#3-nombrar-o-quitar-un-administrador)
4. [Sacar a alguien del sistema](#4-sacar-a-alguien-del-sistema)
5. [Cuando alguien olvida su clave](#5-cuando-alguien-olvida-su-clave)
6. [El primer día del entrenador, en su propio teléfono](#6-el-primer-día-del-entrenador-en-su-propio-teléfono)
7. [Qué puede hacer cada rol](#7-qué-puede-hacer-cada-rol)
8. [Comprobaciones rápidas](#8-comprobaciones-rápidas)
9. [Lo que suele salir mal](#9-lo-que-suele-salir-mal)

---

## 1. Las tres cosas que conviene no confundir

Son tres piezas distintas y se administran en tres lugares distintos. Casi todos
los enredos vienen de mezclarlas.

| | Qué es | Dónde se administra |
|---|---|---|
| **La cuenta** | El correo y la clave con que entra una persona | Supabase → **Authentication → Users** |
| **El rol** | Si esa persona es `admin` o `entrenador` | Supabase → **Table Editor → `perfiles`** |
| **El dispositivo** | El teléfono o computador desde el que entra | Se configura una vez por aparato, en el propio aparato |

**No hay registro abierto.** Nadie puede crearse una cuenta solo: las crea el
club, una por una. Es a propósito, porque las fichas tienen nombre, foto y
contacto del apoderado de menores de edad.

---

## 2. Agregar un entrenador nuevo

Toma dos minutos y se hace una sola vez por persona.

1. Entre a [supabase.com](https://supabase.com) y abra el proyecto de la escuela.
2. En el menú de la izquierda, **Authentication**.
3. **Users** → botón **Add user** → **Create new user**.
4. Escriba el **correo** del entrenador y una **clave provisoria**.
5. **Active «Auto Confirm User».** Sin eso, Supabase le manda un correo de
   confirmación y la persona no puede entrar hasta que lo abra. Con el club
   creando las cuentas a mano, ese paso sólo agrega demoras.
6. **Create user**.
7. Entréguele el correo, la clave y la dirección del sistema. Pídale que cambie
   la clave apenas entre, o cámbiela usted por una definitiva.

Listo: esa persona ya entra como **entrenador**.

> **No hace falta tocar nada más.** No tiene que agregarla a `perfiles`: quien no
> tiene fila ahí cuenta como entrenador, que es el rol con menos permisos. Su
> fila aparece sola la primera vez que entre.

---

## 3. Nombrar o quitar un administrador

El rol de administrador da acceso a los respaldos, a las pautas de evaluación y
al borrado de historial. Déselo sólo a quien lo necesite.

**La persona tiene que haber entrado al menos una vez** para que exista su fila.
Si nunca entró, pídale que entre y vuelva acá.

1. Supabase → **Table Editor** (el ícono de tabla, en la izquierda).
2. Arriba, elija la tabla **`perfiles`**.
3. Busque la fila por su correo.
4. Haga doble clic en la celda de la columna **`rol`**.
5. Escriba **`admin`** para nombrarlo, o **`entrenador`** para quitárselo.
6. Guarde. El cambio es inmediato.

> La persona tiene que **salir y volver a entrar** en la aplicación para que su
> pantalla se entere. El rol se lee al iniciar sesión.

**`rol` sólo acepta dos valores**, `admin` o `entrenador`. Cualquier otra cosa la
rechaza la propia base. Es a propósito: un rol mal escrito sería un rol que no
existe y nadie se daría cuenta.

---

## 4. Sacar a alguien del sistema

Cuando alguien deja el cuerpo técnico:

1. Supabase → **Authentication → Users**.
2. Busque su correo, menú de tres puntos al final de la fila → **Delete user**.

Con eso deja de poder entrar, en el acto y desde cualquier dispositivo. Su fila
de `perfiles` se borra sola.

**Lo que hizo no se borra.** Las evaluaciones que levantó siguen ahí con su
nombre: son historial de los niños, no de él.

> **Hágalo el mismo día.** Mientras la cuenta exista, esa persona sigue viendo
> nombres, fotos y teléfonos de los apoderados desde su propio teléfono, haya
> devuelto o no la tablet del club.

---

## 5. Cuando alguien olvida su clave

Dos caminos, y el segundo es el que suele servir:

**Mandarle un correo de recuperación.** Authentication → Users → tres puntos en
su fila → la opción de recuperación de contraseña. Requiere que el proyecto
tenga el envío de correos configurado; el que trae Supabase de fábrica está muy
limitado y a veces no llega.

**Cambiársela usted.** En la misma fila, la opción de actualizar la contraseña.
Le pone una nueva, se la entrega, y le pide que la cambie.

> **No borre y vuelva a crear la cuenta para cambiar una clave.** Al borrarla se
> va también su fila de `perfiles`, y si era administrador vuelve como
> entrenador. Si igual lo hace, acuérdese de volver a ponerle el rol.

---

## 6. El primer día del entrenador, en su propio teléfono

Dígale que abra la dirección del sistema. Lo que vea después depende de cómo se
publicó la aplicación, y se distingue a simple vista:

**Le pide correo y clave.** No hay nada que configurar. Entra y ya está.

**Le aparece la aplicación con la etiqueta «Este dispositivo» arriba a la
derecha.** Ese aparato todavía no sabe dónde está la base del club. Una vez, en
ese teléfono:

1. **Datos → Conexión con la nube**.
2. Pegar los dos valores del proyecto, que están en Supabase → **Project
   Settings → API**: el `Project URL` y la clave `anon public`.
3. **Conectar con la nube**. La página se recarga y ahora sí pide correo y clave.

> La clave `anon public` está pensada para viajar dentro del sitio web, a la
> vista. No es un secreto: lo que protege los datos son los permisos de la base,
> que rechazan toda lectura sin sesión iniciada. La que **nunca** debe salir de
> Supabase es la `service_role`.

Conviene además que deje el sistema como aplicación en la pantalla de inicio:
en el navegador, **Compartir → Añadir a pantalla de inicio** (iPhone) o
**menú → Instalar aplicación** (Android).

---

## 7. Qué puede hacer cada rol

| | admin | entrenador |
|---|---|---|
| Ver jugadores, evaluaciones y camisetas | Sí | Sí |
| Crear y editar fichas, tomar fotos | Sí | Sí |
| Evaluar e inscribir camisetas | Sí | Sí |
| Quitar una camiseta del pedido o un escaneo mal tomado | Sí | Sí |
| **Borrar un jugador y su historial** | Sí | **No** |
| **Borrar una evaluación** | Sí | **No** |
| **Editar las pautas (Parámetros)** | Sí | **No** |
| **Respaldos y planillas (Datos)** | Sí | **No** |
| **Nombrar administradores** | Sí | **No** |

Al entrenador las pestañas **Parámetros** y **Datos** ni le aparecen.

### Dos límites que conviene tener claros

**Un entrenador ve los datos de contacto de todos los apoderados.** Los necesita
para leer la ficha del niño que evalúa. El rol limita lo que puede *hacer*, no lo
que puede *ver*. Por eso importa dar cuentas sólo a quien corresponde, y darlas
de baja el día que la persona se va.

**Lo que decide es la base de datos, no la pantalla.** Que al entrenador no le
aparezca la pestaña Datos es una cortesía para no ofrecerle botones que le van a
ser rechazados. Las restricciones de verdad están escritas en los permisos de
Supabase, así que tampoco puede saltárselas por fuera de la aplicación.

---

## 8. Comprobaciones rápidas

En Supabase → **SQL Editor** → **New query**. Son consultas de lectura: no
cambian nada.

**Quién tiene acceso y con qué rol:**

```sql
select email, rol, creado_en
from public.perfiles
order by rol, email;
```

**Quién tiene cuenta pero nunca ha entrado** (por eso no aparece arriba):

```sql
select u.email, u.created_at
from auth.users u
left join public.perfiles p on p.id = u.id
where p.id is null;
```

**Que los permisos estén puestos** — tienen que salir 20 filas:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

---

## 9. Lo que suele salir mal

**«Creé la cuenta y no puede entrar.»** Casi siempre falta el **Auto Confirm
User**. En Authentication → Users, la columna de confirmación tiene que estar
marcada. Si no lo está, confírmela a mano desde el menú de tres puntos.

**«Le puse `admin` y sigue sin ver Parámetros.»** Tiene que **salir y volver a
entrar**. El rol se lee al iniciar sesión, no en cada pantalla.

**«No encuentro a la persona en `perfiles`.»** Todavía no ha entrado nunca. Su
fila aparece sola la primera vez. Mientras tanto cuenta como entrenador.

**«Aprieto Eliminar y no pasa nada.»** Está entrando con una cuenta de
entrenador. La aplicación lo dice con todas sus letras: *esa acción está
reservada al administrador del club*.

**«Un entrenador dice que ve todo en blanco.»** Está en un dispositivo sin la
conexión configurada, viendo una base vacía de su propio navegador. Revise que
arriba a la derecha diga **Nube compartida** y no **Este dispositivo**; si dice
lo segundo, vea la [sección 6](#6-el-primer-día-del-entrenador-en-su-propio-teléfono).
