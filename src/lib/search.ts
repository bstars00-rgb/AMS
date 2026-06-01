// One-click web-search links for the manual "website check" step.
// We open Google (site-scoped for OTAs) and Google Maps in a new tab — no
// network calls from the app itself, so there is no CORS/credentials/ToS issue.
export interface SearchLink {
  key: string;
  url: string;
}

const q = (s: string) => encodeURIComponent(s.replace(/\s+/g, " ").trim());

export function searchLinks(hotelName: string, city: string, roomName: string): SearchLink[] {
  const hotel = hotelName.trim();
  const hr = `${hotel} ${roomName}`.trim();
  const loc = `${hotel} ${city}`.trim();
  const g = (query: string) => `https://www.google.com/search?q=${q(query)}`;
  return [
    { key: "official", url: g(`${hotel} official website ${roomName}`) },
    { key: "google", url: g(hr) },
    { key: "agoda", url: g(`site:agoda.com ${hr}`) },
    { key: "trip", url: g(`site:trip.com ${hr}`) },
    { key: "booking", url: g(`site:booking.com ${hr}`) },
    { key: "maps", url: `https://www.google.com/maps/search/?api=1&query=${q(loc)}` },
  ];
}
