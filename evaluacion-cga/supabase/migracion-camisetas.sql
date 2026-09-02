-- ============================================================================
-- Escuela de Fútbol · Club Gimnástico Alemán
-- Migración: agregar el pedido de camisetas a una base que YA está funcionando.
--
-- Para qué existe este archivo: `schema.sql` es el esquema completo y sirve
-- igual, pero vuelve a escribir las reglas de permiso de las cuatro tablas que
-- usted ya tiene andando. Este archivo NO las toca: sólo agrega lo nuevo.
--
-- Cómo usarlo: supabase.com → su proyecto → SQL Editor → New query → pegar
-- todo → Run. Es idempotente: se puede correr las veces que haga falta.
--
-- ----------------------------------------------------------------------------
-- QUÉ HACE Y QUÉ NO HACE
--
-- Hace, y nada más que esto:
--   · crea la tabla `camisetas`, que hoy no existe;
--   · le pone un índice para buscar por temporada y categoría;
--   · le activa la seguridad por fila y sus dos permisos;
--   · crea la vista de consulta `v_camisetas`.
--
-- NO hace, y se puede comprobar leyendo: ningún DROP TABLE, ningún DELETE,
-- ningún TRUNCATE, ningún ALTER COLUMN. No toca `jugadores`, `evaluaciones`,
-- `rubrica` ni `hojas` —ni sus datos, ni su estructura, ni sus permisos—.
--
-- El único `cascade` que aparece es la definición de la llave foránea: una
-- regla para el futuro (si algún día borra un jugador, se va también su
-- camiseta), no algo que se ejecute ahora sobre lo que ya hay.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La tabla
--
-- A diferencia de las demás, ésta saca tres campos del jsonb a columnas
-- propias: sobre ellos va el índice único que impide que dos niños de la misma
-- categoría terminen con el mismo dorsal. La aplicación valida lo mismo antes
-- de guardar, pero esa validación no sirve cuando dos entrenadores inscriben al
-- mismo tiempo desde teléfonos distintos: la última palabra la tiene la base.
-- ---------------------------------------------------------------------------

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

create index if not exists camisetas_temporada_idx on public.camisetas (temporada, categoria, numero);

-- ---------------------------------------------------------------------------
-- 2. Seguridad
--
-- Igual que en el resto del sistema: la clave anónima viaja dentro del sitio
-- web, así que por sí sola no puede dar acceso. Sin sesión iniciada no se lee
-- ni se escribe nada.
--
-- Los permisos se crean sólo si faltan, en vez de borrarlos y rehacerlos. Así
-- este archivo no contiene ningún DROP y se puede correr sin sobresaltos.
-- ---------------------------------------------------------------------------

alter table public.camisetas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'camisetas'
      and policyname = 'cuerpo tecnico lee camisetas'
  ) then
    create policy "cuerpo tecnico lee camisetas" on public.camisetas
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'camisetas'
      and policyname = 'cuerpo tecnico escribe camisetas'
  ) then
    create policy "cuerpo tecnico escribe camisetas" on public.camisetas
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Vista de consulta, para la tesorería
--
-- Trae el jugador y su apoderado al lado del número, y calcula el saldo, que es
-- la pregunta que siempre se hace: quién debe y cuánto. Se puede bajar como CSV
-- desde el propio Supabase sin entender el jsonb.
--
-- `security_invoker`: sin esto la vista se ejecutaría con los permisos de su
-- dueño y se saltaría la seguridad por fila de las tablas de arriba.
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
-- 4. Comprobación
--
-- Después de correr lo de arriba, ejecute esto aparte. Tiene que devolver una
-- tabla vacía —cero filas— y ningún error: la tabla existe y está vacía, que es
-- exactamente lo que corresponde antes de inscribir la primera camiseta.
-- ---------------------------------------------------------------------------

-- select * from public.camisetas;
