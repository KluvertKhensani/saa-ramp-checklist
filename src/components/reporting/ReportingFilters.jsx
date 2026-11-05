import { CalendarRange, Filter, RefreshCw, RotateCcw } from "lucide-react";

function createOption(value, label = value) {
    return {
        value,
        label,
    };
}

function createUniqueOptions(values) {
    return [...new Set(values)]
        .filter(Boolean)
        .sort((firstValue, secondValue) =>
            firstValue.localeCompare(secondValue),
        )
        .map((value) => createOption(value));
}

export default function ReportingFilters({
    filters,
    checklists,
    tasks,
    loading = false,
    onChange,
    onApply,
    onReset,
}) {
    const aircraftTypeOptions = createUniqueOptions(
        checklists.map((checklist) => checklist.aircraftType),
    );

    const phaseOptions = createUniqueOptions(
        tasks.map((task) => task.phase),
    );

    const impactOptions = createUniqueOptions(
        tasks.map((task) => task.impactCategory),
    );

    function updateFilter(field, value) {
        onChange({
            ...filters,
            value,
        });
    }

    function handleSubmit(event) {
        event.preventDefault();
        onApply();
    }

    return (
        <form
            className="reporting-filters"
            onSubmit={handleSubmit}
            aria-label="Management reporting filters"
        >
            <div className="reporting-filters-heading">
                <div>
                    <span className="reporting-section-eyebrow">
                        <Filter size={15} aria-hidden="true" />
                        Reporting Filters
                    </span>

                    <h2>Operational Data Selection</h2>

                    <p>
                        Select the flight period and operational criteria to update the
                        dashboard, matrix, and Power BI export package.
                    </p>
                </div>

                <CalendarRange size={28} aria-hidden="true" />
            </div>

            <div className="reporting-filter-grid">
                <label className="reporting-filter-field">
                    <span>Date From</span>

                    <input
                        type="date"
                        value={filters.dateFrom}
                        max={filters.dateTo || undefined}
                        onChange={(event) =>
                            updateFilter("dateFrom", event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label className="reporting-filter-field">
                    <span>Date To</span>

                    <input
                        type="date"
                        value={filters.dateTo}
                        min={filters.dateFrom || undefined}
                        onChange={(event) =>
                            updateFilter("dateTo", event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label className="reporting-filter-field">
                    <span>Flight Out</span>

                    <input
                        type="search"
                        value={filters.flightOut}
                        placeholder="Example: SA223"
                        onChange={(event) =>
                            updateFilter("flightOut", event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label className="reporting-filter-field">
                    <span>Registration</span>

                    <input
                        type="search"
                        value={filters.registration}
                        placeholder="Example: ZS-SXA"
                        onChange={(event) =>
                            updateFilter("registration", event.target.value)
                        }
                        disabled={loading}
                    />
                </label>

                <label className="reporting-filter-field">
                    <span>Aircraft Type</span>

                    <select
                        value={filters.aircraftType}
                        onChange={(event) =>
                            updateFilter("aircraftType", event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All aircraft types</option>

                        {aircraftTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="reporting-filter-field">
                    <span>Checklist Status</span>

                    <select
                        value={filters.checklistStatus}
                        onChange={(event) =>
                            updateFilter("checklistStatus", event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All statuses</option>
                        <option value="completed">Completed</option>
                        <option value="in_progress">In progress</option>
                    </select>
                </label>

                <label className="reporting-filter-field">
                    <span>Phase</span>

                    <select
                        value={filters.phase}
                        onChange={(event) =>
                            updateFilter("phase", event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All phases</option>

                        {phaseOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="reporting-filter-field">
                    <span>Impact Category</span>

                    <select
                        value={filters.impactCategory}
                        onChange={(event) =>
                            updateFilter("impactCategory", event.target.value)
                        }
                        disabled={loading}
                    >
                        <option value="all">All impact categories</option>

                        {impactOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="reporting-filter-actions">
                <button
                    type="button"
                    className="ramp-button ramp-button-light"
                    onClick={onReset}
                    disabled={loading}
                >
                    <RotateCcw size={17} aria-hidden="true" />
                    Reset Filters
                </button>

                <button
                    type="submit"
                    className="ramp-button ramp-button-primary"
                    disabled={loading || !filters.dateFrom || !filters.dateTo}
                >
                    <RefreshCw
                        size={17}
                        className={loading ? "reporting-spin" : ""}
                        aria-hidden="true"
                    />

                    {loading ? "Loading Reporting Data..." : "Apply Filters"}
                </button>
            </div>
        </form>
    );
}