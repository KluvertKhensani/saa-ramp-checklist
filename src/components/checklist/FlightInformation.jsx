import { Clock3, Plane } from "lucide-react";

const AIRCRAFT_REGISTRATIONS = {
  A320: [
    "ZSSXD",
    "ZSSXJ",
    "ZSSZA",
    "ZSSZB",
    "ZSSZC",
    "ZSSZD",
    "ZSSZE",
    "ZSSZF",
    "ZSSZG",
    "ZSSZH",
    "ZSSZI",
    "ZSSZJ",
    "ZSSZK",
    "ZSSZL",
    "ZSSZM",
    "ZSSZN",
    "ZSSZO",
  ],
  A330: ["ZSSXD", "ZSSXF", "ZSSXJ", "ZSSXM"],
  A340: ["ZSSXD", "ZSSXF", "ZSSXM"],
};

function normalizeOperationalCode(value, maxLength = 20) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, maxLength);
}

function normalizeTimeValue(value) {
  return String(value || "")
    .trim()
    .slice(0, 5);
}

export default function FlightInformation({
  flight,
  coordinatorName = "",
  onChange,
  onLandingNow,
  onChocksNow,
  disabled = false,
}) {
  const availableRegistrations =
    AIRCRAFT_REGISTRATIONS[flight.aircraftType] || [];

  const lockedCoordinator = coordinatorName || flight.trcCoordinator || "";

  function change(field, value) {
    if (disabled) {
      return;
    }

    let normalizedValue = value;

    if (field === "flightIn" || field === "flightOut" || field === "bay") {
      normalizedValue = normalizeOperationalCode(value);
    }

    if (
      field === "sta" ||
      field === "eta" ||
      field === "ata" ||
      field === "chocksOn" ||
      field === "std" ||
      field === "definedPushTime"
    ) {
      normalizedValue = normalizeTimeValue(value);
    }

    onChange?.(field, normalizedValue);
  }

  function changeAircraftType(nextAircraftType) {
    if (disabled) {
      return;
    }

    const normalizedAircraftType = normalizeOperationalCode(
      nextAircraftType,
      10,
    );

    const nextRegistrations =
      AIRCRAFT_REGISTRATIONS[normalizedAircraftType] || [];

    onChange?.("aircraftType", normalizedAircraftType);

    if (
      flight.registration &&
      !nextRegistrations.includes(normalizeOperationalCode(flight.registration))
    ) {
      onChange?.("registration", "");
    }
  }

  return (
    <section className="ramp-card">
      <div className="ramp-section-heading">
        <div>
          <p className="ramp-eyebrow">Operational record</p>

          <h2>Flight information</h2>
        </div>

        <Plane size={25} aria-hidden="true" />
      </div>

      <p
        id="flight-information-guidance"
        className="flight-information-guidance"
      >
        Complete all fields marked with an asterisk before starting checklist
        activities. Pre-Arrival planned times remain based on STA Scheduled,
        even when an aircraft arrives before STA.
      </p>

      <div
        className="flight-grid"
        aria-describedby="flight-information-guidance"
      >
        <label>
          <span>Flight In</span>

          <input
            type="text"
            value={flight.flightIn}
            onChange={(event) => change("flightIn", event.target.value)}
            placeholder="SA226"
            disabled={disabled}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            aria-label="Inbound flight number"
          />
        </label>

        <label>
          <span>Flight Out *</span>

          <input
            type="text"
            value={flight.flightOut}
            onChange={(event) => change("flightOut", event.target.value)}
            placeholder="SA227"
            disabled={disabled}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            required
            aria-required="true"
            aria-label="Outbound flight number, required"
          />
        </label>

        <label>
          <span>Flight Date *</span>

          <input
            type="date"
            value={flight.flightDate}
            onChange={(event) => change("flightDate", event.target.value)}
            disabled={disabled}
            required
            aria-required="true"
            aria-label="Flight date, required"
          />
        </label>

        <label>
          <span>Bay</span>

          <input
            type="text"
            value={flight.bay}
            onChange={(event) => change("bay", event.target.value)}
            placeholder="C1"
            disabled={disabled}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            aria-label="Aircraft parking bay"
          />
        </label>

        <label>
          <span>Aircraft Type *</span>

          <select
            value={flight.aircraftType}
            onChange={(event) => changeAircraftType(event.target.value)}
            disabled={disabled}
            required
            aria-required="true"
            aria-label="Aircraft type, required"
          >
            <option value="">Select aircraft</option>

            <option value="A320">A320</option>

            <option value="A330">A330</option>

            <option value="A340">A340</option>
          </select>
        </label>

        <label>
          <span>Registration *</span>

          <select
            value={flight.registration}
            onChange={(event) =>
              change(
                "registration",
                normalizeOperationalCode(event.target.value),
              )
            }
            disabled={disabled || !flight.aircraftType}
            required
            aria-required="true"
            aria-label="Aircraft registration, required"
          >
            <option value="">
              {flight.aircraftType
                ? "Select registration"
                : "Select aircraft type first"}
            </option>

            {availableRegistrations.map((registration) => (
              <option key={registration} value={registration}>
                {registration}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>STA Scheduled *</span>

          <input
            type="time"
            step="60"
            value={flight.sta}
            onChange={(event) => change("sta", event.target.value)}
            disabled={disabled}
            required
            aria-required="true"
            aria-describedby="sta-scheduled-help"
            aria-label="Scheduled time of arrival, required"
          />

          <small id="sta-scheduled-help" className="flight-field-help">
            Baseline for all Pre-Arrival readiness activities.
          </small>
        </label>

        <label>
          <span>ETA MVT Update</span>

          <input
            type="time"
            step="60"
            value={flight.eta}
            onChange={(event) => change("eta", event.target.value)}
            disabled={disabled}
            aria-label="Estimated time of arrival movement update"
          />
        </label>

        <label>
          <span>STD Scheduled *</span>

          <input
            type="time"
            step="60"
            value={flight.std}
            onChange={(event) => change("std", event.target.value)}
            disabled={disabled}
            required
            aria-required="true"
            aria-label="Scheduled time of departure, required"
          />
        </label>

        <label>
          <span>Defined Push Time</span>

          <div className="time-select-field">
            <Clock3 size={17} aria-hidden="true" />

            <input
              type="time"
              step="60"
              value={flight.definedPushTime || ""}
              onChange={(event) =>
                change("definedPushTime", event.target.value)
              }
              disabled={disabled}
              aria-describedby="defined-push-help"
              aria-label="Defined push time"
            />
          </div>

          <small id="defined-push-help" className="flight-field-help">
            STD is used when no separate Defined Push Time is entered.
          </small>
        </label>

        <label>
          <span>ATA Real</span>

          <div className="field-with-button">
            <input
              type="text"
              value={flight.ata || "Not recorded"}
              readOnly
              disabled
              aria-label="Recorded actual time of arrival"
            />

            <button
              type="button"
              className="time-now-button"
              onClick={onLandingNow}
              title={
                disabled
                  ? "This checklist is read-only"
                  : "Record ATA using the current time"
              }
              aria-label="Record ATA using the current time"
              disabled={disabled}
            >
              <Clock3 size={17} aria-hidden="true" />

              <span className="time-now-button-label">Now</span>
            </button>
          </div>
        </label>

        <label>
          <span>Chocks On Real</span>

          <div className="field-with-button">
            <input
              type="text"
              value={flight.chocksOn || "Not recorded"}
              readOnly
              disabled
              aria-label="Recorded actual chocks on time"
            />

            <button
              type="button"
              className="time-now-button"
              onClick={onChocksNow}
              title={
                disabled
                  ? "This checklist is read-only"
                  : "Record Chocks On using the current time"
              }
              aria-label="Record Chocks On using the current time"
              disabled={disabled}
            >
              <Clock3 size={17} aria-hidden="true" />

              <span className="time-now-button-label">Now</span>
            </button>
          </div>
        </label>

        <label>
          <span>TRC Coordinator · Signed In</span>

          <input
            type="text"
            className="locked-profile-field"
            value={lockedCoordinator}
            readOnly
            disabled
            aria-label="Signed-in TRC Coordinator, read only"
          />
        </label>
      </div>
    </section>
  );
}
