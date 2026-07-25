"""Tests for avatar upload/get/remove endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to reading from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

TINY_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mP8z8BQz0AEYBxVSF+FADFcAf/+gr9AAAAAAElFTkSuQmCC"
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@noc.local", "password": "Admin@123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_upload_avatar_success(headers):
    r = requests.post(f"{BASE_URL}/api/auth/me/avatar", headers=headers, json={"avatar_base64": TINY_PNG_DATA_URL})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("avatar_base64") == TINY_PNG_DATA_URL
    assert "_id" not in data
    assert "password_hash" not in data
    assert data.get("email") == "admin@noc.local"


def test_me_returns_avatar(headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json().get("avatar_base64") == TINY_PNG_DATA_URL


def test_login_includes_avatar():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@noc.local", "password": "Admin@123"})
    assert r.status_code == 200
    user = r.json()["user"]
    assert user.get("avatar_base64") == TINY_PNG_DATA_URL
    assert "password_hash" not in user
    assert "_id" not in user


def test_clear_avatar(headers):
    r = requests.post(f"{BASE_URL}/api/auth/me/avatar", headers=headers, json={"avatar_base64": None})
    assert r.status_code == 200
    assert r.json().get("avatar_base64") in (None, "")
    # verify via me
    r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert r2.json().get("avatar_base64") in (None, "")


def test_no_auth_returns_401():
    r = requests.post(f"{BASE_URL}/api/auth/me/avatar", json={"avatar_base64": TINY_PNG_DATA_URL})
    assert r.status_code == 401


def test_too_large_returns_413(headers):
    huge = "data:image/png;base64," + ("A" * 2_600_000)
    r = requests.post(f"{BASE_URL}/api/auth/me/avatar", headers=headers, json={"avatar_base64": huge})
    assert r.status_code == 413
    detail = (r.json().get("detail") or "").lower()
    assert "besar" in detail or "size" in detail or "mb" in detail
