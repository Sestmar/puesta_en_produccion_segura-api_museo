from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests handled, by method, route template and status code.",
    ["method", "path", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds, by method and route template.",
    ["method", "path"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

AUDIT_EVENTS_TOTAL = Counter(
    "audit_events_total",
    "Audit events persisted, by action.",
    ["action"],
)


def observe_request(method: str, path: str, status_code: int, duration: float) -> None:
    """Record one HTTP request in the Prometheus metrics."""
    HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status=str(status_code)).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)


def record_audit_event(action: str) -> None:
    AUDIT_EVENTS_TOTAL.labels(action=action).inc()


def render_metrics() -> bytes:
    return generate_latest()


METRICS_MEDIA_TYPE = CONTENT_TYPE_LATEST
