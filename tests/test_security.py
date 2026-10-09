from datetime import timedelta

import jwt
import pytest

from app.security import create_access_token, decode_token, hash_password, verify_password


def test_hash_password_is_not_plaintext():
    hashed = hash_password("Secret123")
    assert hashed != "Secret123"
    assert hashed.startswith("$2")


def test_hash_password_is_salted():
    assert hash_password("Secret123") != hash_password("Secret123")


def test_verify_password():
    hashed = hash_password("Secret123")
    assert verify_password("Secret123", hashed) is True
    assert verify_password("WrongPass1", hashed) is False


def test_verify_password_with_corrupted_hash_does_not_raise():
    assert verify_password("Secret123", "not-a-bcrypt-hash") is False


def test_create_and_decode_token():
    token = create_access_token(subject="alice", role="admin")
    payload = decode_token(token)
    assert payload["sub"] == "alice"
    assert payload["role"] == "admin"


def test_expired_token_raises():
    token = create_access_token(
        subject="alice", role="viewer", expires_delta=timedelta(seconds=-1)
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(token)


def test_tampered_token_raises():
    token = create_access_token(subject="alice", role="viewer")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token + "tampered")
