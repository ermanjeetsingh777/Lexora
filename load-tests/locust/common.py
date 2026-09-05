"""
Shared Locust helpers — login, auth header, safe GET weight tasks.
"""
from __future__ import annotations

import json
import os
import threading
from typing import Any

from locust import HttpUser


API_PREFIX = "/api/v1"

# Shared across all virtual users (critical for 1000-user runs)
_shared_lock = threading.Lock()
_shared_access_token: str | None = None
_shared_refresh_token: str | None = None
_shared_institution_id: str | None = None
_shared_branch_id: str | None = None
_shared_library_id: str | None = None
_shared_member_id: str | None = None
_shared_bootstrapped = False


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def load_dotenv_file(path: str) -> None:
    """Minimal .env loader (no python-dotenv dependency)."""
    if not path or not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


class LexoraApiUser(HttpUser):
    """Base user: login once (shared token for 1000-user runs), then hit endpoints."""

    abstract = True

    access_token: str | None = None
    refresh_token: str | None = None
    institution_id: str | None = None
    branch_id: str | None = None
    library_id: str | None = None
    member_id: str | None = None

    def on_start(self) -> None:
        verify = env_bool("LOCUST_VERIFY_SSL", default=True)
        self.client.verify = verify
        if not verify:
            try:
                import urllib3

                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            except Exception:
                pass

        # Default ON for high concurrency — one login for all VUs
        if env_bool("LOCUST_SHARED_LOGIN", default=True):
            self._login_shared()
            self._bootstrap_ids_shared()
        else:
            self._login()
            self._bootstrap_ids()

    def _login_shared(self) -> None:
        global _shared_access_token, _shared_refresh_token
        with _shared_lock:
            if _shared_access_token:
                self.access_token = _shared_access_token
                self.refresh_token = _shared_refresh_token
                return
            self._login()
            _shared_access_token = self.access_token
            _shared_refresh_token = self.refresh_token

    def _bootstrap_ids_shared(self) -> None:
        global \
            _shared_bootstrapped, \
            _shared_institution_id, \
            _shared_branch_id, \
            _shared_library_id, \
            _shared_member_id
        with _shared_lock:
            if _shared_bootstrapped:
                self.institution_id = _shared_institution_id
                self.branch_id = _shared_branch_id
                self.library_id = _shared_library_id
                self.member_id = _shared_member_id
                return
            self._bootstrap_ids()
            _shared_institution_id = self.institution_id
            _shared_branch_id = self.branch_id
            _shared_library_id = self.library_id
            _shared_member_id = self.member_id
            _shared_bootstrapped = True

    def _login(self) -> None:
        email = os.getenv("LOCUST_EMAIL", "institution@slms.com")
        password = os.getenv("LOCUST_PASSWORD", "Demo@12345")
        with self.client.post(
            f"{API_PREFIX}/auth/login",
            json={"email": email, "password": password},
            name="POST /auth/login",
            catch_response=True,
        ) as res:
            if res.status_code != 200:
                res.failure(f"login HTTP {res.status_code}: {res.text[:200]}")
                return
            try:
                payload = res.json()
            except json.JSONDecodeError:
                res.failure("login: invalid JSON")
                return

            data = payload.get("data") or {}
            token = data.get("accessToken") or data.get("access_token")
            if not token:
                res.failure(f"login: no accessToken in {payload.get('message')}")
                return

            self.access_token = token
            self.refresh_token = data.get("refreshToken") or data.get("refresh_token")
            res.success()

    def auth_headers(self) -> dict[str, str]:
        if not self.access_token:
            return {}
        return {"Authorization": f"Bearer {self.access_token}"}

    def api_get(self, path: str, name: str | None = None, **kwargs: Any):
        """Authenticated GET under /api/v1."""
        url = path if path.startswith("/") else f"{API_PREFIX}/{path}"
        if not url.startswith(API_PREFIX) and url.startswith("/api/"):
            pass
        elif not url.startswith(API_PREFIX):
            url = f"{API_PREFIX}/{path.lstrip('/')}"

        headers = {**self.auth_headers(), **(kwargs.pop("headers", {}) or {})}
        return self.client.get(
            url,
            headers=headers,
            name=name or f"GET {url}",
            **kwargs,
        )

    def api_post(self, path: str, json_body: dict | None = None, name: str | None = None, **kwargs: Any):
        url = path if path.startswith(API_PREFIX) else f"{API_PREFIX}/{path.lstrip('/')}"
        headers = {**self.auth_headers(), **(kwargs.pop("headers", {}) or {})}
        return self.client.post(
            url,
            json=json_body,
            headers=headers,
            name=name or f"POST {url}",
            **kwargs,
        )

    def _first_id(self, payload: Any, *keys: str) -> str | None:
        if not isinstance(payload, dict):
            return None
        data = payload.get("data", payload)
        if isinstance(data, list) and data:
            row = data[0]
            if isinstance(row, dict):
                for k in keys:
                    if row.get(k):
                        return str(row[k])
        if isinstance(data, dict):
            items = data.get("items") or data.get("results") or data.get("data")
            if isinstance(items, list) and items and isinstance(items[0], dict):
                for k in keys:
                    if items[0].get(k):
                        return str(items[0][k])
            for k in keys:
                if data.get(k):
                    return str(data[k])
        return None

    def _bootstrap_ids(self) -> None:
        """Resolve institution / branch / library / member ids for nested routes."""
        if not self.access_token:
            return

        # Institutions
        with self.client.get(
            f"{API_PREFIX}/institutions/list",
            headers=self.auth_headers(),
            name="BOOTSTRAP GET /institutions/list",
            catch_response=True,
        ) as res:
            if res.status_code == 200:
                try:
                    self.institution_id = self._first_id(res.json(), "id", "institutionId")
                    res.success()
                except Exception as exc:
                    res.failure(str(exc))
            else:
                res.failure(f"{res.status_code}")

        if not self.institution_id:
            with self.client.get(
                f"{API_PREFIX}/institutions/my-institution",
                headers=self.auth_headers(),
                name="BOOTSTRAP GET /institutions/my-institution",
                catch_response=True,
            ) as res:
                if res.status_code == 200:
                    try:
                        self.institution_id = self._first_id(res.json(), "id", "institutionId")
                        res.success()
                    except Exception:
                        res.failure("parse")
                else:
                    res.failure(f"{res.status_code}")

        # Branches
        with self.client.get(
            f"{API_PREFIX}/branches/list",
            headers=self.auth_headers(),
            name="BOOTSTRAP GET /branches/list",
            catch_response=True,
        ) as res:
            if res.status_code == 200:
                try:
                    self.branch_id = self._first_id(res.json(), "id", "branchId")
                    res.success()
                except Exception:
                    res.failure("parse")
            else:
                res.failure(f"{res.status_code}")

        # Libraries
        with self.client.get(
            f"{API_PREFIX}/libraries/list",
            headers=self.auth_headers(),
            name="BOOTSTRAP GET /libraries/list",
            catch_response=True,
        ) as res:
            if res.status_code == 200:
                try:
                    self.library_id = self._first_id(res.json(), "id", "libraryId")
                    res.success()
                except Exception:
                    res.failure("parse")
            else:
                res.failure(f"{res.status_code}")

        # Members
        with self.client.get(
            f"{API_PREFIX}/members",
            headers=self.auth_headers(),
            name="BOOTSTRAP GET /members",
            catch_response=True,
        ) as res:
            if res.status_code == 200:
                try:
                    self.member_id = self._first_id(res.json(), "id", "memberId")
                    res.success()
                except Exception:
                    res.failure("parse")
            else:
                res.failure(f"{res.status_code}")
