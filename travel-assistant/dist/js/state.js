import { validateTrip, generatePlan } from './planner.js';

const categories = new Set(['activity', 'food', 'transport', 'stay']);
const shortText = (value, max) => typeof value === 'string' && value.length <= max;

export async function validateSnapshot(value) {
  if (!value || value.schemaVersion !== 1 || !value.trip || !value.plan) throw new Error('지원하는 여행 JSON 형식이 아닙니다.');
  const errors = validateTrip(value.trip);
  if (errors.length) throw new Error(errors.join(' '));
  const reference = await generatePlan(value.trip);
  const { days, notes, provider } = value.plan;
  if (!Array.isArray(days) || days.length !== reference.days.length || !Array.isArray(notes) || notes.length > 30 || notes.some(note => !shortText(note, 2000)) || !shortText(provider, 80)) throw new Error('일정 데이터가 올바르지 않습니다.');
  const ids = new Set();
  for (const [index, day] of days.entries()) {
    if (!day || day.date !== reference.days[index].date || !shortText(day.label, 200) || !shortText(day.city, 120) || !Array.isArray(day.items) || day.items.length > 60) throw new Error('일정 날짜나 활동 개수를 확인하세요.');
    for (const item of day.items) {
      if (!item || !shortText(item.id, 160) || !item.id || ids.has(item.id) || !shortText(item.title, 120) || !item.title.trim() || !shortText(item.location, 120) || !item.location.trim() || !shortText(item.description, 1000) || !categories.has(item.category) || typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) || !Number.isFinite(item.cost) || item.cost < 0 || item.cost > 1e9 || !Number.isInteger(item.duration) || item.duration < (item.locked && item.category === 'stay' ? 0 : 1) || item.duration > 1440 || typeof item.locked !== 'boolean' || (!item.locked && item.bookingId !== undefined)) throw new Error('활동의 이름·시간·비용·소요 시간을 확인하세요.');
      ids.add(item.id);
    }
    const actualLocked = day.items.filter(item => item.locked);
    const expectedLocked = reference.days[index].items.filter(item => item.locked);
    if (JSON.stringify(actualLocked) !== JSON.stringify(expectedLocked)) throw new Error('고정 예약 항목이 변경되었습니다. 여행 조건에서 예약을 수정하세요.');
  }
  if (!Number.isInteger(value.selectedDay) || value.selectedDay < 0 || value.selectedDay >= days.length) throw new Error('선택한 여행 날짜가 올바르지 않습니다.');
  return value;
}
