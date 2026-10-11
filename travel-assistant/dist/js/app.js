import { DEFAULT_TRIP, validateTrip, calculateBudget } from './planner.js';
import { planTrip, mapLink } from './providers.js';
import { validateSnapshot } from './state.js';

const $ = (selector) => document.querySelector(selector);
const money = value => new Intl.NumberFormat('ko-KR').format(Math.round(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const date = (value, options = { month: 'long', day: 'numeric' }) => new Intl.DateTimeFormat('ko-KR', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const shortDate = value => value.replaceAll('-', '. ');
const prefs = { nature: '자연', culture: '문화', food: '미식', adventure: '액티비티', relax: '휴식' };
const cats = { activity: ['관광·체험', 'mountain'], food: ['식사', 'food'], transport: ['이동', 'train'], stay: ['숙박', 'bed'] };
const STORAGE_KEY = 'roam.travel.v1';
let state;
let editingId = null;
let toastTimer;
let busy = false;

function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('#save-status').innerHTML = `${icon('check')}이 브라우저에 저장됨`;
  } catch {
    $('#save-status').textContent = '저장 불가 · JSON으로 내보내세요';
    notify('브라우저 저장 공간을 사용할 수 없습니다. 내보내기로 백업하세요.');
  }
}

function render() {
  const { trip, plan, selectedDay } = state;
  const swiss = /스위스|swiss|switzerland/i.test(trip.destination);
  const title = `${trip.destination} ${trip.travelers > 1 ? '함께하는 여행' : '나만의 여행'}`;
  const range = `${shortDate(trip.startDate)} – ${shortDate(trip.endDate)}`;
  $('#sidebar-title').textContent = title;
  $('#sidebar-date').textContent = range;
  $('#breadcrumb-title').textContent = title;
  $('#hero-destination').textContent = swiss ? 'SWITZERLAND' : trip.destination;
  $('#hero-title').innerHTML = swiss ? `함께 떠나요,<br>스위스의 ${new Date(trip.startDate).getUTCMonth() >= 8 && new Date(trip.startDate).getUTCMonth() <= 10 ? '가을' : '풍경'}.` : `나다운 여행,<br>${esc(trip.destination)}에서.`;
  $('#hero-subtitle').textContent = swiss ? '알프스의 풍경 속, 우리만의 속도로 채우는 시간.' : '취향과 예산을 담아, 새로운 발견을 향해.';
  $('.hero').classList.toggle('generic-destination', !swiss);
  $('.photo-credit').hidden = !swiss;
  $('.swiss-flag').hidden = !swiss;
  $('#hero-date').textContent = range;
  $('#hero-party').textContent = `${trip.travelers}인 여행`;
  $('#stat-days').textContent = `${plan.days.length - 1}박 ${plan.days.length}일`;
  $('#stat-party').textContent = `${trip.travelers}명`;
  $('#stat-budget').innerHTML = `${money(trip.budget)}<span>원</span>`;
  $('#stat-prefs').textContent = trip.preferences.length ? trip.preferences.map(key => prefs[key]).join(' · ') : '골고루 탐색';
  $('#day-tabs').innerHTML = plan.days.map((day, index) => `<button class="day-tab ${index === selectedDay ? 'selected' : ''}" id="tab-${index}" role="tab" aria-selected="${index === selectedDay}" aria-controls="day-panel" tabindex="${index === selectedDay ? 0 : -1}" data-day="${index}"><span>DAY ${String(index + 1).padStart(2, '0')}</span><strong>${date(day.date, { month: 'numeric', day: 'numeric' })}</strong><small>${esc(day.city)}</small></button>`).join('');
  const day = plan.days[selectedDay];
  $('#day-panel').setAttribute('aria-labelledby', `tab-${selectedDay}`);
  $('#day-label').textContent = `DAY ${String(selectedDay + 1).padStart(2, '0')} · ${date(day.date, { month: 'long', day: 'numeric', weekday: 'long' })}`;
  $('#day-title').textContent = selectedDay === 0 ? `안녕, ${day.city}` : selectedDay === plan.days.length - 1 ? '여행의 마지막까지, 천천히' : `${day.city}, 우리만의 하루`;
  $('#day-description').textContent = `${day.city}에서 ${trip.pace === 'relaxed' ? '여유롭게' : trip.pace === 'active' ? '알차게' : '균형 있게'} 보내는 하루`;
  $('#day-cost').innerHTML = `<span>이 날의 예상 지출</span><strong>${money(day.items.reduce((sum, item) => sum + (item.locked && item.category === 'stay' ? 0 : item.cost), 0))}원</strong><small>예약 숙박비는 총예산에서 별도 계산</small>`;
  $('#timeline').innerHTML = [...day.items].sort((a, b) => a.time.localeCompare(b.time)).map((item, index) => {
    const [category, glyph] = cats[item.category];
    const destinationQuery = `${item.location} ${trip.destination}`;
    return `<div class="timeline-item"><span class="timeline-marker ${item.category}">${icon(glyph)}</span><div class="activity-card ${item.category} ${index === 0 ? 'featured' : ''}"><div class="activity-top"><span class="category-badge ${item.category}">${category}</span>${item.locked ? `<span class="locked-badge">${icon('lock')}예약 고정</span>` : ''}</div><div class="activity-main"><div class="activity-info"><h4>${esc(item.title)}</h4><p class="activity-location">${icon('pin')}${esc(item.location)}</p><p class="activity-description">${esc(item.description)}</p></div><div class="activity-actions">${item.locked ? `<button type="button" class="icon-button" data-open-trip aria-label="숙박 예약 정보 수정">${icon('lock')}</button>` : `<button type="button" class="icon-button" data-edit="${esc(item.id)}" aria-label="${esc(item.title)} 수정">${icon('edit')}</button>`}</div></div><div class="activity-bottom"><strong>${esc(item.time)}</strong><span class="duration">${item.duration >= 60 ? `${Math.floor(item.duration / 60)}시간${item.duration % 60 ? ` ${item.duration % 60}분` : ''}` : `${item.duration}분`}</span><span class="activity-cost">${item.locked && item.category === 'stay' ? '예약 숙박비 별도' : item.cost ? `약 ${money(item.cost)}원` : '추가 비용 없음'}</span><a class="map-link" href="${esc(mapLink(destinationQuery))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.location)} 지도 검색">지도 ↗</a></div></div></div>`;
  }).join('');
  renderBudget();
  renderBooking();
  $('#pace-insight').textContent = trip.pace === 'relaxed' ? '주요 활동은 하루 1개. 이동과 식사 사이에 여유를 두어, 함께하는 사람의 속도로 여행해요.' : trip.pace === 'active' ? '주요 활동은 하루 3개. 하고 싶은 일이 많은 날엔 소요 시간을 수정해 휴식도 챙겨주세요.' : '주요 활동은 하루 2개. 풍경과 작은 발견, 휴식이 균형을 이루는 여행을 그렸어요.';
  $('#plan-notes').innerHTML = plan.notes.map(note => `<p>${esc(note)}</p>`).join('');
  save();
}

function renderBudget() {
  const budget = calculateBudget(state.trip, state.plan.days);
  $('#budget-total').innerHTML = `${money(budget.total)}<span>원</span>`;
  const percentage = Math.round(budget.percent);
  $('#budget-fill').style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  $('#budget-fill').classList.toggle('over-budget', budget.remaining < 0);
  $('#budget-track').setAttribute('aria-valuenow', Math.min(100, Math.max(0, percentage)));
  $('#budget-track').setAttribute('aria-valuetext', `예산의 ${percentage}%`);
  $('#budget-ratio').textContent = `예산의 ${percentage}%`;
  $('#budget-remaining').textContent = budget.remaining < 0 ? `${money(-budget.remaining)}원 초과` : `${money(budget.remaining)}원 남음`;
  const entries = [['stay', '숙박', budget.lodging], ['activity', '관광·체험', budget.activities], ['food', '식사', budget.food], ['transport', '교통', budget.transport]];
  $('#budget-breakdown').innerHTML = entries.map(([category, label, value]) => `<div class="budget-row"><span><i class="budget-dot ${category}"></i>${label}</span><strong>${category === 'stay' && budget.lodgingUnknown ? `${value ? `${money(value)}원 + ` : ''}미입력` : `${money(value)}원`}</strong></div>`).join('');
  $('#budget-warning').textContent = [budget.lodgingUnknown ? '숙박 금액 미입력 — 총액과 잔액에 포함되지 않았어요.' : '', budget.remaining < 0 ? '설정한 예산을 넘었어요. 활동이나 금액을 조정해 주세요.' : ''].filter(Boolean).join(' ');
}

function renderBooking() {
  const r = state.trip.reservation;
  $('#booking-content').innerHTML = r.enabled ? `<span class="booking-label">${icon('check')}입력한 예약 · 확인 필요</span><h3 class="booking-name">${esc(r.name)}</h3><p class="booking-place">${icon('pin')}${esc(r.location)}</p><div class="booking-dates"><div class="booking-date"><small>체크인</small><strong>${date(r.checkIn)}</strong></div><span>${icon('arrow')}</span><div class="booking-date"><small>체크아웃</small><strong>${date(r.checkOut)}</strong></div></div><p class="booking-note">${Math.round((Date.parse(r.checkOut) - Date.parse(r.checkIn)) / 86400000)}박 · ${r.totalCost === null ? '숙박 금액 미입력' : `전체 ${money(r.totalCost)}원`}<br>예약일은 일정에 고정되어 있어요.</p>` : '<p class="empty-booking">예약한 숙소를 추가하면<br>그 일정은 고정해둘게요.</p>';
}

function openTrip() {
  const f = $('#trip-form');
  const trip = state.trip;
  for (const name of ['destination', 'startDate', 'endDate', 'travelers', 'budget', 'pace', 'notes']) f.elements[name].value = trip[name];
  for (const checkbox of f.querySelectorAll('[name="preferences"]')) checkbox.checked = trip.preferences.includes(checkbox.value);
  f.elements.reservationEnabled.checked = trip.reservation.enabled;
  for (const [name, key] of [['reservationName', 'name'], ['reservationLocation', 'location'], ['checkIn', 'checkIn'], ['checkOut', 'checkOut'], ['lodgingCost', 'totalCost']]) f.elements[name].value = trip.reservation[key] ?? '';
  toggleReservation();
  $('#trip-error').textContent = '';
  $('#trip-dialog').showModal();
}

function toggleReservation() {
  const enabled = $('#trip-form').elements.reservationEnabled.checked;
  $('#reservation-fields').hidden = !enabled;
  for (const input of $('#reservation-fields').querySelectorAll('input')) {
    input.disabled = !enabled;
    input.required = enabled && input.name !== 'lodgingCost';
  }
}

function readTrip() {
  const f = $('#trip-form').elements;
  return {
    destination: f.destination.value.trim(), startDate: f.startDate.value, endDate: f.endDate.value,
    travelers: Number(f.travelers.value), budget: Number(f.budget.value),
    preferences: [...$('#trip-form').querySelectorAll('[name="preferences"]:checked')].map(input => input.value),
    pace: f.pace.value, notes: f.notes.value.trim(),
    reservation: { enabled: f.reservationEnabled.checked, name: f.reservationName.value.trim(), location: f.reservationLocation.value.trim(), checkIn: f.checkIn.value, checkOut: f.checkOut.value, totalCost: f.lodgingCost.value === '' ? null : Number(f.lodgingCost.value) }
  };
}

async function generate(trip) {
  if (busy) return;
  busy = true;
  const buttons = [$('#generate-button'), $('#regenerate-button')];
  buttons.forEach(button => button.disabled = true);
  try {
    const plan = await planTrip(trip);
    const next = { schemaVersion: 1, trip: structuredClone(trip), plan, selectedDay: 0 };
    await validateSnapshot(next);
    state = next;
    render();
    if ($('#trip-dialog').open) $('#trip-dialog').close();
    notify('취향과 예약을 담은 새 일정을 만들었어요.');
  } catch (error) {
    $('#trip-error').textContent = error.message;
    notify(`일정 생성 실패: ${error.message}`);
  } finally { busy = false; buttons.forEach(button => button.disabled = false); }
}

function confirmChange(title, message) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

function openActivity(id = null) {
  const day = state.plan.days[state.selectedDay];
  const item = id ? day.items.find(item => item.id === id) : { title: '', time: '15:00', category: 'activity', location: day.city, cost: 0, duration: 60, description: '' };
  if (!item || item.locked) return;
  if (!id && day.items.length >= 60) return notify('하루 최대 60개 일정까지 추가할 수 있어요.');
  editingId = id;
  const f = $('#activity-form').elements;
  for (const name of ['title', 'time', 'category', 'location', 'cost', 'duration', 'description']) f[name].value = item[name];
  $('#activity-dialog-title').textContent = id ? '일정 수정' : '나만의 일정 추가';
  $('#delete-button').hidden = !id;
  $('#activity-error').textContent = '';
  $('#activity-dialog').showModal();
}

document.addEventListener('click', event => {
  const open = event.target.closest('[data-open-trip]');
  if (open) openTrip();
  const close = event.target.closest('[data-close-dialog]');
  if (close) close.closest('dialog').close();
  const edit = event.target.closest('[data-edit]');
  if (edit) openActivity(edit.dataset.edit);
  const tab = event.target.closest('[data-day]');
  if (tab) { state.selectedDay = Number(tab.dataset.day); render(); $(`#tab-${state.selectedDay}`).focus(); }
});

$('#day-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  state.selectedDay = event.key === 'Home' ? 0 : event.key === 'End' ? state.plan.days.length - 1 : (state.selectedDay + (event.key === 'ArrowRight' ? 1 : -1) + state.plan.days.length) % state.plan.days.length;
  render(); $(`#tab-${state.selectedDay}`).focus();
});

$('#trip-form').elements.reservationEnabled.addEventListener('change', toggleReservation);
$('#trip-form').addEventListener('submit', async event => {
  event.preventDefault();
  const trip = readTrip();
  const errors = validateTrip(trip);
  if (errors.length) { $('#trip-error').textContent = errors.join(' '); return; }
  await generate(trip);
});

$('#add-button').addEventListener('click', () => openActivity());
$('#activity-form').addEventListener('submit', async event => {
  event.preventDefault();
  const f = $('#activity-form').elements;
  const next = structuredClone(state);
  const day = next.plan.days[next.selectedDay];
  const item = { id: editingId ?? crypto.randomUUID(), time: f.time.value, title: f.title.value.trim(), location: f.location.value.trim(), category: f.category.value, description: f.description.value.trim(), cost: Number(f.cost.value), duration: Number(f.duration.value), locked: false };
  if (editingId) {
    const index = day.items.findIndex(item => item.id === editingId && !item.locked);
    if (index < 0) return;
    day.items[index] = item;
  } else day.items.push(item);
  try {
    await validateSnapshot(next);
    state = next; render(); $('#activity-dialog').close(); notify('일정을 저장했어요. 예상 예산도 업데이트했습니다.');
  } catch (error) { $('#activity-error').textContent = error.message; }
});

$('#delete-button').addEventListener('click', () => {
  const day = state.plan.days[state.selectedDay];
  day.items = day.items.filter(item => item.id !== editingId || item.locked);
  render(); $('#activity-dialog').close(); notify('일정을 삭제했어요.');
});

$('#regenerate-button').addEventListener('click', async () => {
  if (await confirmChange('일정을 다시 추천할까요?', '수정한 활동을 현재 여행 조건에 맞춘 새 추천으로 대체합니다. 필요하면 먼저 내보내기로 저장하세요.')) await generate(state.trip);
});
$('#reset-button').addEventListener('click', async () => {
  if (await confirmChange('스위스 예시로 돌아갈까요?', '현재 여행을 2027년 스위스 4인 가족여행 예시로 대체합니다. 필요하면 먼저 내보내기로 저장하세요.')) await generate(structuredClone(DEFAULT_TRIP));
});

$('#export-button').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `roam-${state.trip.startDate}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('현재 일정과 예약 정보를 JSON으로 내보냈어요.');
});
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error('파일은 10MB 이하만 불러올 수 있습니다.');
    const next = await validateSnapshot(JSON.parse(await file.text()));
    if (await confirmChange('저장한 여행을 불러올까요?', '현재 여행을 파일에 저장된 일정으로 대체합니다.')) { state = next; render(); notify('저장한 여행을 불러왔어요.'); }
  } catch (error) { notify(`불러오기 실패: ${error.message}`); }
});

async function init() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) state = await validateSnapshot(JSON.parse(stored));
  } catch { notify('저장된 여행을 읽지 못했어요. 스위스 예시를 준비했습니다.'); }
  if (!state) { const trip = structuredClone(DEFAULT_TRIP); state = { schemaVersion: 1, trip, plan: await planTrip(trip), selectedDay: 0 }; }
  render();
}

init().catch(() => {
  $('#save-status').textContent = '앱을 시작하지 못했습니다.';
  notify('앱을 실행할 수 없습니다. README의 로컬 서버 실행 방법을 확인하세요.');
});
