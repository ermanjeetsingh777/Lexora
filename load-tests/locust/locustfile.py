"""
Lexora API Locust load tests — public + authenticated endpoints.

Usage (from load-tests/locust):
  # Local
  pip install -r requirements.txt
  .\\run-local.ps1

  # Production (set email/password first)
  .\\run-prod.ps1

Web UI: http://localhost:8089
"""
from __future__ import annotations

import os
from pathlib import Path

from locust import HttpUser, between, tag, task

from common import API_PREFIX, LexoraApiUser, load_dotenv_file


# Load env file if LOCUST_ENV_FILE set (run-*.ps1 sets this)
_env_file = os.getenv("LOCUST_ENV_FILE", "")
if _env_file:
    load_dotenv_file(_env_file)

# Staged ramp to 1000 concurrent users when LOCUST_SHAPE=thousand
_shape = os.getenv("LOCUST_SHAPE", "").strip().lower()
if _shape in {"thousand", "1000", "1k"}:
    from shapes import ThousandUsersShape  # noqa: F401 — Locust auto-discovers LoadTestShape



class PublicApiUser(HttpUser):
    """Anonymous / public endpoints only (no login)."""

    wait_time = between(1, 3)
    weight = 1

    def on_start(self) -> None:
        verify = os.getenv("LOCUST_VERIFY_SSL", "true").lower() in {"1", "true", "yes"}
        self.client.verify = verify
        if not verify:
            try:
                import urllib3

                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            except Exception:
                pass

    @tag("public")
    @task(5)
    def packages(self) -> None:
        self.client.get(f"{API_PREFIX}/packages", name="GET /packages")

    @tag("public")
    @task(3)
    def addons(self) -> None:
        self.client.get(f"{API_PREFIX}/addons", name="GET /addons")

    @tag("public")
    @task(3)
    def public_reviews(self) -> None:
        self.client.get(f"{API_PREFIX}/customer-reviews/public", name="GET /customer-reviews/public")

    @tag("public", "auth")
    @task(1)
    def login_probe(self) -> None:
        """Light login probe (uses env credentials) — counts as public path."""
        email = os.getenv("LOCUST_EMAIL", "institution@slms.com")
        password = os.getenv("LOCUST_PASSWORD", "Demo@12345")
        self.client.post(
            f"{API_PREFIX}/auth/login",
            json={"email": email, "password": password},
            name="POST /auth/login (public probe)",
        )


class AuthenticatedApiUser(LexoraApiUser):
    """
    JWT user hitting all major read endpoints across modules.
    Nested routes use ids resolved in on_start bootstrap.
    """

    wait_time = between(0.5, 2)
    weight = 5

    # ── Auth / profile ──────────────────────────────────────────
    @tag("auth")
    @task(4)
    def current_user(self) -> None:
        self.api_get("auth/current-user", name="GET /auth/current-user")

    @tag("auth")
    @task(2)
    def profile(self) -> None:
        self.api_get("auth/profile", name="GET /auth/profile")

    @tag("auth")
    @task(2)
    def entitlements(self) -> None:
        self.api_get("auth/organization-entitlements", name="GET /auth/organization-entitlements")

    @tag("auth")
    @task(1)
    def registration_status(self) -> None:
        self.api_get("auth/registration-status", name="GET /auth/registration-status")

    # ── Dashboard ───────────────────────────────────────────────
    @tag("dashboard")
    @task(6)
    def dashboard_overview(self) -> None:
        self.api_get("dashboard/overview", name="GET /dashboard/overview")

    @tag("dashboard")
    @task(3)
    def dashboard_revenue(self) -> None:
        self.api_get("dashboard/revenue", name="GET /dashboard/revenue")

    @tag("dashboard")
    @task(3)
    def dashboard_activity(self) -> None:
        self.api_get("dashboard/activity", name="GET /dashboard/activity")

    # ── Institutions ────────────────────────────────────────────
    @tag("institutions")
    @task(5)
    def institutions_list(self) -> None:
        self.api_get("institutions/list", name="GET /institutions/list")

    @tag("institutions")
    @task(2)
    def institutions_dropdown(self) -> None:
        self.api_get("institutions/dropdown", name="GET /institutions/dropdown")

    @tag("institutions")
    @task(2)
    def my_institution(self) -> None:
        self.api_get("institutions/my-institution", name="GET /institutions/my-institution")

    @tag("institutions")
    @task(4)
    def institution_detail_bundle(self) -> None:
        if not self.institution_id:
            return
        iid = self.institution_id
        self.api_get(f"institutions/{iid}", name="GET /institutions/{id}")
        self.api_get(f"institutions/{iid}/overview", name="GET /institutions/{id}/overview")
        self.api_get(f"institutions/{iid}/branches-view", name="GET /institutions/{id}/branches-view")
        self.api_get(f"institutions/{iid}/libraries-view", name="GET /institutions/{id}/libraries-view")
        self.api_get(f"institutions/{iid}/billing", name="GET /institutions/{id}/billing")
        self.api_get(f"institutions/{iid}/analytics", name="GET /institutions/{id}/analytics")
        self.api_get(f"institutions/{iid}/quick-view", name="GET /institutions/{id}/quick-view")

    # ── Branches ────────────────────────────────────────────────
    @tag("branches")
    @task(5)
    def branches_list(self) -> None:
        self.api_get("branches/list", name="GET /branches/list")

    @tag("branches")
    @task(3)
    def branch_detail(self) -> None:
        if not self.branch_id:
            return
        self.api_get(f"branches/{self.branch_id}", name="GET /branches/{id}")

    @tag("branches")
    @task(2)
    def nested_branches(self) -> None:
        if not self.institution_id:
            return
        self.api_get(
            f"institutions/{self.institution_id}/branches",
            name="GET /institutions/{id}/branches",
        )
        if self.branch_id:
            self.api_get(
                f"institutions/{self.institution_id}/branches/{self.branch_id}",
                name="GET /institutions/{id}/branches/{branchId}",
            )
            self.api_get(
                f"institutions/{self.institution_id}/branches/{self.branch_id}/analytics",
                name="GET /institutions/.../branches/{id}/analytics",
            )

    # ── Libraries ───────────────────────────────────────────────
    @tag("libraries")
    @task(5)
    def libraries_list(self) -> None:
        self.api_get("libraries/list", name="GET /libraries/list")

    @tag("libraries")
    @task(2)
    def libraries_revenue(self) -> None:
        self.api_get("libraries/list/revenue", name="GET /libraries/list/revenue")

    @tag("libraries")
    @task(4)
    def library_detail_bundle(self) -> None:
        if not self.library_id:
            return
        lid = self.library_id
        self.api_get(f"libraries/{lid}", name="GET /libraries/{id}")
        self.api_get(f"libraries/{lid}/calendar", name="GET /libraries/{id}/calendar")
        self.api_get(f"libraries/{lid}/attendance-qr", name="GET /libraries/{id}/attendance-qr")

    @tag("libraries")
    @task(2)
    def nested_libraries(self) -> None:
        if not (self.institution_id and self.branch_id):
            return
        base = f"institutions/{self.institution_id}/branches/{self.branch_id}/libraries"
        self.api_get(base, name="GET /.../branches/{id}/libraries")
        self.api_get(f"{base}/capacity-summary", name="GET /.../libraries/capacity-summary")
        if self.library_id:
            self.api_get(f"{base}/{self.library_id}", name="GET /.../libraries/{libraryId}")

    # ── Plans ───────────────────────────────────────────────────
    @tag("plans")
    @task(3)
    def library_plans(self) -> None:
        if not (self.institution_id and self.branch_id and self.library_id):
            return
        path = (
            f"institutions/{self.institution_id}/branches/{self.branch_id}"
            f"/libraries/{self.library_id}/plans"
        )
        self.api_get(path, name="GET /.../libraries/{id}/plans")

    # ── Members ─────────────────────────────────────────────────
    @tag("members")
    @task(6)
    def members_list(self) -> None:
        self.api_get("members", name="GET /members")

    @tag("members")
    @task(3)
    def members_summary(self) -> None:
        self.api_get("members/summary", name="GET /members/summary")

    @tag("members")
    @task(2)
    def members_me(self) -> None:
        self.api_get("members/me", name="GET /members/me")

    @tag("members")
    @task(4)
    def member_detail_bundle(self) -> None:
        if not self.member_id:
            return
        mid = self.member_id
        self.api_get(f"members/{mid}", name="GET /members/{id}")
        self.api_get(f"members/{mid}/book-loans", name="GET /members/{id}/book-loans")
        self.api_get(f"members/{mid}/digital-books", name="GET /members/{id}/digital-books")

    @tag("members")
    @task(2)
    def scoped_members(self) -> None:
        if self.institution_id:
            self.api_get(
                f"institutions/{self.institution_id}/members",
                name="GET /institutions/{id}/members",
            )
        if self.institution_id and self.branch_id:
            self.api_get(
                f"institutions/{self.institution_id}/branches/{self.branch_id}/members",
                name="GET /institutions/.../branches/{id}/members",
            )
        if self.institution_id and self.branch_id and self.library_id:
            self.api_get(
                f"institutions/{self.institution_id}/branches/{self.branch_id}"
                f"/libraries/{self.library_id}/members",
                name="GET /.../libraries/{id}/members",
            )

    # ── Attendance ──────────────────────────────────────────────
    @tag("attendance")
    @task(4)
    def attendance_summary(self) -> None:
        self.api_get("attendance/summary", name="GET /attendance/summary")

    @tag("attendance")
    @task(3)
    def attendance_records(self) -> None:
        self.api_get("attendance/records", name="GET /attendance/records")

    @tag("attendance")
    @task(3)
    def attendance_live(self) -> None:
        self.api_get("attendance/live", name="GET /attendance/live")

    @tag("attendance")
    @task(2)
    def attendance_analytics(self) -> None:
        self.api_get("attendance/analytics", name="GET /attendance/analytics")

    @tag("attendance")
    @task(2)
    def attendance_calendar(self) -> None:
        self.api_get("attendance/calendar/month", name="GET /attendance/calendar/month")
        self.api_get("attendance/calendar/summary", name="GET /attendance/calendar/summary")

    @tag("attendance")
    @task(2)
    def member_attendance(self) -> None:
        if not self.member_id:
            return
        mid = self.member_id
        self.api_get(f"attendance/members/{mid}/calendar", name="GET /attendance/members/{id}/calendar")
        self.api_get(f"attendance/members/{mid}/records", name="GET /attendance/members/{id}/records")
        self.api_get(
            f"attendance/members/{mid}/statistics",
            name="GET /attendance/members/{id}/statistics",
        )

    @tag("attendance", "scanner")
    @task(3)
    def scanner_context(self) -> None:
        self.api_get("attendance/scanner/context", name="GET /attendance/scanner/context")
        self.api_get("attendance/scanner/members", name="GET /attendance/scanner/members")
        self.api_get("attendance/scanner/seats", name="GET /attendance/scanner/seats")

    @tag("attendance")
    @task(2)
    def library_attendance_seats(self) -> None:
        if not self.library_id:
            return
        self.api_get(
            f"attendance/libraries/{self.library_id}/seats",
            name="GET /attendance/libraries/{id}/seats",
        )

    # ── Seats (nested) ──────────────────────────────────────────
    @tag("seats")
    @task(2)
    def branch_seats(self) -> None:
        if not (self.institution_id and self.branch_id):
            return
        self.api_get(
            f"institutions/{self.institution_id}/branches/{self.branch_id}/seats",
            name="GET /.../branches/{id}/seats",
        )

    # ── Books ───────────────────────────────────────────────────
    @tag("books")
    @task(3)
    def library_books(self) -> None:
        if not (self.institution_id and self.branch_id and self.library_id):
            return
        base = (
            f"institutions/{self.institution_id}/branches/{self.branch_id}"
            f"/libraries/{self.library_id}/books"
        )
        self.api_get(base, name="GET /.../libraries/{id}/books")
        self.api_get(f"{base}/stats", name="GET /.../books/stats")

    # ── Subscriptions ───────────────────────────────────────────
    @tag("subscriptions")
    @task(3)
    def package_subscriptions(self) -> None:
        self.api_get("package-subscriptions/overview", name="GET /package-subscriptions/overview")
        self.api_get("package-subscriptions/quote", name="GET /package-subscriptions/quote")

    @tag("subscriptions")
    @task(2)
    def institution_subscriptions(self) -> None:
        if not self.institution_id:
            return
        self.api_get(
            f"institutions/{self.institution_id}/subscriptions",
            name="GET /institutions/{id}/subscriptions",
        )

    # ── Packages / addons (auth) ─────────────────────────────────
    @tag("packages")
    @task(2)
    def packages_auth(self) -> None:
        self.api_get("packages", name="GET /packages (auth)")

    @tag("addons")
    @task(2)
    def my_addons(self) -> None:
        self.api_get("addons/my-addons", name="GET /addons/my-addons")

    # ── Notifications ───────────────────────────────────────────
    @tag("notifications")
    @task(3)
    def notifications(self) -> None:
        self.api_get("notifications", name="GET /notifications")

    # ── Support ─────────────────────────────────────────────────
    @tag("support")
    @task(3)
    def support_bundle(self) -> None:
        self.api_get("support/context", name="GET /support/context")
        self.api_get("support/tickets", name="GET /support/tickets")
        self.api_get("support/articles", name="GET /support/articles")
        self.api_get("support/status", name="GET /support/status")

    # ── Admin (may 403 for org admin — still measures latency) ──
    @tag("admin")
    @task(1)
    def admin_reads(self) -> None:
        self.api_get("admin/users", name="GET /admin/users")
        self.api_get("admin/roles", name="GET /admin/roles")
        self.api_get("admin/permissions", name="GET /admin/permissions")
        self.api_get("admin/system-health", name="GET /admin/system-health")
        self.api_get("admin/audit-logs", name="GET /admin/audit-logs")
        self.api_get("admin/registrations", name="GET /admin/registrations")

    # ── Customer reviews (admin) ────────────────────────────────
    @tag("reviews")
    @task(1)
    def customer_reviews_admin(self) -> None:
        self.api_get("customer-reviews", name="GET /customer-reviews")


# Default host if --host not passed (overridden by env / CLI)
AuthenticatedApiUser.host = os.getenv("LOCUST_HOST", "https://localhost:7050")
PublicApiUser.host = os.getenv("LOCUST_HOST", "https://localhost:7050")
