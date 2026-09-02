-- ============================================================================
-- Escuela de Fútbol · Club Gimnástico Alemán
-- Migración: quién puede hacer qué.
--
-- Hasta ahora toda cuenta con sesión podía todo: leer, escribir y borrar
-- cualquier cosa. Esto separa dos roles.
--
--   admin       El club. Todo, incluidos Parámetros, respaldos y borrar.
--   entrenador  Evalúa, inscribe camisetas y edita fichas. No borra jugadores
--               ni evaluaciones, y no toca las pautas.
--
-- Cómo usarlo: supabase.com → su proyecto → SQL Editor → New query → pegar
-- todo → Run. ANTES DE EJECUTAR, cambie el correo del paso 3 por el suyo.
--
-- ----------------------------------------------------------------------------
-- LEA ESTO ANTES DE CORRER, PORQUE SUPABASE VA A MOSTRAR SU AVISO
--
-- Este archivo SÍ contiene `drop policy`, y no se puede evitar: las reglas de
-- permiso de PostgreSQL se suman, nunca se restan. Si la regla vieja dice
-- «cualquiera con sesión puede todo», agregarle una regla nueva más estricta no
-- sirve de nada mientras la vieja siga ahí. Hay que sacarla para que la nueva
-- mande.
--
-- `drop policy` borra una REGLA DE PERMISO, no datos. En este archivo no hay
-- ningún DROP TABLE, DELETE, TRUNCATE ni ALTER COLUMN: sus jugadores, sus
-- evaluaciones, sus camisetas y sus hojas no se tocan.
--
-- Si el correo del paso 3 no corresponde a ninguna cuenta, el archivo se
-- detiene AHÍ, antes de tocar un solo permiso: el sistema queda funcionando
-- exactamente como hoy y lo único que queda es una tabla `perfiles` vacía que
-- no le hace nada a nadie. Corrija el correo y vuelva a correrlo.
--
-- El orden de los pasos es a propósito y no conviene alterarlo: primero lo que
-- no cambia nada, después la verificación, y sólo al final los permisos. Así no
-- hace falta confiar en que la base deshaga a medio camino.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La tabla de perfiles
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
-- 2. La pregunta "¿quien está conectado es administrador?"
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
-- 3. Quién es el administrador
--
--    ⬇⬇  CAMBIE ESTE CORREO POR EL SUYO ANTES DE EJECUTAR  ⬇⬇
--
-- Tiene que ser el mismo con el que entra a la aplicación, es decir una cuenta
-- de Supabase → Authentication → Users. Puede repetir la línea para nombrar a
-- más de uno.
-- ---------------------------------------------------------------------------

update public.perfiles set rol = 'admin' where email = 'CAMBIE-ESTO@ejemplo.cl';

-- ---------------------------------------------------------------------------
-- 4. Red de seguridad
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
      'No quedó ningún administrador, así que no se cambió nada. El correo del paso 3 no coincide con ninguna cuenta. Las cuentas que existen son: %',
      correos;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Permisos sobre los perfiles
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
-- 6. Permisos sobre los datos de la escuela
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
-- 7. Comprobación
--
-- Corra esto aparte después. Tiene que aparecer su correo con rol `admin`.
-- ---------------------------------------------------------------------------

-- select email, rol from public.perfiles order by rol, email;
