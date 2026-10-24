# [Performance/Medium] OpenStreetMap Nominatim Usage Policy Violation and Synchronous Event Loop Blocking

- **Issue ID**: ISSUE-13
- **Severity**: Medium (CVSS 5.5)
- **Priority**: P2
- **Component**: `Backend / OSM Integration`
- **Labels**: `performance, async, openstreetmap, backend, p2`

---

## 1. Summary
In backend/app/services/hospital_finder.py, fetch_real_hospitals queries OpenStreetMap Nominatim using synchronous httpx.Client(timeout=4.5) without an async client or to_thread, blocking the entire Python async event loop. It also violates Nominatim policy by lacking a contact email in the User-Agent and having no caching, risking IP bans.

---

## 2. Affected Code Locations
- `backend/app/services/hospital_finder.py:L133-L184`

---

## 3. Impact & Risk
Event loop stalling degrades backend throughput for all concurrent users. Rapid queries trigger HTTP 403 IP bans from OpenStreetMap.

---

## 4. Steps to Reproduce
1. Query find_specialist_doctors repeatedly 3 times in 2 seconds.
2. Observe HTTP 403 Forbidden from Nominatim.

---

## 5. Expected Behavior
Nominatim requests must be asynchronous, include a valid contact email in the User-Agent, and implement an in-memory or Redis caching layer.

---

## 6. Suggested Fix / Code Snippet
Implement an async cached fetcher with httpx.AsyncClient and a contact User-Agent header.
