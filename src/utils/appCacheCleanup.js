const APP_CACHE_MARKERS = ["workbox-precache", "saa-ramp-checklist"];

function belongsToThisApplication(cacheName) {
  const normalizedName = String(cacheName || "").toLowerCase();

  return APP_CACHE_MARKERS.some((marker) =>
    normalizedName.includes(marker.toLowerCase()),
  );
}

export async function clearApplicationCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return 0;
  }

  const cacheNames = await window.caches.keys();

  const applicationCaches = cacheNames.filter(belongsToThisApplication);

  const deletionResults = await Promise.all(
    applicationCaches.map((cacheName) => window.caches.delete(cacheName)),
  );

  return deletionResults.filter(Boolean).length;
}
