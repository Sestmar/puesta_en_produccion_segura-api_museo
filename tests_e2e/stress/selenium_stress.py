"""Estrés a nivel de navegador con Selenium.

Lanza N navegadores Chrome headless en paralelo; cada uno repite un recorrido
real de visitante (portada → obras → detalle → artistas → salas) y mide cuánto
tarda cada página en estar lista para el usuario (su <h1> o contenido visible).

Se ejecuta por escalones (p. ej. 1, 5, 10, 20 navegadores) y guarda:
  - ``samples.csv``: una fila por página cargada.
  - ``summary.json``: p50/p95/máx y errores por escalón y por página.

Uso:
  python -m tests_e2e.stress.selenium_stress --levels 1,5,10,20 --iterations 3
"""

import argparse
import csv
import json
import statistics
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import make_driver, wait, wait_heading
from tests_e2e.config import E2EConfig, load_config

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
ARTWORK_LINK = (By.CSS_SELECTOR, "main a[href^='/obras/']")
PAGE_TIMEOUT = 30


@dataclass
class Sample:
    level: int
    worker: int
    iteration: int
    page: str
    seconds: float
    ok: bool
    error: str = ""


def _timed(samples: list[Sample], lock: threading.Lock, base: dict, page: str, action) -> bool:
    start = time.perf_counter()
    try:
        action()
        sample = Sample(**base, page=page, seconds=time.perf_counter() - start, ok=True)
    except Exception as exc:  # cualquier fallo cuenta como error de la página
        sample = Sample(
            **base,
            page=page,
            seconds=time.perf_counter() - start,
            ok=False,
            error=type(exc).__name__,
        )
    with lock:
        samples.append(sample)
    return sample.ok


def _journey(cfg: E2EConfig, level: int, worker: int, iterations: int, samples, lock) -> None:
    try:
        driver = make_driver(cfg, headless=True)
    except WebDriverException as exc:
        with lock:
            samples.append(Sample(level, worker, 0, "arranque", 0.0, False, type(exc).__name__))
        return
    try:
        for it in range(1, iterations + 1):
            base = {"level": level, "worker": worker, "iteration": it}

            def home():
                driver.get(cfg.base_url + "/")
                wait(driver, PAGE_TIMEOUT).until(EC.presence_of_element_located(ARTWORK_LINK))

            def artworks():
                driver.get(cfg.base_url + "/obras")
                wait_heading(driver, "Obras", PAGE_TIMEOUT)
                wait(driver, PAGE_TIMEOUT).until(EC.presence_of_element_located(ARTWORK_LINK))

            def detail():
                link = wait(driver, PAGE_TIMEOUT).until(EC.element_to_be_clickable(ARTWORK_LINK))
                title = link.find_element(By.TAG_NAME, "img").get_attribute("alt")
                link.click()
                wait_heading(driver, title, PAGE_TIMEOUT)

            def artists():
                driver.get(cfg.base_url + "/artistas")
                wait_heading(driver, "Artistas", PAGE_TIMEOUT)
                wait(driver, PAGE_TIMEOUT).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "main a[href^='/artistas/']"))
                )

            def rooms():
                driver.get(cfg.base_url + "/salas")
                wait_heading(driver, "Salas", PAGE_TIMEOUT)
                wait(driver, PAGE_TIMEOUT).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "main a[href^='/salas/']"))
                )

            _timed(samples, lock, base, "portada", home)
            if _timed(samples, lock, base, "obras", artworks):
                _timed(samples, lock, base, "detalle", detail)
            _timed(samples, lock, base, "artistas", artists)
            _timed(samples, lock, base, "salas", rooms)
    finally:
        driver.quit()


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, round(pct / 100 * (len(ordered) - 1)))
    return ordered[index]


def summarize(samples: list[Sample], durations: dict[int, float]) -> dict:
    by_level: dict[int, list[Sample]] = defaultdict(list)
    for s in samples:
        by_level[s.level].append(s)
    summary = {}
    for level, items in sorted(by_level.items()):
        ok = [s.seconds for s in items if s.ok]
        pages = {}
        for page in sorted({s.page for s in items}):
            page_items = [s for s in items if s.page == page]
            page_ok = [s.seconds for s in page_items if s.ok]
            pages[page] = {
                "muestras": len(page_items),
                "errores": sum(not s.ok for s in page_items),
                "p50_s": round(_percentile(page_ok, 50), 3),
                "p95_s": round(_percentile(page_ok, 95), 3),
            }
        errors: dict[str, int] = defaultdict(int)
        for s in items:
            if not s.ok:
                errors[s.error] += 1
        summary[str(level)] = {
            "navegadores": level,
            "duracion_s": round(durations[level], 1),
            "paginas_cargadas": len(ok),
            "paginas_por_segundo": round(len(ok) / durations[level], 2) if durations[level] else 0,
            "errores": len(items) - len(ok),
            "tasa_error_pct": round(100 * (len(items) - len(ok)) / len(items), 1) if items else 0,
            "media_s": round(statistics.fmean(ok), 3) if ok else 0,
            "p50_s": round(_percentile(ok, 50), 3),
            "p95_s": round(_percentile(ok, 95), 3),
            "max_s": round(max(ok), 3) if ok else 0,
            "tipos_error": dict(errors),
            "por_pagina": pages,
        }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Estrés de navegador con Selenium")
    parser.add_argument(
        "--levels", default="1,5,10,20", help="navegadores concurrentes por escalón"
    )
    parser.add_argument("--iterations", type=int, default=3, help="recorridos por navegador")
    parser.add_argument("--pause", type=float, default=5, help="segundos de pausa entre escalones")
    args = parser.parse_args()

    cfg = load_config()
    levels = [int(x) for x in args.levels.split(",") if x.strip()]
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out_dir = RESULTS_DIR / f"selenium-{cfg.target}-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    samples: list[Sample] = []
    durations: dict[int, float] = {}
    lock = threading.Lock()
    for level in levels:
        print(f"[{cfg.target}] escalón {level} navegadores × {args.iterations} recorridos…")
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=level) as pool:
            for worker in range(1, level + 1):
                pool.submit(_journey, cfg, level, worker, args.iterations, samples, lock)
        durations[level] = time.perf_counter() - start
        level_samples = [s for s in samples if s.level == level]
        errors = sum(not s.ok for s in level_samples)
        print(f"  {len(level_samples)} páginas, {errors} errores, {durations[level]:.1f} s")
        time.sleep(args.pause)

    with (out_dir / "samples.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(asdict(samples[0]).keys()))
        writer.writeheader()
        writer.writerows(asdict(s) for s in samples)

    summary = {
        "objetivo": cfg.target,
        "base_url": cfg.base_url,
        "fecha_utc": stamp,
        "recorridos_por_navegador": args.iterations,
        "escalones": summarize(samples, durations),
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Resultados en {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
