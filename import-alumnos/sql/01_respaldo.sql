-- Respaldo previo. Ejecutar SIEMPRE antes de 03 y 04.
-- Crea copias con timestamp; no toca nada de produccion.
create table if not exists respaldo_jugadores_20260902 as select * from jugadores;
create table if not exists respaldo_evaluaciones_20260902 as select * from evaluaciones;
create table if not exists respaldo_hojas_20260902 as select * from hojas;
select 'jugadores' t, count(*) from respaldo_jugadores_20260902
union all select 'evaluaciones', count(*) from respaldo_evaluaciones_20260902
union all select 'hojas', count(*) from respaldo_hojas_20260902;
