-- ============================================================================
-- Escuela de Fútbol · Club Gimnástico Alemán
-- Esquema para el modo nube (Supabase / PostgreSQL).
--
-- Cómo usarlo: en supabase.com → su proyecto → SQL Editor → pegar todo → Run.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
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
-- Las fichas contienen nombre, foto y correo del apoderado de menores de edad.
-- La clave anónima del proyecto viaja dentro del sitio web, así que por sí sola
-- NO puede dar acceso: RLS queda activo y todas las políticas exigen sesión
-- iniciada. Las cuentas del cuerpo técnico se crean a mano en
-- Supabase → Authentication → Users → Add user.
-- ---------------------------------------------------------------------------

alter table public.jugadores    enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.camisetas    enable row level security;
alter table public.rubrica      enable row level security;
alter table public.hojas        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['jugadores', 'evaluaciones', 'camisetas', 'rubrica', 'hojas'] loop
    execute format('drop policy if exists "cuerpo tecnico lee %1$s" on public.%1$I', t);
    execute format('drop policy if exists "cuerpo tecnico escribe %1$s" on public.%1$I', t);

    execute format($f$
      create policy "cuerpo tecnico lee %1$s" on public.%1$I
        for select to authenticated using (true)
    $f$, t);

    execute format($f$
      create policy "cuerpo tecnico escribe %1$s" on public.%1$I
        for all to authenticated using (true) with check (true)
    $f$, t);
  end loop;
end $$;

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
