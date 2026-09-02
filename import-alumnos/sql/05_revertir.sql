-- Deshace el lote completo si algo salio mal.
begin;
delete from jugadores where datos->'_import'->>'lote' = 'lote-2026-09-02-lista-futbol';
update jugadores set datos = datos - '_import'
 where datos->'_import'->>'lote' = 'lote-2026-09-02-lista-futbol';
select count(*) from jugadores;
-- commit;
