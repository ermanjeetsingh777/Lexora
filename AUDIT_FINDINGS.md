# Lexora security and production-risk audit

Date: 2026-09-05  
Scope: `SLMS_UI` (Angular) and `SLMS_API` (ASP.NET). No large refactor.  
Public repo: https://github.com/ermanjeetsingh777/Lexora  
Verified live hosts: https://uniappx.in (frontend HTTP 200), https://apiuniappx.runasp.net (API).

**This PR redacts committed secrets and applies a few small hardening fixes. Secrets that were already pushed remain in git history. Rotate them on the host immediately.**

## What was verified vs hypothesized

| Item | Status |
| --- | --- |
| Root `apiuniappx.runasp.net-WebDeploy.publishSettings` on `main` contains plaintext Web Deploy credentials for site88158 / apiuniappx.runasp.net | **Verified** (confirmed live finding). Password is **not** repeated here; rotate on the host. |
| Duplicate publish profile also lived under `SLMS_API/` | **Verified** in source |
| Production/QA/UAT SQL connection strings (host, database, user, password) committed | **Verified** in source |
| Live Swagger UI + downloadable `swagger.json` (167 paths, including admin password/role endpoints) | **Verified** unauthenticated GET to `/swagger`, `/swagger/index.html`, `/swagger/v1/swagger.json` |
| Live `/WeatherForecast` and `/api/test` return 200 without auth | **Verified** (TestAttendance was reachable in prod before this PR) |
| Live `GET /api/v1/packages` and `GET /api/v1/customer-reviews/public` are anonymous | **Verified** (intentional for marketing/signup) |
| `Demo:Enabled` is `false` in production appsettings | **Verified** in `appsettings.json` and `appsettings.Production.json`. `DemoSeedData` returns immediately when disabled. |
| README documents seeded SuperAdmin/demo passwords | **Verified** (root `README.md`, `docs/workflow/auth-workflow.md`) |
| `SLMS_API/Application/Services/PackageService .cs` filename has a trailing space | **Verified** (`git ls-files`) |
| `ASPNETCORE_ENVIRONMENT` on the host is `Production` | **Hypothesized** (public Swagger matches committed `Swagger:Enabled: true` before this PR) |
| Placeholder JWT signing keys in config are the keys actually used in prod | **Hypothesized** unless the host overrides `Jwt__SecretKey` |
| Seeded SuperAdmin still works in prod | **Hypothesized** (seeded on first migrate if missing; password is not reset on later boots) |
| SMTP value previously in config is a real Gmail credential | **Hypothesized** (looks placeholder; still should not live in git) |
| Tenant isolation holds for every query | **Hypothesized risk**: no EF global `HasQueryFilter`; services scope by institution/branch/library, but `AdminService.DeleteUserAsync` has no caller/tenant check |
| Dependabot PR #6 is not a prod API/runtime UI dependency emergency | **Verified** (see below) |

No production login was attempted with committed or default credentials.

---

## Critical

### C1. Web Deploy credentials committed on `main` (confirmed)

Root file `apiuniappx.runasp.net-WebDeploy.publishSettings` is on `main` and contains plaintext Web Deploy `userName` + `userPWD` for **site88158** / **apiuniappx.runasp.net**. A duplicate file existed at `SLMS_API/apiuniappx.runasp.net-WebDeploy.publishSettings`.

Anyone with repo (or git-history) access can publish over the production API. **The password is not repeated in this document.** It must be rotated on the SiteASP / Web Deploy host. Removing the files from the tree does not purge history.

**This PR:** removed both files from tracking, added `*.publishSettings` to `.gitignore`, added `SLMS_API/WebDeploy.publishSettings.example` with placeholders only.

### C2. Hosted SQL credentials committed

Plaintext `ConnectionStrings:DefaultConnection` in:

- `SLMS_API/appsettings.json`
- `SLMS_API/appsettings.Production.json`
- `SLMS_API/appsettings.QA.json`
- `SLMS_API/appsettings.UAT.json`

Same host user/password across prod/QA/UAT databases; `Encrypt=False`.

**This PR:** replaced connection strings with `SET_VIA_ENVIRONMENT_ConnectionStrings__DefaultConnection`.

**Required outside git:** rotate the database password; set `ConnectionStrings__DefaultConnection` on the host **before** the next API deploy or the app will fail to start. Enable SQL TLS (`Encrypt=True`).

### C3. Guessable JWT signing keys in committed config

`Jwt:SecretKey` values are public placeholders, e.g. `CHANGE_ME_TO_A_SECURE_PROD_VAULT_KEY_AT_LEAST_32_CHARACTERS` in `appsettings.Production.json`. `JwtTokenService` and JWT bearer validation both use this key as-is. If the host does not override it, anyone can forge access tokens for any user/role (including SuperAdmin).

**This PR:** did not invent a new key (that would still be in git). Set a long random `Jwt__SecretKey` on the host and recycle all sessions.

---

## High

### H1. Default SuperAdmin and member passwords in every environment file

`Identity:SuperAdminEmail` / `SuperAdminPassword` and `DefaultMemberPassword` are committed (`superadmin@slms.com` / `SuperAdmin@123`, `Password@123`). `SuperAdminSeedData` creates that user on first boot. `MemberService` assigns the default member password to every new member. `DemoSeedData` uses the same defaults when `Demo:Enabled` is true (false in Production config).

**Required:** change the SuperAdmin password in the live database if it was never rotated; stop shipping a shared default member password.

### H2. Production Swagger is fully public (confirmed)

Verified live:

- `https://apiuniappx.runasp.net/` redirects to `/swagger`
- `https://apiuniappx.runasp.net/swagger` (and `/swagger/index.html`) serve Swagger UI
- `https://apiuniappx.runasp.net/swagger/v1/swagger.json` is downloadable and enumerates **167** paths (admin users/passwords/roles, members, attendance, backup, etc.)

**This PR:** `Swagger:Enabled` is `false` in `appsettings.json` and `appsettings.Production.json`; `/` no longer defaults Swagger on. Redeploy required before the live host changes.

### H3. `TestAttendanceController` was reachable in production (confirmed)

Verified live: unauthenticated `GET https://apiuniappx.runasp.net/api/test` returned HTTP 200 `"Working"`. The controller is a leftover stub (`api/test`), not Development-only, and the check-in action had its permission attribute commented out.

`GET /WeatherForecast` was also public (HTTP 200).

**This PR:** `TestAttendanceController` is hidden from API explorer and returns **404** unless the host environment is Development, Local, or Dev. `WeatherForecastController` requires `[Authorize]`. Redeploy required.

### H4. OTP is never emailed and was logged in plaintext

`AuthService.SendOtpAsync` generates a 6-digit OTP, stores it, logs `Code: {Code}`, and returns success. There is no call to `IAppEmailService`. `ForgotPasswordAsync` logged the full reset URL (token included).

**This PR:** removed OTP codes and reset URLs from log lines. OTP still is not delivered by email (functional gap; not fixed here).

### H5. No login lockout or rate limiting

`LoginAsync` uses `CheckPasswordAsync` only. Identity lockout is not wired. No `AddRateLimiter`. Public `send-otp`, `register`, `forgot-password`, and `POST /api/v1/customer-reviews` can be abused.

### H6. Login user enumeration

`LoginAsync` returns distinct messages: “Email or phone number is not registered.” vs “Please enter the correct password.” `SendOtpAsync` throws “User not found.”

### H7. `DeleteUser` has no tenant/caller check

`AdminController.DeleteUser` requires `UsersDelete`, then `AdminService.DeleteUserAsync` deletes by id with no `CanAccessUserAsync` / SuperAdmin guard. A scoped admin who has that permission can delete any user id, including SuperAdmin.

### H8. Auth refresh path was wrong (UI)

API route is `POST /api/v1/auth/refresh-token`. UI called `auth/refresh` and double-unwrapped the response. Login also never scheduled refresh (register did).

**This PR:** UI now posts `auth/refresh-token` and stores `response.data`; login schedules refresh. 401 retry is still missing on the HTTP interceptor.

### H9. Tokens in `localStorage` for 180 minutes

`StorageService` persists access + refresh tokens. Combined with XSS, tokens are trivial to steal. Access token lifetime is 180 minutes in prod config.

---

## Medium

### M1. CORS allows GitHub Pages origin with credentials

`Cors:AllowedOrigins` includes `https://ermanjeetsingh777.github.io` plus production domains. Policy uses `AllowCredentials()`. `.github/workflows/deploy.yml` publishes the Angular app to GitHub Pages. Fallback `AllowAnyOrigin` exists if the origins array is empty (not the current prod config).

### M2. Tenant isolation is application-scoped, not database-enforced

`ApplicationDbContext` has no `HasQueryFilter` on `TenantId`. Member/admin services generally check institution/branch/library scope. A missed filter is a cross-tenant IDOR. `TenantId` is unused in `Application/Services`.

### M3. Public kiosk APIs dump member directories given a QR token

`AttendanceKioskController` is `[AllowAnonymous]`. `SearchMembersAsync` returns up to 50 names/membership numbers (and can match phone). Tokens are GUID-based (not easily guessed) but a leaked library QR is a member directory.

### M4. SQL `Encrypt=False` on hosted connection strings

Man-in-the-middle risk between the app host and `databaseasp.net`.

### M5. Exception messages returned to clients on several write paths

`CustomerReviewsController.Submit` / approve / reject and tenant registration list return `ex.Message`. `GlobalExceptionHandler` itself is conservative (generic 500).

### M6. Default Angular `environment.ts` pointed at production API

`SLMS_UI/src/environments/environment.ts` uses `https://apiuniappx.runasp.net/api/v1` and includes demo email/password. `ng serve` default config replaces this with `environment.local.ts`; a build without file replacement would hit prod.

### M7. `xlsx@0.18.5` in production UI

Used for member bulk upload. Community SheetJS has a history of prototype-pollution / ReDoS issues. Prefer a maintained fork or server-side parse.

### M8. Approvals UI permission mismatch

`/admin/approvals` is guarded by `PermissionKey.UsersList`. API registration approve/reject requires SuperAdmin. Institution admins can open a broken page.

### M9. Migration swallow

`DbSeeder.MigrateAndSeedAsync` catches all migrate failures and continues. A failed migration can leave prod on a silent old schema.

### M10. `docs/lovable-source/.env` committed

Supabase project URL + publishable/anon JWT. Not used by SLMS_UI/SLMS_API. Anon keys are often public by design, but this file should not be in git.

**This PR:** removed from tracking; added `.env.example`.

### M11. README documents seeded SuperAdmin / demo passwords

Root `README.md` (and `docs/workflow/auth-workflow.md`) publish the seeded SuperAdmin and demo org-admin emails/passwords. That is expected for local onboarding, but it is a public-repo credential hint.

**Verified:** `Demo:Enabled` is `false` in `SLMS_API/appsettings.json` and `appsettings.Production.json`. `DemoSeedData.SeedAsync` returns immediately when disabled, so the demo org admin is not seeded by a production boot. SuperAdmin seed still runs on first migrate (`H1`).

**This PR:** README now states these logins are local/dev only and that demo seed is off in production.

---

## Low

### L1. Wildcard route `**` → `dashboard`

Unknown paths bounce through the authenticated shell. Not a data leak; slightly noisy UX.

### L2. `AllowedHosts: *` in `appsettings.json`

Acceptable behind a single host, but host filtering is off.

### L3. Access token expiry keys not cleared on logout

`StorageService.clear()` removes token/user/tenant but not `access_token_expires` / `refresh_token_expires`.

### L4. Policy consent stored only in `localStorage`

Client-side only; not a security boundary.

### L5. Phone numbers and support contacts hardcoded in environment files

Not secrets; PII/ops hygiene.

### L6. `PackageService` source filename has a trailing space

`git ls-files` showed `SLMS_API/Application/Services/PackageService .cs` (space before `.cs`). Class name is `PackageService`; DI still resolves. The odd name is a hygiene / tooling risk (some glob/copy tools mishandle it).

**This PR:** renamed to `SLMS_API/Application/Services/PackageService.cs`.

---

## Dependabot PR #6

https://github.com/ermanjeetsingh777/Lexora/pull/6

- Title: bump npm_and_yarn group (postcss, brace-expansion, vite, js-yaml, plus transitive esbuild/nanoid).
- Files: `docs/lovable-source/package.json` + lockfile, and a small `SLMS_UI` postcss bump (`package.json` / `package-lock.json`).
- `docs/lovable-source` is a Lovable/TanStack prototype, **not** the production Angular app or the API.
- `postcss` in `SLMS_UI` is a **devDependency** (build-time). It does not ship in the browser bundle.
- **Not a blocker for SLMS_API.** Fine to merge for hygiene; it does not address any Critical/High finding above.

A separate remote branch `dependabot/npm_and_yarn/SLMS_UI/npm_and_yarn-ca1230fda4` exists; it was not opened as PR #6.

---

## Fixes included in this PR

1. Stop tracking Web Deploy profiles (root + `SLMS_API/`); ignore `*.publishSettings`; add a redacted example. **Rotate the host password — it is not printed here.**
2. Redact SQL and SMTP secrets from API `appsettings*`.
3. Disable Swagger by default and in Production config.
4. Make `TestAttendanceController` return 404 outside Development/Local/Dev; authorize `WeatherForecastController`.
5. Stop logging OTP codes, password-reset URLs, and SuperAdmin passwords.
6. Fix Angular refresh-token URL and schedule refresh after login.
7. Remove `docs/lovable-source/.env` from tracking.
8. Rename `PackageService .cs` → `PackageService.cs`.
9. Clarify README that seeded passwords are local/dev and `Demo:Enabled` is false in prod.

## Not changed (would be a larger change)

- JWT/SuperAdmin rotation (must happen on the host and in the database)
- Login lockout, rate limits, captcha
- Tenant global query filters
- `DeleteUser` authorization
- OTP email delivery
- HttpOnly cookie session storage
- 401 interceptor retry
- SheetJS replacement
