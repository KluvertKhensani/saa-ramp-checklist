import {
  CalendarRange,
  FileSpreadsheet,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import ExcelJS from "exceljs";

import { supabase } from "../../lib/supabase";
import {
  canExportReports,
  getRoleLabel,
} from "../../utils/roles";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();

  const month = String(
    currentDate.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
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

function downloadWorkbook(buffer, filename) {
  const blob = new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

export default function ChecklistExport({
  profile,
}) {
  const [fromDate, setFromDate] = useState(
    getFirstDayOfMonth
  );

  const [toDate, setToDate] = useState(
    getToday
  );

  const [exporting, setExporting] =
    useState(false);

  const exportAllowed = canExportReports(
    profile?.role
  );

  async function exportToExcel() {
    try {
      if (!exportAllowed) {
        throw new Error(
          "Your role does not have permission to export reports."
        );
      }

      if (!fromDate || !toDate) {
        throw new Error(
          "Select both the From Date and To Date."
        );
      }

      if (fromDate > toDate) {
        throw new Error(
          "The From Date cannot be later than the To Date."
        );
      }

      setExporting(true);

      const {
        data: checklists,
        error: checklistError,
      } = await supabase
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
            "trc_coordinator",
            "checklist_status",
            "is_locked",
            "approved_at",
            "approval_notes",
            "created_at",
            "updated_at",
          ].join(",")
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
          "No checklists were found for the selected date range."
        );
      }

      const checklistIds = checklists.map(
        (checklist) => checklist.id
      );

      const {
        data: checklistItems,
        error: itemsError,
      } = await supabase
        .from("ramp_checklist_items")
        .select(
          [
            "checklist_id",
            "item_number",
            "phase",
            "activity",
            "planned_time",
            "actual_time",
            "delay_seconds",
            "operational_status",
            "observation",
            "completed_at",
          ].join(",")
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

      const checklistById = new Map(
        checklists.map((checklist) => [
          checklist.id,
          checklist,
        ])
      );

      const workbook = new ExcelJS.Workbook();

      workbook.creator =
        profile?.full_name ||
        "SAA Ramp Checklist";

      workbook.created = new Date();
      workbook.modified = new Date();

      workbook.title =
        `SAA Ramp Checklist ${fromDate} to ${toDate}`;

      workbook.subject =
        "SAA Ramp Checklist Operational Export";

      const summarySheet =
        workbook.addWorksheet(
          "Checklist Summary"
        );

      summarySheet.columns = [
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
          width: 12,
        },
        {
          header: "ETA",
          key: "eta",
          width: 12,
        },
        {
          header: "ATA",
          key: "ata",
          width: 12,
        },
        {
          header: "Chocks On",
          key: "chocksOn",
          width: 14,
        },
        {
          header: "STD",
          key: "std",
          width: 12,
        },
        {
          header: "Coordinator",
          key: "coordinator",
          width: 24,
        },
        {
          header: "Status",
          key: "status",
          width: 17,
        },
        {
          header: "Locked",
          key: "locked",
          width: 11,
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

      checklists.forEach((checklist) => {
        summarySheet.addRow({
          flightDate:
            checklist.flight_date,
          flightIn:
            checklist.flight_in || "",
          flightOut:
            checklist.flight_out || "",
          bay:
            checklist.bay || "",
          aircraftType:
            checklist.aircraft_type || "",
          registration:
            checklist.registration || "",
          sta:
            checklist.sta || "",
          eta:
            checklist.eta || "",
          ata:
            checklist.ata || "",
          chocksOn:
            checklist.chocks_on || "",
          std:
            checklist.std || "",
          coordinator:
            checklist.trc_coordinator || "",
          status:
            checklist.checklist_status || "",
          locked:
            checklist.is_locked
              ? "Yes"
              : "No",
          approvedAt:
            formatTimestamp(
              checklist.approved_at
            ),
          approvalNotes:
            checklist.approval_notes || "",
          updatedAt:
            formatTimestamp(
              checklist.updated_at
            ),
        });
      });

      styleWorksheet(summarySheet);

      const activitySheet =
        workbook.addWorksheet(
          "Checklist Activities"
        );

      activitySheet.columns = [
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
          header: "Item Number",
          key: "itemNumber",
          width: 13,
        },
        {
          header: "Phase",
          key: "phase",
          width: 22,
        },
        {
          header: "Activity",
          key: "activity",
          width: 42,
        },
        {
          header: "Planned Time",
          key: "plannedTime",
          width: 15,
        },
        {
          header: "Actual Time",
          key: "actualTime",
          width: 15,
        },
        {
          header: "Delay Seconds",
          key: "delaySeconds",
          width: 16,
        },
        {
          header: "Status",
          key: "status",
          width: 18,
        },
        {
          header: "Observation",
          key: "observation",
          width: 45,
        },
        {
          header: "Completed At",
          key: "completedAt",
          width: 23,
        },
      ];

      (checklistItems || []).forEach(
        (item) => {
          const checklist =
            checklistById.get(
              item.checklist_id
            );

          activitySheet.addRow({
            flightDate:
              checklist?.flight_date || "",
            flightOut:
              checklist?.flight_out || "",
            registration:
              checklist?.registration || "",
            itemNumber:
              item.item_number,
            phase:
              item.phase,
            activity:
              item.activity,
            plannedTime:
              item.planned_time || "",
            actualTime:
              item.actual_time || "",
            delaySeconds:
              item.delay_seconds,
            status:
              item.operational_status,
            observation:
              item.observation || "",
            completedAt:
              formatTimestamp(
                item.completed_at
              ),
          });
        }
      );

      styleWorksheet(activitySheet);

      const informationSheet =
        workbook.addWorksheet(
          "Report Information"
        );

      informationSheet.columns = [
        {
          header: "Field",
          key: "field",
          width: 28,
        },
        {
          header: "Value",
          key: "value",
          width: 55,
        },
      ];

      informationSheet.addRows([
        {
          field: "Report",
          value:
            "SAA Ramp Checklist Date Range Export",
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
          value:
            profile?.full_name ||
            "Authenticated User",
        },
        {
          field: "Role",
          value: getRoleLabel(
            profile?.role
          ),
        },
        {
          field: "Exported At",
          value: formatTimestamp(
            new Date().toISOString()
          ),
        },
        {
          field: "Checklist Count",
          value: checklists.length,
        },
        {
          field: "Activity Count",
          value:
            checklistItems?.length || 0,
        },
      ]);

      styleWorksheet(informationSheet);

      const buffer =
        await workbook.xlsx.writeBuffer();

      const filename =
        `SAA-Ramp-Checklist-${fromDate}-to-${toDate}.xlsx`;

      downloadWorkbook(
        buffer,
        filename
      );

      window.alert(
        "Excel report created successfully.\n\n" +
          `Checklists: ${checklists.length}\n` +
          `Activities: ${checklistItems?.length || 0}`
      );
    } catch (error) {
      console.error(
        "Excel export failed:",
        error
      );

      window.alert(
        "The Excel report could not be created.\n\n" +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setExporting(false);
    }
  }

  if (!exportAllowed) {
    return null;
  }

  return (
    <section className="export-panel">
      <div className="export-heading">
        <div>
          <p className="ramp-eyebrow">
            Operational reporting
          </p>

          <h3>
            Export checklist data
          </h3>

          <p>
            Select a flight-date range
            and download the authorised
            records as an Excel workbook.
          </p>
        </div>

        <FileSpreadsheet size={28} />
      </div>

      <div className="export-controls">
        <label>
          <span>From Date</span>

          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(event) =>
              setFromDate(
                event.target.value
              )
            }
          />
        </label>

        <label>
          <span>To Date</span>

          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(event) =>
              setToDate(
                event.target.value
              )
            }
          />
        </label>

        <button
          type="button"
          className="ramp-button ramp-button-green"
          onClick={exportToExcel}
          disabled={exporting}
        >
          {exporting ? (
            <LoaderCircle
              size={17}
              className="spin"
            />
          ) : (
            <CalendarRange size={17} />
          )}

          {exporting
            ? "Creating Excel..."
            : "Export Excel"}
        </button>
      </div>
    </section>
  );
}