import {
    ArrowLeft,
    Download,
    LoaderCircle,
    RefreshCw,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../../lib/supabase";
import {
    buildAggregatedPowerBiData,
    exportAggregatedPowerBiData,
} from "../../utils/aggregatedPowerBiExport";
import ReportingCharts from "./ReportingCharts";
import ReportingKpis from "./ReportingKpis";
import ReportingMatrix from "./ReportingMatrix";

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

function getDefaultFromDate() {
    const date = new Date();

    date.setDate(date.getDate() - 30);

    return date.toISOString().slice(0, 10);
}

function percentage(value, total) {
    if (!total) {
        return 0;
    }

    return Number(((value / total) * 100).toFixed(1));
}

function createEmptyReportingData() {
    return {
        flights: [],
        activities: [],
        dailyPerformance: [],
        delayAnalysis: [],
    };
}

export default function ManagementReportingDashboard({
    profile,
    onBack,
}) {
    const [fromDate, setFromDate] = useState(
        getDefaultFromDate,
    );

    const [toDate, setToDate] = useState(getTodayDate);

    const [flightSearch, setFlightSearch] = useState("");

    const [aircraftFilter, setAircraftFilter] =
        useState("all");

    const [statusFilter, setStatusFilter] = useState("all");

    const [checklists, setChecklists] = useState([]);

    const [checklistItems, setChecklistItems] = useState([]);

    const [loading, setLoading] = useState(false);

    const [exporting, setExporting] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");

    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

    const loadReportingData = useCallback(async () => {
        if (!fromDate || !toDate) {
            setErrorMessage(
                "Select both a From Date and a To Date.",
            );

            return;
        }

        if (fromDate > toDate) {
            setErrorMessage(
                "The From Date cannot be later than the To Date.",
            );

            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const {
                data: checklistData,
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
                        "defined_push_time",
                        "trc_coordinator",
                        "checklist_status",
                        "is_locked",
                        "approved_by",
                        "approved_at",
                        "approval_notes",
                        "owner_id",
                        "created_at",
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

            const loadedChecklists = checklistData || [];

            if (loadedChecklists.length === 0) {
                setChecklists([]);
                setChecklistItems([]);
                setLastUpdatedAt(new Date());

                return;
            }

            const checklistIds = loadedChecklists.map(
                (checklist) => checklist.id,
            );

            const {
                data: itemData,
                error: itemsError,
            } = await supabase
                .from("ramp_checklist_items")
                .select(
                    [
                        "id",
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

            setChecklists(loadedChecklists);
            setChecklistItems(itemData || []);
            setLastUpdatedAt(new Date());
        } catch (error) {
            console.error(
                "Management reporting data load failed:",
                error,
            );

            setChecklists([]);
            setChecklistItems([]);

            setErrorMessage(
                error?.message ||
                "Management reporting data could not be loaded.",
            );
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => {
        const loadingTimer = window.setTimeout(() => {
            void loadReportingData();
        }, 0);

        return () => {
            window.clearTimeout(loadingTimer);
        };
    }, [loadReportingData]);

    const aircraftOptions = useMemo(() => {
        return [
            ...new Set(
                checklists
                    .map((checklist) => checklist.aircraft_type)
                    .filter(Boolean),
            ),
        ].sort((first, second) =>
            first.localeCompare(second),
        );
    }, [checklists]);

    const filteredChecklists = useMemo(() => {
        const normalizedSearch = flightSearch
            .trim()
            .toLowerCase();

        return checklists.filter((checklist) => {
            const matchesFlight =
                !normalizedSearch ||
                [
                    checklist.flight_in,
                    checklist.flight_out,
                    checklist.registration,
                    checklist.bay,
                ].some((value) =>
                    String(value || "")
                        .toLowerCase()
                        .includes(normalizedSearch),
                );

            const matchesAircraft =
                aircraftFilter === "all" ||
                checklist.aircraft_type === aircraftFilter;

            const matchesStatus =
                statusFilter === "all" ||
                checklist.checklist_status === statusFilter;

            return (
                matchesFlight &&
                matchesAircraft &&
                matchesStatus
            );
        });
    }, [
        aircraftFilter,
        checklists,
        flightSearch,
        statusFilter,
    ]);

    const filteredChecklistIds = useMemo(
        () =>
            new Set(
                filteredChecklists.map(
                    (checklist) => checklist.id,
                ),
            ),
        [filteredChecklists],
    );

    const filteredChecklistItems = useMemo(
        () =>
            checklistItems.filter((item) =>
                filteredChecklistIds.has(item.checklist_id),
            ),
        [checklistItems, filteredChecklistIds],
    );

    const reportingData = useMemo(() => {
        if (filteredChecklists.length === 0) {
            return createEmptyReportingData();
        }

        return buildAggregatedPowerBiData({
            checklists: filteredChecklists,
            checklistItems: filteredChecklistItems,
        });
    }, [filteredChecklists, filteredChecklistItems]);

    const kpis = useMemo(() => {
        const operationalItems =
            filteredChecklistItems.filter(
                (item) => item.phase !== "Pre-Arrival",
            );

        const completedOperationalItems =
            operationalItems.filter(
                (item) =>
                    item.operational_status &&
                    item.operational_status !== "pending",
            );

        const onTimeItems = operationalItems.filter(
            (item) =>
                item.operational_status === "on_time",
        );

        const lightDelayItems = operationalItems.filter(
            (item) =>
                item.operational_status === "light_delay",
        );

        const delayedItems = operationalItems.filter(
            (item) => item.operational_status === "delay",
        );

        const highImpactExceptions =
            operationalItems.filter(
                (item) =>
                    item.impact_category === "high" &&
                    ["light_delay", "delay"].includes(
                        item.operational_status,
                    ),
            );

        const allCompletedItems =
            filteredChecklistItems.filter(
                (item) =>
                    item.operational_status &&
                    item.operational_status !== "pending",
            );

        const completedFlights =
            filteredChecklists.filter(
                (checklist) =>
                    checklist.checklist_status === "completed",
            ).length;

        return {
            totalFlights: filteredChecklists.length,
            completedFlights,
            inProgressFlights:
                filteredChecklists.length - completedFlights,
            totalActivities: filteredChecklistItems.length,
            completedActivities: allCompletedItems.length,
            pendingActivities:
                filteredChecklistItems.length -
                allCompletedItems.length,
            checklistCompletionPercentage: percentage(
                allCompletedItems.length,
                filteredChecklistItems.length,
            ),
            operationalActivities: operationalItems.length,
            operationalCompleted:
                completedOperationalItems.length,
            onTimeActivities: onTimeItems.length,
            lightDelayActivities: lightDelayItems.length,
            delayedActivities: delayedItems.length,
            operationalOnTimePercentage: percentage(
                onTimeItems.length,
                completedOperationalItems.length,
            ),
            highImpactExceptions:
                highImpactExceptions.length,
        };
    }, [filteredChecklists, filteredChecklistItems]);

    const statusData = useMemo(
        () => [
            {
                name: "On Time",
                value: kpis.onTimeActivities,
            },
            {
                name: "Slightly Delayed",
                value: kpis.lightDelayActivities,
            },
            {
                name: "Delayed",
                value: kpis.delayedActivities,
            },
            {
                name: "Pending",
                value:
                    kpis.operationalActivities -
                    kpis.operationalCompleted,
            },
        ],
        [kpis],
    );

    const dailyData = useMemo(
        () =>
            reportingData.dailyPerformance.map((record) => ({
                date: record.flight_date,
                flights: record.total_flights,
                onTimePercentage:
                    record.operational_on_time_percentage,
                completionPercentage:
                    record.operational_completion_percentage,
            })),
        [reportingData.dailyPerformance],
    );

    const phaseData = useMemo(() => {
        const phaseMap = new Map();

        for (const item of filteredChecklistItems) {
            if (item.phase === "Pre-Arrival") {
                continue;
            }

            const phase = item.phase || "Unassigned";

            if (!phaseMap.has(phase)) {
                phaseMap.set(phase, {
                    phase,
                    slightDelay: 0,
                    delay: 0,
                });
            }

            const phaseRecord = phaseMap.get(phase);

            if (item.operational_status === "light_delay") {
                phaseRecord.slightDelay += 1;
            }

            if (item.operational_status === "delay") {
                phaseRecord.delay += 1;
            }
        }

        return [...phaseMap.values()];
    }, [filteredChecklistItems]);

    const delayedActivities = useMemo(
        () =>
            reportingData.delayAnalysis
                .filter(
                    (record) =>
                        record.total_delay_occurrences > 0,
                )
                .slice(0, 8)
                .map((record) => ({
                    activity: record.activity,
                    shortActivity:
                        record.activity.length > 22
                            ? `${record.activity.slice(0, 22)}...`
                            : record.activity,
                    delayCount: record.total_delay_occurrences,
                    averageDelayMinutes:
                        record.average_positive_delay_minutes,
                })),
        [reportingData.delayAnalysis],
    );

    const matrixRows = useMemo(() => {
        const checklistMap = new Map(
            filteredChecklists.map((checklist) => [
                checklist.id,
                checklist,
            ]),
        );

        return filteredChecklistItems.map((item) => {
            const checklist = checklistMap.get(
                item.checklist_id,
            );

            return {
                checklistId: item.checklist_id,
                flightDate: checklist?.flight_date || "",
                flightOut: checklist?.flight_out || "",
                aircraftType:
                    checklist?.aircraft_type || "",
                registration:
                    checklist?.registration || "",
                taskCode: item.task_code || "",
                itemNumber: item.item_number,
                phase: item.phase || "",
                activity: item.activity || "",
                impactCategory:
                    item.impact_category || "",
                plannedTime: item.planned_time || "",
                actualTime: item.actual_time || "",
                delaySeconds: item.delay_seconds,
                operationalStatus:
                    item.operational_status || "pending",
                observation: item.observation || "",
            };
        });
    }, [filteredChecklists, filteredChecklistItems]);

    function clearFilters() {
        setFlightSearch("");
        setAircraftFilter("all");
        setStatusFilter("all");
    }

    function exportReportingData() {
        if (filteredChecklists.length === 0) {
            window.alert(
                "No reporting records match the selected filters.",
            );

            return;
        }

        setExporting(true);

        try {
            const result = exportAggregatedPowerBiData({
                checklists: filteredChecklists,
                checklistItems: filteredChecklistItems,
                fromDate,
                toDate,
            });

            window.alert(
                "Power BI reporting data created successfully.\n\n" +
                `Flights: ${result.flights.length}\n` +
                `Activities: ${result.activities.length}\n` +
                `Files downloaded: ${result.downloadedFiles}`,
            );
        } catch (error) {
            console.error(
                "Aggregated Power BI export failed:",
                error,
            );

            window.alert(
                "The Power BI reporting files could not be created.\n\n" +
                (error?.message || "Unknown export error"),
            );
        } finally {
            setExporting(false);
        }
    }

    return (
        <section
            className="management-reporting-dashboard"
            aria-busy={loading}
        >
            <div className="management-reporting-navigation">
                <button
                    type="button"
                    className="ramp-button ramp-button-light"
                    onClick={onBack}
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Checklist
                </button>

                <button
                    type="button"
                    className="ramp-button ramp-button-primary"
                    onClick={exportReportingData}
                    disabled={
                        exporting ||
                        loading ||
                        filteredChecklists.length === 0
                    }
                >
                    {exporting ? (
                        <LoaderCircle
                            size={17}
                            className="spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Download size={17} aria-hidden="true" />
                    )}

                    {exporting
                        ? "Creating Power BI Files..."
                        : "Export Power BI Data"}
                </button>
            </div>

            <header className="management-reporting-header">
                <div>
                    <span className="performance-summary-eyebrow">
                        Management reporting
                    </span>

                    <h2>GRU Turnaround Performance Dashboard</h2>

                    <p>
                        Aggregated PTS readiness, operational
                        performance, exceptions, and task-level analysis.
                    </p>
                </div>

                <div className="management-reporting-user">
                    <span>Reporting user</span>

                    <strong>
                        {profile?.full_name || "Authorised User"}
                    </strong>

                    {lastUpdatedAt ? (
                        <small>
                            Updated{" "}
                            {lastUpdatedAt.toLocaleTimeString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            })}
                        </small>
                    ) : null}
                </div>
            </header>

            <section
                className="management-reporting-filters"
                aria-label="Management reporting filters"
            >
                <label>
                    <span>From Date</span>

                    <input
                        type="date"
                        value={fromDate}
                        max={toDate}
                        onChange={(event) =>
                            setFromDate(event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label>
                    <span>To Date</span>

                    <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(event) =>
                            setToDate(event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label>
                    <span>Flight or Registration</span>

                    <input
                        type="search"
                        value={flightSearch}
                        placeholder="Search flight, bay, or registration"
                        onChange={(event) =>
                            setFlightSearch(event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label>
                    <span>Aircraft Type</span>

                    <select
                        value={aircraftFilter}
                        onChange={(event) =>
                            setAircraftFilter(event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All aircraft</option>

                        {aircraftOptions.map((aircraftType) => (
                            <option
                                key={aircraftType}
                                value={aircraftType}
                            >
                                {aircraftType}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Checklist Status</span>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All statuses</option>
                        <option value="in_progress">
                            In progress
                        </option>
                        <option value="completed">
                            Completed
                        </option>
                    </select>
                </label>

                <div className="management-reporting-filter-actions">
                    <button
                        type="button"
                        className="ramp-button ramp-button-primary"
                        onClick={() => void loadReportingData()}
                        disabled={loading}
                    >
                        {loading ? (
                            <LoaderCircle
                                size={17}
                                className="spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <RefreshCw
                                size={17}
                                aria-hidden="true"
                            />
                        )}

                        {loading ? "Loading..." : "Refresh"}
                    </button>

                    <button
                        type="button"
                        className="ramp-button ramp-button-light"
                        onClick={clearFilters}
                        disabled={loading}
                    >
                        Clear Filters
                    </button>
                </div>
            </section>

            {errorMessage ? (
                <div className="reporting-error-state" role="alert">
                    <strong>Reporting data could not be loaded</strong>
                    <span>{errorMessage}</span>
                </div>
            ) : null}

            {!loading &&
                !errorMessage &&
                filteredChecklists.length === 0 ? (
                <div className="reporting-empty-state">
                    <strong>No reporting records found</strong>

                    <span>
                        No checklists match the selected date range and
                        filters.
                    </span>
                </div>
            ) : null}

            {loading ? (
                <div
                    className="reporting-loading-state"
                    role="status"
                    aria-live="polite"
                >
                    <LoaderCircle
                        size={26}
                        className="spin"
                        aria-hidden="true"
                    />

                    <strong>
                        Loading management reporting data...
                    </strong>
                </div>
            ) : null}

            {!loading &&
                !errorMessage &&
                filteredChecklists.length > 0 ? (
                <>
                    <div className="management-reporting-result-summary">
                        <strong>
                            {filteredChecklists.length} flight
                            {filteredChecklists.length === 1 ? "" : "s"}
                        </strong>

                        <span>
                            {filteredChecklistItems.length} activity records
                        </span>
                    </div>

                    <ReportingKpis kpis={kpis} />

                    <ReportingCharts
                        statusData={statusData}
                        dailyData={dailyData}
                        phaseData={phaseData}
                        delayedActivities={delayedActivities}
                    />

                    <ReportingMatrix rows={matrixRows} />
                </>
            ) : null}
        </section>
    );
}