"""MikroTik native RouterOS API integration tests.
Validates the switch from REST (port 443) to native API (librouteros, port 8728).
We cannot test the happy path (no real MikroTik). We validate:
  - Router CRUD works and returns new defaults (api_port=8728, ssl_enabled=false)
  - /test against unreachable host returns 200 with {ok:false, error: <clean string>}
  - /sync against unreachable host returns {ok:false, routes_processed:0} (no 5xx)
  - last_error is persisted on router record
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@noc.local", "password": "Admin@123"}


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def created_router(admin_token):
    """Create one test router pointing at an unreachable host. Cleaned up after tests."""
    payload = {
        "name": "TEST_MikroTik_Unreachable",
        "host": "10.255.255.99",
        "api_port": 8728,
        "username": "api-readonly",
        "password": "dummy-pass-123",
        "ssl_enabled": False,
        "verify_ssl": False,
        "routing_table": "main",
        "status": "Active",
        "description": "Unreachable test router",
        "auto_sync": "manual",
    }
    r = requests.post(f"{API}/network/routers", json=payload, headers=_h(admin_token), timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data
    # cleanup
    try:
        requests.delete(f"{API}/network/routers/{data['id']}", headers=_h(admin_token), timeout=15)
    except Exception:
        pass


class TestRouterCRUD:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/network/routers", timeout=15)
        assert r.status_code == 401

    def test_list_ok(self, admin_token):
        r = requests.get(f"{API}/network/routers", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_router_defaults_reflected(self, created_router):
        # New defaults must be respected
        assert created_router["api_port"] == 8728, f"api_port should default to 8728, got {created_router['api_port']}"
        assert created_router["ssl_enabled"] is False
        assert created_router["has_password"] is True
        assert created_router["name"] == "TEST_MikroTik_Unreachable"
        assert created_router["host"] == "10.255.255.99"
        assert created_router["connection_status"] in ("Untested", "Error", "Not Configured")

    def test_get_router_persists(self, admin_token, created_router):
        r = requests.get(f"{API}/network/routers", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        found = next((x for x in r.json() if x["id"] == created_router["id"]), None)
        assert found is not None
        assert found["api_port"] == 8728
        assert found["ssl_enabled"] is False

    def test_update_router(self, admin_token, created_router):
        upd = {
            "name": "TEST_MikroTik_Unreachable",
            "host": "10.255.255.99",
            "api_port": 8728,
            "username": "api-readonly",
            "ssl_enabled": False,
            "verify_ssl": False,
            "routing_table": "main",
            "status": "Active",
            "description": "updated desc",
            "auto_sync": "manual",
        }
        r = requests.put(f"{API}/network/routers/{created_router['id']}", json=upd,
                         headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["description"] == "updated desc"
        assert r.json()["api_port"] == 8728


class TestTestConnection:
    def test_test_unreachable_host_returns_200_with_clean_error(self, admin_token, created_router):
        """The endpoint must NOT return 5xx even when the router is unreachable.
        Instead it returns {ok:false, error: <string>}."""
        r = requests.post(f"{API}/network/routers/{created_router['id']}/test",
                          headers=_h(admin_token), timeout=45)
        assert r.status_code == 200, f"Expected 200 status, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("ok") is False, f"Expected ok=false, got {body}"
        err = body.get("error") or ""
        assert isinstance(err, str) and len(err) > 0
        # Error should mention MikroTik/API/timeout — proving librouteros wiring
        assert any(kw in err.lower() for kw in ["mikrotik", "api", "timed out", "timeout", "cannot reach"]), (
            f"Error text should mention MikroTik/API/timeout, got: {err}"
        )
        # Port 8728 (native API) should be in the error (proves not on port 443 anymore)
        assert "8728" in err or "10.255.255.99" in err, (
            f"Error should reference native API port 8728 or the host, got: {err}"
        )
        # Ensure the old httpx/REST wording is gone
        assert "https" not in err.lower(), f"Should not reference https (REST): {err}"
        assert "/rest/" not in err, f"Should not reference REST endpoint: {err}"

    def test_test_persists_last_error(self, admin_token, created_router):
        # After a failed test, last_error must be persisted
        r = requests.get(f"{API}/network/routers", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        found = next((x for x in r.json() if x["id"] == created_router["id"]), None)
        assert found is not None
        assert found.get("last_error"), "last_error should be persisted after failed test"
        assert found["connection_status"] == "Error"

    def test_test_localhost_refused(self, admin_token):
        """Localhost:8728 refuses connections → should surface clean error, not 5xx."""
        payload = {
            "name": "TEST_MK_LocalRefused", "host": "127.0.0.1", "api_port": 8728,
            "username": "api", "password": "x", "ssl_enabled": False, "verify_ssl": False,
            "routing_table": "main", "status": "Active", "description": "", "auto_sync": "manual",
        }
        c = requests.post(f"{API}/network/routers", json=payload, headers=_h(admin_token), timeout=15)
        assert c.status_code == 200, c.text
        rid = c.json()["id"]
        try:
            r = requests.post(f"{API}/network/routers/{rid}/test", headers=_h(admin_token), timeout=30)
            assert r.status_code == 200
            body = r.json()
            assert body.get("ok") is False
            err = (body.get("error") or "").lower()
            assert any(kw in err for kw in ["cannot reach mikrotik", "connection", "refused", "mikrotik"]), err
            assert "8728" in body.get("error", "") or "127.0.0.1" in body.get("error", "")
        finally:
            requests.delete(f"{API}/network/routers/{rid}", headers=_h(admin_token), timeout=15)


class TestSyncNow:
    def test_sync_unreachable_returns_ok_false(self, admin_token, created_router):
        r = requests.post(f"{API}/network/routers/{created_router['id']}/sync",
                          headers=_h(admin_token), timeout=60)
        assert r.status_code == 200, f"Sync must not 5xx even when unreachable: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("ok") is False
        assert body.get("routes_processed") == 0
        assert isinstance(body.get("error"), str) and body["error"]


class TestRoleGuards:
    def test_viewer_cannot_create(self):
        v = requests.post(f"{API}/auth/login",
                          json={"email": "viewer@noc.local", "password": "Password@123"}, timeout=15).json()["token"]
        payload = {"name": "TEST_v", "host": "1.2.3.4", "api_port": 8728, "username": "u",
                   "password": "p", "ssl_enabled": False}
        r = requests.post(f"{API}/network/routers", json=payload, headers=_h(v), timeout=15)
        assert r.status_code == 403
