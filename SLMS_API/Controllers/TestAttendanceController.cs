using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers
{
    [ApiController]
    [Route("api/test")]
    public class TestAttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly ICurrentUserService _currentUserService;

        public TestAttendanceController(IAttendanceService attendanceService, ICurrentUserService currentUserService)
        {
            _attendanceService = attendanceService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok("Working");
        }

        [HttpPost("members/{memberId:guid}/check-in")]
        //[Permission(PermissionKey.AttendanceManage)]
        public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckIn(Guid memberId, [FromBody] CheckInRequest request, CancellationToken cancellationToken)
        {
            return Ok("Working");
        }

    }

}
