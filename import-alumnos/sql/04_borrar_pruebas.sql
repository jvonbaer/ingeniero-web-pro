-- Elimina los 4 registros de prueba.
-- PASO 1 - inspeccionar que cuelga de ellos ANTES de borrar:
select j.codigo, j.datos->>'nombre' nombre, j.datos->>'apellido' apellido,
       count(e.id) as evaluaciones
from jugadores j left join evaluaciones e on e.jugador_id = j.id
where j.codigo in ('CGA-F-03-001','CGA-F-17-001','CGA-F-18-001','CGA-F-94-001')
group by 1,2,3 order by 1;

-- PASO 2 - borrar. hojas -> evaluaciones -> jugadores (respeta las FK).
begin;
delete from hojas where evaluacion_id in (
  select e.id from evaluaciones e join jugadores j on j.id = e.jugador_id
  where j.codigo in ('CGA-F-03-001','CGA-F-17-001','CGA-F-18-001','CGA-F-94-001'));
delete from evaluaciones where jugador_id in (
  select id from jugadores
  where codigo in ('CGA-F-03-001','CGA-F-17-001','CGA-F-18-001','CGA-F-94-001'));
delete from jugadores
  where codigo in ('CGA-F-03-001','CGA-F-17-001','CGA-F-18-001','CGA-F-94-001');
select count(*) as jugadores_restantes from jugadores;
-- commit;   (o  rollback;)
