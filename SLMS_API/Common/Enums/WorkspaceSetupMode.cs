namespace SLMS_API.Common.Enums;

public enum WorkspaceSetupMode
{
    /// <summary>Create institution, branch and library automatically during registration.</summary>
    Auto = 1,

    /// <summary>Let the user fill the onboarding wizard (institution → branch → library).</summary>
    Manual = 2,

    /// <summary>Skip setup; queue the account for SuperAdmin approval.</summary>
    Later = 3
}
