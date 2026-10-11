import { generatePlan } from './planner.js';

// Swap this boundary for a server-side POST /api/plan when connecting an LLM.
// Never place LLM or paid data-provider secrets in browser source.
export async function planTrip(trip) {
  return generatePlan(trip);
}

// Map links work now; live place lookup and timetables belong behind a backend.
export function mapLink(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
