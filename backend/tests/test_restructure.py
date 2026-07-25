"""Tests for iteration 2 restructure: counts endpoint, dashboard extras,
partners/racks/devices CRUD, category-specific customer fields, extended
document categories, and role permissions on the new modules.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@noc.local", "password": "Admin@123"}
SUPERVISOR = {"email": "supervisor@noc.local", "password": "Password@123"}
ENGINEER = {"email": "engineer@noc.local", "password": "Password@123"}
VIEWER = {"email": "viewer@noc.local", "password": "Password@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def engineer_token():
    return _login(ENGINEER)


@pytest.fixture(scope="module")
def viewer_token():
    return _login(VIEWER)


@pytest.fixture(scope="module")
def supervisor_token():
    return _login(SUPERVISOR)


# ---------------- /api/counts ----------------
class TestCounts:
    def test_counts_shape(self, admin_token):
        r = requests.get(f"{API}/counts", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # top-level keys
        for k in ["customers", "documents", "partners", "racks", "devices",
                  "shifts", "incidents", "incidents_active",
                  "maintenances", "maintenances_active"]:
            assert k in data, f"missing key {k}"
        # customers nested
        for cat in ["Broadband", "Dedicated Internet", "Cross Connect",
                    "Dark Fiber", "Metro Ethernet", "_total"]:
            assert cat in data["customers"]
        # documents nested
        for cat in ["BA", "SLA", "Kontrak", "PO", "SO", "Teknis", "_total"]:
            assert cat in data["documents"]
        assert isinstance(data["partners"], int)
        assert data["partners"] >= 4          # seeded
        assert data["racks"] >= 3
        assert data["devices"] >= 5

    def test_counts_requires_auth(self):
        r = requests.get(f"{API}/counts", timeout=15)
        assert r.status_code == 401


# ---------------- /api/dashboard/stats extras ----------------
class TestDashboardExtras:
    def test_new_keys(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ["total_partners", "total_racks", "total_devices", "docs_by_category"]:
            assert k in data, f"missing {k}"
        for cat in ["BA", "SLA", "Kontrak", "PO", "SO", "Teknis"]:
            assert cat in data["docs_by_category"]
        assert data["total_partners"] >= 4
        assert data["total_racks"] >= 3
        assert data["total_devices"] >= 5


# ---------------- Partners CRUD ----------------
class TestPartnersCRUD:
    def test_list_seeded(self, admin_token):
        r = requests.get(f"{API}/partners?page_size=50", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        names = [p["name"] for p in r.json()["items"]]
        for expected in ["Lintasarta", "Telkom", "Indosat", "NTT"]:
            assert expected in names, f"missing seed partner {expected}"

    def test_search_q(self, admin_token):
        r = requests.get(f"{API}/partners?q=Telkom", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert any("Telkom" in p["name"] for p in items)

    def test_full_crud(self, admin_token):
        payload = {"name": "TEST_PartnerA", "service_type": "Metro Ethernet",
                   "capacity": "100 Mbps", "location": "Jakarta",
                   "provider_sid": "TEST-PSID-1", "pic_name": "TEST PIC",
                   "phone": "+62-000", "email_support": "noc@test.local",
                   "status": "Active"}
        r = requests.post(f"{API}/partners", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # GET
        r = requests.get(f"{API}/partners/{pid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["name"] == "TEST_PartnerA"

        # UPDATE
        upd = dict(payload); upd["capacity"] = "200 Mbps"
        r = requests.put(f"{API}/partners/{pid}", json=upd, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["capacity"] == "200 Mbps"

        # verify persisted
        r = requests.get(f"{API}/partners/{pid}", headers=_h(admin_token), timeout=15)
        assert r.json()["capacity"] == "200 Mbps"

        # DELETE
        r = requests.delete(f"{API}/partners/{pid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/partners/{pid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 404

    def test_partner_linked_customers(self, admin_token):
        # Find Telkom
        r = requests.get(f"{API}/partners?q=Telkom", headers=_h(admin_token), timeout=15)
        items = r.json()["items"]
        assert items, "Telkom seed missing"
        telkom_id = items[0]["id"]
        # Customers linked
        r = requests.get(f"{API}/customers?partner_id={telkom_id}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        linked = r.json()["items"]
        assert any("Bank Sejahtera" in c["company_name"] for c in linked), \
            f"expected PT Bank Sejahtera linked to Telkom, got: {[c['company_name'] for c in linked]}"

    def test_engineer_cannot_delete_partner(self, admin_token, engineer_token):
        payload = {"name": "TEST_PartnerB", "service_type": "IP Transit", "status": "Active"}
        r = requests.post(f"{API}/partners", json=payload, headers=_h(engineer_token), timeout=15)
        assert r.status_code == 200
        pid = r.json()["id"]
        r = requests.delete(f"{API}/partners/{pid}", headers=_h(engineer_token), timeout=15)
        assert r.status_code == 403
        # cleanup
        requests.delete(f"{API}/partners/{pid}", headers=_h(admin_token), timeout=15)

    def test_viewer_cannot_create_partner(self, viewer_token):
        payload = {"name": "TEST_ViewerPartner", "status": "Active"}
        r = requests.post(f"{API}/partners", json=payload, headers=_h(viewer_token), timeout=15)
        assert r.status_code == 403


# ---------------- Racks CRUD ----------------
class TestRacksCRUD:
    def test_list_seeded(self, admin_token):
        r = requests.get(f"{API}/racks?page_size=50", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        names = [x["name"] for x in r.json()["items"]]
        for expected in ["Rack A12", "Rack A13", "Rack B04"]:
            assert expected in names, f"missing seed rack {expected}, got {names}"

    def test_full_crud(self, admin_token):
        payload = {"datacenter": "TEST_DC", "name": "TEST_RackZ", "number": "Z01",
                   "capacity_u": 42, "status": "Active"}
        r = requests.post(f"{API}/racks", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        assert r.json()["capacity_u"] == 42

        upd = dict(payload); upd["capacity_u"] = 48
        r = requests.put(f"{API}/racks/{rid}", json=upd, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["capacity_u"] == 48

        r = requests.delete(f"{API}/racks/{rid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200


# ---------------- Devices CRUD ----------------
class TestDevicesCRUD:
    def test_list_by_rack(self, admin_token):
        # find Rack A12 id
        r = requests.get(f"{API}/racks?q=A12", headers=_h(admin_token), timeout=15)
        rid = r.json()["items"][0]["id"]
        r = requests.get(f"{API}/devices?rack_id={rid}&page_size=50", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        names = [d["name"] for d in r.json()["items"]]
        for expected in ["CORE-RTR-01", "AGG-SW-01", "SVR-MON-01"]:
            assert expected in names, f"expected {expected} in Rack A12 devices, got {names}"

    def test_full_crud(self, admin_token):
        r = requests.get(f"{API}/racks?q=A13", headers=_h(admin_token), timeout=15)
        rid = r.json()["items"][0]["id"]
        payload = {"rack_id": rid, "name": "TEST_DevX", "hostname": "test-devx",
                   "brand": "TestBrand", "model": "M1", "position_u": 10,
                   "height_u": 2, "status": "Active"}
        r = requests.post(f"{API}/devices", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        assert r.json()["position_u"] == 10 and r.json()["height_u"] == 2

        # Verify list filter
        r = requests.get(f"{API}/devices?rack_id={rid}&q=TEST_DevX", headers=_h(admin_token), timeout=15)
        assert any(d["id"] == did for d in r.json()["items"])

        # UPDATE
        upd = dict(payload); upd["position_u"] = 15
        r = requests.put(f"{API}/devices/{did}", json=upd, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200 and r.json()["position_u"] == 15

        # DELETE
        r = requests.delete(f"{API}/devices/{did}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200


# ---------------- Customer category extra fields (extra='allow') ----------------
class TestCustomerCategoryFields:
    """Ensure extra fields per category are stored and returned."""

    def _create_and_verify(self, admin_token, payload, cid_prefix, extra_keys):
        r = requests.post(f"{API}/customers", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # verify roundtrip
        r = requests.get(f"{API}/customers/{cid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        got = r.json()
        for k, v in extra_keys.items():
            assert got.get(k) == v, f"field {k} lost: got {got.get(k)!r} expected {v!r}"
        # filter by category returns this record
        r = requests.get(f"{API}/customers?category={payload['category']}&q={payload['sid']}",
                         headers=_h(admin_token), timeout=15)
        found = any(i["id"] == cid for i in r.json()["items"])
        assert found, "created record not returned when filtering by category"
        # cleanup
        requests.delete(f"{API}/customers/{cid}", headers=_h(admin_token), timeout=15)

    def test_broadband_fields(self, admin_token):
        extras = {"package_name": "Home 100M", "odp_olt_pop": "ODP-A/OLT-1",
                  "pppoe_username": "u_test", "ip_public": "1.2.3.4"}
        payload = {"sid": "TEST_BB01", "company_name": "TEST_BroadbandCo",
                   "category": "Broadband", **extras}
        self._create_and_verify(admin_token, payload, "BB", extras)

    def test_dedicated_fields(self, admin_token):
        extras = {"ip_public": "203.194.0.1", "subnet_prefix": "/29",
                  "gateway": "203.194.0.2", "routing": "BGP", "asn": "65001"}
        payload = {"sid": "TEST_DIA01", "company_name": "TEST_DIACo",
                   "category": "Dedicated Internet", **extras}
        self._create_and_verify(admin_token, payload, "DIA", extras)

    def test_cross_connect_fields(self, admin_token):
        extras = {"rack_source": "A12", "port_source": "P1",
                  "rack_destination": "B04", "port_destination": "P24",
                  "connector_type": "LC"}
        payload = {"sid": "TEST_XC01", "company_name": "TEST_XCCo",
                   "category": "Cross Connect", **extras}
        self._create_and_verify(admin_token, payload, "XC", extras)

    def test_dark_fiber_fields(self, admin_token):
        extras = {"site_a": "JKT", "site_b": "BDG",
                  "cores_used": 2, "cores_total": 24, "length_km": 145}
        payload = {"sid": "TEST_DF01", "company_name": "TEST_DFCo",
                   "category": "Dark Fiber", **extras}
        self._create_and_verify(admin_token, payload, "DF", extras)

    def test_metro_ethernet_fields(self, admin_token):
        extras = {"node_a": "N-JKT-A", "port_a": "Gi0/1",
                  "node_b": "N-JKT-B", "port_b": "Gi0/2"}
        payload = {"sid": "TEST_ME01", "company_name": "TEST_MECo",
                   "category": "Metro Ethernet", **extras}
        self._create_and_verify(admin_token, payload, "ME", extras)


# ---------------- Document extended categories (PO/SO/Teknis) ----------------
class TestDocumentExtendedCategories:
    @pytest.mark.parametrize("cat", ["PO", "SO", "Teknis"])
    def test_create_and_filter_by_category(self, admin_token, cat):
        payload = {"title": f"TEST_Doc_{cat}", "category": cat,
                   "doc_number": f"TEST-{cat}-1", "description": "test"}
        r = requests.post(f"{API}/documents", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        assert r.json()["category"] == cat

        r = requests.get(f"{API}/documents?category={cat}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert all(i["category"] == cat for i in r.json()["items"])
        assert any(i["id"] == did for i in r.json()["items"])

        # cleanup
        requests.delete(f"{API}/documents/{did}", headers=_h(admin_token), timeout=15)

    def test_document_partner_linkage(self, admin_token):
        # Pick a partner
        r = requests.get(f"{API}/partners?q=Lintasarta", headers=_h(admin_token), timeout=15)
        partner_id = r.json()["items"][0]["id"]
        payload = {"title": "TEST_DocLink", "category": "Kontrak",
                   "partner_id": partner_id, "description": "linkage"}
        r = requests.post(f"{API}/documents", json=payload, headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        assert r.json()["partner_id"] == partner_id

        r = requests.get(f"{API}/documents?partner_id={partner_id}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert any(i["id"] == did for i in r.json()["items"])

        requests.delete(f"{API}/documents/{did}", headers=_h(admin_token), timeout=15)
