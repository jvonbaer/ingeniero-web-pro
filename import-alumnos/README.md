# Carga masiva de alumnos — Escuela de Fútbol CGA

Importa las 45 filas de `LISTA_ALUMNOS_FUTBOL.xlsx` al proyecto Supabase
**`escuela_futbol-cga`** (`uqxikcdldyfaudzmnoke`) sin sobrescribir nada de lo ya ingresado.

## Resultado del cruce

| Veredicto | Filas | Qué pasa |
|---|---|---|
| NUEVO | 32 | se insertan con código generado |
| BLOQUEADO | 3 | nuevos sin año de nacimiento: no se les puede generar código |
| EXACTO | 4 | ya existen; solo se rellenan campos vacíos |
| PROBABLE | 1 | ya existe; confirmado |
| CONFIRMADO | 5 | resueltos manualmente por Juaco: los 5 son la misma persona |

## Garantía de no sobrescritura

En `03_aplicar.sql`, los valores del Excel se calculan con un `case when` que solo
produce valor cuando el campo existente está ausente o vacío, y se aplican con
`jsonb_strip_nulls(...)` a la derecha de `||`. Un dato ya ingresado nunca se pisa.

Los `INSERT` llevan `on conflict (codigo) do nothing`, así que un código repetido
se ignora en vez de reemplazar al jugador existente.

## Orden de ejecución

```
01_respaldo.sql        copia jugadores/evaluaciones/hojas. OBLIGATORIO antes de 03 y 04.
02_staging.sql         carga las 45 filas en import_staging. No toca jugadores.
03_aplicar.sql         inserta los 32 nuevos + rellena huecos de los coincidentes.
04_borrar_pruebas.sql  elimina los 4 registros de prueba (y lo que cuelga de ellos).
05_revertir.sql        deshace 03 por completo.
```

Los scripts 03, 04 y 05 abren `begin;` y dejan el `commit;` comentado a propósito:
revisar el resultado y recién entonces confirmar, o `rollback;`.

## Verificación realizada

Se levantó una réplica local en PostgreSQL 16 con el esquema real y los 15 jugadores
y 12 evaluaciones de producción, y se corrió el ciclo completo:

- `03` → 47 jugadores (15 + 32). Los 15 preexistentes intactos en nombre, apellido,
  fechaNacimiento, posición, pieHábil, alturaCm y categoría. Solo 4 recibieron el RUT
  que les faltaba.
- `04` → borra 4 jugadores, 3 evaluaciones y 3 hojas respetando las FK.
- `05` → vuelve a 11 jugadores, sin `_import` ni `rut` residual, idénticos al respaldo.

## Decisiones aplicadas

- **`fechaNacimiento`**: se guarda la fecha real donde el Excel la trae (27 de 45 filas).
  Vacía en las 18 restantes. El acuerdo original era dejarla siempre vacía, pero el
  archivo resultó traer fechas completas y no solo el año.
- **`categoria`**: calculada como `SUB-N`, con N = el par siguiente a la edad cumplida
  en 2026. La regla reproduce las categorías actuales salvo Alonso Caro, que está una
  categoría arriba.
- **`codigo`**: `CGA-F-<2 dígitos del año>-<correlativo>`, continuando desde el máximo
  de cada año. No se reutilizan los códigos que libera `04`.
- **Registros de prueba eliminados**: `CGA-F-03-001`, `CGA-F-17-001`, `CGA-F-18-001`,
  `CGA-F-94-001`.

## Estado

**Aplicado en producción el 2026-09-02.** 47 jugadores tras el import; luego se
eliminaron los 4 de prueba junto con sus 6 evaluaciones, quedando 43 alumnos y
6 evaluaciones. Verificado contra `respaldo_jugadores_20260902`: ningún campo
preexistente fue pisado fuera de las correcciones autorizadas.

### Correcciones autorizadas (bloque C de 03)

| Código | Cambio |
|---|---|
| CGA-F-20-002 | apellido Castel → Castet; fecha placeholder → 2021-09-22 |
| CGA-F-20-004 | apellido Heisse → Geisse; fecha placeholder → 2021-09-12 |
| CGA-F-20-005 | fecha placeholder → 2020-01-25 |

## Pendiente de decisión

- 3 filas bloqueadas por falta de año: Roberto Reveco, Agustín Aro León, Pedro Pablo Chain.
- 5 filas en REVISAR (ver `revision.csv`).
- 7 RUT con dígito verificador inválido; se cargan tal cual y quedan marcados
  `rut_valido = false` en `import_staging`.
- 2 filas sin RUT: José Paulsen y Pedro Pablo Chain.
