export const inviteAcceptUiEn = {
  login: "Login",
  invalidTitle: "Invalid invitation",
  loadInvalid: "This invitation link is invalid or has expired.",
  goSignIn: "Go to sign in",
  loading: "Loading invitation…",
  expiredTitle: "Invitation expired",
  expiredBody: "Ask {school} admin for a new link.",
  eyebrow: "You're invited",
  joinSchool: "Join {school}",
  createRole: "Create your {role} account",
  createRoleLabel: "Create your {role} account · {label}",
  studentId: "Student ID",
  studentIdPh: "From your school",
  firstName: "First name",
  lastName: "Last name",
  username: "Username",
  email: "Email (contact)",
  password: "Password",
  joining: "Joining…",
  accept: "Accept invitation",
  joinFailed: "Could not join",
} as const;

export const verifyReportCardUiEn = {
  incomplete: "This verification link is incomplete.",
  invalid: "This report card could not be verified. The link may be invalid.",
  loading: "Verifying report card…",
  verified: "Verified report card",
  invalidTitle: "Could not verify",
  school: "School",
  student: "Student",
  grade: "Grade",
  year: "Academic year",
  issued: "Issued",
  verifiedAt: "Verified at",
  platform: "Platform",
} as const;

export const adminSettingsUiEn = {
  tabSchool: "School profile",
  tabAttendance: "Attendance",
  tabNotifications: "Notifications",
  tabAccess: "Access & invites",
  tabPlan: "Plan & reports",
} as const;

export const adminSupportUiEn = {
  heroTitle: "Report an issue",
  heroSub:
    "Send billing, technical, or account problems to the {brand} tenant control center. Track replies and status here.",
  badgeControl: "Control center",
  badgeAdmin: "School admin",
  newReport: "New report",
  newReportSub: "Describe the problem clearly so platform support can act fast.",
  loadFailed: "Failed to load tickets",
  sendFailed: "Failed to send report",
} as const;

export const adminFinanceUiEn = {
  heroTitle: "School finance",
  heroSubLoading: "Track collections, bill students, verify payments, and export records.",
} as const;