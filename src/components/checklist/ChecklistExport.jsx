import { CalendarRange, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { CHECKLIST_ITEMS } from "../../data/checklistItems";

import { supabase } from "../../lib/supabase";

import { canExportReports, getRoleLabel } from "../../utils/roles";

const REPORT_NAME = "OPS Check-List GRU - Turnaround Report";

const STATUS_LABELS = {
  pending: "Pending",
  on_time: "On Time",
  light_delay: "Slightly Delayed",
  delay: "Delayed",
};

const STATUS_STYLES = {
  Pending: {
    fill: "FFE5E7EB",
    font: "FF4B5563",
  },
  "On Time": {
    fill: "FFD1FAE5",
    font: "FF166534",
  },
  "Slightly Delayed": {
    fill: "FFFFE7C2",
    font: "FF9A3412",
  },
  Delayed: {
    fill: "FFFECACA",
    font: "FF991B1B",
  },
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth() {
  const currentDate = new Date();

  const year = currentDate.getFullYear();

  const month = String(currentDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(parsedDate);
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function formatChecklistStatus(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPerformanceStatus(value) {
  return STATUS_LABELS[value] || "Pending";
}

function formatVariance(delaySeconds) {
  if (delaySeconds === null || delaySeconds === undefined) {
    return "";
  }

  if (delaySeconds === 0) {
    return "On target";
  }

  const absoluteMinutes = Math.max(1, Math.round(Math.abs(delaySeconds) / 60));

  const sign = delaySeconds < 0 ? "-" : "+";

  return `${sign}${absoluteMinutes} min`;
}

function normalizeActivity(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getReportingScope(phase) {
  return phase === "Pre-Arrival"
    ? "Pre-Arrival Readiness"
    : "Turnaround Operation";
}

function getImpactLabel(impactCategory) {
  switch (impactCategory) {
    case "high":
      return "High Impact";

    case "low":
      return "Low Impact";

    default:
      return "Medium Impact";
  }
}

function styleWorksheet(worksheet) {
  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  worksheet.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: 1,
      column: worksheet.columnCount,
    },
  };

  const headerRow = worksheet.getRow(1);

  headerRow.height = 28;

  headerRow.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0B2545",
    },
  };

  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 22;
    }

    row.alignment = {
      vertical: "top",
      wrapText: true,
    };
  });
}

function applyStatusStyle(row, statusLabel) {
  const statusStyle = STATUS_STYLES[statusLabel];

  if (!statusStyle) {
    return;
  }

  const statusCell = row.getCell("performanceStatus");

  statusCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: statusStyle.fill,
    },
  };

  statusCell.font = {
    bold: true,
    color: {
      argb: statusStyle.font,
    },
  };

  statusCell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
}

function buildItemLookup(items) {
  const byTaskCode = new Map();

  const byActivity = new Map();

  const byItemNumber = new Map();

  for (const item of items) {
    if (item.task_code) {
      byTaskCode.set(item.task_code, item);
    }

    if (item.activity) {
      byActivity.set(normalizeActivity(item.activity), item);
    }

    if (item.item_number !== null && item.item_number !== undefined) {
      byItemNumber.set(item.item_number, item);
    }
  }

  return {
    byTaskCode,
    byActivity,
    byItemNumber,
  };
}

function findSavedItem(task, lookup) {
  return (
    lookup.byTaskCode.get(task.taskCode) ||
    lookup.byActivity.get(normalizeActivity(task.activity)) ||
    lookup.byItemNumber.get(task.itemNumber) ||
    null
  );
}

function downloadWorkbook(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;

  document.body.appendChild(link);

  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

export default function ChecklistExport({ profile }) {
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth);

  const [toDate, setToDate] = useState(getToday);

  const [exporting, setExporting] = useState(false);

  const exportAllowed = canExportReports(profile?.role);

  async function exportToExcel() {
    if (exporting) {
      return;
    }

    try {
      if (!exportAllowed) {
        throw new Error(
          "Your role does not have permission to export reports.",
        );
      }

      if (!fromDate || !toDate) {
        throw new Error("Select both the From Date and To Date.");
      }

      if (fromDate > toDate) {
        throw new Error("The From Date cannot be later than the To Date.");
      }

      setExporting(true);

      const excelModule = await import("exceljs");

      const ExcelJS = excelModule.default || excelModule;

      const { data: checklists, error: checklistError } = await supabase
        .from("ramp_checklists")
        .select(
          [
            "id",
            "flight_in",
            "flight_out",
            "flight_date",
            "bay",
            "aircraft_type",
            "registration",
            "sta",
            "eta",
            "ata",
            "chocks_on",
            "std",
            "defined_push_time",
            "trc_coordinator",
            "checklist_status",
            "is_locked",
            "approved_by",
            "approved_at",
            "approval_notes",
            "updated_at",
          ].join(","),
        )
        .gte("flight_date", fromDate)
        .lte("flight_date", toDate)
        .order("flight_date", {
          ascending: true,
        })
        .order("flight_out", {
          ascending: true,
        });

      if (checklistError) {
        throw checklistError;
      }

      if (!checklists?.length) {
        throw new Error(
          "No checklists were found for the selected date range.",
        );
      }

      const checklistIds = checklists.map((checklist) => checklist.id);

      const { data: checklistItems, error: itemsError } = await supabase
        .from("ramp_checklist_items")
        .select(
          [
            "checklist_id",
            "task_code",
            "item_number",
            "phase",
            "activity",
            "impact_category",
            "base_time",
            "planned_offset_seconds",
            "planned_time",
            "actual_time",
            "delay_seconds",
            "operational_status",
            "observation",
            "started_at",
            "started_by",
            "completed_at",
            "completed_by",
          ].join(","),
        )
        .in("checklist_id", checklistIds)
        .order("checklist_id", {
          ascending: true,
        })
        .order("item_number", {
          ascending: true,
        });

      if (itemsError) {
        throw itemsError;
      }

      const itemsByChecklist = new Map();

      for (const item of checklistItems || []) {
        if (!itemsByChecklist.has(item.checklist_id)) {
          itemsByChecklist.set(item.checklist_id, []);
        }

        itemsByChecklist.get(item.checklist_id).push(item);
      }

      const workbook = new ExcelJS.Workbook();

      workbook.creator = profile?.full_name || REPORT_NAME;

      workbook.created = new Date();

      workbook.modified = new Date();

      workbook.title = `${REPORT_NAME} ${fromDate} to ${toDate}`;

      workbook.subject = "PTS-aligned GRU operational export";

      const summarySheet = workbook.addWorksheet("Checklist Summary");

      summarySheet.columns = [
        {
          header: "Checklist ID",
          key: "checklistId",
          width: 38,
        },
        {
          header: "Flight Date",
          key: "flightDate",
          width: 15,
        },
        {
          header: "Flight In",
          key: "flightIn",
          width: 14,
        },
        {
          header: "Flight Out",
          key: "flightOut",
          width: 14,
        },
        {
          header: "Bay",
          key: "bay",
          width: 12,
        },
        {
          header: "Aircraft Type",
          key: "aircraftType",
          width: 18,
        },
        {
          header: "Registration",
          key: "registration",
          width: 18,
        },
        {
          header: "STA",
          key: "sta",
          width: 10,
        },
        {
          header: "ETA",
          key: "eta",
          width: 10,
        },
        {
          header: "ATA",
          key: "ata",
          width: 10,
        },
        {
          header: "Chocks On",
          key: "chocksOn",
          width: 12,
        },
        {
          header: "STD",
          key: "std",
          width: 10,
        },
        {
          header: "Defined Push",
          key: "definedPush",
          width: 14,
        },
        {
          header: "Coordinator",
          key: "coordinator",
          width: 24,
        },
        {
          header: "Checklist Status",
          key: "status",
          width: 18,
        },
        {
          header: "Checklist Completed",
          key: "completed",
          width: 20,
        },
        {
          header: "Pre-Arrival Total",
          key: "preArrivalTotal",
          width: 17,
        },
        {
          header: "Pre-Arrival Completed",
          key: "preArrivalCompleted",
          width: 22,
        },
        {
          header: "Pre-Arrival Pending",
          key: "preArrivalPending",
          width: 20,
        },
        {
          header: "Operational Total",
          key: "operationalTotal",
          width: 18,
        },
        {
          header: "Operational Completed",
          key: "operationalCompleted",
          width: 22,
        },
        {
          header: "Operational Pending",
          key: "operationalPending",
          width: 20,
        },
        {
          header: "Operational On Time",
          key: "onTime",
          width: 20,
        },
        {
          header: "Operational Slightly Delayed",
          key: "slightlyDelayed",
          width: 27,
        },
        {
          header: "Operational Delayed",
          key: "delayed",
          width: 20,
        },
        {
          header: "Locked",
          key: "locked",
          width: 10,
        },
        {
          header: "Approved By",
          key: "approvedBy",
          width: 38,
        },
        {
          header: "Approved At",
          key: "approvedAt",
          width: 23,
        },
        {
          header: "Approval Notes",
          key: "approvalNotes",
          width: 34,
        },
        {
          header: "Updated At",
          key: "updatedAt",
          width: 23,
        },
      ];

      for (const checklist of checklists) {
        const savedItems = itemsByChecklist.get(checklist.id) || [];

        const lookup = buildItemLookup(savedItems);

        const taskRows = CHECKLIST_ITEMS.map((task) => ({
          task,
          savedItem: findSavedItem(task, lookup),
        }));

        const preArrivalRows = taskRows.filter(
          ({ task }) => task.phase === "Pre-Arrival",
        );

        const operationalRows = taskRows.filter(
          ({ task }) => task.phase !== "Pre-Arrival",
        );

        const countCompleted = (scopedRows) =>
          scopedRows.filter(
            ({ savedItem }) =>
              savedItem && savedItem.operational_status !== "pending",
          ).length;

        const countStatus = (scopedRows, status) =>
          scopedRows.filter(
            ({ savedItem }) => savedItem?.operational_status === status,
          ).length;

        const completed = countCompleted(taskRows);

        const preArrivalCompleted = countCompleted(preArrivalRows);

        const operationalCompleted = countCompleted(operationalRows);

        summarySheet.addRow({
          checklistId: checklist.id,
          flightDate: checklist.flight_date,
          flightIn: checklist.flight_in || "",
          flightOut: checklist.flight_out || "",
          bay: checklist.bay || "",
          aircraftType: checklist.aircraft_type || "",
          registration: checklist.registration || "",
          sta: formatTime(checklist.sta),
          eta: formatTime(checklist.eta),
          ata: formatTime(checklist.ata),
          chocksOn: formatTime(checklist.chocks_on),
          std: formatTime(checklist.std),
          definedPush: formatTime(checklist.defined_push_time || checklist.std),
          coordinator: checklist.trc_coordinator || "",
          status: formatChecklistStatus(checklist.checklist_status),
          completed,
          preArrivalTotal: preArrivalRows.length,
          preArrivalCompleted,
          preArrivalPending: preArrivalRows.length - preArrivalCompleted,
          operationalTotal: operationalRows.length,
          operationalCompleted,
          operationalPending: operationalRows.length - operationalCompleted,
          onTime: countStatus(operationalRows, "on_time"),
          slightlyDelayed: countStatus(operationalRows, "light_delay"),
          delayed: countStatus(operationalRows, "delay"),
          locked: checklist.is_locked ? "Yes" : "No",
          approvedBy: checklist.approved_by || "",
          approvedAt: formatTimestamp(checklist.approved_at),
          approvalNotes: checklist.approval_notes || "",
          updatedAt: formatTimestamp(checklist.updated_at),
        });
      }

      styleWorksheet(summarySheet);

      const activitySheet = workbook.addWorksheet("PTS Activities");

      activitySheet.columns = [
        {
          header: "Checklist ID",
          key: "checklistId",
          width: 38,
        },
        {
          header: "Flight Date",
          key: "flightDate",
          width: 15,
        },
        {
          header: "Flight Out",
          key: "flightOut",
          width: 14,
        },
        {
          header: "Registration",
          key: "registration",
          width: 18,
        },
        {
          header: "Task Code",
          key: "taskCode",
          width: 18,
        },
        {
          header: "Task Number",
          key: "taskNumber",
          width: 13,
        },
        {
          header: "Reporting Scope",
          key: "reportingScope",
          width: 24,
        },
        {
          header: "Phase",
          key: "phase",
          width: 16,
        },
        {
          header: "Activity",
          key: "activity",
          width: 52,
        },
        {
          header: "Impact Category",
          key: "impactCategory",
          width: 18,
        },
        {
          header: "Timing Base",
          key: "timingBase",
          width: 15,
        },
        {
          header: "Planned Offset Seconds",
          key: "plannedOffsetSeconds",
          width: 23,
        },
        {
          header: "PTS Planned",
          key: "plannedTime",
          width: 14,
        },
        {
          header: "Actual",
          key: "actualTime",
          width: 12,
        },
        {
          header: "Variance",
          key: "variance",
          width: 14,
        },
        {
          header: "Performance Status",
          key: "performanceStatus",
          width: 20,
        },
        {
          header: "Observation",
          key: "observation",
          width: 45,
        },
        {
          header: "Started At",
          key: "startedAt",
          width: 23,
        },
        {
          header: "Started By",
          key: "startedBy",
          width: 38,
        },
        {
          header: "Completed At",
          key: "completedAt",
          width: 23,
        },
        {
          header: "Completed By",
          key: "completedBy",
          width: 38,
        },
      ];

      for (const checklist of checklists) {
        const savedItems = itemsByChecklist.get(checklist.id) || [];

        const lookup = buildItemLookup(savedItems);

        for (const task of CHECKLIST_ITEMS) {
          const savedItem = findSavedItem(task, lookup);

          const statusLabel = formatPerformanceStatus(
            savedItem?.operational_status,
          );

          const row = activitySheet.addRow({
            checklistId: checklist.id,
            flightDate: checklist.flight_date,
            flightOut: checklist.flight_out || "",
            registration: checklist.registration || "",
            taskCode: task.taskCode,
            taskNumber: task.itemNumber,
            reportingScope: getReportingScope(task.phase),
            phase: task.phase,
            activity: task.activity,
            impactCategory: getImpactLabel(task.impactCategory),
            timingBase: task.base,
            plannedOffsetSeconds: task.offsetSec,
            plannedTime: formatTime(savedItem?.planned_time),
            actualTime: formatTime(savedItem?.actual_time),
            variance: formatVariance(savedItem?.delay_seconds),
            performanceStatus: statusLabel,
            observation: savedItem?.observation || "",
            startedAt: formatTimestamp(savedItem?.started_at),
            startedBy: savedItem?.started_by || "",
            completedAt: formatTimestamp(savedItem?.completed_at),
            completedBy: savedItem?.completed_by || "",
          });

          applyStatusStyle(row, statusLabel);
        }
      }

      styleWorksheet(activitySheet);

      const informationSheet = workbook.addWorksheet("Report Information");

      informationSheet.columns = [
        {
          header: "Field",
          key: "field",
          width: 28,
        },
        {
          header: "Value",
          key: "value",
          width: 60,
        },
      ];

      informationSheet.addRows([
        {
          field: "Report",
          value: `${REPORT_NAME} Date Range Export`,
        },
        {
          field: "From Date",
          value: fromDate,
        },
        {
          field: "To Date",
          value: toDate,
        },
        {
          field: "Exported By",
          value: profile?.full_name || "Authenticated User",
        },
        {
          field: "Role",
          value: getRoleLabel(profile?.role),
        },
        {
          field: "Exported At",
          value: formatTimestamp(new Date().toISOString()),
        },
        {
          field: "Checklist Count",
          value: checklists.length,
        },
        {
          field: "PTS Activities per Checklist",
          value: CHECKLIST_ITEMS.length,
        },
      ]);

      styleWorksheet(informationSheet);

      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `OPS-GRU-Turnaround-Report-${fromDate}-to-${toDate}.xlsx`;

      downloadWorkbook(buffer, filename);

      window.alert(
        "Excel report created successfully.\n\n" +
          `Checklists: ${checklists.length}\n` +
          `PTS rows: ${checklists.length * CHECKLIST_ITEMS.length}`,
      );
    } catch (error) {
      console.error("Excel export failed:", error);

      window.alert(
        "The Excel report could not be created.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setExporting(false);
    }
  }

  if (!exportAllowed) {
    return null;
  }

  return (
    <section className="export-panel" aria-busy={exporting}>
      <div className="export-heading">
        <div>
          <p className="ramp-eyebrow">Operational reporting</p>

          <h3>Export PTS checklist data</h3>

          <p>
            Select a flight-date range and download the authorised{" "}
            {CHECKLIST_ITEMS.length}
            -activity PTS report as an Excel workbook.
          </p>
        </div>

        <FileSpreadsheet size={28} aria-hidden="true" />
      </div>

      <div className="export-controls">
        <label>
          <span>From Date</span>

          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(event) => setFromDate(event.target.value)}
            disabled={exporting}
          />
        </label>

        <label>
          <span>To Date</span>

          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(event) => setToDate(event.target.value)}
            disabled={exporting}
          />
        </label>

        <button
          type="button"
          className="ramp-button ramp-button-green"
          onClick={exportToExcel}
          disabled={exporting}
          aria-disabled={exporting}
        >
          {exporting ? (
            <LoaderCircle size={17} className="spin" aria-hidden="true" />
          ) : (
            <CalendarRange size={17} aria-hidden="true" />
          )}

          {exporting ? "Creating Excel..." : "Export Excel"}
        </button>
      </div>
    </section>
  );
}
