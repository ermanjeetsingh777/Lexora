using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers
{
    /// <summary>
    /// Local/dev smoke endpoint only. Hidden from Swagger and returns 404 in Production/UAT/QA.
    /// </summary>
    [ApiController]
    [ApiExplorerSettings(IgnoreApi = true)]
    [Route("api/test")]
    public class TestAttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly ICurrentUserService _currentUserService;
        private readonly IHostEnvironment _environment;

        public TestAttendanceController(
            IAttendanceService attendanceService,
            ICurrentUserService currentUserService,
            IHostEnvironment environment)
        {
            _attendanceService = attendanceService;
            _currentUserService = currentUserService;
            _environment = environment;
        }

        [HttpGet]
        public IActionResult Get()
        {
            if (!IsNonProductionTestHost())
            {
                return NotFound();
            }

            return Ok("Working");
        }

        [HttpPost("members/{memberId:guid}/check-in")]
        public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckIn(
            Guid memberId,
            [FromBody] CheckInRequest request,
            CancellationToken cancellationToken)
        {
            if (!IsNonProductionTestHost())
            {
                return NotFound();
            }

            await Task.CompletedTask;
            return Ok("Working");
        }

        private bool IsNonProductionTestHost() =>
            _environment.IsDevelopment()
            || _environment.IsEnvironment("Local")
            || _environment.IsEnvironment("Dev");
    }
}
