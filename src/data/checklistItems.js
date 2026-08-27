export const CHECKLIST_ITEMS = [
  ["Arrival", "TRC at Parking Bay", "chocks", -120],
  ["Arrival", "Bay clear of GSE / FOD / Contamination", "chocks", -300],
  ["Arrival", "Safety cones in place", "chocks", 0],
  ["Arrival", "Aircraft chocked correctly", "chocks", 0],
  ["Arrival", "Ground / Fixed power connected", "chocks", 120],
  ["Arrival", "FDC to release brakes when safe", "chocks", 180],
  ["Arrival", "Check for visible A/C damage / leaks", "chocks", 240],
  ["Arrival", "Jet bridge / steps positioned", "chocks", 180],
  ["Arrival", "Cabin doors opened", "chocks", 300],

  ["Ground Services", "Staff on bay", "chocks", 300],
  ["Ground Services", "Equipment on bay", "chocks", 360],
  ["Ground Services", "Fuel bowser at bay", "chocks", 480],
  ["Ground Services", "Fuelling completed", "chocks", 1500],
  ["Ground Services", "Step chute parked", "chocks", 360],
  ["Ground Services", "TUG on bay", "chocks", 1200],

  ["Cargo & Baggage", "Last baggage AKE off", "chocks", 600],
  ["Cargo & Baggage", "Cargo offload complete", "chocks", 900],
  ["Cargo & Baggage", "Baggage loading started", "chocks", 900],
  ["Cargo & Baggage", "Loading complete / last bag AKE on", "chocks", 1800],
  ["Cargo & Baggage", "Final cargo confirmed", "chocks", 1920],
  ["Cargo & Baggage", "Final baggage confirmed", "chocks", 1920],
  ["Cargo & Baggage", "Holds closed", "chocks", 1980],

  ["Catering & Cleaning", "Cleaners on aircraft", "chocks", 360],
  ["Catering & Cleaning", "Cleaners off aircraft", "chocks", 1200],
  ["Catering & Cleaning", "Catering vehicles positioned", "chocks", 360],
  ["Catering & Cleaning", "Airchefs sign off", "chocks", 1200],

  ["Boarding", "OK to board", "chocks", 1500],
  ["Boarding", "Main boarding started", "chocks", 1560],
  ["Boarding", "First passenger boarded", "chocks", 1620],
  ["Boarding", "Boarding ended", "chocks", 2100],
  ["Boarding", "Last passenger boarded", "chocks", 2100],
  ["Boarding", "Final slip received", "chocks", 2160],
  ["Boarding", "Pax count confirmed", "chocks", 2160],

  ["Departure", "Doors armed and cross-checked", "std", -300],
  ["Departure", "Cabin doors and hold doors closed", "std", -360],
  ["Departure", "Stairs / jet bridge removed", "std", -240],
  ["Departure", "Pushback clearance received", "std", -180],
  ["Departure", "Aircraft pushback", "std", -300],
].map(([phase, activity, base, offsetSec], index) => ({
  itemNumber: index + 1,
  phase,
  activity,
  base,
  offsetSec,
}));

export const CHECKLIST_PHASES = [
  "All",
  "Arrival",
  "Ground Services",
  "Cargo & Baggage",
  "Catering & Cleaning",
  "Boarding",
  "Departure",
];

export function createEmptyChecklistRows() {
  return CHECKLIST_ITEMS.map(() => ({
    actualTime: "",
    observation: "",
    status: "pending",
    delaySeconds: null,
  }));
}