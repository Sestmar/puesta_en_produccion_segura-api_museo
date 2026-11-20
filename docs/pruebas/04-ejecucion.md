# 4. Cómo ejecutar las pruebas

Todos los comandos se lanzan **desde la raíz del repositorio** con el entorno virtual activado.
Los ejemplos usan PowerShell; en Bash basta con cambiar `$env:VAR="x"` por `export VAR=x`.

## 4.1 Requisitos

- Python 3.13 con las dependencias de pruebas:

  ```powershell
  pip install -r requirements-e2e.txt
  ```

- Google Chrome instalado. Selenium Manager descarga el `chromedriver` adecuado automáticamente.
- Docker Desktop, para el entorno local.

## 4.2 Entorno local

1. Levantar la aplicación con la configuración de producción. El `.env` de la raíz necesita un
   `SECRET_KEY` fuerte, porque la API arranca con `ENVIRONMENT=production`:

   ```powershell
   docker compose -p museo-perf -f docker-compose.yml -f docker-compose.perf.yml up --build -d
   ```

   - Frontend (nginx): <http://127.0.0.1:5173>
   - API: <http://127.0.0.1:8001>

   Se usa `127.0.0.1` y no `localhost` a propósito. En Windows, `localhost` resuelve primero a
   IPv6 (`::1`), y el reenvío de puertos IPv6 de Docker Desktop se quedó colgado durante la
   primera ejecución de S1: aceptaba la conexión y no respondía, mientras que por IPv4 todo
   seguía funcionando.

2. Cargar el catálogo y crear las cuentas de prueba. Hay que empezar con la base de datos vacía;
   si no lo está, ejecuta antes `docker compose -p museo-perf down -v`:

   ```powershell
   docker compose -p museo-perf exec api python -m app.seed
   python -m tests_e2e.setup_local --load-users 10
   ```

   `setup_local` crea:

   - `e2e-admin`
   - `e2e-cliente`
   - de `loadtest-01` a `loadtest-10`

   Las contraseñas son aleatorias y se guardan en `tests_e2e/.env.local` (fuera de git).

## 4.3 Entorno de producción

En el panel de administración de producción se crean a mano:

- un administrador de pruebas;
- un cliente de pruebas;
- las cuentas de carga necesarias.

Después, copia [`tests_e2e/env.example`](../../tests_e2e/env.example) a `tests_e2e/.env.prod` y
rellénalo. Ese fichero está en `.gitignore`.

Todos los comandos de abajo eligen el entorno con `E2E_TARGET` (`local` por defecto, o `prod`).

## 4.4 Pruebas funcionales

```powershell
# Local
pytest -c tests_e2e/pytest.ini tests_e2e/functional

# Producción (por defecto sin escrituras ni registros)
$env:E2E_TARGET="prod"; pytest -c tests_e2e/pytest.ini tests_e2e/functional

# Ver el navegador en pantalla en lugar de headless
$env:E2E_HEADLESS="0"; pytest -c tests_e2e/pytest.ini tests_e2e/functional

# Informe JUnit para adjuntar como evidencia
pytest -c tests_e2e/pytest.ini tests_e2e/functional --junitxml=tests_e2e/results/funcionales-local.xml
```

Se usa `-c tests_e2e/pytest.ini` para no heredar la configuración de cobertura de los tests
unitarios.

## 4.5 Estrés con Selenium (S1)

```powershell
python -m tests_e2e.stress.selenium_stress --levels 1,5,10,20 --iterations 3                       # local
$env:E2E_TARGET="prod"; python -m tests_e2e.stress.selenium_stress --levels 1,5,10 --iterations 3  # prod
```

Los resultados se guardan en `tests_e2e/results/selenium-<entorno>-<fecha>/`.

## 4.6 Carga con Locust (L1–L4)

Se puede usar la interfaz web (`http://localhost:8089`) o el modo sin interfaz, que es el que
deja informes reproducibles. Plantilla:

```powershell
locust -f tests_e2e/stress/locustfile.py --headless --host <API> `
  -u <usuarios> -r <alta_por_segundo> -t <duración> `
  --csv tests_e2e/results/<escenario>-<entorno> `
  --html tests_e2e/results/<escenario>-<entorno>.html `
  <Perfil>
```

| Escenario | Comando (local; en prod cambia `--host` y define `$env:E2E_TARGET="prod"`) |
|---|---|
| L1 | `... --host http://127.0.0.1:8001 -u 5 -r 1 -t 3m ... CatalogVisitor` |
| L2 | `... --host http://127.0.0.1:8001 -u 100 -r 5 -t 3m ... CatalogVisitor` |
| L2b | Relanzar la API con `$env:DEFAULT_RATE_LIMIT="1000000 per minute"` y el `docker compose ... up -d` de 4.2; después `... -u 200 -r 10 -t 3m ... CatalogVisitor`. **Restaurar el límite al terminar.** |
| L3 | `... --host http://127.0.0.1:8001 -u 9 -r 0.067 -t 4m ... AuthenticatedClient` |
| L4 | `... --host http://127.0.0.1:8001 -u 5 -r 5 -t 1m ... BruteForceAttacker` |

Entre escenarios hay que esperar al menos un minuto, para que la ventana del límite de tasa
empiece limpia. La cuenta víctima de L4 queda bloqueada 15 minutos: no ejecutes L3 justo
después.

## 4.7 Evidencias

- Los resultados en bruto se generan en `tests_e2e/results/` (fuera de git).
- Los informes que respaldan [05-resultados.md](05-resultados.md) se copian a
  [`docs/pruebas/resultados/`](resultados/).
