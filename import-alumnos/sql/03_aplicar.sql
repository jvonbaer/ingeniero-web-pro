-- APLICAR. Correr 01_respaldo.sql antes. Todo dentro de una transaccion.
begin;

-- A) Insertar los 32 alumnos nuevos, derivandolos de import_staging.
--    on conflict (codigo) do nothing: si el codigo ya existiera, la fila se ignora
--    en vez de pisar al jugador existente.
insert into jugadores (id, codigo, categoria, activo, datos)
select s.jugador_id, s.codigo, s.categoria, true,
       jsonb_build_object(
         'id', s.jugador_id, 'codigo', s.codigo,
         'nombre', s.nombres, 'apellido', s.apellidos,
         'rut', coalesce(s.rut,''),
         'fechaNacimiento', coalesce(s.fecha_nac::text,''),   -- vacia si el Excel no la trae
         'anioNacimiento', s.anio_nac::text,
         'categoria', s.categoria, 'activo', true,
         'posicion','', 'pieHabil','', 'alturaCm','', 'dorsal','',
         'ingreso', current_date::text,
         'creadoEn', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'apoderado', jsonb_build_object('nombre','','email','','telefono',''),
         'fotoDataUrl','',
         '_import', jsonb_build_object('lote', s.lote, 'fila', s.n,
                      'fuente','LISTA_ALUMNOS_FUTBOL.xlsx', 'accion','insertado')
       )
  from import_staging s
 where s.lote = 'lote-2026-09-02-lista-futbol'
   and s.veredicto = 'NUEVO'
   and s.codigo is not null          -- excluye las 3 filas sin año de nacimiento
on conflict (codigo) do nothing;

-- B) Completar SOLO campos vacios de los ya existentes (EXACTO y PROBABLE confirmados).
--    Regla de no-sobrescritura: j.datos va a la DERECHA del operador ||, por lo tanto
--    cualquier valor ya presente en la base gana sobre el del Excel.
update jugadores j
set datos = j.datos
            -- Los valores del Excel van a la DERECHA del ||, pero solo se calculan
            -- cuando el campo existente esta ausente o vacio; strip_nulls descarta
            -- el resto. Asi el relleno cubre huecos y nunca pisa un dato ingresado.
            || jsonb_strip_nulls(jsonb_build_object(
                 'rut',             case when coalesce(j.datos->>'rut','') = ''
                                         then s.rut end,
                 'anioNacimiento',  case when coalesce(j.datos->>'anioNacimiento','') = ''
                                         then s.anio_nac::text end,
                 'fechaNacimiento', case when coalesce(j.datos->>'fechaNacimiento','') = ''
                                         then s.fecha_nac::text end
               ))
            -- _import es metadata del proceso: se re-estampa siempre.
            || jsonb_build_object('_import',
                 jsonb_build_object('lote', s.lote, 'fila', s.n,
                                    'fuente','LISTA_ALUMNOS_FUTBOL.xlsx',
                                    'accion','completado')),
    actualizado_en = now()
from import_staging s
where s.lote = 'lote-2026-09-02-lista-futbol'
  and s.veredicto in ('EXACTO','PROBABLE','CONFIRMADO')
  and j.codigo = s.codigo_match;

-- C) Correcciones AUTORIZADAS EXPRESAMENTE. Esto SI sobrescribe, a diferencia de (B),
--    porque son datos que la base tiene mal: dos apellidos mal escritos y tres fechas
--    de nacimiento que eran el placeholder 2020-09-01 (la fecha de ingreso, no la real).
--    Si prefieres no tocarlos, borra este bloque completo: (A) y (B) no dependen de el.
update jugadores set datos = datos || '{"apellido":"Castet","fechaNacimiento":"2021-09-22"}'::jsonb,
       actualizado_en = now() where codigo = 'CGA-F-20-002';   -- Simon Alejandro Castet Fernandez
update jugadores set datos = datos || '{"apellido":"Geisse","fechaNacimiento":"2021-09-12"}'::jsonb,
       actualizado_en = now() where codigo = 'CGA-F-20-004';   -- Federico Thomas Geisse Yevenes
update jugadores set datos = datos || '{"fechaNacimiento":"2020-01-25"}'::jsonb,
       actualizado_en = now() where codigo = 'CGA-F-20-005';   -- Alonso Andres Caro Orena

select count(*) as insertados from jugadores where datos->'_import'->>'lote' = 'lote-2026-09-02-lista-futbol';
-- Revisar el resultado y recien entonces:
-- commit;   (o  rollback;  si algo no cuadra)
