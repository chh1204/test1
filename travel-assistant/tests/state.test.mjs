import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRIP, generatePlan } from '../dist/js/planner.js';
import { validateSnapshot } from '../dist/js/state.js';
import { mapLink } from '../dist/js/providers.js';

async function snapshot() {
  const trip = structuredClone(DEFAULT_TRIP);
  return { schemaVersion: 1, trip, plan: await generatePlan(trip), selectedDay: 0 };
}

test('exported default and custom edited itinerary can be restored', async () => {
  const data = await snapshot();
  await validateSnapshot(JSON.parse(JSON.stringify(data)));
  const item = data.plan.days[0].items.find(item => !item.locked);
  item.title = '가족이 정한 새로운 일정'; item.cost = 123456;
  await validateSnapshot(data);
});

test('bad dates, costs, duplicate IDs and tampered reservation are rejected', async () => {
  for (const mutate of [
    data => { data.plan.days[0].date = '2027-09-12'; },
    data => { data.plan.days[0].items[0].cost = -1; },
    data => { data.plan.days[0].items[0].cost = Infinity; },
    data => { data.plan.days[0].items[0].time = ['09:30']; },
    data => { data.trip.pace = ['relaxed']; },
    data => { data.plan.days[0].items[1].id = data.plan.days[0].items[0].id; },
    data => { data.plan.days[0].items[0].bookingId = 'forged'; },
    data => { data.plan.days[0].items = data.plan.days[0].items.filter(item => !item.locked); },
    data => { data.selectedDay = 999; },
    data => { data.schemaVersion = 9; },
  ]) {
    const data = await snapshot(); mutate(data);
    await assert.rejects(validateSnapshot(data));
  }
});

test('map queries safely encode arbitrary place names', () => {
  const url = new URL(mapLink('그린델발트 & ? " <script>'));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('query'), '그린델발트 & ? " <script>');
});
