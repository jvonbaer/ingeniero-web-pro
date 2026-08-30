-- ============================================================================
-- Socios, ramas y escuelas · Club Gimnástico Alemán de Temuco
-- Esquema de la base compartida (Supabase / PostgreSQL).
--
-- Cómo usarlo: supabase.com → su proyecto → SQL Editor → New query → pegar
-- todo → Run. Es idempotente: se puede volver a ejecutar sin romper nada ni
-- perder datos.
-- ============================================================================
--
-- Cómo se cruzan los datos, que es lo que sostiene todo lo demás:
--
--     personas ──vinculos──> personas        quién responde y paga por quién
--     personas ──inscripciones──> planes     en qué está inscrito y a qué precio
--     inscripciones ──pagos──>               qué períodos están pagados
--
-- Hay UNA sola tabla de personas. El niño de la escuela de fútbol, su madre que
-- paga y el socio vitalicio que juega tenis son todos filas de `personas`; lo
-- que los distingue son sus relaciones. Con dos tablas separadas —"socios" y
-- "apoderados"— cada consulta cruzada habría que programarla aparte, y una
-- madre que además es socia terminaría registrada dos veces.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
--
-- Las columnas son de verdad, no un bloque JSON: así la secretaría puede abrir
-- la tabla en Supabase → Table Editor, ordenar por apellido, corregir un
-- teléfono o bajar un CSV sin ayuda de nadie. Sólo `descuentos` y `horarios`
-- van en jsonb, porque son listas de largo variable dentro de un plan.
-- ---------------------------------------------------------------------------

create table if not exists public.personas (
  id                    text primary key,
  rut                   text unique,
  documento             text default '',
  nombres               text not null,
  apellidos             text not null default '',
  fecha_nacimiento      date,
  sexo                  text default '',
  email                 text default '',
  telefono              text default '',
  direccion             text default '',
  comuna                text default '',
  socio                 boolean not null default false,
  numero_socio          text default '',
  categoria_socio       text default '',
  fecha_ingreso         date,
  contacto_emergencia   text default '',
  telefono_emergencia   text default '',
  observaciones_salud   text default '',
  prevision             text default '',
  autoriza_imagen       boolean not null default false,
  activo                boolean not null default true,
  notas                 text default '',
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

-- El cruce entre quien practica y el adulto que responde por ella.
-- `pagador` es lo que conecta al deportista con quien paga: la inscripción
-- guarda a quién se le cobra, y este vínculo explica por qué.
create table if not exists public.vinculos (
  id                  text primary key,
  persona_id          text not null references public.personas(id) on delete cascade,
  adulto_id           text not null references public.personas(id) on delete cascade,
  tipo                text not null default 'apoderado',
  pagador             boolean not null default false,
  contacto_principal  boolean not null default false,
  notas               text default '',
  -- La misma pareja no se registra dos veces: evita que un apoderado aparezca
  -- duplicado en la ficha por haber tocado dos veces «Enlazar».
  unique (persona_id, adulto_id),
  -- Nadie es responsable de sí mismo.
  constraint vinculo_no_reflexivo check (persona_id <> adulto_id)
);

-- La cuota de socio, la mensualidad de una rama, el arancel de una escuela o el
-- valor de una actividad puntual: todos comparten estructura.
create table if not exists public.planes (
  id              text primary key,
  nombre          text not null,
  tipo            text not null default 'escuela',   -- socio | rama | escuela | actividad
  rama            text not null default 'club',      -- club | futbol | outdoor | tenis | natacion
  valor           integer not null default 0,
  matricula       integer not null default 0,
  periodicidad    text not null default 'mensual',   -- mensual | trimestral | semestral | anual | unico
  cupos           integer,
  vigencia_desde  date,
  vigencia_hasta  date,
  condiciones     text default '',
  requisitos      text default '',
  descuentos      jsonb not null default '{"hermanos":0,"socio":0,"pagoAnual":0}'::jsonb,
  horarios        jsonb not null default '[]'::jsonb,
  edad_minima     integer,
  edad_maxima     integer,
  activo          boolean not null default true,
  notas           text default '',
  actualizado_en  timestamptz not null default now()
);

-- `valor` y `periodicidad` son una COPIA de los del plan al momento de
-- inscribir, no una referencia: cuando el club sube la mensualidad en marzo,
-- quien se inscribió en enero conserva lo que se le prometió hasta que alguien
-- decida cambiárselo a mano.
create table if not exists public.inscripciones (
  id                text primary key,
  persona_id        text not null references public.personas(id) on delete cascade,
  plan_id           text not null references public.planes(id)   on delete restrict,
  pagador_id        text not null references public.personas(id) on delete restrict,
  fecha_inicio      date not null,
  fecha_termino     date,
  valor             integer not null default 0,
  descuento_motivo  text default '',
  periodicidad      text not null default 'mensual',
  estado            text not null default 'activa',   -- activa | suspendida | terminada
  canal_aviso       text not null default 'correo',   -- correo | whatsapp | ambos
  dias_aviso        integer not null default 5,
  matricula_pagada  boolean not null default false,
  notas             text default '',
  creado_en         timestamptz not null default now()
);

-- Cada pago cubre un período concreto, y de ahí sale el próximo vencimiento: no
-- se guarda una fecha de vencimiento suelta que haya que recordar actualizar.
-- Los pagos de matrícula van sin período, porque no corren la renovación.
create table if not exists public.pagos (
  id              text primary key,
  inscripcion_id  text not null references public.inscripciones(id) on delete cascade,
  persona_id      text not null references public.personas(id) on delete restrict,
  monto           integer not null default 0,
  fecha           date not null,
  periodo_desde   date,
  periodo_hasta   date,
  medio           text not null default 'transferencia',
  concepto        text not null default 'cuota',      -- cuota | matricula | actividad | otro
  comprobante     text default '',
  registrado_por  text default '',
  notas           text default '',
  creado_en       timestamptz not null default now()
);

-- Registro de los avisos de renovación ya enviados, para no repetirlos.
create table if not exists public.avisos (
  id              text primary key,
  inscripcion_id  text not null references public.inscripciones(id) on delete cascade,
  vence           date,
  canal           text not null default 'correo',
  destino         text default '',
  enviado_en      timestamptz not null default now(),
  estado          text not null default 'enviado',    -- enviado | error | manual
  detalle         text default ''
);

create index if not exists personas_apellidos_idx    on public.personas (apellidos, nombres);
create index if not exists personas_activas_idx      on public.personas (activo) where activo;
create index if not exists vinculos_persona_idx      on public.vinculos (persona_id);
create index if not exists vinculos_adulto_idx       on public.vinculos (adulto_id);
create index if not exists inscripciones_persona_idx on public.inscripciones (persona_id);
create index if not exists inscripciones_pagador_idx on public.inscripciones (pagador_id);
create index if not exists inscripciones_plan_idx    on public.inscripciones (plan_id) where estado = 'activa';
create index if not exists pagos_inscripcion_idx     on public.pagos (inscripcion_id, periodo_hasta desc);
create index if not exists pagos_fecha_idx           on public.pagos (fecha desc);

-- Un mismo vencimiento no se avisa dos veces por la vía automática.
--
-- El envío automático anota la fila ANTES de mandar el correo, así que este
-- índice funciona como una reserva: si dos ejecuciones coincidieran, la segunda
-- choca acá y no alcanza a mandar nada. Es parcial —sólo sobre los avisos
-- efectivamente enviados— por dos razones: los avisos hechos a mano desde la
-- pantalla de Cobranzas se pueden repetir cuantas veces haga falta, y un envío
-- que falló queda con estado `error` y por lo tanto se reintenta al día
-- siguiente.
create unique index if not exists avisos_sin_repetir_idx
  on public.avisos (inscripcion_id, vence) where estado = 'enviado';

-- ---------------------------------------------------------------------------
-- Seguridad
--
-- Las fichas contienen RUT, direcciones y teléfonos de socios y de menores de
-- edad. La clave anónima del proyecto viaja dentro del sitio web, así que por
-- sí sola NO puede dar acceso: RLS queda activo y todas las políticas exigen
-- sesión iniciada. Las cuentas de quienes administran el registro se crean a
-- mano en Supabase → Authentication → Users → Add user.
-- ---------------------------------------------------------------------------

alter table public.personas      enable row level security;
alter table public.vinculos      enable row level security;
alter table public.planes        enable row level security;
alter table public.inscripciones enable row level security;
alter table public.pagos         enable row level security;
alter table public.avisos        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['personas', 'vinculos', 'planes', 'inscripciones', 'pagos', 'avisos'] loop
    execute format('drop policy if exists "club lee %1$s" on public.%1$I', t);
    execute format('drop policy if exists "club escribe %1$s" on public.%1$I', t);

    execute format($f$
      create policy "club lee %1$s" on public.%1$I
        for select to authenticated using (true)
    $f$, t);

    execute format($f$
      create policy "club escribe %1$s" on public.%1$I
        for all to authenticated using (true) with check (true)
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Vista de cobranza: una fila por inscripción, con su próximo vencimiento y a
-- quién avisarle.
--
-- Reproduce en SQL la misma regla que aplica la aplicación —el vencimiento se
-- deduce de los pagos, no se guarda— para que el envío automático de avisos
-- (avisos/enviar.mjs) no tenga que reimplementarla, y para poder consultar el
-- estado de las cuotas desde el propio Supabase.
--
-- `security_invoker`: sin esto la vista se ejecutaría con los permisos de su
-- dueño y se saltaría el RLS de las tablas de arriba.
-- ---------------------------------------------------------------------------

create or replace view public.v_cobranzas
with (security_invoker = true) as
with hoy as (
  -- La fecha de Chile, no la del servidor: en UTC, a partir de las 20:00 de
  -- Temuco ya es el día siguiente, y una cuota aparecería vencida antes de
  -- tiempo.
  select (now() at time zone 'America/Santiago')::date as dia
),
cubierto as (
  select
    i.id as inscripcion_id,
    max(p.periodo_hasta) as hasta
  from public.inscripciones i
  left join public.pagos p
    on p.inscripcion_id = i.id
   and p.concepto <> 'matricula'
   and p.periodo_hasta is not null
  group by i.id
),
base as (
  select
    i.*,
    c.hasta,
    case
      when i.periodicidad = 'unico' and c.hasta is not null then null
      when c.hasta is null then i.fecha_inicio
      else c.hasta + 1
    end as vence
  from public.inscripciones i
  join cubierto c on c.inscripcion_id = i.id
)
select
  b.id                                        as inscripcion_id,
  b.persona_id,
  trim(per.nombres || ' ' || per.apellidos)   as persona,
  per.rut                                     as persona_rut,
  pl.id                                       as plan_id,
  pl.nombre                                   as plan,
  pl.rama,
  pl.tipo                                     as tipo_plan,
  b.valor,
  b.periodicidad,
  b.estado                                    as estado_inscripcion,
  b.dias_aviso,
  b.canal_aviso,
  b.hasta                                     as cubierto_hasta,
  b.vence,
  (b.vence - h.dia)                           as dias,
  case
    when b.estado = 'terminada'          then 'terminada'
    when b.estado = 'suspendida'         then 'suspendida'
    when b.vence is null                 then 'pagada'
    when b.vence < h.dia                 then 'vencida'
    when b.vence <= h.dia + b.dias_aviso then 'por-vencer'
    else 'al-dia'
  end                                         as estado_cobro,
  b.pagador_id,
  trim(pag.nombres || ' ' || pag.apellidos)   as pagador,
  -- A quién avisarle: el pagador; y si no dejó contacto, el primer adulto
  -- responsable que sí lo tenga. Es la misma regla de src/domain/avisos.ts.
  coalesce(nullif(pag.email, ''), respaldo.email, '')       as avisar_email,
  coalesce(nullif(pag.telefono, ''), respaldo.telefono, '') as avisar_telefono
from base b
cross join hoy h
join public.personas per on per.id = b.persona_id
join public.planes   pl  on pl.id  = b.plan_id
join public.personas pag on pag.id = b.pagador_id
left join lateral (
  select a.email, a.telefono
  from public.vinculos v
  join public.personas a on a.id = v.adulto_id
  where v.persona_id = b.persona_id
    and (coalesce(a.email, '') <> '' or coalesce(a.telefono, '') <> '')
  order by v.pagador desc, v.contacto_principal desc
  limit 1
) respaldo on coalesce(pag.email, '') = '' and coalesce(pag.telefono, '') = '';

-- ---------------------------------------------------------------------------
-- Vista del grupo familiar: quién responde por quién, en una sola tabla plana.
-- Sirve para revisar los cruces desde SQL o exportarlos.
-- ---------------------------------------------------------------------------

create or replace view public.v_grupo_familiar
with (security_invoker = true) as
select
  trim(p.nombres || ' ' || p.apellidos) as persona,
  p.rut                                 as persona_rut,
  extract(year from age(p.fecha_nacimiento))::int as edad,
  v.tipo                                as relacion,
  trim(a.nombres || ' ' || a.apellidos) as adulto,
  a.rut                                 as adulto_rut,
  a.email                               as adulto_email,
  a.telefono                            as adulto_telefono,
  v.pagador,
  v.contacto_principal
from public.vinculos v
join public.personas p on p.id = v.persona_id
join public.personas a on a.id = v.adulto_id
order by p.apellidos, p.nombres;

-- ---------------------------------------------------------------------------
-- Comprobaciones rápidas (opcionales)
-- ---------------------------------------------------------------------------
-- Qué hay que cobrar esta semana y a quién avisarle:
--   select persona, plan, valor, vence, dias, estado_cobro, pagador, avisar_email
--   from public.v_cobranzas
--   where estado_inscripcion = 'activa' and estado_cobro in ('vencida', 'por-vencer')
--   order by dias;
--
-- Menores sin ningún adulto enlazado (el arreglo más urgente que puede haber):
--   select trim(nombres || ' ' || apellidos) as persona, fecha_nacimiento
--   from public.personas p
--   where p.fecha_nacimiento > current_date - interval '18 years'
--     and not exists (select 1 from public.vinculos v where v.persona_id = p.id);
--
-- Recaudación del mes por rama:
--   select pl.rama, sum(pg.monto) as total
--   from public.pagos pg
--   join public.inscripciones i on i.id = pg.inscripcion_id
--   join public.planes pl on pl.id = i.plan_id
--   where date_trunc('month', pg.fecha) = date_trunc('month', current_date)
--   group by pl.rama order by total desc;
