"""Backend API tests for NOC Support System.
Covers: Auth, Roles, Customers CRUD, Documents CRUD, Shift/Incidents/Maintenance CRUD,
Users admin endpoints, Dashboard stats.
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@noc.local", "password": "Admin@123"}
SUPERVISOR = {"email": "supervisor@noc.local", "password": "Password@123"}
ENGINEER = {"email": "engineer@noc.local", "password": "Password@123"}
VIEWER = {"email": "viewer@noc.local", "password": "Password@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"], data["user"]


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_token():
    tok, _ = _login(ADMIN)
    return tok


@pytest.fixture(scope="session")
def supervisor_token():
    tok, _ = _login(SUPERVISOR)
    return tok


@pytest.fixture(scope="session")
def engineer_token():
    tok, _ = _login(ENGINEER)
    return tok


@pytest.fixture(scope="session")
def viewer_token():
    tok, _ = _login(VIEWER)
    return tok


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == "admin@noc.local"
        assert data["user"]["role"] == "admin"
        assert isinstance(data["token"], str) and len(data["token"]) > 20
        assert "password_hash" not in data["user"]

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@noc.local", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_returns_user(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@noc.local"

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_logout(self, admin_token):
        r = requests.post(f"{API}/auth/logout", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------- ROLE CAPABILITIES ----------------
class TestRoles:
    def test_viewer_cannot_create_customer(self, viewer_token):
        payload = {"sid": "TEST_V001", "company_name": "TEST_Viewer", "service_name": "S", "category": "Broadband"}
        r = requests.post(f"{API}/customers", json=payload, headers=_auth_headers(viewer_token), timeout=15)
        assert r.status_code == 403

    def test_engineer_can_create_customer(self, engineer_token):
        payload = {"sid": "TEST_E001", "company_name": "TEST_EngineerCo", "service_name": "S", "category": "Broadband"}
        r = requests.post(f"{API}/customers", json=payload, headers=_auth_headers(engineer_token), timeout=15)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # engineer cannot delete
        r2 = requests.delete(f"{API}/customers/{cid}", headers=_auth_headers(engineer_token), timeout=15)
        assert r2.status_code == 403
        # supervisor cleanup + verifies deletion
        sup_token, _ = _login(SUPERVISOR)
        r3 = requests.delete(f"{API}/customers/{cid}", headers=_auth_headers(sup_token), timeout=15)
        assert r3.status_code == 200

    def test_supervisor_can_delete(self, supervisor_token):
        payload = {"sid": "TEST_S001", "company_name": "TEST_SupCo", "service_name": "S", "category": "Broadband"}
        r = requests.post(f"{API}/customers", json=payload, headers=_auth_headers(supervisor_token), timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        r2 = requests.delete(f"{API}/customers/{cid}", headers=_auth_headers(supervisor_token), timeout=15)
        assert r2.status_code == 200


# ---------------- CUSTOMERS CRUD ----------------
class TestCustomersCRUD:
    def test_list_default(self, admin_token):
        r = requests.get(f"{API}/customers", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        assert data["total"] >= 1

    def test_list_category_filter(self, admin_token):
        r = requests.get(f"{API}/customers?category=Broadband", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["category"] == "Broadband"

    def test_list_search(self, admin_token):
        r = requests.get(f"{API}/customers?q=Sinar", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert any("Sinar" in i.get("company_name", "") for i in items)

    def test_list_sort(self, admin_token):
        r = requests.get(f"{API}/customers?sort_by=company_name&sort_dir=asc&page_size=50",
                         headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        names = [i["company_name"] for i in r.json()["items"]]
        assert names == sorted(names)

    def test_full_crud(self, admin_token):
        payload = {"sid": "TEST_CRUD01", "company_name": "TEST_CrudCo", "service_name": "S1", "category": "Broadband",
                   "location": "Jakarta", "bandwidth": "10 Mbps", "status": "Active"}
        r = requests.post(f"{API}/customers", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        created = r.json()
        cid = created["id"]
        assert created["sid"] == "TEST_CRUD01"

        # GET by id
        r = requests.get(f"{API}/customers/{cid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["company_name"] == "TEST_CrudCo"

        # UPDATE
        upd = dict(payload)
        upd["company_name"] = "TEST_CrudCo Updated"
        r = requests.put(f"{API}/customers/{cid}", json=upd, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["company_name"] == "TEST_CrudCo Updated"

        # verify persistence
        r = requests.get(f"{API}/customers/{cid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["company_name"] == "TEST_CrudCo Updated"

        # DELETE
        r = requests.delete(f"{API}/customers/{cid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200

        r = requests.get(f"{API}/customers/{cid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 404


# ---------------- DOCUMENTS CRUD ----------------
class TestDocumentsCRUD:
    def test_full_crud_with_base64(self, admin_token):
        b64 = base64.b64encode(b"hello world").decode()
        payload = {"title": "TEST_Doc1", "category": "BA", "doc_number": "TEST-BA-1",
                   "description": "test document", "file_name": "test.txt", "file_type": "text/plain",
                   "file_size": 11, "file_base64": b64}
        r = requests.post(f"{API}/documents", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        assert r.json()["file_base64"] == b64

        # list with category filter
        r = requests.get(f"{API}/documents?category=BA", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert all(i["category"] == "BA" for i in r.json()["items"])

        # update
        upd = dict(payload)
        upd["title"] = "TEST_Doc1 Updated"
        r = requests.put(f"{API}/documents/{did}", json=upd, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Doc1 Updated"

        # delete
        r = requests.delete(f"{API}/documents/{did}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200


# ---------------- SHIFT / INCIDENT / MAINTENANCE ----------------
class TestLogsCRUD:
    def test_shift_crud(self, admin_token):
        payload = {"date": "2026-02-14", "shift": "Morning", "officer": "TEST_Officer",
                   "site": "TestSite", "issue": "TEST_issue", "action_taken": "", "status": "Open", "priority": "Medium"}
        r = requests.post(f"{API}/shift-handovers", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        # filter status=Open
        r = requests.get(f"{API}/shift-handovers?status=Open", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert all(i["status"] == "Open" for i in r.json()["items"])
        # update
        upd = dict(payload); upd["status"] = "Resolved"
        r = requests.put(f"{API}/shift-handovers/{sid}", json=upd, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "Resolved"
        # delete
        r = requests.delete(f"{API}/shift-handovers/{sid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200

    def test_incident_crud(self, admin_token):
        payload = {"title": "TEST_Incident", "site": "TestSite", "started_at": "2026-02-14T10:00:00Z",
                   "description": "test", "status": "Open", "priority": "High"}
        r = requests.post(f"{API}/incidents", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        iid = r.json()["id"]
        r = requests.get(f"{API}/incidents?status=Open", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200 and all(i["status"] == "Open" for i in r.json()["items"])
        upd = dict(payload); upd["status"] = "Resolved"
        r = requests.put(f"{API}/incidents/{iid}", json=upd, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "Resolved"
        r = requests.delete(f"{API}/incidents/{iid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200

    def test_maintenance_crud(self, admin_token):
        payload = {"title": "TEST_Maint", "site": "TestSite", "scheduled_start": "2026-02-16T00:00:00Z",
                   "type": "Planned", "description": "test", "status": "Open", "priority": "Low"}
        r = requests.post(f"{API}/maintenances", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        r = requests.get(f"{API}/maintenances?status=Open", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200 and all(i["status"] == "Open" for i in r.json()["items"])
        upd = dict(payload); upd["status"] = "Resolved"
        r = requests.put(f"{API}/maintenances/{mid}", json=upd, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "Resolved"
        r = requests.delete(f"{API}/maintenances/{mid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200


# ---------------- USERS ADMIN ----------------
class TestUsersAdmin:
    def test_admin_list(self, admin_token):
        r = requests.get(f"{API}/users", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert "admin@noc.local" in emails

    def test_non_admin_forbidden(self, viewer_token, engineer_token, supervisor_token):
        for tok in [viewer_token, engineer_token, supervisor_token]:
            r = requests.get(f"{API}/users", headers=_auth_headers(tok), timeout=15)
            assert r.status_code == 403

    def test_user_crud(self, admin_token):
        payload = {"email": "TEST_newuser@noc.local", "password": "Password@123", "name": "TEST User", "role": "engineer"}
        # try create; if exists, delete then re-create
        r = requests.post(f"{API}/users", json=payload, headers=_auth_headers(admin_token), timeout=15)
        if r.status_code == 400:
            # find & delete
            r_list = requests.get(f"{API}/users", headers=_auth_headers(admin_token), timeout=15).json()
            existing = next((u for u in r_list if u["email"] == "test_newuser@noc.local"), None)
            if existing:
                requests.delete(f"{API}/users/{existing['id']}", headers=_auth_headers(admin_token), timeout=15)
            r = requests.post(f"{API}/users", json=payload, headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        assert r.json()["email"] == "test_newuser@noc.local"

        # update
        r = requests.patch(f"{API}/users/{uid}", json={"role": "supervisor", "active": False},
                           headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "supervisor"
        assert r.json()["active"] is False

        # delete
        r = requests.delete(f"{API}/users/{uid}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200

    def test_admin_cannot_delete_self(self, admin_token):
        me = requests.get(f"{API}/auth/me", headers=_auth_headers(admin_token), timeout=15).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 400


# ---------------- DASHBOARD ----------------
class TestDashboard:
    def test_stats(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=_auth_headers(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ["customers_by_category", "total_customers", "active_customers", "total_documents",
                  "active_incidents", "total_incidents", "active_maintenances", "total_shifts",
                  "status_breakdown", "recent"]:
            assert k in data
        assert data["total_customers"] >= 1
        assert isinstance(data["recent"], list)

    def test_stats_requires_auth(self):
        r = requests.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 401
