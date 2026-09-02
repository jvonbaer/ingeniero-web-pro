-- Deshace el lote completo. Requiere que exista la tabla de respaldo creada por 01.
-- Distingue dos casos, porque tratarlos igual borraria jugadores preexistentes:
--   accion='insertado'  -> fila creada por el import  -> se elimina
--   accion='completado' -> jugador que YA existia y solo recibio campos vacios
--                          -> se restaura tal cual estaba desde el respaldo
begin;

delete from jugadores
 where datos->'_import'->>'lote'   = 'lote-2026-09-02-lista-futbol'
   and datos->'_import'->>'accion' = 'insertado';

update jugadores j
   set datos = r.datos, categoria = r.categoria, activo = r.activo, actualizado_en = now()
  from respaldo_jugadores_20260902 r
 where j.codigo = r.codigo
   and j.datos->'_import'->>'lote'   = 'lote-2026-09-02-lista-futbol'
   and j.datos->'_import'->>'accion' = 'completado';

select count(*) as jugadores_tras_revertir from jugadores;
-- commit;   (o  rollback;)
