const MONTHS_2026 = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2026, index, 1);
  return {
    key: `${date.getFullYear()}-${String(index + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', { month: 'long' }),
    shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
    start: date,
    end: new Date(2026, index + 1, 0)
  };
});

const ASSET_NAMES = [
  'EV Runs',
  'Auger',
  'Enchilada',
  'Salsa',
  'Turitella',
  'Pontus',
  'Poseidon',
  'Noble Voyager',
  'Q5000',
  'Stena Evolution',
  'Appomattox',
  'Mars',
  'Olympus',
  'Ursa',
  'Vito',
  'Perdido',
  'Whale',
];

const state = {
  records: [],
  source: '',
  phaseColors: {},
  forecastCounts: {},
  detailMode: '',
  quickFilter: 'all',
  monthFilter: [],
  timelineMonthIndex: 0,
  initialMonthJumpDone: false,
  impactMonth: MONTHS_2026[0].key,
  filters: { asset: 'all', phase: 'all', status: 'all', dateFrom: '', dateTo: '' }
};

const els = {
  sourceLabel: document.getElementById('sourceLabel'),
  rangeLabel: document.getElementById('rangeLabel'),
  metricStrip: document.getElementById('metricStrip'),
  metricDetails: document.getElementById('metricDetails'),
  phaseLegend: document.getElementById('phaseLegend'),
  timeline: document.getElementById('timeline'),
  table: document.getElementById('activityTable'),
  form: document.getElementById('activityForm'),
  assetInput: document.getElementById('assetInput'),
  phaseInput: document.getElementById('phaseInput'),
  assetFilter: document.getElementById('assetFilter'),
  phaseFilter: document.getElementById('phaseFilter'),
  statusFilter: document.getElementById('statusFilter'),
  dateFromFilter: document.getElementById('dateFromFilter'),
  dateToFilter: document.getElementById('dateToFilter'),
  clearDateFilter: document.getElementById('clearDateFilter'),
  monthViewSlider: document.getElementById('monthViewSlider'),
  jumpCurrentMonthBtn: document.getElementById('jumpCurrentMonthBtn'),
  refreshButton: document.getElementById('refreshButton'),
  workbookInput: document.getElementById('workbookInput'),
  impactMonth: document.getElementById('impactMonth'),
  forecastDemand: document.getElementById('forecastDemand'),
  additionalRunsDemand: document.getElementById('additionalRunsDemand'),
  baseFleetInput: document.getElementById('baseFleetInput'),
  fracSpotHiresInput: document.getElementById('fracSpotHiresInput'),
  operationalSpotHiresInput: document.getElementById('operationalSpotHiresInput'),
  impactsInput: document.getElementById('impactsInput'),
  impactMeta: document.getElementById('impactMeta'),
  saveImpactsButton: document.getElementById('saveImpactsButton'),
  editDialog: document.getElementById('editDialog'),
  editForm: document.getElementById('editForm'),
  editPhase: document.getElementById('editPhase'),
  deleteActivity: document.getElementById('deleteActivity'),
  cancelEdit: document.getElementById('cancelEdit'),
  toast: document.getElementById('toast')
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.setTimeout(() => { els.toast.hidden = true; }, 3200);
}

// Static mode: when true, loads data from /data/ folder instead of API
let staticMode = false;
const STATIC_DATA_VERSION = '20260713-spot-hire-impacts';

// Map API endpoints to static JSON files (relative paths for GitHub Pages)
const STATIC_DATA_MAP = {
  '/api/spot-hire': 'data/spot-hire.json'
};

async function checkApiHealth() {
  try {
    const response = await fetch('api/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function api(path, options = {}) {
  // In static mode, redirect read operations to static JSON files
  if (staticMode && (!options.method || options.method === 'GET')) {
    if (path.includes('/api/spot-hire/impacts')) {
      const response = await fetch(`data/spot-hire-impacts.json?v=${STATIC_DATA_VERSION}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load static data: data/spot-hire-impacts.json');
      const impacts = await response.json();
      const month = new URL(path, window.location.origin).searchParams.get('month');
      return impacts[month] || { text: '', base_fleet: '', frac_spot_hires: '', operational_spot_hires: '', updated_at: null };
    }

    const staticPath = STATIC_DATA_MAP[path];
    if (staticPath) {
      const response = await fetch(`${staticPath}?v=${STATIC_DATA_VERSION}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load static data: ${staticPath}`);
      return response.json();
    }
  }
  
  // In static mode, block write operations with a friendly message
  if (staticMode && options.method && options.method !== 'GET') {
    showToast('Read-only mode: Changes cannot be saved in the hosted version');
    throw new Error('Write operations disabled in static mode');
  }
  
  const response = await fetch(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.error || message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.json();
}

function parseDate(value) {
  if (!value) return null;
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fmtDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateInputValue(value) {
  const date = parseDate(value);
  return date ? dateOnly(date) : '';
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function recordOverlapsMonth(record, month) {
  const start = parseDate(record.start_date);
  const end = parseDate(record.end_date) || start;
  if (!start || !end) return false;
  const monthStart = new Date(month.start);
  const monthEnd = new Date(month.end);
  monthEnd.setHours(23, 59, 59, 999);
  return start <= monthEnd && end >= monthStart;
}

function activeMonthFilters() {
  const selected = Array.isArray(state.monthFilter) ? state.monthFilter : [];
  return MONTHS_2026.filter(month => selected.includes(month.key));
}

function visibleMonths() {
  const selectedMonths = activeMonthFilters();
  const rangeStart = parseDate(state.filters.dateFrom);
  const rangeEnd = parseDate(state.filters.dateTo);
  
  // If date range is set, show only months that overlap with that range
  if (rangeStart || rangeEnd) {
    return MONTHS_2026.filter(month => {
      const monthStart = month.start;
      const monthEnd = month.end;
      if (rangeStart && rangeEnd) {
        return monthEnd >= rangeStart && monthStart <= rangeEnd;
      } else if (rangeStart) {
        return monthEnd >= rangeStart;
      } else if (rangeEnd) {
        return monthStart <= rangeEnd;
      }
      return true;
    });
  }
  
  // If any months are selected, show only those months
  if (selectedMonths.length >= 1) {
    const indexes = selectedMonths
      .map(month => MONTHS_2026.findIndex(item => item.key === month.key))
      .filter(index => index >= 0);
    if (!indexes.length) return MONTHS_2026;
    const startIndex = Math.min(...indexes);
    const endIndex = Math.max(...indexes);
    return MONTHS_2026.slice(startIndex, endIndex + 1);
  }
  // No selection = show all months
  return MONTHS_2026;
}

function recordOverlapsPeriod(record, periodStart, periodEndExclusive) {
  const start = parseDate(record.start_date);
  const end = parseDate(record.end_date) || start;
  if (!start || !end) return false;
  return start < periodEndExclusive && end >= periodStart;
}

function isIndividualRun(record) {
  return record.record_type === 'individual_run' || String(record.phase || '').toLowerCase() === 'individual run';
}

function parseAssetInfo(record) {
  const rawAsset = String(record.asset || '').replace(/\s+/g, ' ').trim();
  const match = rawAsset.match(/\s*\((\d+)\)\s*$/);
  let displayAsset = String(record.display_asset || (match ? rawAsset.slice(0, match.index).trim() : rawAsset) || 'Unassigned');
  
  // Normalize Stena variants to Stena Evolution
  if (displayAsset.toLowerCase() === 'stena') {
    displayAsset = 'Stena Evolution';
  }
  
  const explicitCount = Number(record.vessel_count);
  const sourceAssetCount = Number(record.source_asset_count);
  return {
    displayAsset,
    sourceAssetCount: Number.isFinite(sourceAssetCount) && sourceAssetCount > 0 ? sourceAssetCount : null,
    vesselCount: Number.isFinite(explicitCount) && explicitCount > 0 ? explicitCount : 1
  };
}

function assetDemandGroupKey(record) {
  const { displayAsset } = parseAssetInfo(record);
  return displayAsset.toLowerCase();
}

function maxVesselDemandByAsset(records, month) {
  const groupedDemand = new Map();
  records.forEach(record => {
    if (isIndividualRun(record)) return;
    if (!recordOverlapsMonth(record, month)) return;
    const key = assetDemandGroupKey(record);
    const currentCount = groupedDemand.get(key) || 0;
    groupedDemand.set(key, Math.max(currentCount, parseAssetInfo(record).vesselCount));
  });
  return Array.from(groupedDemand.values()).reduce((total, vesselCount) => total + vesselCount, 0);
}

function vesselCountBadge(record) {
  const { vesselCount, sourceAssetCount } = parseAssetInfo(record);
  const sourceNote = sourceAssetCount && sourceAssetCount !== vesselCount
    ? ` Source asset label carried (${sourceAssetCount}) in the workbook, but that suffix is not used as the activity count.`
    : '';
  return `<span class="vessel-count-badge" title="${vesselCount} forecasted ${vesselCount === 1 ? 'vessel' : 'vessels'}.${sourceNote}"><span class="vessel-icon" aria-hidden="true">⛴</span>${vesselCount}</span>`;
}

function monthlyDemandCounts(records) {
  return new Map(MONTHS_2026.map(month => [month.key, maxVesselDemandByAsset(records, month)]));
}

function forecastCountForMonth(month, records = state.records) {
  return maxVesselDemandByAsset(records, month);
}

function monthlyAdditionalRunCounts(records) {
  return new Map(MONTHS_2026.map(month => [month.key, records.reduce((total, record) => {
    return isIndividualRun(record) && recordOverlapsMonth(record, month)
      ? total + parseAssetInfo(record).vesselCount
      : total;
  }, 0)]));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function assetOptions() {
  const existingAssets = unique(state.records.map(record => parseAssetInfo(record).displayAsset));
  const configured = new Set(ASSET_NAMES.map(asset => asset.toLowerCase()));
  return [...ASSET_NAMES, ...existingAssets.filter(asset => !configured.has(asset.toLowerCase()))];
}

function fillSelect(select, values, selectedValue = '') {
  select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  if (selectedValue && values.includes(selectedValue)) select.value = selectedValue;
}

function fillSelectWithAll(select, values, allLabel) {
  const current = select.value || 'all';
  select.innerHTML = `<option value="all">${allLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = values.includes(current) ? current : 'all';
}

function phaseNames() {
  return unique([...Object.keys(state.phaseColors), ...state.records.map(record => record.phase || 'Other')]);
}

function phaseColor(phase) {
  return state.phaseColors[phase] || '#16858c';
}

// Consolidate similar phase names for cleaner legend display
const PHASE_DISPLAY_MAP = {
  'Frac': 'Frac Spot Hire',
  'Demobilization': 'Demob',
  'LWX 10 Deepen Hole': 'Deepening',
  'VX004 Deepen Hole': 'Deepening',
  'Side Track': 'Sidetrack'
};

function normalizePhaseForDisplay(phase) {
  return PHASE_DISPLAY_MAP[phase] || phase;
}

function legendPhaseNames() {
  const allPhases = phaseNames();
  const normalized = allPhases.map(normalizePhaseForDisplay);
  return unique(normalized);
}

function hydrateControls() {
  const phases = phaseNames();
  fillSelect(els.assetInput, ASSET_NAMES, els.assetInput.value || 'Pontus');
  fillSelect(els.phaseInput, phases, els.phaseInput.value || phases[0]);
  fillSelect(els.editPhase, phases, els.editPhase.value || phases[0]);
  fillSelect(els.impactMonth, MONTHS_2026.map(month => month.key), state.impactMonth);
  Array.from(els.impactMonth.options).forEach(option => {
    const month = MONTHS_2026.find(item => item.key === option.value);
    if (month) option.textContent = month.label;
  });
}

async function loadImpacts() {
  const payload = await api(`/api/spot-hire/impacts?month=${encodeURIComponent(state.impactMonth)}`);
  const monthLabel = MONTHS_2026.find(month => month.key === state.impactMonth)?.label || state.impactMonth;
  els.baseFleetInput.value = payload.base_fleet || '';
  els.fracSpotHiresInput.value = payload.frac_spot_hires || '';
  els.operationalSpotHiresInput.value = payload.operational_spot_hires || '';
  els.impactsInput.value = payload.text || '';
  els.impactMeta.textContent = payload.text && payload.updated_at
    ? `${monthLabel} last saved ${new Date(payload.updated_at).toLocaleString()}`
    : `${monthLabel} planning note saved on this link.`;
}

async function loadData() {
  const spotPayload = await api('/api/spot-hire');
  state.records = spotPayload.records || [];
  state.source = spotPayload.source || '';
  state.phaseColors = spotPayload.phase_colors || {};
  state.forecastCounts = spotPayload.monthly_forecast_counts || {};
  hydrateControls();
  await loadImpacts();
  render();
}

async function saveImpacts() {
  const payload = await api('/api/spot-hire/impacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: state.impactMonth,
      base_fleet: els.baseFleetInput.value,
      frac_spot_hires: els.fracSpotHiresInput.value,
      operational_spot_hires: els.operationalSpotHiresInput.value,
      text: els.impactsInput.value
    })
  });
  const monthLabel = MONTHS_2026.find(month => month.key === state.impactMonth)?.label || state.impactMonth;
  els.impactMeta.textContent = payload.text
    ? `${monthLabel} last saved ${new Date(payload.updated_at).toLocaleString()}`
    : `${monthLabel} planning note saved on this link.`;
  showToast(`${monthLabel} notes saved`);
}

function filteredRecords() {
  const rangeStart = parseDate(state.filters.dateFrom);
  const rangeEnd = parseDate(state.filters.dateTo);
  const monthFilters = activeMonthFilters();
  const monthWindow = visibleMonths();
  const monthWindowStart = monthWindow[0]?.start || null;
  const monthWindowEndExclusive = monthWindow.length
    ? new Date(monthWindow[monthWindow.length - 1].start.getFullYear(), monthWindow[monthWindow.length - 1].start.getMonth() + 1, 1)
    : null;
  if (rangeEnd) rangeEnd.setHours(23, 59, 59, 999);
  let selectedAssets = state.filters.asset;
  if (Array.isArray(selectedAssets)) {
    if (selectedAssets.includes('all')) selectedAssets = 'all';
  }
  return state.records.filter(record => {
    const start = parseDate(record.start_date);
    const end = parseDate(record.end_date) || start;
    const { displayAsset } = parseAssetInfo(record);
    const overlapsRange = (!rangeStart || (end && end >= rangeStart)) && (!rangeEnd || (start && start <= rangeEnd));
    const overlapsMonth = !monthFilters.length
      || (monthFilters.length < 2
        ? monthFilters.some(month => recordOverlapsMonth(record, month))
        : (monthWindowStart && monthWindowEndExclusive && recordOverlapsPeriod(record, monthWindowStart, monthWindowEndExclusive)));
    let assetMatch = true;
    if (selectedAssets !== 'all') {
      const assetArr = Array.isArray(selectedAssets) ? selectedAssets : [selectedAssets];
      assetMatch = assetArr.includes(record.asset) || assetArr.includes(displayAsset);
    }
    const quickMatch = state.quickFilter === 'active'
      ? String(record.status || 'Planned').toLowerCase() !== 'complete'
      : state.quickFilter === 'dedicated'
        ? String(record.phase || '').toLowerCase() === 'dedicated osv'
        : true;
    return quickMatch &&
      assetMatch &&
      (state.filters.phase === 'all' || record.phase === state.filters.phase) &&
      (state.filters.status === 'all' || (record.status || 'Planned') === state.filters.status) &&
      overlapsMonth &&
      overlapsRange;
  }).sort((a, b) => (parseDate(a.start_date) || 0) - (parseDate(b.start_date) || 0));
}

function setFilter(partial, quickFilter = 'all') {
  state.filters = { ...state.filters, ...partial };
  state.quickFilter = quickFilter;
  state.monthFilter = [];
  els.assetFilter.value = state.filters.asset;
  els.phaseFilter.value = state.filters.phase;
  els.statusFilter.value = state.filters.status;
  render();
}

function renderFilters() {
  // Preserve multi-select
  const prev = Array.from(els.assetFilter.selectedOptions).map(opt => opt.value);
  fillSelectWithAll(els.assetFilter, ASSET_NAMES, 'All assets');
  Array.from(els.assetFilter.options).forEach(opt => { if (prev.includes(opt.value)) opt.selected = true; });
  fillSelectWithAll(els.phaseFilter, phaseNames(), 'All phases');
  fillSelectWithAll(els.statusFilter, unique(state.records.map(record => record.status || 'Planned')), 'All statuses');
}

function groupCounts(records, keyFn) {
  const counts = new Map();
  records.forEach(record => {
    const key = keyFn(record) || 'Unassigned';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderMetrics(records) {
  const allFiltered = filteredRecords();
  const metrics = [
    { key: 'active', label: 'Active Activities', value: allFiltered.filter(record => String(record.status || 'Planned').toLowerCase() !== 'complete').length },
    { key: 'assets', label: 'Assets', value: unique(allFiltered.map(record => record.asset)).length },
    { key: 'phases', label: 'Phases', value: unique(allFiltered.map(record => record.phase)).length },
    { key: 'dedicated', label: 'Dedicated OSV', value: allFiltered.filter(record => String(record.phase || '').toLowerCase() === 'dedicated osv').length }
  ];
  els.metricStrip.innerHTML = metrics.map(metric => `<button type="button" class="metric ${state.detailMode === metric.key ? 'active' : ''}" data-metric="${metric.key}"><span>${metric.label}</span><strong>${metric.value}</strong></button>`).join('');
  renderMetricDetails(records);
}

function detailItem(label, detail, attrs) {
  const attrText = Object.entries(attrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ');
  return `<button type="button" class="detail-chip" ${attrText}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></button>`;
}

function renderMetricDetails(records) {
  if (!state.detailMode) {
    els.metricDetails.hidden = true;
    els.metricDetails.innerHTML = '';
    return;
  }
  const activeRecords = records.filter(record => String(record.status || 'Planned').toLowerCase() !== 'complete');
  let title = 'Active Activities';
  let body = activeRecords.slice(0, 12).map(record => detailItem(record.activity, `${record.asset} / ${record.phase}`, { 'data-record-filter': record.id })).join('');
  if (state.detailMode === 'assets') {
    title = 'Asset Detail';
    body = groupCounts(records, record => record.asset).map(([asset, count]) => detailItem(asset, `${count} activit${count === 1 ? 'y' : 'ies'}`, { 'data-asset-filter': asset })).join('');
  } else if (state.detailMode === 'phases') {
    title = 'Phase Detail';
    body = groupCounts(records, record => record.phase).map(([phase, count]) => detailItem(phase, `${count} activit${count === 1 ? 'y' : 'ies'}`, { 'data-phase-filter': phase })).join('');
  } else if (state.detailMode === 'dedicated') {
    title = 'Dedicated OSV Detail';
    body = records.filter(record => String(record.phase || '').toLowerCase() === 'dedicated osv')
      .map(record => detailItem(record.activity, `${record.asset} / ${fmtDate(record.start_date)} - ${fmtDate(record.end_date)}`, { 'data-record-filter': record.id })).join('');
  }
  els.metricDetails.hidden = false;
  els.metricDetails.innerHTML = `<div class="metric-detail-heading"><strong>${title}</strong><button type="button" data-clear-detail>Clear Detail Filter</button></div><div class="detail-chip-grid">${body || '<div class="empty-state">No detail records in the current view.</div>'}</div>`;
}

function renderLegend() {
  els.phaseLegend.innerHTML = '<strong>Color codes</strong>' + legendPhaseNames().map(phase => `<span><i style="background:${escapeHtml(phaseColor(phase))}"></i>${escapeHtml(phase)}</span>`).join('');
}

function updateForecastDemand(records) {
  const selectedMonth = MONTHS_2026.find(month => month.key === state.impactMonth) || MONTHS_2026[0];
  const count = forecastCountForMonth(selectedMonth, records);
  const additionalCount = records.filter(record => isIndividualRun(record) && recordOverlapsMonth(record, selectedMonth)).length;
  els.forecastDemand.innerHTML = `<strong>${count}</strong>`;
  els.forecastDemand.title = `${count} OSVs required in ${selectedMonth.label}, calculated as the highest vessel count per asset without counting multiple activities for the same asset twice. Individual Runs are excluded.`;
  els.additionalRunsDemand.innerHTML = `<strong>${additionalCount}</strong>`;
  els.additionalRunsDemand.title = `${additionalCount} additional ${additionalCount === 1 ? 'run' : 'runs'} in ${selectedMonth.label}`;
}

function currentMonthIndex() {
  const now = new Date();
  if (now.getFullYear() !== 2026) return null;
  return Math.max(0, Math.min(11, now.getMonth()));
}

function scrollTimelineToMonth(monthIndex, smooth = true) {
  const monthWidth = Number(els.timeline.dataset.monthWidth || 170);
  const monthCount = Number(els.timeline.dataset.monthCount || 12);
  const clamped = Math.max(0, Math.min(Math.max(0, monthCount - 1), Number(monthIndex) || 0));
  state.timelineMonthIndex = clamped;
  els.timeline.scrollTo({
    left: clamped * monthWidth,
    behavior: smooth ? 'smooth' : 'auto'
  });
  if (els.monthViewSlider) els.monthViewSlider.value = String(clamped);
}

function renderTimeline(records) {
  const labelWidth = 260;
  const monthWidth = 170;
  const monthsInView = visibleMonths();
  const timelineStart = monthsInView[0]?.start || MONTHS_2026[0].start;
  const lastVisibleMonth = monthsInView[monthsInView.length - 1] || MONTHS_2026[MONTHS_2026.length - 1];
  const timelineEnd = new Date(lastVisibleMonth.start.getFullYear(), lastVisibleMonth.start.getMonth() + 1, 1);
  const laneWidth = monthsInView.length * monthWidth;
  const timelineWidth = labelWidth + (monthsInView.length * monthWidth);
  const demandCounts = monthlyDemandCounts(records);
  const additionalCounts = monthlyAdditionalRunCounts(records);
  els.timeline.dataset.dayWidth = String(monthWidth / 30);
  els.timeline.dataset.monthWidth = String(monthWidth);
  els.timeline.dataset.monthCount = String(monthsInView.length);

  // Helper: convert date to pixel position within the lane (accounting for variable month lengths)
  function dateToPixel(date) {
    for (let i = 0; i < monthsInView.length; i++) {
      const month = monthsInView[i];
      const monthStart = month.start;
      const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      if (date >= monthStart && date < nextMonthStart) {
        const daysInMonth = (nextMonthStart - monthStart) / (1000 * 60 * 60 * 24);
        const dayOfMonth = (date - monthStart) / (1000 * 60 * 60 * 24);
        return (i + dayOfMonth / daysInMonth) * monthWidth;
      }
    }
    // Date before visible range
    if (date < monthsInView[0].start) return 0;
    // Date after visible range
    return laneWidth;
  }

  const currentIndex = currentMonthIndex();
  const head = `<div class="time-head month-head" style="min-width:${timelineWidth}px;grid-template-columns:${labelWidth}px ${laneWidth}px;"><div class="time-label">Vessel demand by asset</div><div class="date-grid month-grid" style="grid-template-columns: repeat(${monthsInView.length}, ${monthWidth}px);">${monthsInView.map((month, index) => {
    const absoluteIndex = MONTHS_2026.findIndex(item => item.key === month.key);
    const monthClass = currentIndex === null
      ? ''
      : absoluteIndex < currentIndex
        ? 'past-month'
        : absoluteIndex === currentIndex
          ? 'current-month'
          : 'future-month';
    const selected = Array.isArray(state.monthFilter) && state.monthFilter.includes(month.key);
    return `<button type="button" class="date-cell month-cell month-filter-button ${selected ? 'active' : ''} ${monthClass}" data-month-filter="${month.key}" data-month-index="${index}" title="Click to filter to ${month.label} only."><strong>${month.label}</strong><span class="vessel-month-count"><span class="vessel-icon" aria-hidden="true">⛴</span>${demandCounts.get(month.key) || 0}</span><span class="additional-month-count">+${additionalCounts.get(month.key) || 0} runs</span></button>`;
  }).join('')}</div></div>`;

  // Group records by asset for dedicated asset rows
  const assetGroups = new Map();
  records.forEach(record => {
    const { displayAsset } = parseAssetInfo(record);
    if (!assetGroups.has(displayAsset)) {
      assetGroups.set(displayAsset, []);
    }
    assetGroups.get(displayAsset).push(record);
  });

  // Sort assets: EV Run activities first, then by ASSET_NAMES order, then alphabetically
  const sortedAssets = [...assetGroups.keys()].sort((a, b) => {
    // Check if asset group contains EV Run activities
    const aHasEVRun = assetGroups.get(a).some(r => r.phase === 'EV Run' || r.activity === 'EV Run');
    const bHasEVRun = assetGroups.get(b).some(r => r.phase === 'EV Run' || r.activity === 'EV Run');
    
    // EV Runs always go first
    if (aHasEVRun && !bHasEVRun) return -1;
    if (bHasEVRun && !aHasEVRun) return 1;
    
    const aIndex = ASSET_NAMES.indexOf(a);
    const bIndex = ASSET_NAMES.indexOf(b);
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    return a.localeCompare(b);
  });

  const rows = sortedAssets.map(assetName => {
    const assetRecords = assetGroups.get(assetName);
    const bars = assetRecords.map(record => {
      const start = parseDate(record.start_date);
      const end = parseDate(record.end_date) || start;
      if (!start || !end) return '';
      const inclusiveEnd = new Date(end);
      inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
      const visibleStart = new Date(Math.max(start.getTime(), timelineStart.getTime()));
      const visibleEnd = new Date(Math.min(inclusiveEnd.getTime(), timelineEnd.getTime()));
      if (visibleEnd <= timelineStart || visibleStart >= timelineEnd) return '';
      
      const leftPx = dateToPixel(visibleStart);
      const rightPx = dateToPixel(visibleEnd);
      const widthPx = Math.max(20, rightPx - leftPx);
      
      const color = phaseColor(record.phase);
      const { vesselCount } = parseAssetInfo(record);
      const vesselBadge = vesselCountBadge(record);
      return `<button class="task-bar spot-bar" data-edit="${record.id}" data-shift="${record.id}" style="position:absolute;left:${leftPx}px;width:${widthPx}px;background:${escapeHtml(color)};" title="${escapeHtml(record.activity)} (${escapeHtml(record.phase || 'Other')}) - ${vesselCount} vessel${vesselCount === 1 ? '' : 's'}. Click to edit.">
        <span class="task-title">${vesselBadge}${escapeHtml(record.activity || record.phase || 'Activity')}</span>
      </button>`;
    }).filter(Boolean).join('');
    
    if (!bars) return ''; // Skip asset row if no visible activities
    
    return `<div class="route-row" style="min-width:${timelineWidth}px;grid-template-columns:${labelWidth}px ${laneWidth}px;">
      <div class="route-label"><strong>${escapeHtml(assetName)}</strong><span>${assetRecords.length} activit${assetRecords.length === 1 ? 'y' : 'ies'}</span></div>
      <div class="bar-lane month-lane" style="background-size:${monthWidth}px 100%;position:relative;">
        ${bars}
      </div>
    </div>`;
  }).filter(Boolean).join('');
  els.timeline.innerHTML = head + rows;

  if (els.monthViewSlider) {
    els.monthViewSlider.min = '0';
    els.monthViewSlider.max = String(Math.max(0, monthsInView.length - 1));
    if (Number(els.monthViewSlider.value) > Number(els.monthViewSlider.max)) {
      els.monthViewSlider.value = els.monthViewSlider.max;
    }
  }

  // Keep the month slider and timeline scroll in sync after each render.
  const currentVisibleIndex = currentIndex === null ? null : monthsInView.findIndex(month => MONTHS_2026[currentIndex]?.key === month.key);
  if (!state.initialMonthJumpDone && currentVisibleIndex !== null && currentVisibleIndex >= 0) {
    state.initialMonthJumpDone = true;
    scrollTimelineToMonth(currentVisibleIndex, false);
  } else {
    scrollTimelineToMonth(state.timelineMonthIndex, false);
  }
}

function statusClass(status) {
  const key = String(status || '').toLowerCase();
  if (key.includes('complete')) return 'status-complete';
  if (key.includes('progress')) return 'status-progress';
  if (key.includes('confirm')) return 'status-confirmed';
  return '';
}

function renderTable(records) {
  els.table.innerHTML = records.map(record => `<tr>
    <td class="route-name"><strong>${escapeHtml(record.activity)}</strong><span>${escapeHtml(record.notes || record.source || '')}</span></td>
    <td>${escapeHtml(parseAssetInfo(record).displayAsset)}</td>
    <td>${escapeHtml(record.area || '')}</td>
    <td><span class="status-pill" style="background:${escapeHtml(record.color || phaseColor(record.phase))};color:white;">${escapeHtml(record.phase || 'Other')}</span></td>
    <td>${fmtDate(record.start_date)}</td>
    <td>${fmtDate(record.end_date)}</td>
    <td><span class="status-pill ${statusClass(record.status)}">${escapeHtml(record.status || 'Planned')}</span></td>
    <td><div class="table-actions"><button type="button" data-edit="${record.id}">Edit</button><button type="button" class="danger-button" data-delete="${record.id}">Delete</button></div></td>
  </tr>`).join('') || '<tr><td colspan="8">No activities match the current filters.</td></tr>';
}

function render() {
  renderFilters();
  renderLegend();
  const records = filteredRecords();
  const monthFilters = activeMonthFilters();
  const monthsInView = visibleMonths();
  const monthLabel = monthFilters.map(month => month.label).join(', ');
  const windowLabel = monthsInView.length
    ? `${monthsInView[0].label}${monthsInView.length > 1 ? ` to ${monthsInView[monthsInView.length - 1].label}` : ''}`
    : 'all months';
  renderMetrics(records);
  els.sourceLabel.textContent = state.source || 'No workbook source loaded';
  els.rangeLabel.textContent = monthFilters.length
    ? `Showing visible period ${windowLabel}. Selected months: ${monthLabel}. Activities are filtered to this time period.`
    : state.quickFilter === 'dedicated'
    ? 'Showing Dedicated OSV activities in a monthly view. Drag empty schedule space to pan, drag an activity bar to shift dates, or use the month slider to slide the view.'
    : state.quickFilter === 'active'
      ? 'Showing active activities in a monthly view. Drag empty schedule space to pan, drag an activity bar to shift dates, or use the month slider to slide the view.'
      : 'Showing imported and app-entered demand by month. Drag empty schedule space to pan, drag an activity bar to shift dates, or use the month slider to slide the view.';
  renderTimeline(records);
  updateForecastDemand(records);
  renderTable(records);
}

async function addRecord(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const phase = data.get('phase');
  const vesselCount = Math.max(1, Number(data.get('vessel_count')) || 1);
  await api('/api/spot-hire', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset: data.get('asset'), vessel_count: vesselCount, area: data.get('area') || '', activity: data.get('activity'), phase, color: phaseColor(phase), status: data.get('status'), start_date: data.get('start_date'), end_date: data.get('end_date'), notes: data.get('notes') || '' })
  });
  event.currentTarget.reset();
  showToast('Activity added');
  await loadData();
}

function openEdit(recordId) {
  const record = state.records.find(item => item.id === recordId);
  if (!record) return;
  const form = els.editForm.elements;
  const { vesselCount } = parseAssetInfo(record);
  form.id.value = record.id;
  form.asset.value = record.asset || '';
  form.vessel_count.value = vesselCount;
  form.area.value = record.area || '';
  form.activity.value = record.activity || '';
  form.phase.value = record.phase || phaseNames()[0] || 'Other';
  form.status.value = record.status || 'Planned';
  form.start_date.value = toDateInputValue(record.start_date);
  form.end_date.value = toDateInputValue(record.end_date);
  form.notes.value = record.notes || '';
  els.editDialog.hidden = false;
  centerEditDialog();
}

function closeEdit() {
  els.editDialog.hidden = true;
}

async function saveEdit(event) {
  event.preventDefault();
  const data = new FormData(els.editForm);
  const startDate = String(data.get('start_date') || '');
  const endDate = String(data.get('end_date') || '');
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) throw new Error('Start Date and End Date are required.');
  if (end < start) throw new Error('End Date must be on or after Start Date.');
  const phase = data.get('phase');
  const asset = String(data.get('asset') || '').trim();
  const displayAsset = asset.replace(/\s*\(\d+\)\s*$/, '').trim() || asset;
  const vesselCount = Math.max(1, Number(data.get('vessel_count')) || 1);
  await api('/api/spot-hire/changes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [{ id: data.get('id'), asset, display_asset: displayAsset, vessel_count: vesselCount, area: data.get('area') || '', activity: data.get('activity'), phase, color: phaseColor(phase), status: data.get('status'), start_date: startDate, end_date: endDate, notes: data.get('notes') || '' }] })
  });
  closeEdit();
  showToast('Activity updated');
  await loadData();
}

function shiftDate(value, dayDelta) {
  const date = parseDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + dayDelta);
  return dateOnly(date);
}

async function shiftRecord(recordId, dayDelta) {
  const record = state.records.find(item => item.id === recordId);
  if (!record || !dayDelta) return;
  await api('/api/spot-hire/changes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [{ id: record.id, start_date: shiftDate(record.start_date, dayDelta), end_date: shiftDate(record.end_date, dayDelta) }] })
  });
  showToast(`Activity shifted ${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? '' : 's'} ${dayDelta > 0 ? 'later' : 'earlier'}`);
  await loadData();
}

async function deleteRecord(recordId) {
  const record = state.records.find(item => item.id === recordId);
  if (!record) return;
  if (!confirm(`Delete ${record.asset} / ${record.activity} from the schedule?`)) return;
  await api(`/api/spot-hire/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  closeEdit();
  showToast('Activity deleted from schedule');
  await loadData();
}

function bindFilters() {
  // Multi-select asset filter event
  els.assetFilter.addEventListener('change', () => {
    const selected = Array.from(els.assetFilter.selectedOptions).map(opt => opt.value);
    state.filters.asset = selected.length === 0 || selected.includes('all') ? 'all' : selected;
    render();
  });
  [els.phaseFilter, els.statusFilter].forEach(select => {
    select.addEventListener('change', () => {
      state.filters.phase = els.phaseFilter.value;
      state.filters.status = els.statusFilter.value;
      state.quickFilter = 'all';
      render();
    });
  });
  [els.dateFromFilter, els.dateToFilter].forEach(input => {
    input.addEventListener('change', () => {
      state.filters.dateFrom = els.dateFromFilter.value;
      state.filters.dateTo = els.dateToFilter.value;
      state.monthFilter = [];
      render();
    });
  });
  els.clearDateFilter.addEventListener('click', () => {
    els.dateFromFilter.value = '';
    els.dateToFilter.value = '';
    state.filters = { asset: 'all', phase: 'all', status: 'all', dateFrom: '', dateTo: '' };
    state.quickFilter = 'all';
    state.monthFilter = [];
    render();
  });
}

function enableTimelinePan() {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;
  els.timeline.addEventListener('mousedown', event => {
    if (event.button !== 0 || event.target.closest('.task-bar')) return;
    isDragging = true;
    moved = false;
    startX = event.clientX;
    scrollLeft = els.timeline.scrollLeft;
    els.timeline.classList.add('dragging');
    event.preventDefault();
  });
  document.addEventListener('mousemove', event => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 3) moved = true;
    els.timeline.scrollLeft = scrollLeft - delta;
  });
  document.addEventListener('mouseup', event => {
    if (!isDragging) return;
    isDragging = false;
    els.timeline.classList.remove('dragging');
    if (moved) event.preventDefault();
  });
}

function enableBarShift() {
  let drag = null;
  let suppressEditClick = false;
  els.timeline.addEventListener('mousedown', event => {
    const bar = event.target.closest('.spot-bar');
    if (!bar || event.button !== 0) return;
    drag = { id: bar.dataset.shift, startX: event.clientX, dayWidth: Number(els.timeline.dataset.dayWidth || 6), bar, dayDelta: 0, moved: false };
    bar.classList.add('shifting');
    event.preventDefault();
    event.stopPropagation();
  });
  document.addEventListener('mousemove', event => {
    if (!drag) return;
    const rawDelta = event.clientX - drag.startX;
    drag.dayDelta = Math.round(rawDelta / drag.dayWidth);
    drag.moved = Math.abs(rawDelta) > 8;
    drag.bar.style.transform = `translateX(${drag.dayDelta * drag.dayWidth}px)`;
  });
  document.addEventListener('mouseup', event => {
    if (!drag) return;
    const finished = drag;
    drag = null;
    finished.bar.classList.remove('shifting');
    finished.bar.style.transform = '';
    if (finished.moved) {
      suppressEditClick = true;
      window.setTimeout(() => { suppressEditClick = false; }, 0);
      event.preventDefault();
      event.stopPropagation();
      shiftRecord(finished.id, finished.dayDelta).catch(err => showToast(err.message));
    }
  });
  els.timeline.addEventListener('click', event => {
    if (!suppressEditClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function centerEditDialog() {
  const dialog = els.editForm;
  dialog.style.left = '';
  dialog.style.top = '';
  dialog.style.transform = '';
  window.requestAnimationFrame(() => {
    const rect = dialog.getBoundingClientRect();
    const left = Math.max(12, (window.innerWidth - rect.width) / 2);
    const top = Math.max(12, Math.min((window.innerHeight - rect.height) / 2, window.innerHeight - 80));
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  });
}

function clampEditDialog() {
  const dialog = els.editForm;
  if (els.editDialog.hidden) return;
  const rect = dialog.getBoundingClientRect();
  const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
  const maxTop = Math.max(12, window.innerHeight - Math.min(rect.height, window.innerHeight - 24) - 12);
  const nextLeft = Math.min(Math.max(rect.left, 12), maxLeft);
  const nextTop = Math.min(Math.max(rect.top, 12), maxTop);
  dialog.style.left = `${nextLeft}px`;
  dialog.style.top = `${nextTop}px`;
}

function enableDialogDrag() {
  const handle = els.editForm.querySelector('.dialog-drag-handle');
  let drag = null;
  handle.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    const rect = els.editForm.getBoundingClientRect();
    drag = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    els.editForm.classList.add('dragging-dialog');
    event.preventDefault();
  });
  document.addEventListener('mousemove', event => {
    if (!drag) return;
    const rect = els.editForm.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
    const maxTop = Math.max(12, window.innerHeight - Math.min(rect.height, window.innerHeight - 24) - 12);
    const left = Math.min(Math.max(event.clientX - drag.offsetX, 12), maxLeft);
    const top = Math.min(Math.max(event.clientY - drag.offsetY, 12), maxTop);
    els.editForm.style.left = `${left}px`;
    els.editForm.style.top = `${top}px`;
  });
  document.addEventListener('mouseup', () => {
    if (!drag) return;
    drag = null;
    els.editForm.classList.remove('dragging-dialog');
  });
  window.addEventListener('resize', clampEditDialog);
}

els.form.addEventListener('submit', event => addRecord(event).catch(err => showToast(err.message)));
els.editForm.addEventListener('submit', event => saveEdit(event).catch(err => showToast(err.message)));
els.cancelEdit.addEventListener('click', closeEdit);
els.deleteActivity.addEventListener('click', () => deleteRecord(els.editForm.elements.id.value).catch(err => showToast(err.message)));
els.editDialog.addEventListener('click', event => { if (event.target === els.editDialog) closeEdit(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeEdit(); });
els.refreshButton.addEventListener('click', () => loadData().catch(err => showToast(err.message)));
els.workbookInput?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('file', file);
    showToast('Uploading workbook...');
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const result = await res.json();
    showToast(result.message || 'Workbook uploaded successfully');
    await loadData();
  } catch (err) {
    showToast(err.message || 'Upload failed');
  }
  event.target.value = '';
});
els.saveImpactsButton.addEventListener('click', () => saveImpacts().catch(err => showToast(err.message)));
els.impactMonth.addEventListener('change', () => {
  state.impactMonth = els.impactMonth.value;
  updateForecastDemand(filteredRecords());
  loadImpacts().catch(err => showToast(err.message));
});
els.timeline.addEventListener('click', event => {
  const monthButton = event.target.closest('[data-month-filter]');
  if (!monthButton) return;
  const monthKey = monthButton.dataset.monthFilter;
  const selected = new Set(Array.isArray(state.monthFilter) ? state.monthFilter : []);
  if (selected.has(monthKey)) {
    selected.delete(monthKey);
  } else {
    selected.add(monthKey);
    state.impactMonth = monthKey;
    els.impactMonth.value = monthKey;
    loadImpacts().catch(err => showToast(err.message));
  }
  state.monthFilter = Array.from(selected);
  state.filters.dateFrom = '';
  state.filters.dateTo = '';
  els.dateFromFilter.value = '';
  els.dateToFilter.value = '';
  render();
});
els.metricStrip.addEventListener('click', event => {
  const metric = event.target.closest('[data-metric]');
  if (!metric) return;
  state.detailMode = metric.dataset.metric;
  state.quickFilter = metric.dataset.metric === 'active' ? 'active' : metric.dataset.metric === 'dedicated' ? 'dedicated' : 'all';
  render();
});
els.metricDetails.addEventListener('click', event => {
  if (event.target.closest('[data-clear-detail]')) {
    setFilter({ asset: 'all', phase: 'all', status: 'all' }, 'all');
    return;
  }
  const asset = event.target.closest('[data-asset-filter]')?.dataset.assetFilter;
  const phase = event.target.closest('[data-phase-filter]')?.dataset.phaseFilter;
  const recordId = event.target.closest('[data-record-filter]')?.dataset.recordFilter;
  if (asset) setFilter({ asset }, 'all');
  if (phase) setFilter({ phase }, 'all');
  if (recordId) openEdit(recordId);
});
document.body.addEventListener('click', event => {
  if (event.target.closest('[data-delete]')) return;
  const editButton = event.target.closest('[data-edit]');
  if (editButton) openEdit(editButton.dataset.edit);
});
document.body.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) deleteRecord(deleteButton.dataset.delete).catch(err => showToast(err.message));
});
if (els.monthViewSlider) {
  els.monthViewSlider.addEventListener('input', () => {
    scrollTimelineToMonth(Number(els.monthViewSlider.value || 0), false);
  });
}

if (els.jumpCurrentMonthBtn) {
  els.jumpCurrentMonthBtn.addEventListener('click', () => {
    const monthIndex = currentMonthIndex();
    const monthsInView = visibleMonths();
    if (monthIndex === null || !monthsInView.length) return;
    const currentKey = MONTHS_2026[monthIndex]?.key;
    const visibleIndex = monthsInView.findIndex(month => month.key === currentKey);
    scrollTimelineToMonth(visibleIndex >= 0 ? visibleIndex : 0, true);
  });
}

els.timeline.addEventListener('scroll', () => {
  const monthWidth = Number(els.timeline.dataset.monthWidth || 170);
  const monthCount = Number(els.timeline.dataset.monthCount || 12);
  const monthIndex = Math.max(0, Math.min(Math.max(0, monthCount - 1), Math.round(els.timeline.scrollLeft / monthWidth)));
  state.timelineMonthIndex = monthIndex;
  if (els.monthViewSlider) els.monthViewSlider.value = String(monthIndex);
});

bindFilters();
enableTimelinePan();
enableBarShift();
enableDialogDrag();

// Initialize: check if API is available, otherwise use static mode
(async function init() {
  const apiAvailable = await checkApiHealth();
  if (!apiAvailable) {
    staticMode = true;
    console.log('API not available - running in static read-only mode');
    // Add visual indicator for static mode
    const banner = document.createElement('div');
    banner.id = 'staticModeBanner';
    banner.style.cssText = 'background: #2d3748; color: #f7fafc; text-align: center; padding: 6px 12px; font-size: 13px; position: fixed; top: 0; left: 0; right: 0; z-index: 9999;';
    banner.innerHTML = '📖 Read-only mode — <a href="https://github.com/cfcoyle2/osv-demand-scheduler" style="color: #90cdf4;">View source on GitHub</a>';
    document.body.style.paddingTop = '32px';
    document.body.insertBefore(banner, document.body.firstChild);
  }
  loadData().catch(err => showToast(err.message));
})();
