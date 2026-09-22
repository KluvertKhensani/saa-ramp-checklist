import {
  Clock3,
  Plane,
} from "lucide-react";

export default function FlightInformation({
  flight,
  coordinatorName = "",
  onChange,
  onLandingNow,
  onChocksNow,
  disabled = false,
}) {
  function change(
    field,
    value
  ) {
    if (disabled) {
      return;
    }

    onChange(
      field,
      value
    );
  }

  const lockedCoordinator =
    coordinatorName ||
    flight.trcCoordinator ||
    "";

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
            value={flight.flightIn}
            onChange={(event) =>
              change(
                "flightIn",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="SA226"
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            Flight Out *
          </span>

          <input
            value={flight.flightOut}
            onChange={(event) =>
              change(
                "flightOut",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="SA227"
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            Flight Date *
          </span>

          <input
            type="date"
            value={flight.flightDate}
            onChange={(event) =>
              change(
                "flightDate",
                event.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            Bay
          </span>

          <input
            value={flight.bay}
            onChange={(event) =>
              change(
                "bay",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="C1"
            disabled={disabled}
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
              change(
                "aircraftType",
                event.target.value
              )
            }
            disabled={disabled}
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

          <input
            value={
              flight.registration
            }
            onChange={(event) =>
              change(
                "registration",
                event.target.value
                  .toUpperCase()
              )
            }
            placeholder="ZS-SZM"
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            STA Scheduled
          </span>

          <input
            type="time"
            step="60"
            value={flight.sta}
            onChange={(event) =>
              change(
                "sta",
                event.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            ETA MVT
          </span>

          <input
            type="time"
            step="60"
            value={flight.eta}
            onChange={(event) =>
              change(
                "eta",
                event.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            STD Scheduled
          </span>

          <input
            type="time"
            step="60"
            value={flight.std}
            onChange={(event) =>
              change(
                "std",
                event.target.value
              )
            }
            disabled={disabled}
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
                flight
                  .definedPushTime ||
                ""
              }
              onChange={(event) =>
                change(
                  "definedPushTime",
                  event.target.value
                )
              }
              disabled={disabled}
              aria-label="Select defined push time"
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
              aria-label="Recorded landing real time"
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
              aria-label="Recorded chocks on real time"
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