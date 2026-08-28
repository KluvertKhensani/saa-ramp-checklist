export const ROLE_LABELS = {
  administrator: "Administrator",
  occ_manager: "OCC Manager",
  controller: "Controller",
  trc_coordinator: "TRC Coordinator",
  turnaround_coordinator: "Turnaround Coordinator",
  ramp_agent: "Ramp Agent",
  qa_inspector: "QA Inspector",
  viewer: "Viewer",
  auditor: "Auditor",
};

export function getRoleLabel(role) {
  if (!role) {
    return "User";
  }

  return ROLE_LABELS[role] || role;
}

export function canApproveChecklist(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "qa_inspector",
  ].includes(role);
}

export function canOperateChecklist(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "trc_coordinator",
    "turnaround_coordinator",
    "ramp_agent",
  ].includes(role);
}

export function canExportReports(role) {
  return [
    "administrator",
    "occ_manager",
    "controller",
    "turnaround_coordinator",
    "qa_inspector",
    "auditor",
  ].includes(role);
}