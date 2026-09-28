import {
  Clock3,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

function formatDate(value) {
  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Africa/Johannesburg",
    }
  ).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone:
        "Africa/Johannesburg",
    }
  ).format(value);
}

export default function LiveClock() {
  const [
    currentDateTime,
    setCurrentDateTime,
  ] = useState(
    () => new Date()
  );

  useEffect(() => {
    const timerId =
      window.setInterval(() => {
        setCurrentDateTime(
          new Date()
        );
      }, 1000);

    return () => {
      window.clearInterval(
        timerId
      );
    };
  }, []);

  return (
    <div
      className="live-clock"
      aria-label="Current South African date and time"
    >
      <Clock3
        className="live-clock-icon"
        size={16}
        aria-hidden="true"
      />

      <span className="live-clock-content">
        <span className="live-clock-date">
          {formatDate(
            currentDateTime
          )}
        </span>

        <span className="live-clock-time">
          {formatTime(
            currentDateTime
          )}
        </span>
      </span>
    </div>
  );
}