-- ============================================================================
-- Escuela de Fútbol · Club Gimnástico Alemán
-- Esquema para el modo nube (Supabase / PostgreSQL).
--
-- Cómo usarlo: en supabase.com → su proyecto → SQL Editor → pegar todo → Run.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- ANTES DE EJECUTAR, busque «CAMBIE-ESTO» y ponga ahí el correo de quien va a
-- administrar el sistema. Si no lo hace, el archivo se detiene y se lo dice.
--
-- Sobre una base que YA está en uso conviene correr las migraciones sueltas de
-- esta misma carpeta en vez de este archivo: hacen lo mismo, pero sin volver a
-- escribir lo que ya está puesto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
--
-- Cada entidad viaja completa en la columna `datos` (jsonb) y sólo se proyectan
-- como columnas los campos por los que se filtra u ordena. Es deliberado: la
-- rúbrica la edita el propio entrenador desde la pantalla "Parámetros", y un
-- esquema relacional rígido para los puntajes obligaría a migrar la base cada
-- vez que agrega un sub-punto. Para consultar en SQL está la vista v_puntajes,
-- más abajo, que devuelve los mismos datos fila por fila.
-- ---------------------------------------------------------------------------

create table if not exists public.jugadores (
  id              text primary key,
  codigo          text not null unique,
  categoria       text,
  activo          boolean not null default true,
  datos           jsonb not null,
  actualizado_en  timestamptz not null default now()
);

create table if not exists public.evaluaciones (
  id              text primary key,
  jugador_id      text not null references public.jugadores(id) on delete cascade,
  fecha           date not null,
  estado          text not null default 'borrador',
  datos           jsonb not null,
  actualizado_en  timestamptz not null default now()
);

-- Una sola fila (id = 1) con la configuración de la escuela: las pautas de
-- evaluación, qué pauta usa cada categoría de edad, y el cuerpo técnico.
-- (La tabla conserva el nombre `rubrica` de la primera versión para no obligar
-- a migrar las instalaciones que ya existen.)
create table if not exists public.rubrica (
  id              integer primary key default 1,
  datos           jsonb not null,
  actualizado_en  timestamptz not null default now(),
  constraint rubrica_fila_unica check (id = 1)
);

-- Hojas de papel escaneadas. Van en su propia tabla y no dentro de la
-- evaluación: la aplicación carga todas las evaluaciones al arrancar y una
-- imagen de 250 KB por cada una haría la espera insoportable. Se leen de a una,
-- sólo cuando alguien abre esa evaluación.
create table if not exists public.hojas (
  evaluacion_id   text primary key references public.evaluaciones(id) on delete cascade,
  datos           text not null,
  actualizado_en  timestamptz not null default now()
);


-- Camisetas del pedido de cada temporada.
--
-- A diferencia de las otras tablas, acá SÍ salen tres campos del jsonb a
-- columnas propias: sobre ellos va el índice único que impide que dos niños de
-- la misma categoría terminen con el mismo dorsal. La aplicación valida lo
-- mismo antes de guardar, pero esa validación no sirve cuando dos entrenadores
-- inscriben al mismo tiempo desde teléfonos distintos: la última palabra tiene
-- que tenerla la base.
create table if not exists public.camisetas (
  id              text primary key,
  jugador_id      text not null references public.jugadores(id) on delete cascade,
  temporada       text not null,
  categoria       text not null,
  numero          integer not null check (numero between 1 and 99),
  datos           jsonb not null,
  actualizado_en  timestamptz not null default now(),
  -- Un número por categoría y temporada.
  constraint camisetas_numero_unico unique (temporada, categoria, numero),
  -- Y una camiseta por jugador y temporada.
  constraint camisetas_jugador_unico unique (temporada, jugador_id)
);

create index if not exists evaluaciones_jugador_idx on public.evaluaciones (jugador_id, fecha desc);
create index if not exists jugadores_categoria_idx  on public.jugadores (categoria) where activo;
create index if not exists camisetas_temporada_idx   on public.camisetas (temporada, categoria, numero);

-- ---------------------------------------------------------------------------
-- Seguridad
--
-- Dos capas, y conviene no confundirlas.
--
-- La primera es quién entra. Las fichas contienen nombre, foto y correo del
-- apoderado de menores de edad. La clave anónima del proyecto viaja dentro del
-- sitio web, así que por sí sola NO puede dar acceso: RLS queda activo y todas
-- las políticas exigen sesión iniciada. Las cuentas del cuerpo técnico se crean
-- a mano en Supabase → Authentication → Users → Add user.
--
-- La segunda es qué puede hacer cada uno, y se apoya en la tabla `perfiles`:
--
--   admin       El club. Todo, incluidas las pautas y el borrado de historial.
--   entrenador  Evalúa, inscribe camisetas y edita fichas. No borra jugadores
--               ni evaluaciones, y no toca las pautas.
--
-- Nada de esto vive en la aplicación. La aplicación esconde los botones que no
-- corresponden, pero eso es cortesía: quien decide es esto de acá, porque
-- cualquiera con una cuenta puede consultar la base sin pasar por la pantalla.
--
--    ⬇⬇  MÁS ABAJO HAY UN CORREO QUE TIENE QUE CAMBIAR POR EL SUYO  ⬇⬇
-- ---------------------------------------------------------------------------

alter table public.jugadores    enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.camisetas    enable row level security;
alter table public.rubrica      enable row level security;
alter table public.hojas        enable row level security;

-- ---------------------------------------------------------------------------
-- Quién es quién: la tabla de perfiles
--
-- Una fila por cuenta. El rol se administra desde Table Editor, sin tocar
-- código: para nombrar a alguien administrador, se le cambia `rol` a 'admin'.
--
-- Quien no tenga fila acá es entrenador. Es deliberado que el caso "no sé quién
-- es" caiga del lado que menos permisos tiene y no del otro.
-- ---------------------------------------------------------------------------

create table if not exists public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nombre     text not null default '',
  rol        text not null default 'entrenador' check (rol in ('admin', 'entrenador')),
  creado_en  timestamptz not null default now()
);

-- Las cuentas que ya existen entran como entrenadores. El administrador se
-- nombra en el paso 5.
insert into public.perfiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- La pregunta "¿quien está conectado es administrador?"
--
-- Va como función y no escrita dentro de cada política, por dos razones. Una,
-- que se escribe una sola vez y no diez. La otra es técnica y es la importante:
-- la política de la tabla `perfiles` necesita consultar `perfiles`, y eso sin
-- `security definer` sería una consulta que se llama a sí misma para siempre.
-- Al declararla así, la función corre con los permisos de su dueño y lee la
-- tabla directamente, sin volver a pasar por las políticas.
--
-- No expone nada: sólo responde sí o no sobre quien ya está conectado.
-- ---------------------------------------------------------------------------

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Quién es el administrador
--
--    ⬇⬇  CAMBIE ESTE CORREO POR EL SUYO ANTES DE EJECUTAR  ⬇⬇
--
-- Tiene que ser el mismo con el que entra a la aplicación, es decir una cuenta
-- de Supabase → Authentication → Users. Puede repetir la línea para nombrar a
-- más de uno.
-- ---------------------------------------------------------------------------

update public.perfiles set rol = 'admin' where email = 'CAMBIE-ESTO@ejemplo.cl';

-- ---------------------------------------------------------------------------
-- Red de seguridad
--
-- Si el correo de arriba no correspondía a ninguna cuenta, no quedaría ningún
-- administrador y usted se habría cerrado la puerta de su propio sistema: sin
-- Parámetros, sin respaldos y sin poder arreglarlo desde la aplicación.
--
-- Por eso esta comprobación va ACÁ y no al final: lo que sigue son los
-- permisos, y si algo está mal el archivo se detiene sin haberlos tocado. El
-- club sigue trabajando como hoy mientras usted corrige el correo.
-- ---------------------------------------------------------------------------

do $$
declare
  correos text;
begin
  if not exists (select 1 from public.perfiles where rol = 'admin') then
    select coalesce(string_agg(email, ', '), '(ninguna)') into correos from public.perfiles;
    raise exception
      'No quedó ningún administrador, así que no se cambió nada. El correo del bloque anterior no coincide con ninguna cuenta. Las cuentas que existen son: %',
      correos;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Permisos sobre los perfiles
--
-- Cada uno ve su propia fila —la aplicación la necesita para saber qué mostrar—
-- y el administrador las ve todas. Escribir, sólo el administrador: sin esto
-- cualquier entrenador se ascendería a sí mismo con una línea desde la consola
-- del navegador, y todo lo demás de este archivo sobraría.
-- ---------------------------------------------------------------------------

alter table public.perfiles enable row level security;

drop policy if exists "cada uno ve su perfil" on public.perfiles;
create policy "cada uno ve su perfil" on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

drop policy if exists "solo el admin administra perfiles" on public.perfiles;
create policy "solo el admin administra perfiles" on public.perfiles
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Permisos sobre los datos de la escuela
--
-- La regla vieja —una sola, «puede todo»— se reemplaza por cuatro separadas:
-- leer, crear, editar y borrar. Las tres primeras siguen siendo de todo el
-- cuerpo técnico, porque son el trabajo de todos los días. La cuarta cambia.
--
-- Borrar un jugador se lleva por delante su historial completo de evaluaciones
-- y su camiseta, y no hay forma de deshacerlo. Borrar una evaluación rompe la
-- comparación de la tela de araña. Ésas dos quedan para el administrador.
--
-- `hojas` y `camisetas` conservan el borrado abierto a propósito: quitar un
-- escaneo mal tomado o sacar del pedido a un niño que se retiró es trabajo
-- corriente del entrenador, y no destruye historial.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  solo_admin_borra boolean;
begin
  foreach t in array array['jugadores', 'evaluaciones', 'camisetas', 'hojas'] loop
    solo_admin_borra := t in ('jugadores', 'evaluaciones');

    -- Fuera las dos reglas anchas de antes.
    execute format('drop policy if exists "cuerpo tecnico lee %1$s" on public.%1$I', t);
    execute format('drop policy if exists "cuerpo tecnico escribe %1$s" on public.%1$I', t);
    -- Y fuera las de este mismo archivo, para poder volver a correrlo.
    execute format('drop policy if exists "cuerpo tecnico crea %1$s" on public.%1$I', t);
    execute format('drop policy if exists "cuerpo tecnico edita %1$s" on public.%1$I', t);
    execute format('drop policy if exists "borrar %1$s" on public.%1$I', t);

    execute format($f$
      create policy "cuerpo tecnico lee %1$s" on public.%1$I
        for select to authenticated using (true)
    $f$, t);

    execute format($f$
      create policy "cuerpo tecnico crea %1$s" on public.%1$I
        for insert to authenticated with check (true)
    $f$, t);

    execute format($f$
      create policy "cuerpo tecnico edita %1$s" on public.%1$I
        for update to authenticated using (true) with check (true)
    $f$, t);

    execute format(
      'create policy "borrar %1$s" on public.%1$I for delete to authenticated using (%2$s)',
      t,
      case when solo_admin_borra then 'public.es_admin()' else 'true' end
    );
  end loop;
end $$;

-- Las pautas de evaluación las lee todo el mundo —sin ellas no se puede
-- evaluar— pero las edita sólo el administrador. Cambiar un sub-punto de lugar
-- afecta a todo el historial de la escuela, no a una ficha.
alter table public.rubrica enable row level security;

drop policy if exists "cuerpo tecnico lee rubrica" on public.rubrica;
drop policy if exists "cuerpo tecnico escribe rubrica" on public.rubrica;
drop policy if exists "solo el admin edita la rubrica" on public.rubrica;

create policy "cuerpo tecnico lee rubrica" on public.rubrica
  for select to authenticated using (true);

create policy "solo el admin edita la rubrica" on public.rubrica
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Vista de consulta: una fila por sub-punto respondido.
--
-- Cada evaluación se cruza con la pauta con la que fue levantada, así una
-- escuela con pautas distintas por categoría igual obtiene una sola tabla
-- plana. Sirve para análisis en SQL, tableros externos o exportaciones, sin
-- tener que entender la estructura del jsonb.
-- ---------------------------------------------------------------------------

-- security_invoker: sin esto la vista se ejecutaría con los permisos de su
-- dueño y se saltaría el RLS de las tablas de arriba.
create or replace view public.v_puntajes
with (security_invoker = true) as
with pautas as (
  select
    pauta.valor ->> 'id'                  as pauta_id,
    pauta.valor ->> 'nombre'              as pauta_nombre,
    (pauta.valor ->> 'version')::int      as pauta_version,
    cat.valor                             as categoria
  from public.rubrica r
  cross join lateral jsonb_array_elements(r.datos -> 'pautas') as pauta(valor)
  cross join lateral jsonb_array_elements(pauta.valor -> 'categorias') as cat(valor)
  where r.id = 1
)
select
  j.codigo                                              as jugador_codigo,
  (j.datos ->> 'nombre') || ' ' || (j.datos ->> 'apellido') as jugador,
  j.categoria,
  j.datos ->> 'posicion'                                as posicion,
  e.id                                                  as evaluacion_id,
  e.fecha,
  e.datos ->> 'temporada'                               as temporada,
  e.datos ->> 'entrenador'                              as entrenador,
  p.pauta_nombre                                        as pauta,
  (e.datos ->> 'pautaVersion')::int                     as pauta_version,
  p.categoria ->> 'id'                                  as categoria_evaluacion,
  ind.valor ->> 'id'                                    as indicador,
  ind.valor ->> 'nombre'                                as indicador_nombre,
  -- La subsección hace falta para leer la tabla: dentro de "Técnica" hay dos
  -- sub-puntos llamados "Precisión" —uno del pase y otro del remate— y dos
  -- llamados "Cambia de dirección". Sin esta columna no se distinguen.
  ind.valor ->> 'grupo'                                 as subseccion,
  (e.datos -> 'puntajes' ->> (ind.valor ->> 'id'))::int as valor,
  (e.datos ->> 'escalaMax')::int                        as escala_max,
  round(
    (e.datos -> 'puntajes' ->> (ind.valor ->> 'id'))::numeric
    / nullif((e.datos ->> 'escalaMax')::numeric, 0) * 100
  )                                                     as puntaje_100
from public.evaluaciones e
join public.jugadores j on j.id = e.jugador_id
join pautas p on p.pauta_id = e.datos ->> 'pautaId'
cross join lateral jsonb_array_elements(p.categoria -> 'indicadores') as ind(valor)
where e.estado = 'finalizada'
  and e.datos -> 'puntajes' ? (ind.valor ->> 'id');


-- ---------------------------------------------------------------------------
-- Vista de consulta: el pedido de camisetas, listo para la tesorería.
--
-- Trae el jugador al lado del número y calcula el saldo, que es la pregunta que
-- siempre se hace: quién debe y cuánto. Se puede bajar como CSV desde el propio
-- Supabase sin entender el jsonb.
-- ---------------------------------------------------------------------------

create or replace view public.v_camisetas
with (security_invoker = true) as
select
  c.temporada,
  c.categoria,
  c.numero,
  c.datos ->> 'nombreEstampado'                             as nombre_estampado,
  c.datos ->> 'talla'                                       as talla,
  j.codigo                                                  as jugador_codigo,
  (j.datos ->> 'nombre') || ' ' || (j.datos ->> 'apellido') as jugador,
  j.datos -> 'apoderado' ->> 'nombre'                       as apoderado,
  j.datos -> 'apoderado' ->> 'telefono'                     as telefono_apoderado,
  (c.datos ->> 'precio')::numeric                           as precio,
  (c.datos ->> 'abonado')::numeric                          as abonado,
  greatest(
    (c.datos ->> 'precio')::numeric - (c.datos ->> 'abonado')::numeric,
    0
  )                                                         as saldo,
  case
    when (c.datos ->> 'abonado')::numeric >= (c.datos ->> 'precio')::numeric then 'pagado'
    when (c.datos ->> 'abonado')::numeric > 0 then 'abonado'
    else 'pendiente'
  end                                                       as estado_pago,
  nullif(c.datos ->> 'medioPago', '')                       as medio_pago,
  nullif(c.datos ->> 'fechaPago', '')::date                 as fecha_pago,
  nullif(c.datos ->> 'comprobante', '')                     as comprobante,
  (c.datos ->> 'entregada')::boolean                        as entregada,
  nullif(c.datos ->> 'fechaEntrega', '')::date              as fecha_entrega,
  nullif(c.datos ->> 'notas', '')                           as notas
from public.camisetas c
join public.jugadores j on j.id = c.jugador_id;

-- ---------------------------------------------------------------------------
-- Comprobación rápida (opcional)
-- ---------------------------------------------------------------------------
-- select jugador, categoria, pauta, fecha, categoria_evaluacion,
--        round(avg(puntaje_100)) as puntaje
-- from public.v_puntajes
-- group by jugador, categoria, pauta, fecha, categoria_evaluacion
-- order by fecha desc, jugador;
--
-- select categoria, numero, nombre_estampado, talla, jugador, estado_pago, saldo
-- from public.v_camisetas
-- where temporada = '2026'
-- order by categoria, numero;
