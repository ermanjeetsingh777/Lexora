# Customer Reviews & Suggestions — Implementation Workflow

End-to-end workflow for **Landing Page Customer Reviews, Rating Submission & SuperAdmin Moderation** across **SLMS_UI** (Angular) and **SLMS_API** (C# / .NET 10).

**Module ID:** M-19 · **Route:** `/` (Public Landing Section) & `/admin/tenant-approvals` (SuperAdmin Moderation Tab) · **Depends on:** M-18 Tenant & Subscription Approvals Console

---

## 1. Overview

Lexora provides a transparent customer review and suggestion system:
1. **Public Review Submission:** Any customer, library founder, administrator, or member can submit a review directly from the landing page.
2. **Review Details Collected:**
   - Rating (1 to 5 Stars with interactive hover selector)
   - Full Name (required)
   - Email Address (required; displayed on approved review cards to provide credibility)
   - Library / Organization Name (optional)
   - Role / Designation (e.g. "Library Owner", "Director", "Member", "Student") (optional)
   - Review Headline / Title (optional)
   - Feedback & Experience Comment (required)
   - Suggestions for Lexora improvement (optional; highlighted with a special suggestion badge)
3. **SuperAdmin Moderation Workflow:**
   - All submitted reviews start in `Status = "Pending"` (`IsApproved = false`) and are hidden from visitors until approved.
   - SuperAdmin reviews pending submissions in the **Tenant & Subscription Approvals Console** (`/admin/tenant-approvals` -> `Customer Reviews` tab).
   - SuperAdmin can:
     - **Approve**: 1-click approve -> status becomes `Approved` and appears immediately in the public landing page review grid.
     - **Reject**: Set status to `Rejected` with internal admin remarks.
     - **Delete**: Soft-delete undesirable or spam submissions.
     - **View Details**: Open modal to read full text, suggestion, reviewer details, and date.
4. **Public Landing Page Display:**
   - Displays live average rating (e.g., ⭐ 4.9/5 from verified library managers & members).
   - Shows approved reviews in modern glassmorphism cards with star ratings, reviewer full name, email address, organization/role badge, feedback quote, and suggestion callout.

---

## 2. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/customer-reviews` | Public / Anonymous | Submit a new customer review (starts in `Pending` status) |
| `GET` | `/api/v1/customer-reviews/public` | Public / Anonymous | Get all approved reviews (`Status == "Approved"`) for landing page display |
| `GET` | `/api/v1/customer-reviews?status={status}&search={search}` | SuperAdmin | List all reviews with optional status filter (`all`, `pending`, `approved`, `rejected`) |
| `POST` | `/api/v1/customer-reviews/{id}/approve` | SuperAdmin | Approve review and publish to landing page |
| `POST` | `/api/v1/customer-reviews/{id}/reject` | SuperAdmin | Reject review and hide from public |
| `DELETE` | `/api/v1/customer-reviews/{id}` | SuperAdmin | Soft-delete review |

---

## 3. Database Schema

### `CustomerReviews` Table
- `Id` (Guid, Primary Key)
- `FullName` (nvarchar(100), Required)
- `Email` (nvarchar(150), Required)
- `OrganizationName` (nvarchar(150), Nullable)
- `Role` (nvarchar(100), Nullable)
- `Rating` (int, 1-5, Required)
- `Title` (nvarchar(200), Nullable)
- `Comment` (nvarchar(2000), Required)
- `Suggestion` (nvarchar(2000), Nullable)
- `Status` (nvarchar(50), Default `'Pending'`)
- `IsApproved` (bit, Default `0`)
- `AdminRemarks` (nvarchar(1000), Nullable)
- `ApprovedByUserId` (nvarchar(450), Nullable)
- `ApprovedAtUtc` (datetime2, Nullable)
- `RejectedAtUtc` (datetime2, Nullable)
- `CreatedAtUtc` (datetime2, Default `GETUTCDATE()`)
- `UpdatedAtUtc` (datetime2, Nullable)
- `IsDeleted` (bit, Default `0`)

---

## 4. Angular UI Architecture

### Components & Services
- **Landing Page Component (`LandingHomePage`)**:
  - Route: `/`
  - Template: `SLMS_UI/src/app/features/landing/landing-home-page.html`
  - Logic: `SLMS_UI/src/app/features/landing/landing-home-page.ts`
  - Features:
    - Community Reviews & Ratings Section (`#reviews`)
    - Interactive Write Review Modal with 1-5 Star selector
    - Live approved reviews grid displaying Reviewer Name, Email, Stars, Feedback, and Suggestions
- **SuperAdmin Approvals Component (`TenantApprovalsComponent`)**:
  - Route: `/admin/tenant-approvals`
  - Tab: `Customer Reviews`
  - Metrics cards: Total Reviews, Pending Approval, Live on Landing, Rejected
  - Actions: 1-click Approve, Reject, Delete, and Full View Modal
- **Customer Review Service (`CustomerReviewService`)**:
  - Path: `SLMS_UI/src/app/core/services/customer-review.service.ts`
  - Endpoints: `submitReview`, `getPublicApprovedReviews`, `getAllReviews`, `approveReview`, `rejectReview`, `deleteReview`
