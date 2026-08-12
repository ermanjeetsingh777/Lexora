# Smart Library Management SaaS Platform
## Software Requirements Specification (SRS)

**Version:** 1.0  
**Date:** May 23, 2026  
**Status:** Active  
**Document Type:** Software Requirements Specification  
**Prepared By:** Technical Team  
**Target Audience:** Developers, QA Engineers, Technical Architects, DevOps Engineers  

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [System Architecture](#system-architecture)
4. [Technical Requirements](#technical-requirements)
5. [Database Design & Schema](#database-design--schema)
6. [API Specifications](#api-specifications)
7. [Frontend Requirements](#frontend-requirements)
8. [Backend Requirements](#backend-requirements)
9. [Integration Requirements](#integration-requirements)
10. [Security & Compliance](#security--compliance)
11. [Performance & Scalability](#performance--scalability)
12. [Testing Requirements](#testing-requirements)
13. [Deployment & DevOps](#deployment--devops)
14. [Appendices](#appendices)

---

## Introduction

### Purpose
This Software Requirements Specification (SRS) provides detailed technical specifications for the Smart Library Management SaaS Platform. It serves as the primary reference for development teams, QA engineers, and DevOps professionals during implementation, testing, and deployment phases.

### Scope
This document covers:
- System architecture and components
- Technical stack and technologies
- Database design and schema
- API specifications and endpoints
- Frontend and backend requirements
- Integration points and external services
- Security, compliance, and performance requirements
- Testing, deployment, and operational guidelines

### Document Audience
- Software Development Team
- QA & Testing Team
- DevOps & Infrastructure Team
- Technical Architects
- Project Managers
- System Administrators

### Definitions & Abbreviations
- **SaaS:** Software-as-a-Service
- **API:** Application Programming Interface
- **JWT:** JSON Web Token
- **RBAC:** Role-Based Access Control
- **CQRS:** Command Query Responsibility Segregation
- **ORM:** Object-Relational Mapping
- **DTO:** Data Transfer Object
- **REST:** Representational State Transfer
- **HTTPS:** Hypertext Transfer Protocol Secure
- **TLS:** Transport Layer Security
- **AES:** Advanced Encryption Standard
- **GUID:** Globally Unique Identifier
- **QR:** Quick Response
- **SMS:** Short Message Service
- **SMTP:** Simple Mail Transfer Protocol

---

## System Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer (Angular 21)                   │
│  ├── Web Browser (Chrome, Firefox, Safari, Edge)               │
│  ├── Mobile Browser (iOS Safari, Android Chrome)               │
│  └── Progressive Web App (PWA)                                 │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTPS / WSS (WebSocket)
┌──────────────▼──────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                  │
│  ├── SSL/TLS Termination                                       │
│  ├── Request Rate Limiting                                     │
│  ├── Request Validation & Routing                              │
│  └── CORS Configuration                                        │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                  ASP.NET Core 10 Web API Layer                  │
│  ├── REST Controllers                                          │
│  ├── Middleware & Pipeline                                     │
│  ├── Authentication/Authorization                              │
│  ├── CQRS Handlers (MediatR)                                   │
│  └── SignalR Hubs                                              │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│              Application Layer (Business Logic)                 │
│  ├── Features (Students, Seats, Attendance, etc.)              │
│  ├── Services & Abstractions                                   │
│  ├── FluentValidation Rules                                    │
│  ├── AutoMapper Profiles                                       │
│  └── Specifications & Queries                                  │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│              Infrastructure Layer (Data Access)                 │
│  ├── Entity Framework Core DbContext                           │
│  ├── Repositories (Generic & Specialized)                      │
│  ├── Unit of Work Pattern                                      │
│  ├── Database Migrations                                       │
│  └── Caching (Redis)                                           │
└──────────────┬──────────────────────────────────────────────────┘
               │
        ┌──────┴──────┬──────────┬──────────┐
        │             │          │          │
┌───────▼────┐ ┌─────▼──┐ ┌────▼─────┐ ┌─▼──────────┐
│   Database │ │ Cache  │ │ Message  │ │  Storage   │
│ (SQL/PG)   │ │(Redis) │ │ Queue    │ │ (AWS S3/   │
│            │ │        │ │(Hangfire)│ │  Azure)    │
└────────────┘ └────────┘ └──────────┘ └────────────┘
```

### Core System Components

#### Frontend
- **Framework:** Angular 21 with Standalone Components
- **UI Library:** Angular Material + Tailwind CSS
- **State Management:** Angular Signals
- **Charting:** ApexCharts
- **Build Tool:** Angular CLI

#### Backend
- **Framework:** ASP.NET Core 10
- **Language:** C#
- **Architecture:** Clean Architecture + CQRS
- **ORM:** Entity Framework Core 10
- **Validation:** FluentValidation
- **Mapping:** AutoMapper
- **Message Bus:** MediatR
- **Caching:** Redis
- **Real-time:** SignalR
- **Background Jobs:** Hangfire

#### Data Layer
- **Primary Database:** PostgreSQL / SQL Server
- **Cache:** Redis
- **Message Queue:** Hangfire (with SQL Server / PostgreSQL backend)

#### Infrastructure
- **Web Server:** IIS / Kestrel
- **Containerization:** Docker (future)
- **Orchestration:** Kubernetes (future)
- **Cloud:** Azure / AWS (future)

---

## System Architecture

### 3-Tier Architecture

#### 1. Presentation Layer (Client-Side)
**Location:** Angular 21 SPA (Single Page Application)

**Responsibilities:**
- Render user interface
- Capture user input
- Validate client-side inputs
- Display data and notifications
- Handle user interactions
- Support offline functionality (PWA)

**Key Technologies:**
- Angular 21 Standalone Components
- Angular Material for UI components
- Tailwind CSS for styling
- Angular Signals for state management
- RxJS for reactive programming
- ApexCharts for data visualization

#### 2. Application Layer (Server-Side)
**Location:** ASP.NET Core 10 REST API

**Responsibilities:**
- Process HTTP requests
- Execute business logic
- Manage authentication/authorization
- Validate data
- Transform data (DTO mapping)
- Send HTTP responses
- Manage real-time updates (SignalR)
- Handle background jobs

**Key Components:**
- Controllers & Endpoints
- CQRS Commands & Queries
- Services & Application Logic
- Validators & Specifications
- AutoMapper Profiles
- Middleware & Pipelines
- SignalR Hubs
- Background Job Handlers

#### 3. Data Layer (Persistence)
**Location:** Database, Cache, File Storage

**Responsibilities:**
- Store and retrieve data
- Maintain data integrity
- Cache frequently accessed data
- Handle transactions
- Support data migrations
- Audit data changes

**Key Components:**
- Entity Framework Core DbContext
- Repositories & Unit of Work
- Database migrations
- Redis Cache
- File Storage (local/cloud)
- Database indexes
- Constraints & relationships

### Multi-Tenant Architecture

#### Tenant Isolation Strategy

**Data Isolation (Database-level):**
```
Single Database with Tenant ID Partitioning
├── Institution (TenantId)
│   ├── Branch (TenantId, BranchId)
│   │   ├── Library (TenantId, BranchId, LibraryId)
│   │   │   ├── Seats (TenantId, BranchId, LibraryId, SeatId)
│   │   │   ├── Members (TenantId, BranchId, LibraryId)
│   │   │   └── Attendance (TenantId, BranchId, LibraryId)
│   │   └── Staff (TenantId, BranchId)
│   └── Subscription (TenantId)
```

**Query Filtering:**
```csharp
// All queries automatically filter by TenantId
var members = _context.Members
    .Where(m => m.TenantId == currentUserTenantId)
    .ToListAsync();
```

**API Endpoint Structure:**
```
GET  /api/v1/institutions/{institutionId}/branches/{branchId}/members
GET  /api/v1/institutions/{institutionId}/branches/{branchId}/seats
POST /api/v1/institutions/{institutionId}/branches/{branchId}/attendance
```

### Feature-Based Modular Structure

```
LMS_Application/
├── Features/
│   ├── Authentication/
│   │   ├── Commands/
│   │   │   ├── LoginCommand.cs
│   │   │   ├── RegisterCommand.cs
│   │   │   └── RefreshTokenCommand.cs
│   │   ├── Queries/
│   │   │   └── GetCurrentUserQuery.cs
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   └── Validators/
│   │
│   ├── Students/
│   │   ├── Commands/
│   │   │   ├── CreateStudentCommand.cs
│   │   │   ├── UpdateStudentCommand.cs
│   │   │   ├── TransferStudentCommand.cs
│   │   │   └── ChangeStudentStatusCommand.cs
│   │   ├── Queries/
│   │   │   ├── GetStudentQuery.cs
│   │   │   ├── ListStudentsQuery.cs
│   │   │   └── GetStudentAttendanceQuery.cs
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   ├── Validators/
│   │   └── Events/
│   │
│   ├── Seats/
│   │   ├── Commands/
│   │   │   ├── AllocateSeatCommand.cs
│   │   │   ├── TransferSeatCommand.cs
│   │   │   ├── CreateSeatsCommand.cs
│   │   │   └── UpdateSeatStatusCommand.cs
│   │   ├── Queries/
│   │   │   ├── GetAvailableSeatsQuery.cs
│   │   │   ├── GetSeatOccupancyQuery.cs
│   │   │   └── GetSeatDetailQuery.cs
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   ├── Validators/
│   │   └── Events/
│   │
│   ├── Attendance/
│   │   ├── Commands/
│   │   │   ├── MarkAttendanceCommand.cs
│   │   │   ├── BulkAttendanceCommand.cs
│   │   │   └── CorrectAttendanceCommand.cs
│   │   ├── Queries/
│   │   │   ├── GetAttendanceReportQuery.cs
│   │   │   └── GetStudentAttendanceQuery.cs
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   └── Validators/
│   │
│   ├── Billing/
│   │   ├── Commands/
│   │   │   ├── CreateSubscriptionCommand.cs
│   │   │   ├── ProcessPaymentCommand.cs
│   │   │   └── ApplyDiscountCommand.cs
│   │   ├── Queries/
│   │   │   ├── GetBillingReportQuery.cs
│   │   │   └── GetSubscriptionDetailsQuery.cs
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   └── Validators/
│   │
│   ├── Notifications/
│   │   ├── Commands/
│   │   │   ├── SendNotificationCommand.cs
│   │   │   └── ScheduleNotificationCommand.cs
│   │   ├── Queries/
│   │   ├── Handlers/
│   │   └── DTOs/
│   │
│   └── Reports/
│       ├── Queries/
│       │   ├── GetDashboardAnalyticsQuery.cs
│       │   ├── GetRevenueReportQuery.cs
│       │   └── GetOccupancyReportQuery.cs
│       ├── Handlers/
│       └── DTOs/
│
├── Common/
│   ├── Behaviors/
│   │   ├── ValidationBehavior.cs
│   │   ├── LoggingBehavior.cs
│   │   └── CachingBehavior.cs
│   ├── Exceptions/
│   │   ├── NotFoundException.cs
│   │   ├── UnauthorizedException.cs
│   │   └── ValidationException.cs
│   ├── Mappings/
│   │   └── AutoMapperProfiles.cs
│   ├── Interfaces/
│   │   ├── ICommand.cs
│   │   ├── IQuery.cs
│   │   ├── ICommandHandler.cs
│   │   └── IQueryHandler.cs
│   └── Constants/
│
└── DependencyInjection.cs
```

---

## Technical Requirements

### Backend Technology Stack

#### Core Framework
- **ASP.NET Core 10** (.NET 10)
  - REST API development
  - Middleware & pipelines
  - Dependency injection
  - Configuration management

#### Data Access
- **Entity Framework Core 10**
  - ORM for database operations
  - LINQ queries
  - Migrations & schema management
  - Lazy loading & eager loading

- **Database Options:**
  - **PostgreSQL** (Recommended for cloud)
  - **SQL Server** (Recommended for Windows)

#### Application Patterns
- **CQRS (Command Query Responsibility Segregation)**
  - Separate read and write models
  - MediatR for command/query dispatching
  - Improved scalability and performance

- **Repository Pattern**
  - Abstract data access logic
  - Generic repository implementation
  - Specialized repositories for complex queries

- **Unit of Work Pattern**
  - Aggregate transactions
  - Maintain consistency
  - Coordinate multiple repositories

#### Validation & Mapping
- **FluentValidation**
  - Rule-based validation
  - Fluent API for rule definition
  - Custom validators
  - Cross-field validation

- **AutoMapper**
  - Object-to-object mapping
  - DTOs transformation
  - Convention-based mapping

#### Logging & Monitoring
- **Serilog**
  - Structured logging
  - Multiple sinks (Console, File, Database)
  - Log levels and filtering
  - Correlation IDs

#### Caching
- **Redis**
  - In-memory caching
  - Session storage
  - Cache invalidation strategies
  - Distributed caching

#### Real-Time Communication
- **SignalR**
  - WebSocket connections
  - Real-time notifications
  - Live updates
  - Group broadcasting

#### Background Job Processing
- **Hangfire**
  - Background job scheduling
  - Recurring jobs
  - Job retry logic
  - Job monitoring dashboard

#### Authentication & Security
- **ASP.NET Core Identity**
  - User management
  - Password hashing
  - Role management

- **JWT (JSON Web Tokens)**
  - Stateless authentication
  - Token expiration
  - Refresh token mechanism

- **OAuth 2.0 & OpenID Connect**
  - Third-party authentication
  - Social login integration

#### Testing Framework
- **xUnit**
  - Unit testing framework
  - Parallel test execution
  - Data-driven tests

- **Moq**
  - Mocking framework
  - Mock object creation
  - Behavior verification

- **Fluent Assertions**
  - Readable assertions
  - Better test failure messages

#### API Documentation
- **Swagger/OpenAPI**
  - Interactive API documentation
  - Schema definition
  - Code generation

### Frontend Technology Stack

#### Core Framework
- **Angular 21**
  - Component-based architecture
  - Standalone components
  - Built-in dependency injection
  - Zone-less change detection

#### Styling & UI
- **Tailwind CSS 3**
  - Utility-first CSS framework
  - Responsive design
  - Dark mode support
  - Customization

- **Angular Material**
  - Pre-built UI components
  - Material Design compliance
  - Accessibility features
  - CDK utilities

#### State Management
- **Angular Signals**
  - Fine-grained reactivity
  - Automatic dependency tracking
  - Performance optimization
  - Zone-less change detection

#### Forms
- **Signal Forms**
  - Type-safe forms
  - Reactive forms API
  - Built-in validation
  - Custom validators

- **Reactive Forms**
  - Dynamic form creation
  - Async validators
  - Form state management

#### Data Visualization
- **ApexCharts**
  - Interactive charts
  - Multiple chart types
  - Real-time updates
  - Export functionality

#### HTTP Client
- **HttpClient**
  - HTTP communication
  - Interceptors for cross-cutting concerns
  - Error handling
  - Request/response transformation

#### Reactive Programming
- **RxJS**
  - Observable streams
  - Operators for data transformation
  - Subject for event broadcasting
  - Memory leak prevention

#### Testing Framework
- **Jasmine**
  - Unit testing framework
  - BDD-style syntax
  - Spy functions

- **Karma**
  - Test runner
  - Multiple browser support
  - CI/CD integration

- **Cypress**
  - End-to-end testing
  - Visual regression testing
  - Real browser testing

#### Build & Bundling
- **Angular CLI**
  - Project scaffolding
  - Development server
  - Production build optimization
  - Lazy loading support

#### Utilities
- **TypeScript**
  - Type safety
  - Object-oriented programming
  - Interface definitions

- **Lodash**
  - Utility functions
  - Array & object manipulation
  - Performance optimization

### Database Technology

#### Primary Database
- **PostgreSQL or SQL Server**
  - Relational data storage
  - ACID compliance
  - Transaction support
  - Complex query support

#### Database Design Principles
- **Normalized Schema:** 3rd Normal Form (3NF)
- **GUID Primary Keys:** All tables use GUID as PK
- **Audit Fields:** CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, DeletedAt
- **Soft Delete:** IsDeleted boolean flag
- **Indexing:** Indexes on frequently queried columns
- **Constraints:** Foreign key, unique, check constraints
- **Multi-Tenancy:** TenantId in all tenant-aware tables

#### Performance Optimization
- **Indexes:**
  - Composite indexes for common queries
  - Covering indexes where possible
  - Regular index maintenance

- **Query Optimization:**
  - Efficient LINQ-to-SQL translation
  - Batch operations for bulk inserts/updates
  - Connection pooling

- **Data Archiving:**
  - Archive old attendance records
  - Purge old audit logs
  - Maintain history tables

### Cache Strategy

#### Redis Configuration
```
- Connection pooling: Enabled
- Expiration Policy: LRU (Least Recently Used)
- Memory Limit: 2GB (configurable)
- Persistence: RDB snapshots + AOF
- Replication: Master-Slave setup
- Cluster: Not required for Phase 1
```

#### Caching Layers

**1. Application-Level Cache:**
- User session data (15 minutes)
- Institution configuration (1 hour)
- Reference data (Branch, Library, Roles) (24 hours)
- Query results (5 minutes)

**2. Database Query Cache:**
- Frequently accessed entities
- Dashboard data (1 hour)
- Reports cache (6 hours)

**3. Cache Invalidation Strategy:**
- TTL-based expiration
- Event-based invalidation
- Manual cache clearing on updates
- Cache warming on application startup

---

## Database Design & Schema

### Core Entity Relationships

#### Multi-Tenant Hierarchy
```
Institution (TenantId)
├── Branch (BranchId)
│   ├── Library (LibraryId)
│   │   ├── Floor (FloorId)
│   │   │   └── Section (SectionId)
│   │   │       └── Seat (SeatId)
│   │   ├── Member (MemberId)
│   │   ├── Subscription (SubscriptionId)
│   │   ├── Attendance (AttendanceId)
│   │   └── Book (BookId)
│   ├── User (UserId) - Staff
│   └── Role (RoleId) - Branch-level roles
├── User (UserId) - Institution-level admins
├── Role (RoleId) - Institution-level roles
└── Settings (SettingId)
```

### Core Tables Definition

#### 1. Institutions Table
```sql
CREATE TABLE Institutions (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(1000),
    Type NVARCHAR(50), -- School, College, Library, CoachingCenter
    Email NVARCHAR(255),
    Phone NVARCHAR(20),
    WebsiteUrl NVARCHAR(500),
    Logo NVARCHAR(500),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(100),
    PostalCode NVARCHAR(20),
    Country NVARCHAR(100),
    TimeZone NVARCHAR(50),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    UNIQUE(TenantId, Email)
);
```

#### 2. Branches Table
```sql
CREATE TABLE Branches (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    InstitutionId GUID NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(1000),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    OperatingHoursStart TIME,
    OperatingHoursEnd TIME,
    Capacity INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (InstitutionId) REFERENCES Institutions(Id),
    INDEX IDX_Branch_TenantInstitution (TenantId, InstitutionId)
);
```

#### 3. Libraries Table
```sql
CREATE TABLE Libraries (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    BranchId GUID NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(1000),
    Floor INT,
    Capacity INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    INDEX IDX_Library_TenantBranch (TenantId, BranchId)
);
```

#### 4. Seats Table
```sql
CREATE TABLE Seats (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    LibraryId GUID NOT NULL,
    SeatNumber NVARCHAR(50) NOT NULL,
    SectionId GUID,
    SeatType NVARCHAR(50), -- Standard, Premium, Accessibility
    Status NVARCHAR(50), -- Available, Occupied, Maintenance, Reserved
    CurrentMemberId GUID,
    MaintenanceNotes NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (LibraryId) REFERENCES Libraries(Id),
    UNIQUE(TenantId, LibraryId, SeatNumber),
    INDEX IDX_Seat_Status (Status),
    INDEX IDX_Seat_CurrentMember (CurrentMemberId)
);
```

#### 5. Members Table
```sql
CREATE TABLE Members (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    LibraryId GUID NOT NULL,
    UserId GUID,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255),
    PhoneNumber NVARCHAR(20),
    DateOfBirth DATE,
    Gender NVARCHAR(20),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    IdentificationNumber NVARCHAR(50),
    ProfileImageUrl NVARCHAR(500),
    Status NVARCHAR(50), -- Active, Inactive, Suspended
    JoinDate DATETIME2 DEFAULT GETUTCDATE(),
    CurrentSeatId GUID,
    CurrentShift NVARCHAR(50), -- Morning, Afternoon, Evening, Night
    SubscriptionId GUID,
    TotalFeesOwed DECIMAL(10, 2) DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (LibraryId) REFERENCES Libraries(Id),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (CurrentSeatId) REFERENCES Seats(Id),
    FOREIGN KEY (SubscriptionId) REFERENCES Subscriptions(Id),
    INDEX IDX_Member_TenantLibrary (TenantId, LibraryId),
    INDEX IDX_Member_Status (Status),
    INDEX IDX_Member_Email (Email)
);
```

#### 6. Attendance Table
```sql
CREATE TABLE Attendance (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    MemberId GUID NOT NULL,
    SeatId GUID,
    CheckInTime DATETIME2 NOT NULL,
    CheckOutTime DATETIME2,
    Duration INT, -- Minutes
    Shift NVARCHAR(50),
    AttendanceStatus NVARCHAR(50), -- Present, Absent, Late, PartialDay
    Remarks NVARCHAR(500),
    QRCodeScanned BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    FOREIGN KEY (SeatId) REFERENCES Seats(Id),
    INDEX IDX_Attendance_Member (MemberId, CheckInTime),
    INDEX IDX_Attendance_Seat (SeatId, CheckInTime)
);
```

#### 7. Subscriptions Table
```sql
CREATE TABLE Subscriptions (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    MemberId GUID NOT NULL,
    SubscriptionPlanId GUID NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    RenewalDate DATE,
    Status NVARCHAR(50), -- Active, Expired, Canceled, Suspended
    PaymentStatus NVARCHAR(50), -- Paid, Pending, Failed, PartiallyPaid
    Amount DECIMAL(10, 2) NOT NULL,
    PaidAmount DECIMAL(10, 2) DEFAULT 0,
    AutoRenewal BIT DEFAULT 1,
    GracePeriodDays INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (MemberId) REFERENCES Members(Id),
    FOREIGN KEY (SubscriptionPlanId) REFERENCES SubscriptionPlans(Id),
    INDEX IDX_Subscription_Member (MemberId),
    INDEX IDX_Subscription_Status (Status)
);
```

#### 8. Users Table
```sql
CREATE TABLE Users (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    Username NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(MAX),
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    ProfileImageUrl NVARCHAR(500),
    IsEmailVerified BIT DEFAULT 0,
    IsPhoneVerified BIT DEFAULT 0,
    LastLoginAt DATETIME2,
    Status NVARCHAR(50), -- Active, Inactive, Locked
    TwoFactorEnabled BIT DEFAULT 0,
    PreferredLanguage NVARCHAR(10) DEFAULT 'en',
    TimeZone NVARCHAR(50),
    PrefersDarkMode BIT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    UNIQUE(TenantId, Email),
    UNIQUE(TenantId, Username),
    INDEX IDX_User_Status (Status)
);
```

#### 9. Roles Table
```sql
CREATE TABLE Roles (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    Type NVARCHAR(50), -- System, Institutional, Custom
    Priority INT,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    UNIQUE(TenantId, Name),
    INDEX IDX_Role_Type (Type)
);
```

#### 10. Permissions Table
```sql
CREATE TABLE Permissions (
    Id GUID PRIMARY KEY,
    TenantId GUID,
    Name NVARCHAR(100) NOT NULL,
    Module NVARCHAR(100),
    Action NVARCHAR(50), -- Create, Read, Update, Delete
    Description NVARCHAR(500),
    IsSystemPermission BIT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UNIQUE(Module, Action)
);
```

#### 11. RolePermissions Table
```sql
CREATE TABLE RolePermissions (
    Id GUID PRIMARY KEY,
    RoleId GUID NOT NULL,
    PermissionId GUID NOT NULL,
    IsGranted BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE,
    UNIQUE(RoleId, PermissionId)
);
```

#### 12. UserRoles Table
```sql
CREATE TABLE UserRoles (
    Id GUID PRIMARY KEY,
    UserId GUID NOT NULL,
    RoleId GUID NOT NULL,
    AssignedAt DATETIME2 DEFAULT GETUTCDATE(),
    AssignedBy GUID,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    UNIQUE(UserId, RoleId),
    INDEX IDX_UserRole_User (UserId)
);
```

#### 13. AuditLogs Table
```sql
CREATE TABLE AuditLogs (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    UserId GUID,
    Action NVARCHAR(100),
    Module NVARCHAR(100),
    EntityType NVARCHAR(100),
    EntityId GUID,
    OldValues NVARCHAR(MAX),
    NewValues NVARCHAR(MAX),
    IPAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    INDEX IDX_AuditLog_Tenant (TenantId),
    INDEX IDX_AuditLog_User (UserId),
    INDEX IDX_AuditLog_Date (CreatedAt)
);
```

#### 14. Notifications Table
```sql
CREATE TABLE Notifications (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    UserId GUID NOT NULL,
    Title NVARCHAR(255),
    Message NVARCHAR(MAX),
    NotificationType NVARCHAR(50), -- Email, SMS, Push, InApp
    IsRead BIT DEFAULT 0,
    ReadAt DATETIME2,
    SendAt DATETIME2,
    SentAt DATETIME2,
    FailureReason NVARCHAR(500),
    DeliveryStatus NVARCHAR(50), -- Pending, Sent, Failed, Delivered
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    INDEX IDX_Notification_User (UserId),
    INDEX IDX_Notification_Status (DeliveryStatus)
);
```

#### 15. SubscriptionPlans Table
```sql
CREATE TABLE SubscriptionPlans (
    Id GUID PRIMARY KEY,
    TenantId GUID NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    BillingCycle NVARCHAR(50), -- Monthly, Quarterly, Annually
    Price DECIMAL(10, 2) NOT NULL,
    MaxMembers INT,
    MaxSeats INT,
    MaxBranches INT,
    Features NVARCHAR(MAX), -- JSON
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy GUID,
    UpdatedAt DATETIME2,
    UpdatedBy GUID,
    FOREIGN KEY (TenantId) REFERENCES Institutions(Id),
    INDEX IDX_SubscriptionPlan_Tenant (TenantId)
);
```

### Database Indexes Strategy

```sql
-- Performance Critical Indexes
CREATE INDEX IDX_Members_TenantLibrary ON Members(TenantId, LibraryId);
CREATE INDEX IDX_Attendance_MemberDate ON Attendance(MemberId, CheckInTime);
CREATE INDEX IDX_Seats_LibraryStatus ON Seats(LibraryId, Status);
CREATE INDEX IDX_Subscriptions_MemberStatus ON Subscriptions(MemberId, Status);
CREATE INDEX IDX_Notifications_UserRead ON Notifications(UserId, IsRead);

-- Full-Text Search Indexes (Future)
CREATE FULLTEXT INDEX ON Members(FirstName, LastName, Email);
CREATE FULLTEXT INDEX ON Books(Title, Author, Description);
```

---

## API Specifications

### API Design Principles

1. **RESTful Architecture**
   - Resource-based endpoints
   - HTTP methods (GET, POST, PUT, DELETE, PATCH)
   - Stateless communication
   - Hypermedia links (HATEOAS)

2. **Versioning Strategy**
   - URL-based versioning: `/api/v1/`
   - Backward compatibility maintained
   - New versions for breaking changes

3. **Response Format**
   - JSON for all responses
   - Consistent response wrapper
   - Standardized error handling
   - Pagination metadata

4. **Authentication**
   - JWT Bearer tokens in Authorization header
   - Token expiration: 24 hours
   - Refresh token: 30 days
   - OTP for sensitive operations

### API Response Wrapper

```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T Data { get; set; }
    public string Message { get; set; }
    public List<string> Errors { get; set; }
    public ApiMetadata Metadata { get; set; }
}

public class ApiMetadata
{
    public int StatusCode { get; set; }
    public string TraceId { get; set; }
    public DateTime Timestamp { get; set; }
    public PaginationMetadata Pagination { get; set; }
}

public class PaginationMetadata
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalRecords { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}
```

### Core API Endpoints

#### Authentication Endpoints
```
POST   /api/v1/auth/register                 - User registration
POST   /api/v1/auth/login                    - User login
POST   /api/v1/auth/refresh-token            - Refresh access token
POST   /api/v1/auth/logout                   - User logout
POST   /api/v1/auth/send-otp                 - Send OTP
POST   /api/v1/auth/verify-otp               - Verify OTP
POST   /api/v1/auth/forgot-password          - Request password reset
POST   /api/v1/auth/reset-password           - Reset password
GET    /api/v1/auth/current-user             - Get current user info
POST   /api/v1/auth/enable-2fa               - Enable 2FA
POST   /api/v1/auth/disable-2fa              - Disable 2FA
```

#### Institution Endpoints
```
GET    /api/v1/institutions                  - List all institutions
POST   /api/v1/institutions                  - Create institution
GET    /api/v1/institutions/{id}             - Get institution details
PUT    /api/v1/institutions/{id}             - Update institution
DELETE /api/v1/institutions/{id}             - Delete institution (soft)
GET    /api/v1/institutions/{id}/analytics   - Get institution analytics
```

#### Branch Endpoints
```
GET    /api/v1/institutions/{instId}/branches                     - List branches
POST   /api/v1/institutions/{instId}/branches                     - Create branch
GET    /api/v1/institutions/{instId}/branches/{branchId}          - Get branch
PUT    /api/v1/institutions/{instId}/branches/{branchId}          - Update branch
DELETE /api/v1/institutions/{instId}/branches/{branchId}          - Delete branch
GET    /api/v1/institutions/{instId}/branches/{branchId}/analytics - Branch analytics
```

#### Library Endpoints
```
GET    /api/v1/institutions/{instId}/branches/{branchId}/libraries                  - List libraries
POST   /api/v1/institutions/{instId}/branches/{branchId}/libraries                  - Create library
GET    /api/v1/institutions/{instId}/branches/{branchId}/libraries/{libId}          - Get library
PUT    /api/v1/institutions/{instId}/branches/{branchId}/libraries/{libId}          - Update library
DELETE /api/v1/institutions/{instId}/branches/{branchId}/libraries/{libId}          - Delete library
GET    /api/v1/institutions/{instId}/branches/{branchId}/libraries/{libId}/seats    - List seats
```

#### Member Endpoints
```
GET    /api/v1/institutions/{instId}/branches/{branchId}/members                    - List members
POST   /api/v1/institutions/{instId}/branches/{branchId}/members                    - Create member
GET    /api/v1/institutions/{instId}/branches/{branchId}/members/{memberId}         - Get member
PUT    /api/v1/institutions/{instId}/branches/{branchId}/members/{memberId}         - Update member
DELETE /api/v1/institutions/{instId}/branches/{branchId}/members/{memberId}         - Delete member
POST   /api/v1/institutions/{instId}/branches/{branchId}/members/{memberId}/transfer - Transfer member
POST   /api/v1/institutions/{instId}/branches/{branchId}/members/{memberId}/change-status - Change status
GET    /api/v1/institutions/{instId}/branches/{branchId}/members/search             - Search members
```

#### Seat Endpoints
```
GET    /api/v1/institutions/{instId}/branches/{branchId}/seats                      - List all seats
POST   /api/v1/institutions/{instId}/branches/{branchId}/seats                      - Create seats (bulk)
GET    /api/v1/institutions/{instId}/branches/{branchId}/seats/{seatId}             - Get seat details
PUT    /api/v1/institutions/{instId}/branches/{branchId}/seats/{seatId}             - Update seat
DELETE /api/v1/institutions/{instId}/branches/{branchId}/seats/{seatId}             - Delete seat
POST   /api/v1/institutions/{instId}/branches/{branchId}/seats/allocate             - Allocate seat
POST   /api/v1/institutions/{instId}/branches/{branchId}/seats/transfer             - Transfer seat
GET    /api/v1/institutions/{instId}/branches/{branchId}/seats/available            - Get available seats
GET    /api/v1/institutions/{instId}/branches/{branchId}/seats/occupancy            - Get occupancy info
```

#### Attendance Endpoints
```
GET    /api/v1/institutions/{instId}/attendance                   - List attendance
POST   /api/v1/institutions/{instId}/attendance/check-in           - Member check-in
POST   /api/v1/institutions/{instId}/attendance/check-out          - Member check-out
POST   /api/v1/institutions/{instId}/attendance/qr-scan            - QR code scan
GET    /api/v1/institutions/{instId}/attendance/{memberId}         - Member attendance
POST   /api/v1/institutions/{instId}/attendance/bulk-upload        - Bulk upload
GET    /api/v1/institutions/{instId}/attendance/report             - Attendance report
```

#### Billing Endpoints
```
GET    /api/v1/institutions/{instId}/subscriptions                            - List subscriptions
POST   /api/v1/institutions/{instId}/subscriptions                            - Create subscription
GET    /api/v1/institutions/{instId}/subscriptions/{subId}                    - Get subscription
PUT    /api/v1/institutions/{instId}/subscriptions/{subId}                    - Update subscription
POST   /api/v1/institutions/{instId}/subscriptions/{subId}/renew              - Renew subscription
POST   /api/v1/institutions/{instId}/payments                                 - Process payment
GET    /api/v1/institutions/{instId}/payments/{paymentId}                     - Get payment
GET    /api/v1/institutions/{instId}/billing-report                           - Billing report
POST   /api/v1/institutions/{instId}/subscriptions/{subId}/apply-discount     - Apply discount
```

#### Analytics Endpoints
```
GET    /api/v1/institutions/{instId}/analytics/dashboard            - Dashboard metrics
GET    /api/v1/institutions/{instId}/analytics/revenue              - Revenue analytics
GET    /api/v1/institutions/{instId}/analytics/attendance           - Attendance analytics
GET    /api/v1/institutions/{instId}/analytics/occupancy            - Occupancy analytics
GET    /api/v1/institutions/{instId}/analytics/member-growth        - Member growth
GET    /api/v1/institutions/{instId}/analytics/reports              - Custom reports
```

#### Notification Endpoints
```
GET    /api/v1/notifications                              - List user notifications
GET    /api/v1/notifications/{notifId}                    - Get notification
PUT    /api/v1/notifications/{notifId}/mark-as-read       - Mark as read
DELETE /api/v1/notifications/{notifId}                    - Delete notification
POST   /api/v1/notifications/mark-all-as-read             - Mark all as read
GET    /api/v1/notifications/preferences                  - Get preferences
PUT    /api/v1/notifications/preferences                  - Update preferences
```

#### System Admin Endpoints
```
GET    /api/v1/admin/users                                - List users
POST   /api/v1/admin/users                                - Create user
GET    /api/v1/admin/users/{userId}                       - Get user
PUT    /api/v1/admin/users/{userId}                       - Update user
DELETE /api/v1/admin/users/{userId}                       - Delete user
POST   /api/v1/admin/users/{userId}/roles                 - Assign role
GET    /api/v1/admin/roles                                - List roles
POST   /api/v1/admin/roles                                - Create role
PUT    /api/v1/admin/roles/{roleId}                       - Update role
GET    /api/v1/admin/permissions                          - List permissions
GET    /api/v1/admin/audit-logs                           - View audit logs
POST   /api/v1/admin/backup                               - Trigger backup
GET    /api/v1/admin/system-health                        - System health check
```

### Request/Response Examples

#### POST /api/v1/institutions/{instId}/members

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1-234-567-8900",
  "dateOfBirth": "2000-01-15",
  "gender": "M",
  "address": "123 Main St",
  "city": "New York",
  "identificationNumber": "ID123456",
  "shift": "Morning"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "status": "Active",
    "joinDate": "2026-05-23T10:30:00Z",
    "currentShift": "Morning"
  },
  "message": "Member created successfully",
  "metadata": {
    "statusCode": 201,
    "traceId": "0HMVJ8Q1234AB:00000001",
    "timestamp": "2026-05-23T10:30:00Z"
  }
}
```

---

## Frontend Requirements

### Angular Component Architecture

#### Core Directory Structure
```
src/app/
├── core/                          # Core services, guards, interceptors
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── notification.service.ts
│   │   └── storage.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── role.guard.ts
│   │   └── unsaved-changes.guard.ts
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   ├── error.interceptor.ts
│   │   └── loading.interceptor.ts
│   └── models/
│       ├── auth.model.ts
│       ├── user.model.ts
│       └── api.model.ts
│
├── shared/                        # Shared components, pipes, directives
│   ├── components/
│   │   ├── sidebar/
│   │   ├── navbar/
│   │   ├── button/
│   │   ├── modal/
│   │   ├── table/
│   │   ├── card/
│   │   └── loading-skeleton/
│   ├── directives/
│   │   ├── has-permission.directive.ts
│   │   └── highlight.directive.ts
│   ├── pipes/
│   │   ├── currency.pipe.ts
│   │   └── status.pipe.ts
│   └── utils/
│       ├── validators.ts
│       └── helpers.ts
│
├── features/                      # Feature modules
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── components/
│   │   │   └── 2fa-dialog/
│   │   ├── services/
│   │   ├── auth.routes.ts
│   │   └── auth.module.ts (if needed)
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   │   ├── kpi-card/
│   │   │   ├── revenue-chart/
│   │   │   ├── occupancy-chart/
│   │   │   └── attendance-chart/
│   │   ├── services/
│   │   └── dashboard.routes.ts
│   │
│   ├── students/
│   │   ├── pages/
│   │   ��   ├── student-list/
│   │   │   ├── student-detail/
│   │   │   └── student-form/
│   │   ├── components/
│   │   │   ├── student-table/
│   │   │   ├── student-filter/
│   │   │   └── student-card/
│   │   ├── services/
│   │   │   └── student.service.ts
│   │   ├── store/
│   │   │   └── student.signals.ts
│   │   └── students.routes.ts
│   │
│   ├── seats/
│   │   ├── pages/
│   │   │   ├── seat-layout/
│   │   │   ├── seat-allocation/
│   │   │   └── seat-transfer/
│   │   ├── components/
│   │   │   ├── seat-grid/
│   │   │   ├── seat-legend/
│   │   │   └── allocation-dialog/
│   │   ├── services/
│   │   │   └── seat.service.ts
│   │   ├── store/
│   │   │   └── seat.signals.ts
│   │   └── seats.routes.ts
│   │
│   ├── attendance/
│   │   ├── pages/
│   │   │   ├── check-in/
│   │   │   ├── attendance-report/
│   │   │   └── attendance-calendar/
│   │   ├── components/
│   │   │   ├── qr-scanner/
│   │   │   ├── attendance-table/
│   │   │   └── check-in-success/
│   │   ├── services/
│   │   │   └── attendance.service.ts
│   │   ├── store/
│   │   │   └── attendance.signals.ts
│   │   └── attendance.routes.ts
│   │
│   ├── billing/
│   │   ├── pages/
│   │   │   ├── subscriptions/
│   │   │   ├── billing-history/
│   │   │   └── payment-form/
│   │   ├── components/
│   │   │   ├── subscription-card/
│   │   │   ├── payment-form/
│   │   │   └── invoice-viewer/
│   │   ├── services/
│   │   │   └── billing.service.ts
│   │   └── billing.routes.ts
│   │
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── user-management/
│   │   │   ├── role-management/
│   │   │   ├── system-settings/
│   │   │   └── audit-logs/
│   │   ├── components/
│   │   │   ├── user-table/
│   │   │   ├── role-form/
│   │   │   └── settings-panel/
│   │   ├── services/
│   │   │   └── admin.service.ts
│   │   └── admin.routes.ts
│   │
│   └── reports/
│       ├── pages/
│       │   ├── revenue-report/
│       │   ├── occupancy-report/
│       │   └── attendance-report/
│       ├── components/
│       │   ├── report-generator/
│       │   └── export-options/
│       ├── services/
│       │   └── report.service.ts
│       └── reports.routes.ts
│
├── layouts/                       # Layout components
│   ├── main-layout/
│   ├── admin-layout/
│   └── auth-layout/
│
├── store/                         # Global state (Signals)
│   ├── app.signals.ts
│   ├── auth.signals.ts
│   └── notification.signals.ts
│
├── app.routes.ts                  # Main routing
├── app.config.ts                  # Application configuration
└── app.component.ts               # Root component
```

### Key Angular Components

#### 1. AppComponent (Root)
```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  // Theme management
  // Global notifications
  // App initialization
}
```

#### 2. Main Layout Component
```typescript
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent],
  template: `
    <div class="flex h-screen">
      <app-sidebar></app-sidebar>
      <div class="flex-1 flex flex-col">
        <app-navbar></app-navbar>
        <main class="flex-1 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent { }
```

#### 3. Authentication Service
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string | null>(null);
  currentUser = signal<User | null>(null);

  login(credentials): Observable<AuthResponse> { }
  logout(): void { }
  refreshToken(): Observable<AuthResponse> { }
  getCurrentUser(): Observable<User> { }
  isAuthenticated(): boolean { }
  hasRole(role: string): boolean { }
  hasPermission(permission: string): boolean { }
}
```

#### 4. Student Signals (State Management)
```typescript
export const studentSignals = () => {
  const students = signal<Student[]>([]);
  const selectedStudent = signal<Student | null>(null);
  const isLoading = signal(false);
  const error = signal<string | null>(null);
  const filters = signal<StudentFilter>({});

  const filteredStudents = computed(() => {
    // Filtering logic
  });

  return { students, selectedStudent, isLoading, error, filters, filteredStudents };
};
```

### UI Component Library

#### Common Components to Develop
1. **Button Component**
   - Variants: primary, secondary, danger, ghost
   - Sizes: sm, md, lg
   - Loading state
   - Disabled state
   - Icons support

2. **Card Component**
   - Header, body, footer
   - Padding options
   - Shadow variants
   - Hover effects

3. **Modal/Dialog Component**
   - Header, body, footer
   - Close button
   - Action buttons
   - Overlay with blur

4. **Table Component**
   - Sortable columns
   - Filterable rows
   - Pagination
   - Row selection
   - Loading state

5. **Form Components**
   - Input field
   - Textarea
   - Select dropdown
   - Checkbox
   - Radio button
   - Date picker
   - Time picker

6. **Notification Component**
   - Toast notifications
   - Alert dialogs
   - Success, warning, error, info types
   - Auto-dismiss

7. **Sidebar Component**
   - Menu items with icons
   - Nested menu support
   - Active state highlight
   - Collapse/expand animation
   - Permission-based visibility

8. **Navbar Component**
   - Logo/brand
   - User profile menu
   - Notification bell
   - Theme toggle
   - Breadcrumb navigation

### Styling Guidelines

**Tailwind CSS Configuration:**
- Dark mode support
- Custom color palette
- Responsive breakpoints
- Custom animations
- Glassmorphism effects

**CSS Classes Naming Convention:**
```
component-name__element--modifier
e.g., button--primary, card__header--active
```

**Theme Variables:**
```typescript
// Light theme
--color-primary: #2563eb
--color-secondary: #6366f1
--color-success: #10b981
--color-warning: #f59e0b
--color-danger: #ef4444

// Dark theme
--background: #0f172a
--surface: #1e293b
--surface-secondary: #334155
```

---

## Backend Requirements

### CQRS Implementation

#### Command Structure
```csharp
public abstract record Command : ICommand
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
}

public abstract record Command<TResponse> : ICommand<TResponse>
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
}

public class CreateStudentCommand : Command<StudentDto>
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    // ... other properties
}
```

#### Query Structure
```csharp
public abstract record Query<TResponse> : IQuery<TResponse>
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
}

public record GetStudentQuery(Guid TenantId, Guid UserId, Guid StudentId) 
    : Query<StudentDto>;

public record ListStudentsQuery(Guid TenantId, Guid UserId, int PageNumber, int PageSize) 
    : Query<PaginatedList<StudentDto>>;
```

#### Handler Implementation
```csharp
public class CreateStudentCommandHandler : ICommandHandler<CreateStudentCommand, StudentDto>
{
    public async Task<StudentDto> Handle(CreateStudentCommand command, CancellationToken cancellationToken)
    {
        // Business logic
        // Validation
        // Database operation
        // Return DTO
    }
}

public class GetStudentQueryHandler : IQueryHandler<GetStudentQuery, StudentDto>
{
    public async Task<StudentDto> Handle(GetStudentQuery query, CancellationToken cancellationToken)
    {
        // Query logic
        // Caching
        // Return DTO
    }
}
```

### Repository Pattern Implementation

#### Generic Repository
```csharp
public interface IRepository<T> where T : class
{
    Task<T> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(T entity, CancellationToken cancellationToken = default);
    IQueryable<T> AsQueryable();
}

public class GenericRepository<T> : IRepository<T> where T : class
{
    private readonly ApplicationDbContext _context;
    private readonly DbSet<T> _dbSet;

    public GenericRepository(ApplicationDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    // Implementation
}
```

#### Specialized Repository
```csharp
public interface IStudentRepository : IRepository<Student>
{
    Task<Student> GetByEmailAsync(string email, Guid tenantId);
    Task<IReadOnlyList<Student>> GetActiveStudentsAsync(Guid tenantId);
    Task<IReadOnlyList<Student>> GetStudentsByStatusAsync(string status, Guid tenantId);
}

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    public StudentRepository(ApplicationDbContext context) : base(context) { }

    // Custom implementations
}
```

### Unit of Work Pattern

```csharp
public interface IUnitOfWork : IAsyncDisposable
{
    IRepository<Student> Students { get; }
    IRepository<Member> Members { get; }
    IRepository<Seat> Seats { get; }
    IRepository<Attendance> Attendance { get; }
    // ... other repositories

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IAsyncTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IRepository<Student> _students;
    private IRepository<Member> _members;

    public IRepository<Student> Students => 
        _students ??= new StudentRepository(_context);
    
    public IRepository<Member> Members => 
        _members ??= new MemberRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
```

### Validation with FluentValidation

```csharp
public class CreateStudentCommandValidator : AbstractValidator<CreateStudentCommand>
{
    public CreateStudentCommandValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100).WithMessage("First name cannot exceed 100 characters");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Email format is invalid");

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^\+?[1-9]\d{1,14}$").WithMessage("Invalid phone format");

        RuleFor(x => x.DateOfBirth)
            .LessThan(DateTime.Now).WithMessage("Date of birth cannot be in the future");
    }
}
```

### AutoMapper Configuration

```csharp
public class StudentMappingProfile : Profile
{
    public StudentMappingProfile()
    {
        CreateMap<Student, StudentDto>()
            .ForMember(dest => dest.FullName, 
                opt => opt.MapFrom(src => $"{src.FirstName} {src.LastName}"))
            .ReverseMap();

        CreateMap<CreateStudentCommand, Student>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
    }
}
```

### Middleware Stack

```csharp
public void Configure(IApplicationBuilder app)
{
    // Exception Handling Middleware
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    // CORS
    app.UseCors("AllowOrigins");

    // HTTPS Redirect
    app.UseHttpsRedirection();

    // Authentication
    app.UseAuthentication();

    // Authorization
    app.UseAuthorization();

    // Request Logging
    app.UseMiddleware<RequestLoggingMiddleware>();

    // Tenant Context
    app.UseMiddleware<TenantContextMiddleware>();

    // Routing
    app.UseRouting();
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapHub<NotificationHub>("/hubs/notifications");
    });
}
```

---

## Integration Requirements

### Third-Party Integrations

#### 1. Payment Gateway Integration
**Provider:** Razorpay / Stripe

**Integration Points:**
- Create payment orders
- Verify payment signatures
- Handle webhooks
- Reconciliation

#### 2. Email Service Integration
**Provider:** SendGrid / AWS SES

**Integration Points:**
- Send transactional emails
- Email templates
- Track delivery
- Handle bounces

#### 3. SMS Service Integration
**Provider:** Twilio / AWS SNS

**Integration Points:**
- Send OTP
- Send notifications
- Handle responses
- Track delivery

#### 4. File Storage Integration
**Provider:** AWS S3 / Azure Blob Storage

**Integration Points:**
- Upload files (profile pics, documents)
- Generate presigned URLs
- Delete files
- Organize by folders

#### 5. QR Code Generation
**Library:** QRCoder

**Integration Points:**
- Generate QR codes for members
- Generate QR codes for seats
- Batch generation

#### 6. PDF Generation
**Library:** SelectPdf / iText

**Integration Points:**
- Generate invoices
- Generate reports
- Generate certificates

---

## Security & Compliance

### Authentication

#### JWT Implementation
```csharp
public class JwtTokenProvider
{
    private readonly JwtSettings _settings;

    public string GenerateAccessToken(User user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("TenantId", user.TenantId.ToString())
        };

        roles.ForEach(role => claims.Add(new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

#### Password Security
- Minimum 12 characters
- Require uppercase, lowercase, numbers, special chars
- Hash using bcrypt
- No password reuse (last 5 passwords)
- Automatic expiration every 90 days

### Authorization

#### Permission-Based Access Control
```csharp
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    [HttpPost]
    [Authorize]
    [Permission("Students.Create")]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentCommand command)
    {
        // Implementation
    }

    [HttpPut("{id}")]
    [Authorize]
    [Permission("Students.Update")]
    public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] UpdateStudentCommand command)
    {
        // Implementation
    }
}
```

#### Custom Authorization Policy
```csharp
services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => 
        policy.RequireRole("SuperAdmin", "InstitutionAdmin"))
    .AddPolicy("BranchAccess", policy =>
        policy.Requirements.Add(new BranchAccessRequirement()));
```

### Data Encryption

#### Encryption at Rest
```csharp
public class EncryptionService
{
    public string Encrypt(string plainText)
    {
        using (var cipher = Aes.Create())
        {
            cipher.Key = _encryptionKey;
            cipher.Mode = CipherMode.CBC;
            cipher.Padding = PaddingMode.PKCS7;

            using (var encryptor = cipher.CreateEncryptor(cipher.Key, cipher.IV))
            {
                using (var ms = new MemoryStream())
                {
                    ms.Write(cipher.IV, 0, cipher.IV.Length);
                    using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    {
                        using (var sw = new StreamWriter(cs))
                        {
                            sw.Write(plainText);
                        }
                        return Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        }
    }
}
```

#### Encryption in Transit
- HTTPS/TLS 1.3 for all communications
- Certificate pinning
- HSTS headers
- Secure cookies (HttpOnly, Secure, SameSite)

### OWASP Top 10 Mitigations

1. **Injection Prevention**
   - Parameterized queries (Entity Framework)
   - Input validation

2. **Authentication Failures**
   - Strong password policies
   - MFA/2FA support
   - Session timeout
   - Account lockout after failed attempts

3. **Sensitive Data Exposure**
   - Encryption at rest and in transit
   - PII masking in logs
   - Secure password storage

4. **XML External Entities (XXE)**
   - Disable XML external entity processing
   - Use safe XML parsers

5. **Access Control**
   - RBAC with fine-grained permissions
   - Principle of least privilege
   - Data isolation per tenant

6. **Security Misconfiguration**
   - Secure default settings
   - Disable unnecessary features
   - Regular security audits

7. **XSS Prevention**
   - Output encoding
   - Content Security Policy headers
   - Angular's built-in XSS protection

8. **CSRF Protection**
   - Anti-forgery tokens
   - SameSite cookie attribute

9. **Using Components with Known Vulnerabilities**
   - Regular dependency updates
   - Automated vulnerability scanning

10. **Insufficient Logging & Monitoring**
    - Comprehensive audit logging
    - Real-time monitoring
    - Alert mechanisms

### GDPR Compliance

```csharp
[HttpPost("export-data")]
[Authorize]
public async Task<IActionResult> ExportPersonalData(Guid userId)
{
    // Export user's personal data in machine-readable format
}

[HttpDelete("delete-account")]
[Authorize]
public async Task<IActionResult> DeleteAccount(Guid userId)
{
    // Anonymize or delete all personal data
}

[HttpGet("consent-preferences")]
[Authorize]
public async Task<IActionResult> GetConsentPreferences(Guid userId)
{
    // Retrieve user's consent preferences
}
```

---

## Performance & Scalability

### Performance Optimization

#### Query Optimization
```csharp
// Good: Projection to DTO
var students = await _context.Students
    .Where(s => s.TenantId == tenantId && s.IsActive)
    .Select(s => new StudentDto 
    { 
        Id = s.Id, 
        Name = s.FirstName + " " + s.LastName,
        Email = s.Email
    })
    .ToListAsync();

// Avoid: Loading entire entity
var students = await _context.Students
    .Where(s => s.TenantId == tenantId && s.IsActive)
    .ToListAsync();
```

#### Pagination Implementation
```csharp
public async Task<PaginatedList<T>> GetPagedAsync(int pageNumber, int pageSize)
{
    var total = await _context.Set<T>().CountAsync();
    var items = await _context.Set<T>()
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return new PaginatedList<T>(items, pageNumber, pageSize, total);
}
```

#### Batch Operations
```csharp
// Batch Insert
await _context.Attendance.AddRangeAsync(attendanceRecords);
await _context.SaveChangesAsync();

// Batch Update
_context.Seats.UpdateRange(seatsToUpdate);
await _context.SaveChangesAsync();
```

#### Eager Loading Strategy
```csharp
var students = await _context.Students
    .Where(s => s.TenantId == tenantId)
    .Include(s => s.CurrentSeat)
    .Include(s => s.Subscription)
    .Include(s => s.Attendance)
    .ToListAsync();
```

#### Distributed Caching
```csharp
public class CachedStudentRepository : IStudentRepository
{
    private const string CacheKeyPrefix = "student_";

    public async Task<Student> GetByIdAsync(Guid id)
    {
        var cacheKey = $"{CacheKeyPrefix}{id}";
        
        var cached = await _cache.GetAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<Student>(cached);

        var student = await _repository.GetByIdAsync(id);
        await _cache.SetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(student), 
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1) });

        return student;
    }
}
```

### Scalability Strategy

#### Horizontal Scaling
- Load balancing across multiple servers
- Sticky sessions via Redis
- Shared cache layer (Redis)
- Distributed logging (Serilog to centralized storage)

#### Database Optimization
- Read replicas for reporting
- Connection pooling
- Query result caching
- Archived data on separate storage

#### Background Job Processing
```csharp
// Offload long-running tasks
await _mediator.Send(new GenerateReportCommand(reportId), cancellationToken);

// Hangfire Job
BackgroundJob.Schedule(() => _reportService.GenerateReport(reportId), TimeSpan.FromSeconds(5));

// Recurring Jobs
RecurringJob.AddOrUpdate("cleanup-old-logs", () => _logService.CleanupOldLogs(), Cron.Daily);
```

---

## Testing Requirements

### Unit Testing Strategy

#### Test Structure
```csharp
public class CreateStudentCommandHandlerTests
{
    private readonly CreateStudentCommandHandler _handler;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;

    public CreateStudentCommandHandlerTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _handler = new CreateStudentCommandHandler(_unitOfWorkMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_CreatesStudent()
    {
        // Arrange
        var command = new CreateStudentCommand 
        { 
            FirstName = "John", 
            LastName = "Doe",
            Email = "john@example.com"
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("John", result.FirstName);
        _unitOfWorkMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithInvalidEmail_ThrowsException()
    {
        // Arrange
        var command = new CreateStudentCommand 
        { 
            Email = "invalid-email"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _handler.Handle(command, CancellationToken.None));
    }
}
```

#### Mocking Strategy
```csharp
var mockRepository = new Mock<IRepository<Student>>();
mockRepository
    .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(new Student { Id = Guid.NewGuid(), FirstName = "John" });

var mockUnitOfWork = new Mock<IUnitOfWork>();
mockUnitOfWork
    .Setup(u => u.Students)
    .Returns(mockRepository.Object);
```

### Integration Testing

#### Database Testing with In-Memory EF Core
```csharp
public class StudentRepositoryIntegrationTests
{
    private readonly ApplicationDbContext _context;
    private readonly IRepository<Student> _repository;

    public StudentRepositoryIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase("TestDb")
            .Options;

        _context = new ApplicationDbContext(options);
        _repository = new GenericRepository<Student>(_context);
    }

    [Fact]
    public async Task AddAsync_WithValidStudent_AddsToDatabase()
    {
        // Arrange
        var student = new Student { FirstName = "John", Email = "john@example.com" };

        // Act
        await _repository.AddAsync(student);
        await _context.SaveChangesAsync();

        // Assert
        var result = await _repository.GetByIdAsync(student.Id);
        Assert.NotNull(result);
        Assert.Equal("John", result.FirstName);
    }
}
```

### End-to-End Testing

#### Cypress Testing
```typescript
describe('Student Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password');
    cy.visit('/admin/students');
  });

  it('should create new student', () => {
    cy.get('[data-cy="add-student-btn"]').click();
    cy.get('[data-cy="first-name-input"]').type('John');
    cy.get('[data-cy="last-name-input"]').type('Doe');
    cy.get('[data-cy="email-input"]').type('john@example.com');
    cy.get('[data-cy="submit-btn"]').click();

    cy.get('[data-cy="success-notification"]').should('be.visible');
  });
});
```

### Testing Coverage Targets
- Unit Tests: 70%+ coverage
- Integration Tests: 50%+ coverage
- E2E Tests: Critical user journeys
- Performance Tests: Response time < 500ms

---

## Deployment & DevOps

### Application Configuration

#### appsettings.json Structure
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=..."
  },
  "Jwt": {
    "SecretKey": "...",
    "Issuer": "SmartLibraryManagement",
    "Audience": "SmartLibraryManagement",
    "ExpirationMinutes": 1440
  },
  "Caching": {
    "RedisConnection": "localhost:6379",
    "SlidingExpiration": 60
  },
  "Email": {
    "Provider": "SendGrid",
    "FromAddress": "noreply@SmartLibraryManagement.com"
  }
}
```

#### Environment-Specific Configuration
```
appsettings.json              (Default)
appsettings.Development.json  (Dev)
appsettings.Staging.json      (Staging)
appsettings.Production.json   (Production)
```

### Build & Deployment Pipeline

#### Build Steps
1. Restore NuGet packages
2. Compile code
3. Run unit tests
4. Code analysis (SonarQube)
5. Build Docker image
6. Push to registry

#### Deployment Steps
1. Pull image from registry
2. Run database migrations
3. Stop old container
4. Start new container
5. Run smoke tests
6. Update load balancer

### Monitoring & Alerting

#### Application Insights Integration
```csharp
services.AddApplicationInsightsTelemetry(Configuration["APPINSIGHTS_CONNECTIONSTRING"]);
services.AddSingleton<ITelemetryInitializer, UserTelemetryInitializer>();
```

#### Health Check Endpoints
```csharp
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");
app.MapHealthChecks("/health/live");
```

#### Key Metrics to Monitor
- HTTP request rate and response time
- Database query performance
- Cache hit rate
- Background job success rate
- Error rate and exceptions
- Server CPU and memory usage
- SignalR connection count

---

## Appendices

### Appendix A: Glossary of Terms

| Term | Definition |
|------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| RBAC | Role-Based Access Control |
| CQRS | Command Query Responsibility Segregation |
| DTO | Data Transfer Object |
| ORM | Object-Relational Mapping |
| TenantId | Unique identifier for institutional tenant |
| SRP | Single Responsibility Principle |
| DRY | Don't Repeat Yourself |
| SOLID | Set of 5 design principles |

### Appendix B: API Response Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but lacking permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or conflicting data |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Server maintenance |

### Appendix C: Database Backup Strategy

**Backup Schedule:**
- Full backup: Daily at 2:00 AM UTC
- Incremental backup: Every 6 hours
- Transaction log backup: Every hour

**Retention Policy:**
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

**Recovery:**
- MTTR (Mean Time to Recovery): < 1 hour
- RPO (Recovery Point Objective): < 1 hour

### Appendix D: Security Checklist

- [ ] SSL/TLS enabled on all endpoints
- [ ] API keys rotated regularly
- [ ] SQL injection prevention in all queries
- [ ] XSS prevention implemented
- [ ] CSRF tokens on all state-changing operations
- [ ] Rate limiting configured
- [ ] Password policies enforced
- [ ] 2FA available for all users
- [ ] Audit logs enabled
- [ ] PII data masked in logs
- [ ] Encryption at rest enabled
- [ ] GDPR compliance verified
- [ ] Regular security audits scheduled
- [ ] Security headers configured
- [ ] Dependency vulnerabilities scanned

---

**Document Version:** 1.0  
**Last Updated:** May 23, 2026  
**Next Review Date:** June 23, 2026  
**Author:** Technical Team  
**Status:** Active  

