import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRIP, validateTrip, generatePlan, calculateBudget } from '../dist/js/planner.js';

const trip = (changes = {}) => ({ ...structuredClone(DEFAULT_TRIP), ...changes });
const activities = plan => plan.days.flatMap(day => day.items.filter(item => item.category === 'activity'));

test('default itinerary has five UTC dates regardless of local time zone', async () => {
  const originalZone = process.env.TZ;
  for (const timezone of ['Asia/Seoul', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    process.env.TZ = timezone;
    assert.deepEqual((await generatePlan(trip())).days.map(day => day.date), ['2027-09-13', '2027-09-14', '2027-09-15', '2027-09-16', '2027-09-17']);
  }
  if (originalZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalZone;
});

test('inclusive ranges accept a single day, leap day, and thirty days', async () => {
  assert.equal((await generatePlan(trip({ endDate: '2027-09-13' }))).days.length, 1);
  assert.equal((await generatePlan(trip({ startDate: '2028-02-28', endDate: '2028-03-01' }))).days.length, 3);
  assert.equal((await generatePlan(trip({ startDate: '2027-09-01', endDate: '2027-09-30' }))).days.length, 30);
});

test('invalid real dates, ranges, input types, and field limits are rejected', async () => {
  const invalid = [
    { startDate: '2027-02-29' }, { startDate: '2027-09-31' }, { startDate: '2027-9-13' },
    { endDate: '2027-09-12' }, { startDate: '2027-09-01', endDate: '2027-10-01' },
    { travelers: 0 }, { travelers: 13 }, { travelers: 2.5 }, { travelers: '4' },
    { budget: 0 }, { budget: Infinity }, { budget: 1000000001 }, { budget: '4000000' },
    { destination: '' }, { destination: 'x'.repeat(81) }, { notes: 'x'.repeat(1001) },
    { preferences: ['invalid'] }, { preferences: 'nature' }, { pace: 'invalid' },
    { reservation: null }, { reservation: undefined }, { reservation: {} },
    { reservation: { ...DEFAULT_TRIP.reservation, name: 'x'.repeat(121) } },
    { reservation: { ...DEFAULT_TRIP.reservation, location: 'x'.repeat(81) } },
    { reservation: { ...DEFAULT_TRIP.reservation, checkOut: '2027-09-13' } },
    { reservation: { ...DEFAULT_TRIP.reservation, checkIn: '2027-02-30' } },
    { reservation: { ...DEFAULT_TRIP.reservation, totalCost: -1 } },
    { reservation: { ...DEFAULT_TRIP.reservation, totalCost: NaN } },
    { reservation: { ...DEFAULT_TRIP.reservation, totalCost: Infinity } },
    { reservation: { ...DEFAULT_TRIP.reservation, totalCost: 1000000001 } },
  ];
  for (const changes of invalid) assert.ok(validateTrip(trip(changes)).length > 0, JSON.stringify(changes));
  assert.deepEqual(validateTrip(trip()), []);
  assert.deepEqual(validateTrip(trip({ reservation: { enabled: false } })), []);
  assert.ok(validateTrip(null).length > 0);
  await assert.rejects(generatePlan(trip({ startDate: 'invalid' })), /실제 여행 날짜/);
});

test('preferences and pace change selected activities without duplicate named venues', async () => {
  const nature = await generatePlan(trip({ preferences: ['nature'] }));
  const food = await generatePlan(trip({ preferences: ['food'] }));
  assert.notDeepEqual(activities(nature).map(item => item.title), activities(food).map(item => item.title));
  const relaxed = await generatePlan(trip());
  const balanced = await generatePlan(trip({ pace: 'balanced' }));
  const active = await generatePlan(trip({ pace: 'active' }));
  assert.equal(activities(relaxed).length, 5);
  assert.equal(activities(balanced).length, 10);
  assert.equal(activities(active).length, 15);
  assert.equal(new Set(activities(active).map(item => item.title)).size, 15);
  assert.deepEqual(validateTrip(trip({ preferences: [] })), []);
});

test('budget reduces paid choices and scales costs for entire party', async () => {
  const normalTrip = trip({ preferences: ['nature'] });
  const economicalTrip = trip({ preferences: ['nature'], budget: 300000 });
  const normal = await generatePlan(normalTrip);
  const economical = await generatePlan(economicalTrip);
  assert.ok(calculateBudget(economicalTrip, economical.days).total < calculateBudget(normalTrip, normal.days).total);
  assert.ok(activities(economical).every(item => item.cost <= 10000 * economicalTrip.travelers));
  assert.ok(activities(normal).some(item => item.cost > 0));
  const soloTrip = trip({ travelers: 1 });
  const solo = await generatePlan(soloTrip);
  const party = await generatePlan(trip());
  assert.equal(calculateBudget(trip(), party.days).total, calculateBudget(soloTrip, solo.days).total * 4);
  assert.ok(economical.notes.some(note => note.includes('초과')));
});

test('check-in, all four booking nights, and checkout are locked; checkout has no overnight', async () => {
  const plan = await generatePlan(trip());
  assert.ok(plan.days[0].items.some(item => item.id.endsWith('-booking-checkin')));
  assert.equal(plan.days.flatMap(day => day.items.filter(item => item.id.endsWith('-booking-night'))).length, 4);
  assert.ok(plan.days.at(-1).items.some(item => item.id.endsWith('-booking-checkout')));
  assert.ok(plan.days.at(-1).items.every(item => !item.id.endsWith('-booking-night')));
  assert.ok(plan.days.flatMap(day => day.items.filter(item => item.bookingId)).every(item => item.locked && item.cost === 0));
  const partial = await generatePlan(trip({ startDate: '2027-09-15', endDate: '2027-09-18' }));
  assert.equal(partial.days.flatMap(day => day.items.filter(item => item.id.endsWith('-booking-night'))).length, 2);
  assert.ok(partial.days[2].items.some(item => item.id.endsWith('-booking-checkout')));
  assert.ok(!partial.days[3].items.some(item => item.bookingId));
});

test('known lodging counted once; unknown lodging excluded and flagged; editable costs included', async () => {
  const unknownTrip = trip();
  const unknown = await generatePlan(unknownTrip);
  const unknownBudget = calculateBudget(unknownTrip, unknown.days);
  assert.equal(unknownBudget.lodging, 0);
  assert.equal(unknownBudget.lodgingUnknown, true);
  const knownTrip = trip({ reservation: { ...DEFAULT_TRIP.reservation, totalCost: 1200000 } });
  const known = await generatePlan(knownTrip);
  const knownBudget = calculateBudget(knownTrip, known.days);
  assert.equal(knownBudget.lodging, 1200000);
  assert.equal(knownBudget.lodgingUnknown, false);
  assert.equal(knownBudget.total, knownBudget.activities + knownBudget.food + knownBudget.transport + 1200000);
  known.days[0].items.push({ category: 'stay', cost: 100000 });
  assert.equal(calculateBudget(knownTrip, known.days).lodging, 1300000);
  const checkoutTrip = trip({ startDate: '2027-09-17', endDate: '2027-09-17', reservation: { ...DEFAULT_TRIP.reservation, totalCost: 1200000 } });
  assert.equal(calculateBudget(checkoutTrip, (await generatePlan(checkoutTrip)).days).lodging, 0);
});

test('non-overlapping booking is not applied to destination or budget', async () => {
  const unrelatedTrip = trip({ startDate: '2027-08-01', endDate: '2027-08-02', reservation: { ...DEFAULT_TRIP.reservation, location: '도쿄', totalCost: 1200000 } });
  const plan = await generatePlan(unrelatedTrip);
  assert.ok(plan.days.every(day => day.city !== '도쿄' && day.items.every(item => !item.bookingId)));
  assert.equal(calculateBudget(unrelatedTrip, plan.days).lodging, 0);
  assert.equal(calculateBudget(unrelatedTrip, plan.days).lodgingUnknown, true);
  assert.ok(plan.notes.some(note => note.includes('겹치지 않아')));
});

test('unbooked overnight costs are unknown until user adds lodging; final date needs no overnight', async () => {
  const noBookingTrip = trip({ reservation: { enabled: false }, startDate: '2027-09-13', endDate: '2027-09-14' });
  const noBooking = await generatePlan(noBookingTrip);
  assert.equal(calculateBudget(noBookingTrip, noBooking.days).lodgingUnknown, true);
  noBooking.days[0].items.push({ category: 'stay', cost: 180000 });
  assert.equal(calculateBudget(noBookingTrip, noBooking.days).lodgingUnknown, false);
  const singleDayTrip = { ...noBookingTrip, endDate: '2027-09-13' };
  assert.equal(calculateBudget(singleDayTrip, (await generatePlan(singleDayTrip)).days).lodgingUnknown, false);
  const partialBookingTrip = trip({ endDate: '2027-09-18', reservation: { ...DEFAULT_TRIP.reservation, totalCost: 1200000 } });
  assert.equal(calculateBudget(partialBookingTrip, (await generatePlan(partialBookingTrip)).days).lodgingUnknown, true);
});

test('booking titles fit activity field bounds while original name stays intact; Swiss alias recognized', async () => {
  const longNameTrip = trip({ destination: 'Swiss Alps', reservation: { ...DEFAULT_TRIP.reservation, name: '숙'.repeat(120) } });
  assert.deepEqual(validateTrip(longNameTrip), []);
  const plan = await generatePlan(longNameTrip);
  assert.ok(plan.days.flatMap(day => day.items).every(item => item.title.length <= 120));
  assert.equal(longNameTrip.reservation.name.length, 120);
  assert.ok(plan.notes.some(note => note.includes('산악 코스')));
});

test('unknown destination has explicit generic venue disclaimer and preserves reservation', async () => {
  const generic = await generatePlan(trip({ destination: '타이베이', reservation: { ...DEFAULT_TRIP.reservation, location: '타이베이' } }));
  assert.equal(generic.provider, 'demo');
  assert.ok(generic.notes.some(note => note.includes('실제 관광지 데이터가 없어')));
  assert.ok(generic.days.every(day => day.city === '타이베이'));
  assert.ok(activities(generic).every(item => item.location === '타이베이' && item.description.includes('일반 추천')));
  assert.ok(generic.days[0].items.some(item => item.id.endsWith('-booking-checkin')));
});
