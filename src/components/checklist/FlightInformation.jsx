import {
  Clock3,
  Plane,
} from "lucide-react";

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
  A330: [
    "ZSSXD",
    "ZSSXF",
    "ZSSXJ",
    "ZSSXM",
  ],
  A340: [
    "ZSSXD",
    "ZSSXF",
    "ZSSXM",
  ],
};

export default function FlightInformation({
  flight,
  coordinatorName = "",
  onChange,
  onLandingNow,
  onChocksNow,
  disabled = false,
}) {
  const availableRegistrations =
    AIRCRAFT_REGISTRATIONS[
      flight.aircraftType
    ] || [];

  const lockedCoordinator =
    coordinatorName ||
    flight.trcCoordinator ||
    "";

  function change(
    field,
    value
  ) {
    if (disabled) {
      return;
    }

    onChange?.(
      field,
      value
    );
  }

  function changeAircraftType(
    nextAircraftType
  ) {
    if (disabled) {
      return;
    }

    const nextRegistrations =
      AIRCRAFT_REGISTRATIONS[
        nextAircraftType
      ] || [];

    onChange?.(
      "aircraftType",
      nextAircraftType
    );

    if (
      flight.registration &&
      !nextRegistrations.includes(
        flight.registration
      )
    ) {
      onChange?.(
        "registration",
        ""
      );
    }
  }

  return (
    <section className="ramp-card">
      <div className="ramp-section-heading">
        <div>
          <p className="ramp-eyebrow">
            Operational record
          </p>

          <h2>
            Flight information
          </h2>
        </div>

        <Plane
          size={25}
          aria-hidden="true"
        />
      </div>

      <div className="flight-grid">
        <label>
          <span>
            Flight In
          </span>

          <input
            type="text"
            value={
              flight.flightIn
            }
            onChange={(event) =>
              change(
                "flightIn",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="SA226"
            disabled={disabled}
            aria-label="Flight In"
          />
        </label>

        <label>
          <span>
            Flight Out *
          </span>

          <input
            type="text"
            value={
              flight.flightOut
            }
            onChange={(event) =>
              change(
                "flightOut",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="SA227"
            disabled={disabled}
            required
            aria-label="Flight Out"
          />
        </label>

        <label>
          <span>
            Flight Date *
          </span>

          <input
            type="date"
            value={
              flight.flightDate
            }
            onChange={(event) =>
              change(
                "flightDate",
                event.target.value
              )
            }
            disabled={disabled}
            required
            aria-label="Flight Date"
          />
        </label>

        <label>
          <span>
            Bay
          </span>

          <input
            type="text"
            value={
              flight.bay
            }
            onChange={(event) =>
              change(
                "bay",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="C1"
            disabled={disabled}
            aria-label="Bay"
          />
        </label>

        <label>
          <span>
            Aircraft Type
          </span>

          <select
            value={
              flight.aircraftType
            }
            onChange={(event) =>
              changeAircraftType(
                event.target.value
              )
            }
            disabled={disabled}
            aria-label="Aircraft Type"
          >
            <option value="">
              Select aircraft
            </option>

            <option value="A320">
              A320
            </option>

            <option value="A330">
              A330
            </option>

            <option value="A340">
              A340
            </option>
          </select>
        </label>

        <label>
          <span>
            Registration
          </span>

          <select
            value={
              flight.registration
            }
            onChange={(event) =>
              change(
                "registration",
                event.target.value
              )
            }
            disabled={
              disabled ||
              !flight.aircraftType
            }
            aria-label="Aircraft Registration"
          >
            <option value="">
              {flight.aircraftType
                ? "Select registration"
                : "Select aircraft type first"}
            </option>

            {availableRegistrations.map(
              (registration) => (
                <option
                  key={registration}
                  value={registration}
                >
                  {registration}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span>
            STA Scheduled
          </span>

          <input
            type="time"
            step="60"
            value={
              flight.sta
            }
            onChange={(event) =>
              change(
                "sta",
                event.target.value
              )
            }
            disabled={disabled}
            aria-label="STA Scheduled"
          />
        </label>

        <label>
          <span>
            ETA MVT
          </span>

          <input
            type="time"
            step="60"
            value={
              flight.eta
            }
            onChange={(event) =>
              change(
                "eta",
                event.target.value
              )
            }
            disabled={disabled}
            aria-label="ETA MVT"
          />
        </label>

        <label>
          <span>
            STD Scheduled
          </span>

          <input
            type="time"
            step="60"
            value={
              flight.std
            }
            onChange={(event) =>
              change(
                "std",
                event.target.value
              )
            }
            disabled={disabled}
            aria-label="STD Scheduled"
          />
        </label>

        <label>
          <span>
            Defined Push Time
          </span>

          <div className="time-select-field">
            <Clock3
              size={17}
              aria-hidden="true"
            />

            <input
              type="time"
              step="60"
              value={
                flight.definedPushTime ||
                ""
              }
              onChange={(event) =>
                change(
                  "definedPushTime",
                  event.target.value
                )
              }
              disabled={disabled}
              aria-label="Defined Push Time"
            />
          </div>
        </label>

        <label>
          <span>
            Landing Real
          </span>

          <div className="field-with-button">
            <input
              type="text"
              value={
                flight.ata ||
                "Not recorded"
              }
              readOnly
              disabled
              aria-label="Recorded Landing Real Time"
            />

            <button
              type="button"
              className="time-now-button"
              onClick={
                onLandingNow
              }
              title={
                disabled
                  ? "This checklist is read-only"
                  : "Record Landing Real using the current time"
              }
              aria-label="Record Landing Real using the current time"
              disabled={disabled}
            >
              <Clock3
                size={17}
                aria-hidden="true"
              />
            </button>
          </div>
        </label>

        <label>
          <span>
            Chocks On Real
          </span>

          <div className="field-with-button">
            <input
              type="text"
              value={
                flight.chocksOn ||
                "Not recorded"
              }
              readOnly
              disabled
              aria-label="Recorded Chocks On Real Time"
            />

            <button
              type="button"
              className="time-now-button"
              onClick={
                onChocksNow
              }
              title={
                disabled
                  ? "This checklist is read-only"
                  : "Record Chocks On Real using the current time"
              }
              aria-label="Record Chocks On Real using the current time"
              disabled={disabled}
            >
              <Clock3
                size={17}
                aria-hidden="true"
              />
            </button>
          </div>
        </label>

        <label>
          <span>
            TRC Coordinator
          </span>

          <input
            type="text"
            className="locked-profile-field"
            value={
              lockedCoordinator
            }
            readOnly
            disabled
            aria-label="Signed-in TRC Coordinator"
          />
        </label>
      </div>
    </section>
  );
}