const DAY_MS = 86400000;
const PREFERENCES = ['nature', 'culture', 'food', 'adventure', 'relax'];
const PACES = { relaxed: 1, balanced: 2, active: 3 };

export const DEFAULT_TRIP = {
  destination: '스위스',
  startDate: '2027-09-13',
  endDate: '2027-09-17',
  travelers: 4,
  budget: 4000000,
  preferences: ['nature', 'food'],
  pace: 'relaxed',
  notes: '4인 가족여행',
  reservation: {
    enabled: true,
    name: '그린델발트 숙소',
    location: '그린델발트',
    checkIn: '2027-09-13',
    checkOut: '2027-09-17',
    totalCost: null,
  },
};

function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() : NaN;
}

export function validateTrip(trip) {
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) return ['여행 정보를 확인해 주세요.'];
  const errors = [];
  if (typeof trip.destination !== 'string' || !trip.destination.trim() || trip.destination.length > 80) errors.push('여행지는 1~80자로 입력해 주세요.');
  const start = dateValue(trip.startDate);
  const end = dateValue(trip.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push('실제 여행 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
  else if (end < start || (end - start) / DAY_MS + 1 > 30) errors.push('여행 기간은 시작일부터 마지막 날까지 1~30일이어야 합니다.');
  if (!Number.isInteger(trip.travelers) || trip.travelers < 1 || trip.travelers > 12) errors.push('동행 인원은 1~12명으로 입력해 주세요.');
  if (typeof trip.budget !== 'number' || !Number.isFinite(trip.budget) || trip.budget <= 0 || trip.budget > 1000000000) errors.push('전체 여행 예산은 0원 초과, 10억 원 이하로 입력해 주세요.');
  if (!Array.isArray(trip.preferences) || trip.preferences.length > PREFERENCES.length || trip.preferences.some(value => !PREFERENCES.includes(value))) errors.push('여행 취향은 자연, 문화, 음식, 모험, 휴식 중 선택해 주세요.');
  if (typeof trip.pace !== 'string' || !Object.hasOwn(PACES, trip.pace)) errors.push('일정 속도를 여유롭게, 균형 있게, 활동적으로 중 선택해 주세요.');
  if (typeof trip.notes !== 'string' || trip.notes.length > 1000) errors.push('추가 요청은 1,000자 이하로 입력해 주세요.');
  const booking = trip.reservation;
  if (!booking || typeof booking !== 'object' || Array.isArray(booking) || typeof booking.enabled !== 'boolean') errors.push('기존 예약 사용 여부를 확인해 주세요.');
  if (booking?.enabled === true) {
    if (typeof booking.name !== 'string' || !booking.name.trim() || booking.name.length > 120) errors.push('숙소 예약 이름은 1~120자로 입력해 주세요.');
    if (typeof booking.location !== 'string' || !booking.location.trim() || booking.location.length > 80) errors.push('숙소 위치는 1~80자로 입력해 주세요.');
    const checkIn = dateValue(booking.checkIn);
    const checkOut = dateValue(booking.checkOut);
    if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut <= checkIn) errors.push('숙소 체크아웃은 실제 체크인 날짜보다 뒤여야 합니다.');
    if (booking.totalCost !== null && (typeof booking.totalCost !== 'number' || !Number.isFinite(booking.totalCost) || booking.totalCost < 0 || booking.totalCost > 1000000000)) errors.push('숙박 총액은 0~10억 원으로 입력하거나 미입력 상태로 남겨 주세요.');
  }
  return errors;
}

// shortcut: curated demonstration venues and estimated costs, replace through the provider when live destination data is connected.
// Each price is an estimated per-person activity cost; meals and local transit are separate daily allowances.
const SWISS_PLACES = [
  ['grindelwald-village', '그린델발트', 'nature', '그린델발트 마을 전망 산책', '그린델발트', 0, 90, '아이거가 보이는 마을 주변에서 산책하고 사진을 남겨요.'],
  ['first-views', '그린델발트', 'nature', '피르스트 전망 코스', '그린델발트 피르스트', 95000, 150, '곤돌라와 전망 코스를 고려한 데모 예산입니다. 운행과 기상을 먼저 확인하세요.'],
  ['valley-walk', '그린델발트', 'nature', '계곡과 목장 풍경 산책', '그린델발트 주변', 0, 120, '평탄한 구간을 골라 가족의 체력에 맞춰 돌아오는 코스예요.'],
  ['bachalpsee-plan', '그린델발트', 'nature', '바흐알프제 방향 자연 탐방', '피르스트·바흐알프제', 95000, 150, '전체 호수 왕복 대신 체력에 맞는 구간을 선택하세요. 접근 교통과 고도·기상 확인이 필요해요.'],
  ['village-paths', '그린델발트', 'nature', '마을 외곽 전망 길 탐방', '그린델발트', 0, 90, '현지 안내판으로 개방된 보행로를 확인하고 천천히 걸어요.'],
  ['eiger-view', '그린델발트', 'relax', '아이거 전망 카페 휴식', '그린델발트', 12000, 90, '따뜻한 음료와 전망을 즐기며 산악 일정 사이에 쉬어요.'],
  ['picnic', '그린델발트', 'relax', '마을 피크닉과 자유 시간', '그린델발트', 8000, 90, '장보기 후 쉬기 좋은 장소를 현지에서 찾아요. 이용 가능 구역을 확인하세요.'],
  ['slow-photo', '그린델발트', 'relax', '느린 사진 산책', '그린델발트', 0, 90, '멀리 이동하지 않고 동행자가 좋아하는 풍경에 시간을 써요.'],
  ['cheese-tasting', '그린델발트', 'food', '스위스 치즈 취향 탐방', '그린델발트 마을 상점', 18000, 90, '치즈와 간식을 소량 맛보는 체험 예산입니다. 판매·시식 여부와 알레르기를 확인하세요.'],
  ['bakery', '그린델발트', 'food', '마을 베이커리 탐방', '그린델발트', 9000, 90, '빵과 디저트 한 가지씩 나누며 가족의 취향을 찾아요.'],
  ['local-groceries', '그린델발트', 'food', '현지 식재료 장보기', '그린델발트', 8000, 90, '슈퍼마켓에서 간식을 고르고 스위스 식재료를 살펴봐요.'],
  ['alpine-food', '그린델발트', 'food', '알프스 지역 음식 탐방', '그린델발트', 22000, 90, '현지 메뉴를 비교하고 먹어 보고 싶은 요리를 골라요. 식당·메뉴는 현지 확인이 필요해요.'],
  ['village-history', '그린델발트', 'culture', '알프스 마을 건축 산책', '그린델발트', 0, 90, '샬레 건축과 마을 분위기를 살펴보는 느긋한 문화 코스예요.'],
  ['local-culture', '그린델발트', 'culture', '현지 문화 전시 알아보기', '그린델발트', 15000, 90, '방문일에 운영 중인 박물관·전시를 확인해 선택하세요.'],
  ['trail-adventure', '그린델발트', 'adventure', '가족 체력에 맞춘 트레일', '그린델발트 주변', 0, 120, '현지 안내로 난이도를 확인한 뒤 짧은 트레일부터 시작하세요.'],
  ['first-adventure', '그린델발트', 'adventure', '피르스트 액티비티 후보 살펴보기', '그린델발트 피르스트', 130000, 150, '선택한 시설별 연령·키 제한, 운영과 별도 예약 여부를 확인하세요.'],
  ['hohematte', '인터라켄', 'nature', '회헤마테 공원과 산 전망', '인터라켄', 0, 90, '공원 산책과 전망을 즐기는 짧은 근교 코스예요.'],
  ['lake-brienz', '인터라켄', 'nature', '브리엔츠호 호숫가 산책', '브리엔츠호 주변', 0, 120, '호숫가에서 풍경을 즐겨요. 왕복 이동은 별도 확인하세요.'],
  ['lake-thun', '인터라켄', 'relax', '툰호 주변 자유 시간', '툰호 주변', 0, 120, '호숫가에서 가족의 속도에 맞춰 쉬어요. 접근 교통은 별도 확인하세요.'],
  ['chocolate', '인터라켄', 'food', '스위스 초콜릿 맛보기', '인터라켄', 16000, 90, '상점에서 초콜릿을 비교하는 체험 예산입니다. 수업 예약은 포함하지 않아요.'],
  ['interlaken-stroll', '인터라켄', 'culture', '인터라켄 중심 거리 탐방', '인터라켄', 0, 90, '마을 거리와 주변 건축을 살펴보며 동네 분위기를 느껴요.'],
  ['harder-kulm', '인터라켄', 'adventure', '하더 쿨름 전망 후보', '인터라켄 하더 쿨름', 65000, 150, '산악 교통을 고려한 데모 예산입니다. 운영·기상·귀환 교통을 확인하세요.'],
  ['zurich-lake', '취리히', 'nature', '취리히호 산책', '취리히호', 0, 90, '호숫가를 걸으며 도착 후 여유 있게 적응해요.'],
  ['zurich-old-town', '취리히', 'culture', '취리히 구시가지 산책', '취리히 구시가지', 0, 120, '골목과 건축을 둘러보는 도보 코스예요.'],
  ['zurich-tastes', '취리히', 'food', '취리히 디저트 탐방', '취리히 중심가', 18000, 90, '현지 상점에서 디저트를 맛보는 소규모 체험 예산입니다.'],
  ['zurich-break', '취리히', 'relax', '취리히 공원 휴식', '취리히', 0, 90, '가까운 공원에서 동행자와 쉬며 다음 일정을 준비해요.'],
  ['zurich-active', '취리히', 'adventure', '취리히 호숫가 긴 산책', '취리히호', 0, 150, '걷는 거리를 늘리되 가족의 피로도에 따라 일찍 돌아와요.'],
  ['lucerne-lake', '루체른', 'nature', '루체른호 산책', '루체른호', 0, 90, '호숫가 풍경과 산 전망을 천천히 즐겨요.'],
  ['chapel-bridge', '루체른', 'culture', '카펠교와 구시가지 탐방', '루체른 구시가지', 0, 120, '다리와 구시가지 주변을 도보로 살펴봐요.'],
  ['lucerne-food', '루체른', 'food', '루체른 지역 간식 탐방', '루체른 구시가지', 14000, 90, '상점 메뉴를 비교하고 새로운 간식을 나눠 먹어요.'],
  ['lucerne-rest', '루체른', 'relax', '루체른 호숫가 카페 휴식', '루체른', 12000, 90, '이동 사이에 호숫가에서 쉬는 시간을 마련해요.'],
  ['lucerne-active', '루체른', 'adventure', '루체른 도보 탐험', '루체른', 0, 150, '구시가지부터 호숫가까지 체력에 맞춰 걸어 봐요.'],
];

function knownCity(location) {
  if (/그린델발트|grindelwald/i.test(location)) return '그린델발트';
  if (/인터라켄|interlaken/i.test(location)) return '인터라켄';
  if (/취리히|zurich|zürich/i.test(location)) return '취리히';
  if (/루체른|lucerne|luzern/i.test(location)) return '루체른';
  return null;
}

function hasBookedNight(trip) {
  const booking = trip.reservation;
  return booking?.enabled && trip.startDate < booking.checkOut && trip.endDate >= booking.checkIn;
}

function makeItem(date, id, time, title, location, category, description, cost, duration, booking = false) {
  return { id: `${date}-${id}`, time, title, location, category, description, cost, duration, locked: booking, ...(booking ? { bookingId: 'primary-reservation' } : {}) };
}

export async function generatePlan(trip) {
  const errors = validateTrip(trip);
  if (errors.length) throw new Error(errors.join('\n'));
  const start = dateValue(trip.startDate);
  const length = (dateValue(trip.endDate) - start) / DAY_MS + 1;
  const isSwiss = /스위스|switzerland|swiss|schweiz|suisse/i.test(trip.destination);
  const booking = trip.reservation;
  const bookingTitle = suffix => `${booking.name.slice(0, 120 - suffix.length)}${suffix}`;
  const bookedNights = hasBookedNight(trip);
  const lodging = bookedNights ? booking.totalCost ?? 0 : 0;
  const economical = (trip.budget - lodging) / length / trip.travelers < 100000;
  const preferences = [...new Set(trip.preferences.length ? trip.preferences : ['nature', 'culture'])];
  const used = new Set();
  const notes = [
    '데모 추천입니다. 실제 AI, 지도, 교통, 예약 API는 연결하지 않았습니다.',
    '표시한 시간·소요 시간·원화 비용은 시연용 추정치이며, 요금과 환율·영업·운행·접근 경로는 확인하지 않았습니다.',
    '비용은 동행 전체 기준입니다. 식사·지역 교통은 일일 예상액이며 항공, 장거리 도시 간 이동, 보험·쇼핑은 제외했습니다.',
  ];
  if (isSwiss) notes.push('산악 코스는 기상·고도·체력에 따라 바꾸세요. 케이블카·시설은 운영일과 연령·키 제한을 확인해 주세요.');
  else notes.push(`${trip.destination}의 실제 관광지 데이터가 없어 취향별 일반 일정으로 구성했습니다. 장소·이동 가능성은 직접 확인해 주세요.`);
  if (booking?.enabled && (trip.endDate < booking.checkIn || trip.startDate > booking.checkOut)) notes.push('기존 숙소 예약이 여행 기간과 겹치지 않아 일정·숙박비에 반영하지 않았습니다.');
  if (bookedNights && booking.totalCost === null) notes.push('예약 숙박 총액이 없어 예산 합계에서 제외했습니다. 실제 총액을 입력하면 전체 예산이 갱신됩니다.');
  if (bookedNights && (trip.startDate > booking.checkIn || trip.endDate < booking.checkOut)) notes.push('예약 일부만 여행 기간과 겹칩니다. 알려진 숙박 총액은 예약 전체 금액을 한 번 반영하며 일할 계산하지 않습니다.');
  if (booking?.enabled && isSwiss && !knownCity(booking.location) && bookedNights) notes.push('예약 숙소 지역의 관광지 데이터가 없어 해당 날짜는 취향별 일반 일정으로 구성했습니다.');
  if (economical) notes.push('전체 예산과 동행 인원에 맞춰 무료·저비용 장소, 간단한 식사와 짧은 이동을 우선했습니다.');
  const genericTitles = {
    nature: '가까운 공원·자연 풍경 탐방',
    culture: '지역 문화와 거리 탐방',
    food: '현지 음식과 시장 탐방',
    adventure: '체력에 맞춘 도보 탐험',
    relax: '카페·산책과 여유 시간',
  };
  const days = Array.from({ length }, (_, index) => {
    const date = new Date(start + index * DAY_MS).toISOString().slice(0, 10);
    const bookingDay = booking?.enabled && date >= booking.checkIn && date <= booking.checkOut;
    const city = bookingDay ? booking.location.trim() : isSwiss ? ['취리히', '루체른', '인터라켄', '그린델발트'][Math.min(index, 3)] : trip.destination.trim();
    const normalizedCity = isSwiss ? knownCity(city) : null;
    const places = normalizedCity ? SWISS_PLACES.filter(place => {
      const nearby = ['그린델발트', '인터라켄'].includes(normalizedCity) && ['그린델발트', '인터라켄'].includes(place[1]);
      return (place[1] === normalizedCity || nearby) && (!economical || place[5] <= 10000);
    }) : [];
    const items = [
      makeItem(date, 'transport', '08:30', '지역 이동 준비', city, 'transport', '지역 대중교통 등 하루 이동 예산입니다. 시간표·노선은 연결되지 않았고 도시 간 이동 비용은 별도예요.', (economical ? 12000 : 28000) * trip.travelers, 60),
      makeItem(date, 'meals', '12:00', economical ? '하루 식사·간식 · 알뜰 예산' : '하루 식사·간식 예산', city, 'food', '동행 전체의 하루 식사와 간식 예상액입니다. 점심을 포함하고 저녁 비용도 이 항목에 합산해요.', (economical ? 28000 : 45000) * trip.travelers, 60),
    ];
    for (let slot = 0; slot < PACES[trip.pace]; slot += 1) {
      const preference = preferences[(index + slot) % preferences.length];
      const available = places.filter(place => !used.has(place[0]));
      const place = available.find(candidate => candidate[2] === preference)
        ?? available.find(candidate => preferences.includes(candidate[2]));
      const time = ['09:30', '13:30', '16:00'][slot];
      if (place) {
        used.add(place[0]);
        items.push(makeItem(date, place[0], time, place[3], place[4], 'activity', `${place[7]}${place[1] !== normalizedCity ? ' 숙소 기준 왕복 이동과 연결 시간을 확인해 주세요.' : ''}`, place[5] * trip.travelers, place[6]));
      } else {
        items.push(makeItem(date, `free-${slot}`, time, `${genericTitles[preference]} · ${index + 1}일차 ${slot + 1}코스`, city, 'activity', places.length ? '방문한 장소와 겹치지 않도록 새로운 구간을 현지에서 선택하세요. 구체적 장소는 직접 확인해 주세요.' : '구체적 관광지를 지정하지 않은 일반 추천입니다. 숙소에서 갈 수 있는 장소를 확인해 선택해 주세요.', (preference === 'food' ? (economical ? 8000 : 16000) : 0) * trip.travelers, 90));
      }
    }
    if (bookingDay && date === booking.checkOut) items.push(makeItem(date, 'booking-checkout', '08:00', bookingTitle(' · 체크아웃'), booking.location, 'stay', '기존 예약을 보존했습니다. 표시 시간은 데모이며 실제 체크아웃 시간은 예약 확인서에서 확인하세요. 이날 숙박은 포함하지 않습니다.', 0, 30, true));
    if (bookingDay && date === booking.checkIn) items.push(makeItem(date, 'booking-checkin', '18:30', bookingTitle(' · 체크인'), booking.location, 'stay', '기존 예약을 보존했습니다. 표시 시간은 데모이며 실제 체크인 가능 시간은 예약 확인서에서 확인하세요.', 0, 30, true));
    if (bookingDay && date < booking.checkOut) items.push(makeItem(date, 'booking-night', '20:30', bookingTitle(' · 예약 숙박'), booking.location, 'stay', booking.totalCost === null ? '숙박 총액 미입력. 일별 항목에서 중복 청구하지 않으며 예산 합계에서도 제외합니다.' : '예약 전체 숙박비는 예산에서 한 번만 계산합니다.', 0, 0, true));
    items.sort((a, b) => a.time.localeCompare(b.time));
    return { date, label: `${index + 1}일차`, city, items };
  });
  if (days.slice(0, -1).some(day => !day.items.some(item => item.id.endsWith('-booking-night')))) notes.push('예약 숙박이 없는 날짜의 숙소 비용은 포함하지 않았습니다. 추가 숙소가 필요하면 일정을 수정해 숙박 항목을 입력하세요.');
  if (calculateBudget(trip, days).remaining < 0) notes.push('현재 추정 합계가 전체 예산을 초과합니다. 활동·식사·교통비를 조정하거나 예산을 늘려 주세요.');
  return { days, notes, provider: 'demo' };
}

export function calculateBudget(trip, days) {
  const sums = { activities: 0, food: 0, transport: 0, lodging: 0 };
  const categoryKeys = { activity: 'activities', food: 'food', transport: 'transport', stay: 'lodging' };
  for (const day of days) {
    for (const item of day.items) {
      const key = Object.hasOwn(categoryKeys, item.category) ? categoryKeys[item.category] : null;
      if (key && !item.bookingId && typeof item.cost === 'number' && Number.isFinite(item.cost) && item.cost >= 0) sums[key] += item.cost;
    }
  }
  const bookedNights = hasBookedNight(trip);
  const missingNight = days.slice(0, -1).some(day => {
    const reserved = trip.reservation?.enabled && day.date >= trip.reservation.checkIn && day.date < trip.reservation.checkOut;
    return !reserved && !day.items.some(item => item.category === 'stay' && !item.bookingId && Number.isFinite(item.cost) && item.cost >= 0);
  });
  const lodgingUnknown = Boolean(bookedNights && trip.reservation.totalCost === null || missingNight);
  if (bookedNights && typeof trip.reservation.totalCost === 'number' && Number.isFinite(trip.reservation.totalCost) && trip.reservation.totalCost >= 0) sums.lodging += trip.reservation.totalCost;
  const total = Object.values(sums).reduce((sum, value) => sum + value, 0);
  return { ...sums, total, remaining: trip.budget - total, percent: Math.round(total / trip.budget * 100), lodgingUnknown };
}
