# Portal Support Artamedia — PRD

## Original Problem Statement
Clone and run `https://github.com/zainaris/portal-support-artamedia.git` (internal NOC portal for PT Artamedia Citra Telematika Indonesia). Then fix the reported bug in **Network → MikroTik Setup**: connection to the router does not work, causing **Public IPv4 Management** to be unable to pull IP-route data from MikroTik. User specified the MikroTik native API port is **8728**.

## Architecture
- **Backend**: FastAPI (Python 3.11) + Motor (async MongoDB) at `/app/backend/server.py` + `/app/backend/network_ipam.py`
- **Frontend**: React 19 + CRA/CRACO + Tailwind + shadcn/ui + framer-motion at `/app/frontend`
- **DB**: MongoDB (local), collections: `users`, `customers`, `partners`, `incidents`, `documents`, `mikrotik_routers`, `ipam_routes`, `ipam_allocations`, `ipam_sync_logs`, `system_config`, etc.
- **Auth**: JWT (HS256) with bcrypt; role-based (admin / supervisor / engineer / viewer)
- **MikroTik integration**: `librouteros==4.1.1` async client (RouterOS native API, port 8728 plain / 8729 API-SSL)

## User Personas
- **Admin** — full CRUD, router config, user mgmt
- **Supervisor** — router config, sync, IPAM writes
- **Engineer** — IPAM/incident writes, no user mgmt
- **Viewer** — read-only

## Core Requirements (static)
- Manage MikroTik routers (add/edit/delete, encrypted password via Fernet)
- Sync IPv4 routes from MikroTik → IPAM (filter to Artamedia prefixes 103.103.144.0/24…147.0/24)
- Public IPv4 management with used/available/reserved/pending/conflict/disabled states
- Customers, partners, incidents, documents, users mgmt
- Audit log for all mutating actions
- Auto-sync loop (manual / 5m / 15m / 30m / 1h / 6h / daily)

## What’s Implemented
### 2026-01 — Initial clone + MikroTik native API bug fix
- Cloned repo into `/app`, installed backend/frontend deps, services running via supervisor.
- **Bug fix (Network → MikroTik Setup)**:
  - Replaced `httpx` REST calls (`/rest/system/identity`, `/rest/ip/route` on port 443) with `librouteros.async_connect` on the RouterOS native API (port **8728** plain, **8729** API-SSL).
  - New helpers in `network_ipam.py`: `_mikrotik_connect`, `_mikrotik_call`, updated `mikrotik_probe` & `mikrotik_fetch_routes`.
  - Exceptions from librouteros (`TrapError`, `FatalError`, `ConnectionClosed`, `ConnectionRefusedError`, `asyncio.TimeoutError`) mapped to clean `HTTPException` with detail strings that reference host + port + "API".
  - `RouterIn` defaults now `api_port=8728`, `ssl_enabled=False`; `router_to_out` legacy fallbacks aligned.
  - Frontend `MikroTikSetup.jsx`: EMPTY defaults → 8728 / ssl_enabled=false; label "API Port *" (placeholder 8728); "API-SSL Enabled (TLS)" switch; badge changed HTTPS → API-SSL; header explains 8728/8729.
  - Backend `requirements.txt` now includes `librouteros==4.1.1`.
- **Testing (iteration_1.json)**: Backend 10/10 pytest pass, Frontend 100%. Verified via unreachable-host tests that `/api/network/routers/{id}/test` and `/sync` return `{ok:false, error:"MikroTik connection timed out to <host>:8728 (API port)"}` with no 5xx, `last_error` persisted, `connection_status` flips to Error, and toast surfaces the new librouteros error text.

## Prioritized Backlog
### P0 (blocked, needs real MikroTik)
- Success-path test: run against a live MikroTik on 8728, assert `mikrotik_probe` returns identity+version and `mikrotik_fetch_routes` returns filtered Artamedia routes with expected columns (dst-address, gateway, distance, active/disabled/dynamic, comment).
- Verify **Public IPv4 Management** page populates once a real router syncs.

### P1
- Consider splitting `network_ipam.py` (1158 lines) into `mikrotik_client.py`, `ipam_service.py`, `router_endpoints.py`.
- Add an "API-SSL" preset button (auto-flip port 8728 ↔ 8729 when the switch toggles).
- Rate-limit repeated failed `/test` calls per router.

### P2
- Support alternate RouterOS API login methods (token-based) for RouterOS ≥ 6.43 (librouteros auto-negotiates plain today).
- Route sync diff view (added / updated / missing) in the UI.
- Import fixed prefixes list from a `.env` config instead of hard-coding `ARTAMEDIA_PREFIXES`.

## Next Tasks
- Ask the user to try their real MikroTik (host + username + password on port 8728) and confirm the sync populates `ipam_routes` and downstream Public IPv4 Management.
- If auth fails, gather the exact error string to determine if the RouterOS user needs `api` policy.

### 2026-01 (later) — Provider filter → dropdown + page-size selector
- **ProviderFilter** rebuilt as a compact `Select` dropdown (was pill/chip buttons). Same testids preserved for individual providers, plus new `${testKey}-filter-provider` for the trigger.
- **Page-size selector** added below every Customer & Partner listing (both category pages and the top-level aggregate). Options **20 / 50 / 75 / 100**, default **20**. Changing the value resets to page 1 and re-fetches with the new `page_size`.
- Applies to: `/customers/*` (Broadband, Dedicated Internet, Metro Ethernet, Dark Fiber, Cross Connect), `/partners/*` (all mitra categories), plus the aggregate `/customers` and `/partners` pages.
- Verified (iteration_2.json): 57/59 substantive frontend checks pass, dropdown Select behavior + page-size selector work end-to-end (verified /api/customers?page_size=50 fires and page indicator resets). Two "gaps" flagged are pre-existing route redirects (`/customers` → `/customers/dedicated`, `/partners` → `/partners/broadband`), not regressions.

### 2026-01 (later) — Documents nested submenu + KMZ Mapping repository
- **Sidebar 3-level nesting**: 'Dokumen & Arsip' → Berita Acara (folder → BA Customer / BA Mitra), Kontrak (folder → Kontrak Customer / Kontrak Mitra), Dokumen Teknis (leaf), **Data Mapping (KMZ)** (leaf).
- **Removed** all SLA menu entries. Legacy `/documents/sla*` routes redirect to Kontrak Customer/Mitra so no 404.
- **Renamed** BA Provider → **BA Mitra**, Contract Provider → **Kontrak Mitra**, Contract Customer → **Kontrak Customer** (title/breadcrumb).
- **New page `/documents/kmz-mapping`** — repositori file KMZ jaringan:
  - Fields: Nama Mapping, Deskripsi, Wilayah/Region, Versi/Revisi, Catatan, Tanggal Upload, Uploaded By.
  - Multi-file upload (.kmz, max 25MB/file), per-file download, per-file delete (mapping tetap), edit metadata, search, wilayah filter, page-size selector (default 20).
  - Role-aware: viewer sees no add/edit/delete controls.
- **Backend**: new `KMZMappingIn` model + `kmz_mappings` collection via `build_crud("kmz-mappings", …)`. Custom endpoints:
  - `POST /api/kmz-mappings/{id}/files` — append file (auto-sets id, uploaded_at, uploaded_by)
  - `DELETE /api/kmz-mappings/{id}/files/{fid}` — remove one file, mapping stays
  - Counts endpoint updated with `documents.KMZ` and adjusted `_total`.
- Verified (iteration_3.json): backend 8/8 pytest pass, frontend all covered scenarios OK.
- **Known constraint**: KMZ files stored as base64 inside a MongoDB doc — with many revisions per mapping, doc can approach 16MB limit. Future: swap to GridFS or S3-compatible blob store.
