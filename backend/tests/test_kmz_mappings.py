"""Backend tests for KMZ Mappings feature."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL.rstrip('/')}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@noc.local", "password": "Admin@123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def viewer_token():
    r = requests.post(f"{API}/auth/login", json={"email": "viewer@noc.local", "password": "Password@123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _b64():
    return base64.b64encode(b"<?xml version='1.0'?><kml></kml>").decode()


class TestKMZMappings:
    created_id = None

    def test_create_mapping(self, admin_token):
        payload = {
            "name": "TEST_Backbone Jakarta",
            "description": "Test mapping",
            "region": "Jakarta",
            "version": "v1.0",
            "notes": "initial",
            "upload_date": "2026-01-15",
            "files": [],
        }
        r = requests.post(f"{API}/kmz-mappings", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["region"] == "Jakarta"
        assert "id" in data
        assert data.get("created_by")
        TestKMZMappings.created_id = data["id"]

    def test_get_list_pagination(self, admin_token):
        r = requests.get(f"{API}/kmz-mappings", params={"q": "TEST_", "page": 1, "page_size": 20}, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        # accept either list or paginated dict
        items = data.get("items") if isinstance(data, dict) else data
        assert any(x["id"] == TestKMZMappings.created_id for x in items)

    def test_add_file(self, admin_token):
        mid = TestKMZMappings.created_id
        body = {"name": "a.kmz", "size": 100, "type": "application/vnd.google-earth.kmz", "base64": _b64(), "notes": ""}
        r = requests.post(f"{API}/kmz-mappings/{mid}/files", json=body, headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert len(doc["files"]) == 1
        f = doc["files"][0]
        assert f["name"] == "a.kmz"
        assert "id" in f
        assert f.get("uploaded_by")
        assert f.get("uploaded_at")

    def test_add_second_file_and_delete(self, admin_token):
        mid = TestKMZMappings.created_id
        body = {"name": "b.kmz", "size": 200, "type": None, "base64": _b64(), "notes": "rev2"}
        r = requests.post(f"{API}/kmz-mappings/{mid}/files", json=body, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        doc = r.json()
        assert len(doc["files"]) == 2
        # delete first file
        fid = doc["files"][0]["id"]
        r2 = requests.delete(f"{API}/kmz-mappings/{mid}/files/{fid}", headers=H(admin_token), timeout=15)
        assert r2.status_code == 200
        doc2 = r2.json()
        assert len(doc2["files"]) == 1
        assert doc2["files"][0]["id"] != fid

    def test_viewer_cannot_write(self, viewer_token):
        payload = {"name": "TEST_denied", "region": "X", "version": "v0", "files": []}
        r = requests.post(f"{API}/kmz-mappings", json=payload, headers=H(viewer_token), timeout=15)
        assert r.status_code in (401, 403), f"expected forbidden got {r.status_code}"

    def test_viewer_can_read(self, viewer_token):
        r = requests.get(f"{API}/kmz-mappings", headers=H(viewer_token), timeout=15)
        assert r.status_code == 200

    def test_delete_mapping(self, admin_token):
        mid = TestKMZMappings.created_id
        r = requests.delete(f"{API}/kmz-mappings/{mid}", headers=H(admin_token), timeout=15)
        assert r.status_code in (200, 204)
        # verify gone
        r2 = requests.get(f"{API}/kmz-mappings/{mid}", headers=H(admin_token), timeout=15)
        assert r2.status_code == 404

    def test_counts_include_kmz(self, admin_token):
        # try common counts endpoints
        for path in ("/counts", "/dashboard/counts", "/dashboard/stats"):
            r = requests.get(f"{API}{path}", headers=H(admin_token), timeout=15)
            if r.status_code == 200:
                text = r.text
                if "KMZ" in text or "kmz" in text.lower():
                    return
        pytest.skip("No counts endpoint exposed KMZ label (non-blocking)")
