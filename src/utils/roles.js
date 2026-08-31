export const ROLE_LABELS = {
  administrator: "Administrator",
  occ_manager: "OCC Manager",
  controller: "Controller",
  qa_inspector: "QA Inspector",
  trc_coordinator: "TRC Coordinator",
  turnaround_coordinator:
    "Turnaround Coordinator",
  ramp_agent: "Ramp Agent",
  auditor: "Auditor",
  viewer: "Viewer",
};

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export function getRoleLabel(role) {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole) {
    return "User";
  }

  return (
    ROLE_LABELS[normalizedRole] ||
    normalizedRole
  );
}

export function canCreateChecklist(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "trc_coordinator",
    "turnaround_coordinator",
    "ramp_agent",
  ].includes(normalizeRole(role));
}

export function canOperateChecklist(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "trc_coordinator",
    "turnaround_coordinator",
    "ramp_agent",
  ].includes(normalizeRole(role));
}

export function canApproveChecklist(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "qa_inspector",
    "trc_coordinator",
    "turnaround_coordinator",
  ].includes(normalizeRole(role));
}

export function canExportReports(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "qa_inspector",
    "trc_coordinator",
    "turnaround_coordinator",
    "auditor",
  ].includes(normalizeRole(role));
}

export function canViewAuditHistory(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "qa_inspector",
    "trc_coordinator",
    "turnaround_coordinator",
    "auditor",
  ].includes(normalizeRole(role));
}

export function isReadOnlyRole(role) {
  return [
    "qa_inspector",
    "auditor",
    "viewer",
  ].includes(normalizeRole(role));
}
