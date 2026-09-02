import {
  Clock3,
  Plane,
} from "lucide-react";

export default function FlightInformation({
  flight,
  onChange,
  onChocksNow,
  disabled = false,
}) {
  function change(field, value) {
    if (disabled) {
      return;
    }

    onChange(field, value);
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
            value={flight.flightIn}
            onChange={(event) =>
              change(
                "flightIn",
                event.target.value.toUpperCase()
              )
            }
            placeholder="SA404"
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
                event.target.value.toUpperCase()
              )
            }
            placeholder="SA405"
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            Date *
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
                event.target.value.toUpperCase()
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
            value={flight.aircraftType}
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

            <option value="B737">
              B737
            </option>

          </select>
        </label>

        <label>
          <span>
            Registration
          </span>

          <input
            value={flight.registration}
            onChange={(event) =>
              change(
                "registration",
                event.target.value.toUpperCase()
              )
            }
            placeholder="ZS-SZM"
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            STA
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
            ETA
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
            ATA
          </span>

          <input
            type="time"
            step="60"
            value={flight.ata}
            onChange={(event) =>
              change(
                "ata",
                event.target.value
              )
            }
            disabled={disabled}
          />
        </label>

        <label>
          <span>
            Chocks On
          </span>

          <div className="field-with-button">
            <input
              type="time"
              step="60"
              value={flight.chocksOn}
              onChange={(event) =>
                change(
                  "chocksOn",
                  event.target.value
                )
              }
              disabled={disabled}
            />

            <button
              type="button"
              className="time-now-button"
              onClick={onChocksNow}
              title={
                disabled
                  ? "This checklist is read-only"
                  : "Record the current time"
              }
              aria-label="Record the current chocks-on time"
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
            STD
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
            TRC Coordinator
          </span>

          <input
            value={flight.trcCoordinator}
            onChange={(event) =>
              change(
                "trcCoordinator",
                event.target.value
              )
            }
            placeholder="Coordinator name"
            disabled={disabled}
          />
        </label>
      </div>
    </section>
  );
}
