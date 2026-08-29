import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  }).format(value);
}

export default function LiveClock() {
  const [currentDateTime, setCurrentDateTime] =
    useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  return (
    <div
      className="live-clock"
      aria-label="Current South African time"
    >
      <Clock3 size={16} aria-hidden="true" />

      <span>
        {formatDateTime(currentDateTime)}
      </span>
    </div>
  );
}
