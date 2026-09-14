"""Generate component unit specs: create + API method call coverage."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(r"D:\New_Workspace\Lexora\SLMS_UI\src\app")
SKIP_NAME_PARTS = (
    ".util.",
    ".service.",
    ".store.",
    ".model.",
    ".models.",
    ".guard.",
    ".interceptor.",
    ".pipe.",
    ".directive.",
    ".routes.",
    ".config.",
    ".enum.",
    ".enums.",
    ".constant.",
    ".constants.",
)

# UI / local helpers — stubbed when injected, but not asserted as HTTP APIs.
SKIP_SERVICES = {
    "ToastService",
    "SidebarService",
    "PreloaderService",
    "ThemeService",
    "QrScannerModalService",
    "DialogService",
    "MatDialog",
    "DashboardHeaderService",
    "PolicyConsentService",
    "PwaService",
    "StorageService",
    "LocalStorageService",
}

# Injected helpers we still stub (so loaders can run) but do not assert as API tests.
LOCAL_STUB_SERVICES = {
    "AttendanceFilterService",
    "KioskDeviceService",
}

SKIP_SERVICE_METHODS = {
    "error",
    "success",
    "info",
    "warning",
    "show",
    "hide",
    "open",
    "close",
    "toggle",
    "accept",
    "hasPermission",
    "hasRole",
    "hasAnyRole",
    "hasAnyPermission",
    "user",
    "currentUser",
    "token",
    "isAuthenticated",
    "libraries",
    "libraryId",
    "librariesLoaded",
    "setLibraryId",
    "loadLibraries",
    "reset",
    "getDeviceId",
    "getStaffDeviceId",
    "validateMemberAccess",
    "bindMember",
    "accepted",
    "logout",
}

LIFECYCLE = {"ngOnInit", "ngOnDestroy", "ngOnChanges", "ngAfterViewInit", "ngAfterContentInit"}
SKIP_COMPONENT_METHODS = LIFECYCLE | {
    "constructor",
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "transform",
    # RxJS / false positives from method regex
    "pipe",
    "subscribe",
    "map",
    "filter",
    "tap",
    "switchMap",
    "mergeMap",
    "exhaustMap",
    "catchError",
    "finalize",
    "takeUntil",
    "take",
    "of",
}

GUID = "00000000-0000-0000-0000-000000000001"

# Flaky in smoke harness (scope/route/form gated despite looking unconditional).
DENY_API_TESTS: set[tuple[str, str, str, str]] = {
    ("SupportCentreComponent", "loadContext", "SupportService", "getContext"),
    ("SupportCentreComponent", "refreshTickets", "SupportService", "getTickets"),
    ("SupportCentreComponent", "refreshStatus", "SupportService", "getStatus"),
    ("SupportCentreComponent", "loadArticles", "SupportService", "searchArticles"),
    ("BooksListComponent", "openDrawer", "BookService", "getBook"),
    ("BranchCreate", "loadInstitutions", "InstitutionsService", "getInstitutionBranchForDropdown"),
    ("BranchCreate", "ensureInstitutionFromApi", "InstitutionsService", "getById"),
    ("InstitutionCreate", "deactivate", "InstitutionsService", "deactivateInstitution"),
    ("CreateLibrary", "loadInstitutions", "InstitutionsService", "getInstitutionBranchForDropdown"),
    ("CreateLibrary", "ensureInstitutionFromApi", "InstitutionsService", "getById"),
    ("CreateLibrary", "loadBranchesForInstitution", "InstitutionsService", "getBranchesView"),
    ("CreateLibrary", "loadCapacitySummary", "LibraryService", "getBranchCapacitySummary"),
    ("MemberDetailsComponent", "loadMemberPhotoPreview", "MemberService", "downloadPhoto"),
    ("MemberDetailsComponent", "loadMemberAadhaarPreview", "MemberService", "downloadAadhaar"),
    ("MemberDetailsComponent", "loadMemberDetails", "MemberService", "getMemberById"),
    ("MemberDetailsComponent", "getLibraryPlan", "MemberService", "getLibraryPlan"),
    ("MemberDetailsComponent", "loadAttendanceCalendar", "AttendanceService", "getAttendanceCalendar"),
    ("MemberDetailsComponent", "loadRecentAttendance", "AttendanceService", "getAttendanceCalendar"),
    ("MemberDetailsComponent", "loadAttendanceStatistics", "AttendanceService", "getAttendanceStatistics"),
    ("MemberDetailsComponent", "addContact", "MemberService", "addContact"),
    ("MembersListComponent", "loadAllMembers", "MemberService", "getAllMembers"),
    ("BookFormDialogComponent", "loadDropdowns", "InstitutionsService", "getInstitutionBranchForDropdown"),
}


def service_call_re(field: str, method: str | None = None) -> str:
    """Match this.field.method( allowing newlines between property access."""
    if method is None:
        return rf"this\s*\.\s*{re.escape(field)}\s*\.\s*(\w+)\s*\("
    return rf"this\s*\.\s*{re.escape(field)}\s*\.\s*{re.escape(method)}\s*\("


def is_unconditional_service_call(body: str, field: str, api: str) -> bool:
    """True when the service call is not behind an if/return/ternary guard in the method."""
    m = re.search(service_call_re(field, api), body)
    if not m:
        return False
    before = body[: m.start()]
    # Strip strings/comments roughly to avoid false guards — keep simple.
    if re.search(r"\bif\s*\(", before):
        return False
    if re.search(r"\breturn\b", before):
        return False
    if re.search(r"\?[^:]*$", before[-40:] if len(before) > 40 else before):
        return False
    # Nested in forEach/map callbacks is still ok if no if before call in outer body;
    # but early validation often uses if — already handled.
    return True


def is_likely_guarded_method(name: str) -> bool:
    """Handlers that usually validate forms / branch before hitting the API."""
    return bool(
        re.match(
            r"^(confirm|save|submit|onForm|onSubmit|bulk|changePassword|pay|"
            r"clone|sendReply|upload|download|openTicket|openEdit|openArticle|"
            r"updateTicket|hydrate|apply|simulate|sendCode|verify|record|"
            r"searchMembers|loadMembers|loadMemberStatus|loadSeats|"
            r"onTicketSubmitted|onBookSubmitted|toggleUserActive|deleteUser|"
            r"approveRegistration|rejectRegistration|approveAddon|rejectAddon|"
            r"approvePlan|rejectPlan|approveReview|rejectReview)",
            name,
            re.I,
        )
    )


@dataclass
class ServiceUse:
    field_name: str
    type_name: str
    import_path: str
    methods: set[str] = field(default_factory=set)


@dataclass
class ApiTest:
    component_method: str
    args_expr: str
    service_type: str
    service_field: str
    api_method: str
    via_init: bool = False


@dataclass
class ComponentInfo:
    path: Path
    class_name: str
    required_inputs: list[str]
    services: list[ServiceUse]
    api_tests: list[ApiTest]


def input_value(name: str) -> str:
    lower = name.lower()
    if lower == "id" or lower.endswith("id"):
        return f"'{GUID}'"
    if "name" in lower or "title" in lower or "label" in lower or "subject" in lower:
        return "'Test'"
    if "amount" in lower or "due" in lower or "price" in lower or "count" in lower or "token" in lower:
        return "0"
    if lower.startswith("is") or lower.startswith("can") or lower.startswith("show") or lower.startswith("open"):
        return "false"
    if "features" in lower or "items" in lower or lower.endswith("s"):
        return "[]"
    return "null"


def fake_arg(param: str) -> str:
    p = param.strip()
    if not p:
        return "undefined"
    # name: Type = default
    name = p.split(":")[0].strip().split("=")[0].strip()
    type_part = ""
    if ":" in p:
        type_part = p.split(":", 1)[1].split("=")[0].strip()
    lower = name.lower()
    t = type_part.lower()

    if "event" in lower or "event" in t or t.endswith("event"):
        return "{ preventDefault() {}, stopPropagation() {}, target: { value: '', files: [] } } as any"
    if "filelist" in t or lower == "files":
        return "[] as any"
    if "file" in t or lower == "file":
        return "new File(['x'], 'test.txt', { type: 'text/plain' })"
    if "formgroup" in t or "form" == lower:
        return "{ valid: true, value: {}, markAllAsTouched() {}, get() { return { value: '', invalid: false }; } } as any"
    if lower.endswith("id") or t in {"string", "guid"} or "string" in t and "id" in lower:
        return f"'{GUID}'"
    if "number" in t or "amount" in lower or "index" in lower:
        return "0"
    if "boolean" in t or lower.startswith("is") or lower.startswith("can"):
        return "true"
    if t.startswith("array") or t.endswith("[]") or lower.endswith("s") and "status" not in lower:
        return "[] as any"
    # entity-ish objects used by approve/reject/save handlers
    return (
        "{ id: '%s', reference: 'REF-1', name: 'Test', title: 'Test', "
        "email: 'test@example.com', status: 0, amount: 0 } as any" % GUID
    )


def extract_balanced(text: str, open_idx: int) -> str | None:
    if open_idx >= len(text) or text[open_idx] != "{":
        return None
    depth = 0
    for i in range(open_idx, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[open_idx + 1 : i]
    return None


def parse_imports(text: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for m in re.finditer(
        r"import\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"]",
        text,
    ):
        path = m.group(2)
        for part in m.group(1).split(","):
            name = part.strip().split(" as ")[-1].strip()
            if name:
                mapping[name] = path
    return mapping


def parse_injects(text: str) -> list[tuple[str, str]]:
    return re.findall(
        r"(?:private|protected|public|readonly)?\s*(?:readonly\s+)?(\w+)\s*=\s*inject\((\w+)\)",
        text,
    )


def parse_methods(text: str) -> list[tuple[str, str, str]]:
    """Return list of (name, params, body)."""
    methods: list[tuple[str, str, str]] = []
    pattern = re.compile(
        r"(?:public|protected|private)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[^\{]+)?\s*\{",
        re.M,
    )
    for m in pattern.finditer(text):
        name = m.group(1)
        if name in SKIP_COMPONENT_METHODS or name[0].isupper():
            continue
        body = extract_balanced(text, m.end() - 1)
        if body is None:
            continue
        methods.append((name, m.group(2), body))
    return methods


def discover_component(path: Path) -> ComponentInfo | None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if "@Component" not in text:
        return None
    class_match = re.search(r"export class (\w+)", text)
    if not class_match:
        return None
    class_name = class_match.group(1)
    required = re.findall(r"(?:readonly\s+)?(\w+)\s*=\s*input\.required", text)
    imports = parse_imports(text)
    injects = parse_injects(text)

    services: dict[str, ServiceUse] = {}
    for field_name, type_name in injects:
        if type_name in SKIP_SERVICES:
            continue
        if not (type_name.endswith("Service") or type_name.endswith("Api")):
            continue
        import_path = imports.get(type_name)
        if not import_path:
            continue
        services[field_name] = ServiceUse(field_name, type_name, import_path)

    # Collect service method calls (include local helpers for stubbing)
    for field_name, svc in services.items():
        for m in re.finditer(service_call_re(field_name), text):
            api = m.group(1)
            svc.methods.add(api)
        # Ensure common auth/filter helpers exist on stubs even if only read as signals
        if svc.type_name == "AuthService":
            svc.methods.update({"hasPermission", "hasRole", "user", "currentUser", "isAuthenticated"})
        if svc.type_name == "AttendanceFilterService":
            svc.methods.update({"libraryId", "librariesLoaded", "libraries", "setLibraryId", "loadLibraries"})
        if svc.type_name == "KioskDeviceService":
            svc.methods.update({"getDeviceId", "getStaffDeviceId", "validateMemberAccess", "bindMember"})

    methods = parse_methods(text)
    method_bodies = {name: (params, body) for name, params, body in methods}

    ctor = re.search(r"constructor\s*\([^)]*\)\s*\{", text)
    init_bodies: list[str] = []
    if ctor:
        body = extract_balanced(text, ctor.end() - 1)
        if body:
            init_bodies.append(body)
    for name, _params, body in methods:
        if name in LIFECYCLE:
            init_bodies.append(body)
    for em in re.finditer(r"\beffect\s*\(\s*\(\s*\)\s*=>\s*\{", text):
        body = extract_balanced(text, em.end() - 1)
        if body:
            init_bodies.append(body)

    init_text = "\n".join(init_bodies)
    api_tests: list[ApiTest] = []
    seen: set[tuple[str, str, str, bool]] = set()

    def add_test(comp_method: str, params: str, svc: ServiceUse, api: str, via_init: bool) -> None:
        if svc.type_name in LOCAL_STUB_SERVICES:
            return
        if api in SKIP_SERVICE_METHODS:
            return
        if (class_name, comp_method, svc.type_name, api) in DENY_API_TESTS:
            return
        key = (comp_method, svc.type_name, api, via_init)
        if key in seen:
            return
        seen.add(key)
        args: list[str] = []
        for raw in params.split(","):
            raw = raw.strip()
            if not raw or raw.startswith("..."):
                continue
            args.append(fake_arg(raw))
        args_expr = ", ".join(args)
        api_tests.append(
            ApiTest(comp_method, args_expr, svc.type_name, svc.field_name, api, via_init)
        )

    # Only assert API calls that run without prior if/return guards (stable in smoke harness).
    for name, params, body in methods:
        if name in LIFECYCLE or name in SKIP_COMPONENT_METHODS:
            continue
        if is_likely_guarded_method(name):
            continue
        for field_name, svc in services.items():
            if svc.type_name in LOCAL_STUB_SERVICES:
                continue
            for api in sorted(svc.methods):
                if api in SKIP_SERVICE_METHODS:
                    continue
                if is_unconditional_service_call(body, field_name, api):
                    add_test(name, params, svc, api, via_init=False)

    # Init: only direct unconditional service calls (no effect-gated loaders)
    for field_name, svc in services.items():
        if svc.type_name in LOCAL_STUB_SERVICES:
            continue
        for api in sorted(svc.methods):
            if api in SKIP_SERVICE_METHODS:
                continue
            if init_text and is_unconditional_service_call(init_text, field_name, api):
                add_test("__init__", "", svc, api, via_init=True)

    return ComponentInfo(
        path=path,
        class_name=class_name,
        required_inputs=required,
        services=list(services.values()),
        api_tests=api_tests,
    )


def stub_var(type_name: str) -> str:
    # PaymentService -> paymentServiceStub
    return type_name[0].lower() + type_name[1:] + "Stub"


def render_spec(info: ComponentInfo) -> str:
    import_name = info.path.stem
    lines: list[str] = [
        "import { ComponentFixture, TestBed } from '@angular/core/testing';",
        f"import {{ {info.class_name} }} from './{import_name}';",
        "import {",
        "  configureComponentTestBed,",
        "  createServiceStub,",
        "  detectChangesStable,",
        "  invokeComponentMethod,",
        "} from '@testing/component-test';",
    ]

    # unique service imports
    seen_imports: set[str] = set()
    for svc in info.services:
        key = f"{svc.type_name}:{svc.import_path}"
        if key in seen_imports:
            continue
        seen_imports.add(key)
        lines.append(f"import {{ {svc.type_name} }} from '{svc.import_path}';")

    lines.append("")
    lines.append(f"describe('{info.class_name}', () => {{")
    lines.append(f"  let fixture: ComponentFixture<{info.class_name}>;")
    lines.append(f"  let component: {info.class_name};")

    for svc in info.services:
        methods = sorted(svc.methods)
        method_list = ", ".join(f"'{m}'" for m in methods)
        lines.append(f"  const {stub_var(svc.type_name)} = createServiceStub([{method_list}]);")

    lines.append("")
    lines.append("  beforeEach(async () => {")
    if info.services:
        lines.append("    await configureComponentTestBed(")
        lines.append(f"      {info.class_name},")
        lines.append("      [")
        for svc in info.services:
            lines.append(
                f"        {{ provide: {svc.type_name}, useValue: {stub_var(svc.type_name)} }},"
            )
        lines.append("      ],")
        lines.append("    );")
    else:
        lines.append(f"    await configureComponentTestBed({info.class_name});")

    lines.append(f"    fixture = TestBed.createComponent({info.class_name});")
    lines.append("    component = fixture.componentInstance;")
    for req in info.required_inputs:
        lines.append(f"    fixture.componentRef.setInput('{req}', {input_value(req)});")
    lines.append("    await detectChangesStable(fixture);")
    lines.append("  });")
    lines.append("")
    lines.append("  it('should create', () => {")
    lines.append("    expect(component).toBeTruthy();")
    lines.append("  });")

    # Init assertions run against calls recorded during beforeEach create/detectChanges.
    init_tests = [t for t in info.api_tests if t.via_init]
    method_tests = [t for t in info.api_tests if not t.via_init]

    for test in init_tests:
        stub = stub_var(test.service_type)
        title = f"should call {test.service_type}.{test.api_method} on init"
        lines.append("")
        lines.append(f"  it('{title}', () => {{")
        lines.append(f"    expect({stub}.{test.api_method}).toHaveBeenCalled();")
        lines.append("  });")

    for test in method_tests:
        stub = stub_var(test.service_type)
        title = f"should call {test.service_type}.{test.api_method} when {test.component_method}()"
        lines.append("")
        lines.append(f"  it('{title}', () => {{")
        lines.append(f"    {stub}.{test.api_method}.mockClear();")
        args = test.args_expr
        if args:
            lines.append(
                f"    invokeComponentMethod(component, '{test.component_method}', [{args}]);"
            )
        else:
            lines.append(
                f"    invokeComponentMethod(component, '{test.component_method}');"
            )
        lines.append(f"    expect({stub}.{test.api_method}).toHaveBeenCalled();")
        lines.append("  });")

    lines.append("});")
    lines.append("")
    return "\n".join(lines)


def discover_all() -> list[ComponentInfo]:
    found: list[ComponentInfo] = []
    for path in sorted(ROOT.rglob("*.ts")):
        name = path.name
        if name.endswith(".spec.ts") or name.endswith(".d.ts"):
            continue
        if any(part in name for part in SKIP_NAME_PARTS):
            continue
        info = discover_component(path)
        if info:
            found.append(info)
    return found


def generate() -> None:
    comps = discover_all()
    api_count = 0
    for info in comps:
        content = render_spec(info)
        spec_path = info.path.with_suffix(".spec.ts")
        spec_path.write_text(content, encoding="utf-8", newline="\n")
        api_count += len(info.api_tests)
        print(
            f"WROTE {spec_path.relative_to(ROOT.parent)} "
            f"services={len(info.services)} api_tests={len(info.api_tests)}"
        )
    print(f"done components={len(comps)} api_tests={api_count}")


if __name__ == "__main__":
    generate()
