import json
import logging

from app.logging_config import JsonFormatter, request_id_ctx


def _record(message="hello", level=logging.INFO):
    return logging.LogRecord(
        name="test",
        level=level,
        pathname=__file__,
        lineno=1,
        msg=message,
        args=(),
        exc_info=None,
    )


def test_json_formatter_emits_valid_json():
    payload = json.loads(JsonFormatter().format(_record()))
    assert payload["level"] == "INFO"
    assert payload["message"] == "hello"
    assert payload["logger"] == "test"
    assert "timestamp" in payload


def test_json_formatter_includes_request_id_from_context():
    token = request_id_ctx.set("req-123")
    try:
        payload = json.loads(JsonFormatter().format(_record()))
    finally:
        request_id_ctx.reset(token)
    assert payload["request_id"] == "req-123"


def test_json_formatter_includes_extra_fields():
    record = _record()
    record.fields = {"method": "GET", "status_code": 200}
    payload = json.loads(JsonFormatter().format(record))
    assert payload["method"] == "GET"
    assert payload["status_code"] == 200


def test_json_formatter_omits_request_id_when_unset():
    payload = json.loads(JsonFormatter().format(_record()))
    assert "request_id" not in payload


def test_request_logs_carry_request_context(client):
    captured: list[dict] = []

    class _Capture(logging.Handler):
        def emit(self, record):
            captured.append(json.loads(self.format(record)))

    handler = _Capture()
    handler.setFormatter(JsonFormatter())
    access_logger = logging.getLogger("app.access")
    access_logger.addHandler(handler)
    try:
        client.get("/health")
    finally:
        access_logger.removeHandler(handler)

    entry = next(i for i in captured if i.get("message") == "request completed")
    assert entry["method"] == "GET"
    assert entry["path"] == "/health"
    assert entry["status_code"] == 200
    assert "request_id" in entry
    assert "duration_ms" in entry
