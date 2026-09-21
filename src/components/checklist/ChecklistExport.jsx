import {
  CalendarRange,
  FileSpreadsheet,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import {
  CHECKLIST_ITEMS,
} from "../../data/checklistItems";
import { supabase } from "../../lib/supabase";
import {
  canExportReports,
  getRoleLabel,
} from "../../utils/roles";

const REPORT_NAME =
  "OPS Check-List GRU - Turnaround Report";

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
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getFirstDayOfMonth() {
  const currentDate =
    new Date();

  const year =
    currentDate.getFullYear();

  const month = String(
    currentDate.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Africa/Johannesburg",
    }
  ).format(new Date(value));
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(
    0,
    5
  );
}

function formatChecklistStatus(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .split("_")
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatPerformanceStatus(
  value
) {
  return (
    STATUS_LABELS[value] ||
    "Pending"
  );
}

function formatVariance(
  delaySeconds
) {
  if (
    delaySeconds === null ||
    delaySeconds === undefined
  ) {
    return "";
  }

  if (delaySeconds === 0) {
    return "On target";
  }

  const absoluteMinutes =
    Math.max(
      1,
      Math.round(
        Math.abs(delaySeconds) /
          60
      )
    );

  const sign =
    delaySeconds < 0
      ? "-"
      : "+";

  return `${sign}${absoluteMinutes} min`;
}

function normalizeActivity(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function styleWorksheet(
  worksheet
) {
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
      column:
        worksheet.columnCount,
    },
  };

  const headerRow =
    worksheet.getRow(1);

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

  worksheet.eachRow(
    (row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 22;
      }

      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }
  );
}

function applyStatusStyle(
  row,
  statusLabel
) {
  const statusStyle =
    STATUS_STYLES[
      statusLabel
    ];

  if (!statusStyle) {
    return;
  }

  const statusCell =
    row.getCell(
      "performanceStatus"
    );

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
  const byTaskCode =
    new Map();

  const byActivity =
    new Map();

  const byItemNumber =
    new Map();

  for (const item of items) {
    if (item.task_code) {
      byTaskCode.set(
        item.task_code,
        item
      );
    }

    if (item.activity) {
      byActivity.set(
        normalizeActivity(
          item.activity
        ),
        item
      );
    }

    if (
      item.item_number !== null &&
      item.item_number !==
        undefined
    ) {
      byItemNumber.set(
        item.item_number,
        item
      );
    }
  }

  return {
    byTaskCode,
    byActivity,
    byItemNumber,
  };
}

function findSavedItem(
  task,
  lookup
) {
  return (
    lookup.byTaskCode.get(
      task.taskCode
    ) ||
    lookup.byActivity.get(
      normalizeActivity(
        task.activity
      )
    ) ||
    lookup.byItemNumber.get(
      task.itemNumber
    ) ||
    null
  );
}

function downloadWorkbook(
  buffer,
  filename
) {
  const blob = new Blob(
    [buffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  const downloadUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(
      downloadUrl
    );
  }, 1000);
}

export default function ChecklistExport({
  profile,
}) {
  const [
    fromDate,
    setFromDate,
  ] = useState(
    getFirstDayOfMonth
  );

  const [
    toDate,
    setToDate,
  ] = useState(getToday);

  const [
    exporting,
    setExporting,
  ] = useState(false);

  const exportAllowed =
    canExportReports(
      profile?.role
    );

  async function exportToExcel() {
    try {
      if (!exportAllowed) {
        throw new Error(
          "Your role does not have permission to export reports."
        );
      }

      if (
        !fromDate ||
        !toDate
      ) {
        throw new Error(
          "Select both the From Date and To Date."
        );
      }

      if (
        fromDate > toDate
      ) {
        throw new Error(
          "The From Date cannot be later than the To Date."
        );
      }

      setExporting(true);

      const excelModule =
        await import(
          "exceljs"
        );

      const ExcelJS =
        excelModule.default ||
        excelModule;

      const {
        data: checklists,
        error: checklistError,
      } = await supabase
        .from(
          "ramp_checklists"
        )
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
            "updated_at",
          ].join(",")
        )
        .gte(
          "flight_date",
          fromDate
        )
        .lte(
          "flight_date",
          toDate
        )
        .order(
          "flight_date",
          {
            ascending: true,
          }
        )
        .order(
          "flight_out",
          {
            ascending: true,
          }
        );

      if (checklistError) {
        throw checklistError;
      }

      if (
        !checklists?.length
      ) {
        throw new Error(
          "No checklists were found for the selected date range."
        );
      }

      const checklistIds =
        checklists.map(
          (checklist) =>
            checklist.id
        );

      const {
        data: checklistItems,
        error: itemsError,
      } = await supabase
        .from(
          "ramp_checklist_items"
        )
        .select(
          [
            "checklist_id",
            "task_code",
            "item_number",
            "phase",
            "activity",
            "planned_time",
            "actual_time",
            "delay_seconds",
            "operational_status",
            "observation",
          ].join(",")
        )
        .in(
          "checklist_id",
          checklistIds
        )
        .order(
          "checklist_id",
          {
            ascending: true,
          }
        )
        .order(
          "item_number",
          {
            ascending: true,
          }
        );

      if (itemsError) {
        throw itemsError;
      }

      const itemsByChecklist =
        new Map();

      for (
        const item of
        checklistItems || []
      ) {
        if (
          !itemsByChecklist.has(
            item.checklist_id
          )
        ) {
          itemsByChecklist.set(
            item.checklist_id,
            []
          );
        }

        itemsByChecklist
          .get(
            item.checklist_id
          )
          .push(item);
      }

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        profile?.full_name ||
        REPORT_NAME;

      workbook.created =
        new Date();

      workbook.modified =
        new Date();

      workbook.title =
        `${REPORT_NAME} ${fromDate} to ${toDate}`;

      workbook.subject =
        "PTS-aligned GRU operational export";

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
          header:
            "Aircraft Type",
          key: "aircraftType",
          width: 18,
        },
        {
          header:
            "Registration",
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
          header:
            "Coordinator",
          key: "coordinator",
          width: 24,
        },
        {
          header:
            "Checklist Status",
          key: "status",
          width: 18,
        },
        {
          header: "Completed",
          key: "completed",
          width: 12,
        },
        {
          header: "On Time",
          key: "onTime",
          width: 11,
        },
        {
          header:
            "Slightly Delayed",
          key:
            "slightlyDelayed",
          width: 17,
        },
        {
          header: "Delayed",
          key: "delayed",
          width: 11,
        },
        {
          header: "Pending",
          key: "pending",
          width: 11,
        },
        {
          header: "Locked",
          key: "locked",
          width: 10,
        },
        {
          header: "Approved At",
          key: "approvedAt",
          width: 23,
        },
        {
          header:
            "Approval Notes",
          key:
            "approvalNotes",
          width: 34,
        },
        {
          header: "Updated At",
          key: "updatedAt",
          width: 23,
        },
      ];

      for (
        const checklist of
        checklists
      ) {
        const savedItems =
          itemsByChecklist.get(
            checklist.id
          ) || [];

        const lookup =
          buildItemLookup(
            savedItems
          );

        const orderedRows =
          CHECKLIST_ITEMS.map(
            (task) =>
              findSavedItem(
                task,
                lookup
              )
          );

        const completed =
          orderedRows.filter(
            (item) =>
              item &&
              item.operational_status !==
                "pending"
          ).length;

        const onTime =
          orderedRows.filter(
            (item) =>
              item?.operational_status ===
              "on_time"
          ).length;

        const slightlyDelayed =
          orderedRows.filter(
            (item) =>
              item?.operational_status ===
              "light_delay"
          ).length;

        const delayed =
          orderedRows.filter(
            (item) =>
              item?.operational_status ===
              "delay"
          ).length;

        summarySheet.addRow({
          flightDate:
            checklist.flight_date,
          flightIn:
            checklist.flight_in ||
            "",
          flightOut:
            checklist.flight_out ||
            "",
          bay:
            checklist.bay || "",
          aircraftType:
            checklist.aircraft_type ||
            "",
          registration:
            checklist.registration ||
            "",
          sta:
            formatTime(
              checklist.sta
            ),
          eta:
            formatTime(
              checklist.eta
            ),
          ata:
            formatTime(
              checklist.ata
            ),
          chocksOn:
            formatTime(
              checklist.chocks_on
            ),
          std:
            formatTime(
              checklist.std
            ),
          coordinator:
            checklist.trc_coordinator ||
            "",
          status:
            formatChecklistStatus(
              checklist.checklist_status
            ),
          completed,
          onTime,
          slightlyDelayed,
          delayed,
          pending:
            CHECKLIST_ITEMS.length -
            completed,
          locked:
            checklist.is_locked
              ? "Yes"
              : "No",
          approvedAt:
            formatTimestamp(
              checklist.approved_at
            ),
          approvalNotes:
            checklist.approval_notes ||
            "",
          updatedAt:
            formatTimestamp(
              checklist.updated_at
            ),
        });
      }

      styleWorksheet(
        summarySheet
      );

      const activitySheet =
        workbook.addWorksheet(
          "PTS Activities"
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
          header:
            "Registration",
          key: "registration",
          width: 18,
        },
        {
          header: "Sequence",
          key: "sequence",
          width: 11,
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
          header:
            "PTS Planned",
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
          header:
            "Performance Status",
          key:
            "performanceStatus",
          width: 20,
        },
        {
          header:
            "Observation",
          key: "observation",
          width: 45,
        },
      ];

      for (
        const checklist of
        checklists
      ) {
        const savedItems =
          itemsByChecklist.get(
            checklist.id
          ) || [];

        const lookup =
          buildItemLookup(
            savedItems
          );

        for (
          const task of
          CHECKLIST_ITEMS
        ) {
          const savedItem =
            findSavedItem(
              task,
              lookup
            );

          const statusLabel =
            formatPerformanceStatus(
              savedItem
                ?.operational_status
            );

          const row =
            activitySheet.addRow({
              flightDate:
                checklist.flight_date,
              flightOut:
                checklist.flight_out ||
                "",
              registration:
                checklist.registration ||
                "",
              sequence:
                task.sequence,
              phase: task.phase,
              activity:
                task.activity,
              plannedTime:
                formatTime(
                  savedItem
                    ?.planned_time
                ),
              actualTime:
                formatTime(
                  savedItem
                    ?.actual_time
                ),
              variance:
                formatVariance(
                  savedItem
                    ?.delay_seconds
                ),
              performanceStatus:
                statusLabel,
              observation:
                savedItem
                  ?.observation ||
                "",
            });

          applyStatusStyle(
            row,
            statusLabel
          );
        }
      }

      styleWorksheet(
        activitySheet
      );

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
          width: 60,
        },
      ];

      informationSheet.addRows([
        {
          field: "Report",
          value:
            `${REPORT_NAME} Date Range Export`,
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
          value:
            getRoleLabel(
              profile?.role
            ),
        },
        {
          field: "Exported At",
          value:
            formatTimestamp(
              new Date()
                .toISOString()
            ),
        },
        {
          field:
            "Checklist Count",
          value:
            checklists.length,
        },
        {
          field:
            "PTS Activities per Checklist",
          value:
            CHECKLIST_ITEMS.length,
        },
      ]);

      styleWorksheet(
        informationSheet
      );

      const buffer =
        await workbook.xlsx
          .writeBuffer();

      const filename =
        `OPS-GRU-Turnaround-Report-${fromDate}-to-${toDate}.xlsx`;

      downloadWorkbook(
        buffer,
        filename
      );

      window.alert(
        "Excel report created successfully.\n\n" +
          `Checklists: ${checklists.length}\n` +
          `PTS rows: ${
            checklists.length *
            CHECKLIST_ITEMS.length
          }`
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
            Export PTS checklist data
          </h3>

          <p>
            Select a flight-date range
            and download the authorised
            47-activity PTS report as an
            Excel workbook.
          </p>
        </div>

        <FileSpreadsheet
          size={28}
          aria-hidden="true"
        />
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
              aria-hidden="true"
            />
          ) : (
            <CalendarRange
              size={17}
              aria-hidden="true"
            />
          )}

          {exporting
            ? "Creating Excel..."
            : "Export Excel"}
        </button>
      </div>
    </section>
  );
}