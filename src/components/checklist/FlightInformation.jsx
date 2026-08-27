import { Clock3, Plane } from "lucide-react";

export default function FlightInformation({
  flight,
  onChange,
  onChocksNow,
}) {
  function change(field, value) {
    onChange(field, value);
  }

  return (
    <section className="ramp-card">
      <div className="ramp-section-heading">
        <div>
          <p className="ramp-eyebrow">Operational record</p>
          <h2>Flight information</h2>
        </div>

        <Plane size={25} />
      </div>

      <div className="flight-grid">
        <label>
          <span>Flight In</span>
          <input
            value={flight.flightIn}
            onChange={(event) =>
              change("flightIn", event.target.value.toUpperCase())
            }
            placeholder="SA404"
          />
        </label>

        <label>
          <span>Flight Out *</span>
          <input
            value={flight.flightOut}
            onChange={(event) =>
              change("flightOut", event.target.value.toUpperCase())
            }
            placeholder="SA405"
          />
        </label>

        <label>
          <span>Date *</span>
          <input
            type="date"
            value={flight.flightDate}
            onChange={(event) =>
              change("flightDate", event.target.value)
            }
          />
        </label>

        <label>
          <span>Bay</span>
          <input
            value={flight.bay}
            onChange={(event) =>
              change("bay", event.target.value.toUpperCase())
            }
            placeholder="C1"
          />
        </label>

        <label>
          <span>Aircraft Type</span>
          <select
            value={flight.aircraftType}
            onChange={(event) =>
              change("aircraftType", event.target.value)
            }
          >
            <option value="">Select aircraft</option>
            <option value="A320">A320</option>
            <option value="A330">A330</option>
            <option value="A340">A340</option>
            <option value="A350">A350</option>
            <option value="B737">B737</option>
            <option value="E170/190">E170/190</option>
          </select>
        </label>

        <label>
          <span>Registration</span>
          <input
            value={flight.registration}
            onChange={(event) =>
              change(
                "registration",
                event.target.value.toUpperCase()
              )
            }
            placeholder="ZS-SZM"
          />
        </label>

        <label>
          <span>STA</span>
          <input
            type="time"
            step="1"
            value={flight.sta}
            onChange={(event) =>
              change("sta", event.target.value)
            }
          />
        </label>

        <label>
          <span>ETA</span>
          <input
            type="time"
            step="1"
            value={flight.eta}
            onChange={(event) =>
              change("eta", event.target.value)
            }
          />
        </label>

        <label>
          <span>ATA</span>
          <input
            type="time"
            step="1"
            value={flight.ata}
            onChange={(event) =>
              change("ata", event.target.value)
            }
          />
        </label>

        <label>
          <span>Chocks On</span>
          <div className="field-with-button">
            <input
              type="time"
              step="1"
              value={flight.chocksOn}
              onChange={(event) =>
                change("chocksOn", event.target.value)
              }
            />

            <button
              type="button"
              className="time-now-button"
              onClick={onChocksNow}
              title="Record the current time"
            >
              <Clock3 size={17} />
            </button>
          </div>
        </label>

        <label>
          <span>STD</span>
          <input
            type="time"
            step="1"
            value={flight.std}
            onChange={(event) =>
              change("std", event.target.value)
            }
          />
        </label>

        <label>
          <span>TRC Coordinator</span>
          <input
            value={flight.trcCoordinator}
            onChange={(event) =>
              change("trcCoordinator", event.target.value)
            }
            placeholder="Coordinator name"
          />
        </label>
      </div>
    </section>
  );
}