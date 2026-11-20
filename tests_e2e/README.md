# tests_e2e

Pruebas funcionales (Selenium) y de estrés (Selenium + Locust) contra la aplicación
**desplegada**, en local o en producción. No forman parte del CI de tests unitarios.

```
tests_e2e/
├── config.py          # configuración por variables de entorno (.env.local / .env.prod)
├── browser.py         # utilidades de Selenium (driver, esperas, login, navegación SPA)
├── conftest.py        # fixtures de pytest y capturas en caso de fallo
├── setup_local.py     # crea las cuentas de prueba en el entorno local
├── env.example        # plantilla de configuración
├── functional/        # 39 casos funcionales (F1–F6)
└── stress/
    ├── selenium_stress.py  # estrés con N navegadores concurrentes (S1)
    └── locustfile.py       # carga HTTP con Locust (L1–L4)
```

Documentación completa (estrategia, casos, escenarios, ejecución y resultados):
[`docs/pruebas/`](../docs/pruebas/README.md).
