"""
Shared Locust helpers — login, auth header, ID bootstrap, safe GET helpers.
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
_shared_package_id: str | None = None
_shared_addon_id: str | None = None
_shared_subscription_id: str | None = None
_shared_plan_id: str | None = None
_shared_book_id: str | None = None
_shared_seat_id: str | None = None
_shared_ticket_id: str | None = None
_shared_article_id: str | None = None
_shared_payment_id: str | None = None
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
    package_id: str | None = None
    addon_id: str | None = None
    subscription_id: str | None = None
    plan_id: str | None = None
    book_id: str | None = None
    seat_id: str | None = None
    ticket_id: str | None = None
    article_id: str | None = None
    payment_id: str | None = None

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
            _shared_member_id, \
            _shared_package_id, \
            _shared_addon_id, \
            _shared_subscription_id, \
            _shared_plan_id, \
            _shared_book_id, \
            _shared_seat_id, \
            _shared_ticket_id, \
            _shared_article_id, \
            _shared_payment_id
        with _shared_lock:
            if _shared_bootstrapped:
                self.institution_id = _shared_institution_id
                self.branch_id = _shared_branch_id
                self.library_id = _shared_library_id
                self.member_id = _shared_member_id
                self.package_id = _shared_package_id
                self.addon_id = _shared_addon_id
                self.subscription_id = _shared_subscription_id
                self.plan_id = _shared_plan_id
                self.book_id = _shared_book_id
                self.seat_id = _shared_seat_id
                self.ticket_id = _shared_ticket_id
                self.article_id = _shared_article_id
                self.payment_id = _shared_payment_id
                return
            self._bootstrap_ids()
            _shared_institution_id = self.institution_id
            _shared_branch_id = self.branch_id
            _shared_library_id = self.library_id
            _shared_member_id = self.member_id
            _shared_package_id = self.package_id
            _shared_addon_id = self.addon_id
            _shared_subscription_id = self.subscription_id
            _shared_plan_id = self.plan_id
            _shared_book_id = self.book_id
            _shared_seat_id = self.seat_id
            _shared_ticket_id = self.ticket_id
            _shared_article_id = self.article_id
            _shared_payment_id = self.payment_id
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

    def _url(self, path: str) -> str:
        if path.startswith(API_PREFIX):
            return path
        return f"{API_PREFIX}/{path.lstrip('/')}"

    def api_get(self, path: str, name: str | None = None, **kwargs: Any):
        """Authenticated GET under /api/v1."""
        url = self._url(path)
        headers = {**self.auth_headers(), **(kwargs.pop("headers", {}) or {})}
        return self.client.get(
            url,
            headers=headers,
            name=name or f"GET {url}",
            **kwargs,
        )

    def api_post(self, path: str, json_body: dict | None = None, name: str | None = None, **kwargs: Any):
        url = self._url(path)
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
            for nested_key in (
                "items",
                "results",
                "data",
                "currentSubscription",
                "history",
                "packages",
                "addons",
                "tickets",
                "articles",
            ):
                items = data.get(nested_key)
                if isinstance(items, list) and items and isinstance(items[0], dict):
                    for k in keys:
                        if items[0].get(k):
                            return str(items[0][k])
                if isinstance(items, dict):
                    for k in keys:
                        if items.get(k):
                            return str(items[k])
            for k in keys:
                if data.get(k):
                    return str(data[k])
        return None

    def _get_json(self, path: str, name: str) -> Any | None:
        with self.client.get(
            self._url(path),
            headers=self.auth_headers(),
            name=name,
            catch_response=True,
        ) as res:
            if res.status_code != 200:
                res.failure(f"{res.status_code}")
                return None
            try:
                payload = res.json()
                res.success()
                return payload
            except Exception as exc:
                res.failure(str(exc))
                return None

    def _bootstrap_ids(self) -> None:
        """Resolve ids used by nested / detail routes across modules."""
        if not self.access_token:
            return

        payload = self._get_json("institutions/list", "BOOTSTRAP GET /institutions/list")
        if payload:
            self.institution_id = self._first_id(payload, "id", "institutionId")

        if not self.institution_id:
            payload = self._get_json(
                "institutions/my-institution",
                "BOOTSTRAP GET /institutions/my-institution",
            )
            if payload:
                self.institution_id = self._first_id(payload, "id", "institutionId")

        payload = self._get_json("branches/list", "BOOTSTRAP GET /branches/list")
        if payload:
            self.branch_id = self._first_id(payload, "id", "branchId")

        payload = self._get_json("libraries/list", "BOOTSTRAP GET /libraries/list")
        if payload:
            self.library_id = self._first_id(payload, "id", "libraryId")

        payload = self._get_json("members", "BOOTSTRAP GET /members")
        if payload:
            self.member_id = self._first_id(payload, "id", "memberId")

        payload = self._get_json("packages", "BOOTSTRAP GET /packages")
        if payload:
            self.package_id = self._first_id(payload, "id", "packageId")

        payload = self._get_json("addons", "BOOTSTRAP GET /addons")
        if payload:
            self.addon_id = self._first_id(payload, "id", "addonId")

        payload = self._get_json(
            "package-subscriptions/overview",
            "BOOTSTRAP GET /package-subscriptions/overview",
        )
        if payload:
            self.subscription_id = self._first_id(
                payload,
                "id",
                "subscriptionId",
                "userPackageId",
            )
            if not self.package_id:
                self.package_id = self._first_id(payload, "packageId")

        if self.institution_id and self.branch_id and self.library_id:
            plans_path = (
                f"institutions/{self.institution_id}/branches/{self.branch_id}"
                f"/libraries/{self.library_id}/plans"
            )
            payload = self._get_json(plans_path, "BOOTSTRAP GET /.../plans")
            if payload:
                self.plan_id = self._first_id(payload, "id", "planId")

            books_path = (
                f"institutions/{self.institution_id}/branches/{self.branch_id}"
                f"/libraries/{self.library_id}/books"
            )
            payload = self._get_json(books_path, "BOOTSTRAP GET /.../books")
            if payload:
                self.book_id = self._first_id(payload, "id", "bookId")

            seats_path = (
                f"institutions/{self.institution_id}/branches/{self.branch_id}/seats"
            )
            payload = self._get_json(seats_path, "BOOTSTRAP GET /.../seats")
            if payload:
                self.seat_id = self._first_id(payload, "id", "seatId")

        payload = self._get_json("support/tickets", "BOOTSTRAP GET /support/tickets")
        if payload:
            self.ticket_id = self._first_id(payload, "id", "ticketId")

        payload = self._get_json("support/articles", "BOOTSTRAP GET /support/articles")
        if payload:
            self.article_id = self._first_id(payload, "id", "articleId")

        payload = self._get_json("payments", "BOOTSTRAP GET /payments")
        if payload:
            self.payment_id = self._first_id(payload, "id", "transactionId")
