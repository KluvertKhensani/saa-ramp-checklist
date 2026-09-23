const RAW_CHECKLIST_ITEMS = [
  [
    "pre-arrival-departing-cargo-at-bay",
    "Pre-Arrival",
    "Departing Cargo at Parking Bay",
    -3180,
    100,
  ],
  [
    "pre-arrival-dispatcher-trc-position",
    "Pre-Arrival",
    "Dispatcher / TRC at Parking Position",
    -2280,
    105,
  ],
  [
    "pre-arrival-confirm-cargo-secured",
    "Pre-Arrival",
    "Confirm Cargo Secured (Station Specific AVSEC Regulations)",
    -2280,
    20,
  ],
  [
    "pre-arrival-staff-gse-catering-position",
    "Pre-Arrival",
    "Staff / All GSEs & Catering Truck at Parking Position",
    -1980,
    95,
  ],
  [
    "pre-arrival-cargo-agent-position",
    "Pre-Arrival",
    "Cargo Agent at Parking Position",
    -1980,
    120,
  ],
  [
    "pre-arrival-stand-cleared-fod",
    "Pre-Arrival",
    "Ensure Stand is Cleared / FOD Inspection",
    -1980,
    3,
  ],
  [
    "arrival-engines-off-chocks-cones",
    "Arrival",
    "Engines Off - Chocks & Cones On",
    0,
    90,
  ],
  [
    "arrival-aircraft-landed-announcement",
    "Arrival",
    "Announcement to Paxs Aircraft Landed",
    0,
    null,
  ],
  [
    "arrival-external-checks",
    "Arrival",
    "Aircraft External Checks (Engineers & Ramp Supervisor)",
    180,
    3,
  ],
  [
    "arrival-bridge-or-stairs-on",
    "Arrival",
    "Bridge On or Paxs Stairs On",
    180,
    89,
  ],
  [
    "arrival-cabin-doors-opened",
    "Arrival",
    "Cabin Doors Opened",
    240,
    89,
  ],
  [
    "arrival-hold-five-opened",
    "Arrival",
    "Hold 5 Opened / Buggies / Wchrs taken",
    300,
    89,
  ],
  [
    "arrival-cargo-holds-opened",
    "Arrival",
    "Cargo Holds opened",
    300,
    89,
  ],
  [
    "arrival-disembarkation-started",
    "Arrival",
    "Passenger Disembarkation Started",
    300,
    88,
  ],
  [
    "arrival-start-fueling",
    "Arrival",
    "Start Fueling",
    300,
    90,
  ],
  [
    "arrival-first-akes-off",
    "Arrival",
    "First AKEs Off (Priority & Transfer Bags)",
    480,
    86,
  ],
  [
    "arrival-disembarkation-completed",
    "Arrival",
    "Passenger Disembarkation Completed",
    900,
    80,
  ],
  [
    "arrival-catering-truck-on",
    "Arrival",
    "Catering Truck On",
    900,
    89,
  ],
  [
    "arrival-cleaners-on",
    "Arrival",
    "Cleaners On",
    900,
    87,
  ],
  [
    "arrival-crew-disembarkation",
    "Arrival",
    "Crew Disembarkation",
    1200,
    null,
  ],
  [
    "arrival-last-baggage-ake-off",
    "Arrival",
    "Last Baggage AKE Off",
    1200,
    70,
  ],
  [
    "arrival-potable-water-truck-on",
    "Arrival",
    "Potable Water Truck On (QTA)",
    1200,
    null,
  ],
  [
    "arrival-short-connection-bags-transferred",
    "Arrival",
    "Outbound Short CNX Bags Transferred (to the line)",
    1500,
    null,
  ],
  [
    "arrival-offload-completed",
    "Arrival",
    "Offload Completed",
    2100,
    70,
  ],
  [
    "arrival-uld-check-serviceability",
    "Arrival",
    "ULD check & serviceability",
    2100,
    null,
  ],
  [
    "departure-countdown",
    "Departure",
    "Departure Count Down",
    120,
    null,
  ],
  [
    "departure-start-loading",
    "Departure",
    "Start Baggage and Cargo Loading",
    2220,
    null,
  ],
  [
    "departure-catering-off",
    "Departure",
    "Catering Off",
    2520,
    55,
  ],
  [
    "departure-crew-onboard-documents",
    "Departure",
    "Crew Onboard / GENDEC Delivery & Checks / Cargo Docs",
    2520,
    10,
  ],
  [
    "departure-final-fuel-figures",
    "Departure",
    "Final Fuel Figures Check (Inform CLC via FM Chat Box)",
    2520,
    20,
  ],
  [
    "departure-waste-truck-on",
    "Departure",
    "Waste Truck On (QTU)",
    2820,
    55,
  ],
  [
    "departure-pre-boarding",
    "Departure",
    "Pre-Boarding (Announcements/PRM/MAAS)",
    2820,
    null,
  ],
  [
    "departure-cleaners-off",
    "Departure",
    "Cleaners Off",
    2820,
    55,
  ],
  [
    "departure-fueling-complete",
    "Departure",
    "Fueling Complete",
    3120,
    20,
  ],
  [
    "departure-main-boarding-started",
    "Departure",
    "Main Boarding Started (Main Announcement)",
    3120,
    55,
  ],
  [
    "departure-preliminary-baggage-figures",
    "Departure",
    "Preliminary Baggage Figures to CLC",
    3420,
    null,
  ],
  [
    "departure-boarding-ended",
    "Departure",
    "Boarding Ended",
    4320,
    5,
  ],
  [
    "departure-offload-outstanding",
    "Departure",
    "Offload Outstanding Paxs and Bags",
    4320,
    null,
  ],
  [
    "departure-loading-complete",
    "Departure",
    "Loading Complete / Last Bag AKE on A/C",
    4620,
    5,
  ],
  [
    "departure-ramp-clearance",
    "Departure",
    "Ramp Clearance",
    4620,
    3,
  ],
  [
    "departure-print-pax-lists",
    "Departure",
    "Print Paxs Lists / Deliver to Crew",
    4620,
    5,
  ],
  [
    "departure-doors-closed",
    "Departure",
    "Cabin Doors and Hold Doors Closed",
    4920,
    3,
  ],
  [
    "departure-final-baggage-figures",
    "Departure",
    "Final Baggage Figures to CLC",
    4920,
    10,
  ],
  [
    "departure-load-sheet-acars",
    "Departure",
    "Load Sheet Sent via Acars",
    4920,
    30,
  ],
  [
    "departure-pushback-tug-on-stand",
    "Departure",
    "Push back Tug on stand",
    4920,
    5,
  ],
  [
    "departure-bridge-removed",
    "Departure",
    "Bridge Removed",
    5100,
    3,
  ],
  [
    "departure-aircraft-pushback",
    "Departure",
    "Aircraft Push Back",
    5520,
    null,
  ],
];

export const CHECKLIST_ITEMS =
  RAW_CHECKLIST_ITEMS
    .map(
      (
        [
          taskCode,
          phase,
          activity,
          offsetSec,
          allocationMinutesBeforeDeparture,
        ],
        sourceIndex
      ) => ({
        taskCode,
        sourceSequence:
          sourceIndex + 1,
        phase,
        activity,
        base: "chocks",
        offsetSec,
        allocationMinutesBeforeDeparture,
        allocationSec:
          allocationMinutesBeforeDeparture ===
          null
            ? null
            : allocationMinutesBeforeDeparture *
              60,
      })
    )
    .sort(
      (
        firstItem,
        secondItem
      ) =>
        firstItem.offsetSec -
          secondItem.offsetSec ||
        firstItem.sourceSequence -
          secondItem.sourceSequence
    )
    .map((item, index) => ({
      ...item,
      itemNumber: index + 1,
      sequence: index + 1,
    }));

export const CHECKLIST_PHASES = [
  "All",
  "Pre-Arrival",
  "Arrival",
  "Departure",
];

export function createEmptyChecklistRows() {
  return CHECKLIST_ITEMS.map(
    () => ({
      actualTime: "",
      observation: "",
      status: "pending",
      delaySeconds: null,
      startedAt: null,
      startedBy: null,
    })
  );
}