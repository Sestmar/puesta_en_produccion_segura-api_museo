# Runbook de respaldo y restauración

Backup lógico de PostgreSQL para la API del museo. Todos los comandos de este
documento fueron probados contra `postgres:16-alpine` (ciclo completo
dump → pérdida simulada → restore → verificación de datos).

## Qué se respalda

| Recurso | ¿Se respalda? | Cómo |
| --- | --- | --- |
| Base de datos PostgreSQL | Sí | `pg_dump` (formato `custom`) |
| Archivo de ancla de auditoría (`audit_anchor.log`) | Sí | copia del volumen `auditanchor` |
| `SECRET_KEY` y credenciales (`.env`) | Sí | copia cifrada fuera del repositorio |
| Redis (rate limiting) | No | es caché/ephemeral; perderlo solo resetea límites |

> **Restaurar siempre base + ancla del mismo punto en el tiempo.** El ancla
> externo firma la cabecera de la cadena de auditoría. Si restaurás la base y
> no el ancla (o viceversa), `GET /audit/verify` reportará una violación. Eso
> es una *característica* (detección de manipulación), no un bug: para una
> restauración legítima hay que restablecer ambos artefactos juntos.

## Respaldo

El servicio de la base se llama `db` en `docker-compose.yml`.

```bash
# 1. Volcado lógico de la base a un archivo custom en el host
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom -f /backups/museum_$(date +%F_%H%M).dump

# 2. Ancla de auditoría (mismo directorio de respaldo)
docker cp "$(docker compose ps -q db)":/app/audit_anchor/anchor.log /backups/

# 3. Credenciales, si no están ya en un gestor de secretos
#    (nunca dentro del repositorio)
cp .env /backups/.env
```

Alternativa manual sin compose (contra un Postgres expuesto):

```bash
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h localhost -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" --format=custom -f museum_$(date +%F_%H%M).dump
```

El formato `custom` es comprimido, restaurable parcialmente y acepta
`--jobs` para acelar la restauración.

## Programación y rotación (ejemplo)

- **Frecuencia**: diario (→ RPO máximo de 24 h). Para un RPO menor hacé
  dumps cada hora y/o archivado WAL continuo.
- **Retención**: 14 dumps diarios + 1 semanal de los últimos 8 + 1 mensual.
- **Windows** (Task Scheduler):
  ```
  schtasks /create /tn museum-backup /sc daily /st 02:00 /tr "C:\scripts\museum-backup.ps1"
  ```
- **Linux**: cron `0 2 * * * /usr/local/bin/museum-backup.sh`.

## Restauración

```bash
# 1. (Opcional) parar la API para evitar escrituras durante el restore
docker compose stop api

# 2. Recrear la base vacía
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB WITH (FORCE);"
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"

# 3. Cargar el dump
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --no-owner --no-privileges /backups/museum_MMMMDDHH.dump

# 4. Restaurar el ancla de auditoría del MISMO respaldo
docker cp /backups/anchor.log "$(docker compose ps -q db)":/app/audit_anchor/anchor.log

# 5. Arrancar y verificar
docker compose up -d
curl -s http://localhost:8000/health/ready
```

## Verificación (obligatoria tras cada restore)

```bash
# Contar registros esperados
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:8000/audit?limit=1

# La cadena de auditoría debe dar VÁLIDA
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:8000/audit/verify
# -> {"valid": true, ...}
```

Si `verify` responde `valid: false`, la restauración es inconsistente
(probablemente ancla o checkpoint de otro punto temporal). No la pongas en
producción sin resolver la inconsistencia.

## Limitaciones conocidas (honestas)

- El `pg_dump` es un respaldo **lógico**: captura el estado al momento del dump
  (RPO = cadencia, no cero). Recovery a punto en el tiempo (PITR) requiere
  archivado WAL continuo + `pg_basebackup`, que es una mejora futura.
- Restaurar sin el ancla rompe `GET /audit/verify` por diseño. Guardar ambos
  juntos es parte del procedimiento, no opcional.
- El respaldo contiene datos personales (credenciales hash, IPs en auditoría):
  cifrar los archivos de backup y restringir el acceso.