# Runbook de respaldo y restauración

Backup lógico de PostgreSQL y del ancla de auditoría para la API del museo.
Los comandos usan los servicios de `docker-compose.yml` (`db` con
`postgres:17-alpine` y `api`) y se ejecutan desde la raíz del repositorio.
Para el despliegue en la VPS con Dokploy, ver la sección
[Producción (Dokploy)](#producción-dokploy).

El ciclo completo de este documento (respaldo → cambios posteriores →
restauración → `GET /audit/verify` con `valid: true`, y `valid: false` con un
ancla de otro momento) se probó en un proyecto compose aislado.

> **Git Bash en Windows** convierte las rutas que empiezan por `/` (por ejemplo
> `/app/audit_anchor/anchor.log` pasa a `C:/Program Files/Git/app/...`). Hay
> que anteponer `MSYS_NO_PATHCONV=1` a los comandos `docker compose` que
> llevan rutas del contenedor.

## Qué se respalda

| Recurso | ¿Se respalda? | Dónde vive | Cómo |
| --- | --- | --- | --- |
| Base de datos PostgreSQL | Sí | contenedor `db`, volumen `pgdata` | `pg_dump` (formato `custom`) |
| Ancla de auditoría (`anchor.log`) | Sí | contenedor `api`, volumen `auditanchor` en `/app/audit_anchor` | `cat` del archivo |
| `SECRET_KEY` y credenciales (`.env`) | Sí | host | copia cifrada fuera del repositorio |
| Redis (rate limiting) | No | contenedor `redis` | es efímero; perderlo solo reinicia los límites |

> **Restaurar siempre la base y el ancla del mismo punto en el tiempo.** El
> ancla externa firma la cabecera de la cadena de auditoría. Si se restaura la
> base sin el ancla (o al revés), `GET /audit/verify` informará de una
> violación. Es la detección de manipulación funcionando, no un fallo: en una
> restauración legítima hay que restablecer los dos artefactos juntos.
>
> **`SECRET_KEY` también firma la cadena.** Restaurar con una clave distinta
> invalida la verificación de las entradas antiguas.

## Respaldo

Los dos archivos se escriben en `./backups/` del host. `pg_dump` vuelca por
la salida estándar porque el contenedor `db` no tiene ese directorio montado.

```bash
mkdir -p backups
STAMP=$(date +%F_%H%M)

# 1. Volcado lógico de la base (formato custom, comprimido)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/museum_$STAMP.dump"

# 2. Ancla de auditoría del mismo momento (vive en el contenedor api)
docker compose exec -T api cat /app/audit_anchor/anchor.log \
  > "backups/anchor_$STAMP.log"

# 3. Credenciales, si no están ya en un gestor de secretos
#    (nunca dentro del repositorio; cifrar la copia)
cp .env "backups/env_$STAMP"
```

`$POSTGRES_USER` y `$POSTGRES_DB` van entre comillas simples para que se
expandan dentro del contenedor, donde ya están definidas.

Para que base y ancla correspondan al mismo instante, conviene hacer el
respaldo con poca actividad o parar la API mientras dura
(`docker compose stop api` / `docker compose start api`). En ese caso el paso 2
se hace con `docker compose run --rm --no-deps -T api cat ...`, porque `exec`
necesita el contenedor en marcha.

Alternativa sin compose (contra un Postgres accesible por red):

```bash
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h <host> -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" --format=custom -f "museum_$(date +%F_%H%M).dump"
```

El formato `custom` va comprimido, permite restaurar solo una parte y acepta
`--jobs` para acelerar la restauración.

## Programación y rotación (ejemplo)

- **Frecuencia**: diaria (RPO máximo de 24 h). Para un RPO menor, dumps cada
  hora o archivado WAL continuo.
- **Retención**: 14 dumps diarios, más 1 semanal de las últimas 8 semanas y
  1 mensual.
- **Linux**: cron `0 2 * * * /usr/local/bin/museum-backup.sh`, que ejecuta los
  pasos de la sección anterior.
- **Windows** (Programador de tareas):
  ```
  schtasks /create /tn museum-backup /sc daily /st 02:00 /tr "C:\scripts\museum-backup.ps1"
  ```

## Restauración

```bash
# 1. Parar la API para que no haya escrituras durante el restore
docker compose stop api

# 2. Recrear la base vacía
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"'

# 3. Cargar el dump por la entrada estándar
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  < backups/museum_<STAMP>.dump

# 4. Restaurar el ancla del MISMO respaldo, sin arrancar el servidor.
#    `run` levanta un contenedor efímero de la imagen api con el volumen
#    montado y como appuser, así el archivo queda con el dueño correcto.
docker compose run --rm --no-deps -T api sh -c 'cat > /app/audit_anchor/anchor.log' \
  < backups/anchor_<STAMP>.log

# 5. Arrancar y comprobar
docker compose start api
curl -s http://localhost:8001/health/ready
```

No usar `docker cp` para el ancla: crea el archivo con dueño `root` y la API,
que corre como `appuser`, no podría escribir en él (`PermissionError`).

## Verificación (obligatoria tras cada restore)

```bash
# Comprobar que hay registros de auditoría
curl -s -H "Authorization: Bearer <admin-token>" "http://localhost:8001/audit?limit=1"

# La cadena de auditoría debe ser válida
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:8001/audit/verify
# -> {"valid": true, ...}
```

Si `verify` responde `valid: false`, la restauración es inconsistente
(probablemente el ancla o el checkpoint son de otro momento, o cambió
`SECRET_KEY`). No se pone en producción hasta resolverlo.

## Producción (Dokploy)

En la VPS no hay compose: la base es un servicio PostgreSQL gestionado por
Dokploy y la API una Application con el volumen del ancla montado en
`/app/audit_anchor`. Los pasos son los mismos, cambiando el destino de cada
comando:

- **Base**: usar los backups programados de Dokploy (destino S3) o `pg_dump`
  contra el contenedor de la base desde la VPS.
- **Ancla**: se lee del contenedor de la API, no del de la base:
  `docker exec <contenedor_api> cat /app/audit_anchor/anchor.log > anchor_<STAMP>.log`.
- Guardar los dos archivos juntos y fuera de la VPS.

Detalles del despliegue en `despliegue-vps.md`.

## Limitaciones conocidas

- `pg_dump` es un respaldo **lógico**: captura el estado en el momento del
  volcado (el RPO es la cadencia, no cero). La recuperación a un punto en el
  tiempo (PITR) necesita archivado WAL continuo y `pg_basebackup`; queda como
  mejora futura.
- Restaurar sin el ancla rompe `GET /audit/verify` por diseño. Guardar ambos
  juntos es parte del procedimiento.
- El respaldo contiene datos personales (hashes de contraseñas, IPs en la
  auditoría): cifrar los archivos y restringir el acceso.
