"""
Lexora API Locust load tests — public + authenticated read endpoints across all modules.

Usage (from load-tests/locust):
  pip install -r requirements.txt
  .\\run-local.ps1
  .\\run-local-1000.ps1

Web UI: http://localhost:8089

Mutating POSTs (payment initiate, check-in, subscribe, etc.) are intentionally excluded.
"""
from __future__ import annotations

import os

from locust import HttpUser, between, tag, task

from common import API_PREFIX, LexoraApiUser, load_dotenv_file


_env_file = os.getenv("LOCUST_ENV_FILE", "")
if _env_file:
    load_dotenv_file(_env_file)

_shape = os.getenv("LOCUST_SHAPE", "").strip().lower()
if _shape in {"thousand", "1000", "1k"}:
    from shapes import ThousandUsersShape  # noqa: F401


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

    @tag("public", "packages")
    @task(5)
    def packages(self) -> None:
        self.client.get(f"{API_PREFIX}/packages", name="GET /packages")

    @tag("public", "addons")
    @task(3)
    def addons(self) -> None:
        self.client.get(f"{API_PREFIX}/addons", name="GET /addons")

    @tag("public", "reviews")
    @task(3)
    def public_reviews(self) -> None:
        self.client.get(
            f"{API_PREFIX}/customer-reviews/public",
            name="GET /customer-reviews/public",
        )

    @tag("public", "auth")
    @task(1)
    def login_probe(self) -> None:
        email = os.getenv("LOCUST_EMAIL", "institution@slms.com")
        password = os.getenv("LOCUST_PASSWORD", "Demo@12345")
        self.client.post(
            f"{API_PREFIX}/auth/login",
            json={"email": email, "password": password},
            name="POST /auth/login (public probe)",
        )


class AuthenticatedApiUser(LexoraApiUser):
    """
    JWT user hitting read endpoints across every module.
    Nested / detail routes use ids resolved during bootstrap.
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
        self.api_get(
            "auth/organization-entitlements",
            name="GET /auth/organization-entitlements",
        )

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
    @task(4)
    def institutions_root(self) -> None:
        self.api_get("institutions", name="GET /institutions")

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
        self.api_get(
            f"institutions/{iid}/branches-view",
            name="GET /institutions/{id}/branches-view",
        )
        self.api_get(
            f"institutions/{iid}/libraries-view",
            name="GET /institutions/{id}/libraries-view",
        )
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
        self.api_get(
            f"libraries/{lid}/attendance-qr",
            name="GET /libraries/{id}/attendance-qr",
        )

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
        if self.plan_id:
            self.api_get(f"{path}/{self.plan_id}", name="GET /.../plans/{planId}")

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
        self.api_get(f"members/{mid}/photo", name="GET /members/{id}/photo")
        self.api_get(f"members/{mid}/aadhaar", name="GET /members/{id}/aadhaar")

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
            base = (
                f"institutions/{self.institution_id}/branches/{self.branch_id}"
                f"/libraries/{self.library_id}/members"
            )
            self.api_get(base, name="GET /.../libraries/{id}/members")
            self.api_get(
                f"{base}/bulk/template",
                name="GET /.../members/bulk/template",
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
        self.api_get(
            f"attendance/members/{mid}/calendar",
            name="GET /attendance/members/{id}/calendar",
        )
        self.api_get(
            f"attendance/members/{mid}/records",
            name="GET /attendance/members/{id}/records",
        )
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
        if self.member_id:
            mid = self.member_id
            self.api_get(
                f"attendance/scanner/members/{mid}/status",
                name="GET /attendance/scanner/members/{id}/status",
            )
            self.api_get(
                f"attendance/scanner/members/{mid}/qr",
                name="GET /attendance/scanner/members/{id}/qr",
            )
        if self.library_id:
            self.api_get(
                f"attendance/scanner/libraries/{self.library_id}/qr",
                name="GET /attendance/scanner/libraries/{id}/qr",
            )

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
        path = f"institutions/{self.institution_id}/branches/{self.branch_id}/seats"
        self.api_get(path, name="GET /.../branches/{id}/seats")
        if self.seat_id:
            self.api_get(f"{path}/{self.seat_id}", name="GET /.../seats/{seatId}")

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
        if self.book_id:
            self.api_get(f"{base}/{self.book_id}", name="GET /.../books/{bookId}")

    # ── Payments (M-20) ─────────────────────────────────────────
    @tag("payments")
    @task(4)
    def payments_platform_status(self) -> None:
        self.api_get("payments/platform/status", name="GET /payments/platform/status")

    @tag("payments")
    @task(4)
    def payments_list(self) -> None:
        self.api_get("payments", name="GET /payments")
        if self.institution_id:
            self.api_get(
                f"payments?institutionId={self.institution_id}",
                name="GET /payments?institutionId",
            )
        if self.member_id:
            self.api_get(
                f"payments?memberId={self.member_id}",
                name="GET /payments?memberId",
            )

    @tag("payments")
    @task(3)
    def payments_institution_account(self) -> None:
        if not self.institution_id:
            return
        self.api_get(
            f"payments/institutions/{self.institution_id}/account",
            name="GET /payments/institutions/{id}/account",
        )

    @tag("payments")
    @task(2)
    def payments_detail(self) -> None:
        if not self.payment_id:
            return
        self.api_get(
            f"payments/{self.payment_id}",
            name="GET /payments/{transactionId}",
        )

    # ── Package subscriptions / SaaS ────────────────────────────
    @tag("subscriptions")
    @task(4)
    def package_subscriptions_overview(self) -> None:
        self.api_get(
            "package-subscriptions/overview",
            name="GET /package-subscriptions/overview",
        )

    @tag("subscriptions")
    @task(2)
    def package_subscriptions_quote(self) -> None:
        if not (self.subscription_id and self.package_id):
            return
        self.api_get(
            f"package-subscriptions/quote"
            f"?subscriptionId={self.subscription_id}&packageId={self.package_id}&forUpgrade=true",
            name="GET /package-subscriptions/quote",
        )

    @tag("subscriptions", "admin")
    @task(1)
    def package_subscription_requests(self) -> None:
        # SuperAdmin only — 403 for org admin still measures latency
        self.api_get(
            "package-subscriptions/requests",
            name="GET /package-subscriptions/requests",
        )

    @tag("subscriptions")
    @task(2)
    def institution_subscriptions(self) -> None:
        if not self.institution_id:
            return
        path = f"institutions/{self.institution_id}/subscriptions"
        self.api_get(path, name="GET /institutions/{id}/subscriptions")
        if self.subscription_id:
            self.api_get(
                f"{path}/{self.subscription_id}",
                name="GET /institutions/{id}/subscriptions/{subscriptionId}",
            )

    # ── Packages / addons ──────────────────────────────────────
    @tag("packages")
    @task(2)
    def packages_auth(self) -> None:
        self.api_get("packages", name="GET /packages (auth)")
        if self.package_id:
            self.api_get(f"packages/{self.package_id}", name="GET /packages/{id}")

    @tag("packages", "admin")
    @task(1)
    def packages_all(self) -> None:
        self.api_get("packages/all", name="GET /packages/all")

    @tag("addons")
    @task(2)
    def my_addons(self) -> None:
        self.api_get("addons/my-addons", name="GET /addons/my-addons")
        if self.addon_id:
            self.api_get(f"addons/{self.addon_id}", name="GET /addons/{id}")

    @tag("addons", "admin")
    @task(1)
    def addons_admin(self) -> None:
        self.api_get("addons/all", name="GET /addons/all")
        self.api_get("addons/requests", name="GET /addons/requests")

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
        if self.ticket_id:
            self.api_get(
                f"support/tickets/{self.ticket_id}",
                name="GET /support/tickets/{ticketId}",
            )
        if self.article_id:
            self.api_get(
                f"support/articles/{self.article_id}",
                name="GET /support/articles/{articleId}",
            )

    # ── Admin (may 403 for org admin — still measures latency) ──
    @tag("admin")
    @task(1)
    def admin_reads(self) -> None:
        self.api_get("admin/users", name="GET /admin/users")
        self.api_get("admin/users/scope-options", name="GET /admin/users/scope-options")
        self.api_get("admin/roles", name="GET /admin/roles")
        self.api_get("admin/permissions", name="GET /admin/permissions")
        self.api_get("admin/system-health", name="GET /admin/system-health")
        self.api_get("admin/audit-logs", name="GET /admin/audit-logs")
        self.api_get("admin/registrations", name="GET /admin/registrations")

    # ── Customer reviews (admin) ────────────────────────────────
    @tag("reviews", "admin")
    @task(1)
    def customer_reviews_admin(self) -> None:
        self.api_get("customer-reviews", name="GET /customer-reviews")


# Default host if --host not passed (overridden by env / CLI)
_default_host = os.getenv("LOCUST_HOST", "https://localhost:7050")
AuthenticatedApiUser.host = _default_host
PublicApiUser.host = _default_host
