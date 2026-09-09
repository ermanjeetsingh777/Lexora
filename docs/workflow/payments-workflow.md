# Payments Workflow (M-20)

Online money movement for both directions: **tenants paying Lexora** for their subscription, and **members paying their library** for fees. Both routes write to the same ledger, and each institution decides whether it collects by **UPI** or through a **Razorpay** account — switching between them is a settings change, not a code change.

---

## 1. Two surfaces, one pipeline

| Surface | Who pays whom | Whose account | Configured in |
|---------|---------------|---------------|---------------|
| **Tenant subscription** | Library owner → Lexora | Lexora's own Razorpay account | `appsettings.json` → `Razorpay` section |
| **Member fees** | Member → their library | The institution's own UPI ID or Razorpay account | Institution detail → Settings → *Member fee collection* |

Lexora never holds member money. In UPI mode the transfer goes straight to the institution's VPA; in Razorpay mode the institution's own keys create the order, so the settlement lands in their bank account.

### Collection modes (`PaymentAccountMode`)

| Mode | Value | What the member sees | How it is confirmed |
|------|-------|----------------------|---------------------|
| **Offline only** | `None` = 0 | No online option; staff record fees by hand | n/a |
| **UPI ID** | `UpiManual` = 1 | QR + `upi://pay` deep link + reference | Member submits the UTR, staff confirm it |
| **Razorpay** | `Razorpay` = 2 | Razorpay checkout (cards, UPI, netbanking) | Signature check + `payment.captured` webhook |

**The mode is the only switch.** `PaymentService.BuildInstructionAsync` reads it and returns a single `PaymentInstructionResponse` carrying either a `upi` block or a `razorpay` block; the UI renders whichever arrived. An institution that starts on UPI and later adds gateway keys changes one radio button — no deployment, no migration.

---

## 2. Data model

**Files:** `Domain/Entities/PaymentAccount.cs` · `Domain/Entities/PaymentTransaction.cs` · configured in `Infrastructure/Data/ApplicationDbContext.cs` · migration `AddPaymentAccountsAndTransactions`

### `PaymentAccount` — one row per institution

| Column | Notes |
|--------|-------|
| `InstitutionId` | Unique — an institution has exactly one collection setup |
| `Mode` | `None` / `UpiManual` / `Razorpay` |
| `UpiVpa`, `UpiPayeeName` | Used in UPI mode; the payee name is what the member sees in their UPI app |
| `RazorpayKeyId` | Public key, safe to send to the browser |
| `RazorpayKeySecretProtected`, `RazorpayWebhookSecretProtected` | Encrypted with `IDataProtectionProvider` (`SecretProtector`, purpose `Lexora.PaymentCredentials.v1`). Never returned to the UI — responses only expose `hasRazorpayKeySecret` / `hasRazorpayWebhookSecret` |
| `WebhookToken` | Random 48-char hex, unique. Each institution has its own webhook secret, so the URL has to say which secret verifies the body |
| `FirstCapturedAtUtc` | Set on the first successful capture |

### `PaymentTransaction` — the ledger

Every attempt is a row, whatever the route. Key fields: `Purpose` (`MemberFee` / `TenantSubscription`), `Provider` (`Upi` / `Razorpay`), `Status`, `Reference` (`LEX-XXXXXXXX`, shown to the payer), `Amount`, `ProviderOrderId`, `ProviderPaymentId`, `UpiUtr`, `RawPayload`, `VerifiedByUserId`.

`ProviderPaymentId` carries a **unique filtered index**. Gateways retry webhooks, and a verifier may click *Confirm* while a webhook is in flight — this index plus the early return in `CaptureAsync` is what stops a payment being credited twice.

### Status flow

```
Created ──────────────► Captured          (Razorpay: signature verified / webhook)
   │
   └── AwaitingVerification ──► Captured  (UPI: member submits UTR, staff confirm)
                            └─► Failed    (staff reject with a reason)
```

---

## 3. API

**Controller:** `Controllers/PaymentsController.cs` · route `api/v1/payments` · **Service:** `Application/Services/PaymentService.cs`

| Method | Route | Permission | Purpose |
|--------|-------|------------|---------|
| GET | `platform/status` | authenticated | Whether Lexora's own gateway is on, so the UI knows to offer *Pay now* |
| GET | `institutions/{institutionId}/account` | `SettingsView` | Current collection setup (no secrets) |
| PUT | `institutions/{institutionId}/account` | `SettingsUpdate` | Save mode + credentials |
| POST | `member-fees/{memberId}/initiate` | authenticated | Create the order / UPI instruction |
| POST | `subscription/initiate` | authenticated | Tenant pays their own pending package |
| POST | `razorpay/verify` | authenticated | Verify the checkout callback signature |
| POST | `{transactionId}/upi-reference` | authenticated | Member submits their UTR |
| POST | `{transactionId}/approve` | `PaymentsUpdate` | Staff confirm a UPI transfer |
| POST | `{transactionId}/reject` | `PaymentsUpdate` | Reject with a reason |
| GET | `` (list) | `PaymentsList` | Ledger, filterable by institution / member / purpose / status |
| GET | `{transactionId}` | authenticated | One payment |
| POST | `webhook/razorpay/{token}` | **anonymous** | Server-to-server confirmation |

### Who can do what

The `Payments` permission module (index 8, keys 49–54) is granted as **full CRUD** to the organisation, institution, branch and library admin/manager roles in `Common/Constants/RolePermissionDefinitions.cs` — confirming a UPI transfer is `PaymentsUpdate`, so read-only access would leave payments stuck in the queue forever. Front-desk `Librarians` get view + list only; a SuperAdmin can widen that per role at runtime. `DbSeeder.SeedRolePermissionsAsync` syncs these on every boot, so the change lands on restart with no migration.

Paying does **not** require a Payments permission: `member-fees/{memberId}/initiate` and `{transactionId}/upi-reference` are `[Authorize]` only, so members in the portal can pay their own fees.

The ledger is scoped in `PaymentService.ListAsync`: anyone below SuperAdmin sees only payments for institutions they are linked to through `UserInstitutions`, plus their own subscription payments — regardless of which `institutionId` they pass.

### Gateway calls

`Infrastructure/Payments/RazorpayClient.cs` is a typed `HttpClient` against `https://api.razorpay.com/` — no vendor SDK. It creates orders (`POST v1/orders`, Basic auth, amount in paise) and verifies both signature types with HMAC-SHA256 compared using `CryptographicOperations.FixedTimeEquals`:

- **Checkout:** `HMAC(keySecret, "{orderId}|{paymentId}")`
- **Webhook:** `HMAC(webhookSecret, rawBody)` — the controller reads the **raw** request body, because re-serialising the model would change the bytes and break the signature.

### Webhook routing

`POST api/v1/payments/webhook/razorpay/{token}`

- `token` = `platform` → verified with `Razorpay:WebhookSecret` from configuration.
- `token` = an institution's `WebhookToken` → verified with that institution's stored webhook secret.

Handled events: `payment.captured` and `order.paid` → capture; `payment.failed` → `Failed` with the gateway's reason; `refund.processed` → `Refunded`. Unknown orders are logged and ignored. A signature mismatch returns `400`; an unexpected fault returns `500` on purpose, so Razorpay retries.

### What capture does

`PaymentService.CaptureAsync` is the single place money is recognised, whoever confirmed it. It is idempotent (returns early if already `Captured`), then:

- **Member fee** → `MemberPlan.PaidAmount += amount`, `DueAmount = max(0, DueAmount − amount)`.
- **Tenant subscription** → marks the `UserPackage` paid, then calls `AdminService.ApproveTenantRegistrationAsync` from a fresh DI scope. A paid subscription *is* an approval, so packages, add-ons, onboarding step and the approval email behave exactly as they do for an offline payment approved in the console. If activation throws, the money is still recorded and the console can retry — the failure is logged, not swallowed into the payer's face.
- Writes `PaymentCaptured` to the audit log.

---

## 4. UI

**Files:** `core/models/payment.models.ts` · `core/services/payment.service.ts` · `features/payments/*`

### Institution settings — `features/payments/payment-settings/`

Rendered inside the institution detail **Settings** tab. Three radio options (Offline only / UPI ID / Razorpay); the matching fields appear below. Secret inputs show *"Saved — leave blank to keep it"* once stored, because the API never sends secrets back. In Razorpay mode the generated **webhook URL** is shown with a copy button and the events to subscribe to.

### Member payment — `features/payments/collect-payment-dialog/`

Opened from *Pay online* on the member details fees card (staff **and** the member portal use the same component).

1. Enter an amount (defaults to the full outstanding dues).
2. `POST member-fees/{memberId}/initiate` returns the instruction.
3. **Razorpay mode** → `PaymentService.openRazorpayCheckout` lazy-loads `checkout.razorpay.com/v1/checkout.js`, opens the dialog, then posts the callback to `razorpay/verify`.
   **UPI mode** → shows the server-rendered QR (`QRCoder`, same helper the attendance QR uses), the VPA, the reference, a *Pay in UPI app* deep link on mobile, and a UTR field.
4. On success the dialog reloads member details so the dues reflect the payment.

The dialog branches on `instruction.mode`, never on stored config — which is what makes the mode switch free.

### Verification queue — `features/payments/payment-queue/`

Also on the Settings tab. Lists this institution's member payments newest-first with status pills; rows in `AwaitingVerification` get **Confirm** / **Reject** (reject asks for a reason). Gateway payments arrive already captured.

### Tenant *Pay now* — `features/auth/pending-approval/`

The card only appears when the platform gateway is configured **and** the tenant actually owes something (`finalApprovedAmount ?? totalCalculatedAmount > 0`), so trial and fully-discounted registrations never see it. On the server, "already paid" is decided by a captured `PaymentTransaction` for the package or an approved tenant — not by `UserPackage.PaymentStatus` alone, which registration used to stamp `Paid` before any money had arrived. Registration now records a paid plan as `PendingApproval`/`Pending` (`UserPackageService.SubscribeAsync`); free and trial plans still start settled.

`GET payments/platform/status` decides whether the card renders at all. When Lexora's gateway is off, the page keeps only the existing WhatsApp-slip route. Paying opens Razorpay, verifies, then re-reads the registration status — which by then is approved, so the existing redirect logic takes the tenant to their dashboard.

### Upgrade / renew / add-on — `features/subscriptions/`

After a tenant submits a renew, upgrade, or capacity add-on request, the pending banner / add-on row shows **both** paths when the platform gateway is on:

- **Pay online** → `POST payments/subscription/initiate` with that `userPackageId`, or `POST payments/addons/{id}/initiate`. Capture activates via `PackageSubscriptionService.ApproveSubscriptionRequestAsync` (with `ApproveLinkedAddons = false`) or `AddonService.ApproveAddonRequestAsync` — not the registration approval path, so the old package is retired correctly and unpaid add-ons are left alone.
- **Send Slip via WhatsApp** → unchanged offline route for SuperAdmin verification.

`PaymentPurpose.TenantAddon` and `PaymentTransaction.UserPackageAddonId` link add-on payments; plan-change amounts use the pending request's own prorated `AmountPaid`, not a fresh package price + every pending add-on.

---

## 5. Configuration

```jsonc
"Razorpay": {
  "Enabled": false,                 // false → tenants can only pay offline
  "KeyId": "...",                   // set via environment Razorpay__KeyId
  "KeySecret": "...",               // set via environment Razorpay__KeySecret
  "WebhookSecret": "...",           // set via environment Razorpay__WebhookSecret
  "Currency": "INR",
  "DisplayName": "Lexora",
  "PublicApiBaseUrl": "https://api.uniappx.in"   // used to build institution webhook URLs
}
```

`PublicApiBaseUrl` must be reachable from the internet, otherwise the webhook URL shown to institutions is useless. Institution credentials never live in configuration — they are entered in the UI and encrypted at rest.

**Data protection keys.** Secrets are encrypted with the ASP.NET data protection keyring. On a single server the default file-backed keyring is fine; if the app is scaled out or the keyring is lost, institutions must re-enter their credentials (`SecretProtector.Unprotect` logs and returns `null` rather than throwing).

### Test mode vs live mode

Razorpay serves both from the same host — only the key id differs (`rzp_test_…` / `rzp_live_…`), so the environment decides which credentials are allowed:

| Environment | Platform keys | Institution keys |
| --- | --- | --- |
| `Development`, `Local`, `Dev`, `QA`, `UAT` | test only | test only |
| `Production` | live only | live only |

`RazorpayKeys.DescribeMismatch` enforces this in three places: saving an institution account rejects the wrong key with a message naming the right prefix, `InitiateSubscriptionAsync` refuses to create an order and falls back to the offline route, and startup logs the active mode (or an error) so a misconfigured deploy is obvious in the log. A test key in production is the dangerous case — checkout would succeed, capture would clear the member's dues, and no money would ever arrive.

The mode is carried to the client as `isTestMode` on the platform status, the institution account, and the Razorpay instruction, so the settings screen, the collect dialog and the tenant *Pay now* card all show a **Test mode** badge instead of leaving anyone guessing which account they are on.

**Running the test flow locally:**

1. Razorpay dashboard → switch to *Test Mode* → Settings → API Keys → generate test keys.
2. Set them on the API rather than in a file: `dotnet user-secrets set "Razorpay:KeyId" "rzp_test_…"` and the same for `Razorpay:KeySecret`. `appsettings.Development.json` already has `Enabled: true` with placeholders.
3. Pay with the test card `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1111`. For UPI, `success@razorpay` succeeds and `failure@razorpay` fails.
4. Webhooks cannot reach `localhost`. Run a tunnel (`ngrok http https://localhost:7050`), set `Razorpay:PublicApiBaseUrl` to the tunnel URL, and register that webhook URL in the test-mode dashboard. Without a tunnel the checkout `verify` call still captures the payment — the webhook is the backup path, not the only one.

Test and live data are entirely separate on Razorpay's side: test orders, payments and webhook secrets do not exist in live mode, so an institution moving to live re-enters its keys and its webhook URL there.

---

## 6. Adding another provider later

The seam is `PaymentAccountMode` + `BuildInstructionAsync`. To add, say, Cashfree: add the enum value, add credential columns (or a JSON blob) to `PaymentAccount`, add a client alongside `RazorpayClient`, and add the branch in `BuildInstructionAsync` plus a webhook case. `PaymentTransaction`, the capture path, the ledger UI and the verification queue stay untouched, because nothing downstream of the instruction knows which provider produced it.

---

## 7. Test checklist

- [ ] Institution set to **UPI ID** → member sees QR + reference, submits UTR, staff confirm → dues drop by the amount
- [ ] Reject a UPI payment → status `Failed` with the reason, dues unchanged
- [ ] Same institution switched to **Razorpay** → the same *Pay online* button now opens checkout, with no code change
- [ ] Razorpay test payment → `razorpay/verify` captures, dues drop, ledger shows the payment id
- [ ] Replay the same `payment.captured` webhook → no double credit (unique `ProviderPaymentId`, idempotent capture)
- [ ] Tamper with the webhook body → `400`, transaction untouched
- [ ] Webhook for an unknown token → `400`; for an unknown order → logged and ignored
- [ ] Save gateway keys, reopen settings → secret fields show *Saved*, plain secrets never appear in the response
- [ ] `Razorpay:Enabled = false` → no *Pay now* on `/pending-approval`; offline WhatsApp route still works
- [ ] Tenant pays their subscription → package marked paid, tenant approved, onboarding step follows the usual `hasWorkspace` rule
- [ ] Partial payment (amount less than dues) → dues reduce by exactly that amount
- [ ] Member portal user pays their own fees → same dialog, no staff-only actions visible
- [ ] Library owner (not SuperAdmin) can confirm a UPI payment — needs `PaymentsUpdate` from the reseeded role map, so restart the API after deploying
- [ ] A user from institution A passes institution B's id to `GET payments` → gets nothing back
- [ ] Paste a `rzp_live_…` key into institution settings on a dev/UAT box → save is rejected with the "use your test key" message
- [ ] Paste a `rzp_test_…` key in production → save is rejected; the live site cannot be put into test mode
- [ ] Test keys configured → **Test mode** badge appears on payment settings, the collect dialog and the tenant *Pay now* card
- [ ] Register on a paid plan → the `UserPackage` sits at `PendingApproval`/`Pending`, and *Pay now* opens checkout instead of reporting "already paid"
- [ ] Register on the free trial → no *Pay now* card at all (nothing is owed)
- [ ] Pay a subscription, then reopen `/pending-approval` → *Pay now* is refused, because a captured transaction now exists for that package
- [ ] Submit a plan upgrade → pending banner shows **Pay online** and **Send Slip via WhatsApp**; online pay activates the new plan and retires the old one
- [ ] Submit a capacity add-on → row shows **Pay online** and **Send Slip**; online pay applies quota without touching other pending add-ons
- [ ] Online upgrade does not auto-approve an unpaid pending add-on (`ApproveLinkedAddons = false`)
- [ ] `Razorpay:Enabled = false` → subscriptions page keeps only WhatsApp; no Pay online buttons
