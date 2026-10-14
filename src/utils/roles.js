export const ROLE_LABELS = {
  administrator: "Administrator",
  occ_manager: "OCC Manager",
  controller: "Controller",
  qa_inspector: "QA Inspector",
  trc_coordinator: "TRC Coordinator",
  turnaround_coordinator: "Turnaround Coordinator",
  ramp_agent: "Ramp Agent",
  auditor: "Auditor",
  viewer: "Viewer",
  data_analyst: "Data Analyst",
  duty_officer: "Duty Officer",
  station_manager: "Station Manager",
  senior_manager: "Senior Manager",
};

const OPERATIONAL_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
  "trc_coordinator",
  "turnaround_coordinator",
  "ramp_agent",
  "duty_officer",
  "station_manager",
];

const TASK_UNDO_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
  "trc_coordinator",
  "turnaround_coordinator",
  "ramp_agent",
];

const APPROVAL_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
  "qa_inspector",
  "trc_coordinator",
  "turnaround_coordinator",
];

const REPORT_EXPORT_ROLES = [
  "data_analyst",
  "station_manager",
  "senior_manager",
];

const AUDIT_VIEW_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
  "qa_inspector",
  "trc_coordinator",
  "turnaround_coordinator",
  "auditor",
  "data_analyst",
  "station_manager",
  "senior_manager",
];

const HISTORY_VIEW_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
  "qa_inspector",
  "trc_coordinator",
  "turnaround_coordinator",
  "ramp_agent",
  "auditor",
  "viewer",
  "data_analyst",
  "duty_officer",
  "station_manager",
  "senior_manager",
];

const READ_ONLY_ROLES = [
  "qa_inspector",
  "auditor",
  "viewer",
  "data_analyst",
  "senior_manager",
];

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

function roleIsIncluded(role, allowedRoles) {
  return allowedRoles.includes(normalizeRole(role));
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return "User";
  }

  return ROLE_LABELS[normalizedRole] || normalizedRole;
}

export function canCreateChecklist(role) {
  return roleIsIncluded(role, OPERATIONAL_ROLES);
}

export function canOperateChecklist(role) {
  return roleIsIncluded(role, OPERATIONAL_ROLES);
}

export function canCompletePendingTask(role) {
  return roleIsIncluded(role, OPERATIONAL_ROLES);
}

export function canUndoCompletedTask(role) {
  return roleIsIncluded(role, TASK_UNDO_ROLES);
}

export function canEditFlightInformation(role) {
  return roleIsIncluded(role, OPERATIONAL_ROLES);
}

export function canEditObservations(role) {
  return roleIsIncluded(role, OPERATIONAL_ROLES);
}

export function canApproveChecklist(role) {
  return roleIsIncluded(role, APPROVAL_ROLES);
}

export function canExportReports(role) {
  return roleIsIncluded(role, REPORT_EXPORT_ROLES);
}

export function canViewAuditHistory(role) {
  return roleIsIncluded(role, AUDIT_VIEW_ROLES);
}

export function canViewOperationalHistory(role) {
  return roleIsIncluded(role, HISTORY_VIEW_ROLES);
}

export function isReadOnlyRole(role) {
  return roleIsIncluded(role, READ_ONLY_ROLES);
}
