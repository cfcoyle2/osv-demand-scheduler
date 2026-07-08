const state = {
  view: 'route',
  tasks: [],
  conflicts: [],
  fleet: null,
  assetCapacity: [],
  monthlyCapacityEntries: [],
  timelineBoundsStart: null,
  source: '',
  bufferHours: 24,
  activeInsight: 'active',
  filters: { coordinator: 'all', asset: 'all', status: 'Planned', dateFrom: '', dateTo: '' },
  spot: {
    records: [],
    source: '',
    phaseColors: {},
    filters: { asset: 'all', phase: 'all', status: 'Planned', dateFrom: '', dateTo: '' }
  }
};

const COORDINATOR_ASSETS = {
  'Chris Coyle': ['Pontus', 'Poseidon', 'Stena Evolution', 'Noble Voyager'],
  'Jennifer Palmisano': ['Auger', 'ESA', 'Stones', 'Whale', 'Perdido', 'Sparta'],
  'Bryan Barron': ['Mars', 'Olympus', 'Ursa'],
  'Daphne Barrera': ['Appomattox', 'Vito', 'Q5000']
};

const ALL_ASSETS = Object.values(COORDINATOR_ASSETS).flat();

const els = {
  routeTab: document.getElementById('routeTab'),
  spotHireTab: document.getElementById('spotHireTab'),
  routeControls: document.getElementById('routeControls'),
  spotControls: document.getElementById('spotControls'),
  routeWorkspace: document.getElementById('routeWorkspace'),
  spotWorkspace: document.getElementById('spotWorkspace'),
  statusStrip: document.getElementById('statusStrip'),
  insightPanel: document.getElementById('insightPanel'),
  sourceLabel: document.getElementById('sourceLabel'),
  rangeLabel: document.getElementById('rangeLabel'),
  timeline: document.getElementById('timeline'),
  table: document.getElementById('taskTable'),
  fleetSummary: document.getElementById('fleetSummary'),
  conflicts: document.getElementById('conflicts'),
  weeklyDemandGrid: document.getElementById('weeklyDemandGrid'),
  forecastAssetSelect: document.getElementById('forecastAssetSelect'),
  forecastDateFrom: document.getElementById('forecastDateFrom'),
  forecastDateTo: document.getElementById('forecastDateTo'),
  runForecastBtn: document.getElementById('runForecastBtn'),
  clearForecastBtn: document.getElementById('clearForecastBtn'),
  assetForecastResult: document.getElementById('assetForecastResult'),
  coordinatorInput: document.getElementById('coordinatorInput'),
  assetInput: document.getElementById('assetInput'),
  coordinatorFilter: document.getElementById('coordinatorFilter'),
  assetFilter: document.getElementById('assetFilter'),
  statusFilter: document.getElementById('statusFilter'),
  dateFromFilter: document.getElementById('dateFromFilter'),
  dateToFilter: document.getElementById('dateToFilter'),
  clearDateFilter: document.getElementById('clearDateFilter'),
  editCoordinator: document.getElementById('editCoordinator'),
  toast: document.getElementById('toast'),
  editDialog: document.getElementById('editDialog'),
  editForm: document.getElementById('editForm'),
  spotStatusStrip: document.getElementById('spotStatusStrip'),
  spotSourceLabel: document.getElementById('spotSourceLabel'),
  spotRangeLabel: document.getElementById('spotRangeLabel'),
  spotTimeline: document.getElementById('spotTimeline'),
  spotTable: document.getElementById('spotTable'),
  spotLegend: document.getElementById('spotLegend'),
  spotForm: document.getElementById('spotForm'),
  spotPhaseInput: document.getElementById('spotPhaseInput'),
  spotAssetFilter: document.getElementById('spotAssetFilter'),
  spotPhaseFilter: document.getElementById('spotPhaseFilter'),
  spotStatusFilter: document.getElementById('spotStatusFilter'),
  spotDateFromFilter: document.getElementById('spotDateFromFilter'),
  spotDateToFilter: document.getElementById('spotDateToFilter'),
  spotClearDateFilter: document.getElementById('spotClearDateFilter'),
  spotEditDialog: document.getElementById('spotEditDialog'),
  spotEditForm: document.getElementById('spotEditForm'),
  spotEditPhase: document.getElementById('spotEditPhase'),
  // New feature elements
  exportConflictSummaryBtn: document.getElementById('exportConflictSummaryBtn'),
  next2WeeksBtn: document.getElementById('next2WeeksBtn'),
  capacityAlertBadge: document.getElementById('capacityAlertBadge'),
  // Snapshot comparison elements
  createSnapshotBtn: document.getElementById('createSnapshotBtn'),
  compareSnapshotsBtn: document.getElementById('compareSnapshotsBtn'),
  snapshotStatus: document.getElementById('snapshotStatus'),
  snapshotCompareDialog: document.getElementById('snapshotCompareDialog'),
  baselineSnapshotSelect: document.getElementById('baselineSnapshotSelect'),
  currentSnapshotSelect: document.getElementById('currentSnapshotSelect'),
  compareAssetFilter: document.getElementById('compareAssetFilter'),
  runCompareBtn: document.getElementById('runCompareBtn'),
  runVolatilityBtn: document.getElementById('runVolatilityBtn'),
  volatilityResult: document.getElementById('volatilityResult'),
  snapshotCompareResult: document.getElementById('snapshotCompareResult'),
  closeCompareDialog: document.getElementById('closeCompareDialog')
};

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalInput(value) {
  const date = parseDate(value);
  if (!date) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 19);
}

function fmt(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtDateOnly(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDateFilter(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.setTimeout(() => { els.toast.hidden = true; }, 3200);
}

// === NEW FEATURE: Export Conflict Summary ===
function generateConflictSummary() {
  const filteredAsset = state.filters.asset !== 'all' ? state.filters.asset : null;
  const lines = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  
  lines.push(`OSV Demand Conflict Summary - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(filteredAsset ? `Asset: ${filteredAsset}` : 'All Assets');
  lines.push('---');
  
  // Get relevant tasks and calculate weekly demand using same logic as grid
  const relevantTasks = filteredAsset ? state.tasks.filter(t => t.asset === filteredAsset) : state.tasks;
  const weeklyData = calculateWeeklyDemand(relevantTasks);
  const weekDemandMap = new Map();
  weeklyData.forEach(w => {
    const key = w.weekStart.toISOString().split('T')[0];
    weekDemandMap.set(key, w.peakDemand);
  });
  
  let hasConflicts = false;
  
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    // Use peak concurrent demand (same as grid)
    const peakDemand = weekDemandMap.get(weekKey) || 0;
    
    // Get capacity using same logic as grid
    const capacity = filteredAsset 
      ? getCapacityForAssetAtDate(filteredAsset, weekStart)
      : getCapacityForWeek(weekKey);
    
    const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    if (peakDemand > capacity) {
      hasConflicts = true;
      lines.push(`⚠️ ${weekLabel}: ${peakDemand} peak demand vs ${capacity} capacity (${peakDemand - capacity} OVER)`);
      
      // List routes active this week
      const activeTasks = relevantTasks.filter(task => {
        const taskStart = parseDate(task.start_date);
        const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
        if (!taskStart || !taskEnd) return false;
        return taskStart <= weekEnd && taskEnd >= weekStart;
      });
      activeTasks.forEach(t => {
        lines.push(`   • ${t.activity?.substring(0, 60) || 'Route'}...`);
      });
    }
  }
  
  if (!hasConflicts) {
    lines.push('✅ No capacity conflicts in the next 8 weeks.');
  }
  
  return lines.join('\n');
}

function exportConflictSummary() {
  const summary = generateConflictSummary();
  navigator.clipboard.writeText(summary).then(() => {
    showToast('Conflict summary copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy to clipboard');
  });
}

// === NEW FEATURE: Next 2 Weeks Focus ===
function focusNext2Weeks() {
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  
  const fromStr = today.toISOString().split('T')[0];
  const toStr = twoWeeksLater.toISOString().split('T')[0];
  
  state.filters.dateFrom = fromStr;
  state.filters.dateTo = toStr;
  els.dateFromFilter.value = fromStr;
  els.dateToFilter.value = toStr;
  
  render();
  showToast('Showing next 2 weeks');
}

// === NEW FEATURE: Coordinator Drill Filter ===
function filterByCoordinator(coordinator) {
  if (state.filters.coordinator === coordinator) {
    // Toggle off
    state.filters.coordinator = 'all';
    els.coordinatorFilter.value = 'all';
    showToast('Showing all coordinators');
  } else {
    state.filters.coordinator = coordinator;
    els.coordinatorFilter.value = coordinator;
    showToast(`Filtered to ${coordinator}`);
  }
  render();
}

// === NEW FEATURE: Capacity Alert Badge ===
function updateCapacityAlertBadge() {
  if (!els.capacityAlertBadge) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  
  let overCapacityWeeks = 0;
  
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Count all tasks active this week
    const activeTasks = state.tasks.filter(task => {
      const taskStart = parseDate(task.start_date);
      const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
      if (!taskStart || !taskEnd) return false;
      return taskStart <= weekEnd && taskEnd >= weekStart;
    });
    
    const capacity = getCapacityForWeek(weekStart.toISOString().split('T')[0]);
    if (activeTasks.length > capacity) {
      overCapacityWeeks++;
    }
  }
  
  if (overCapacityWeeks > 0) {
    els.capacityAlertBadge.textContent = `⚠️ ${overCapacityWeeks} week${overCapacityWeeks > 1 ? 's' : ''} over capacity`;
    els.capacityAlertBadge.style.display = 'inline-flex';
    els.capacityAlertBadge.onclick = () => {
      // Scroll to Schedule Watch and highlight
      document.querySelector('.schedule-watch-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  } else {
    els.capacityAlertBadge.style.display = 'none';
  }
}

// === NEW FEATURE: Route Shift Preview ===
let shiftPreviewTooltip = null;

function showShiftPreview(taskId, daysDelta, mouseX, mouseY) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  if (!shiftPreviewTooltip) {
    shiftPreviewTooltip = document.createElement('div');
    shiftPreviewTooltip.className = 'shift-preview-tooltip';
    document.body.appendChild(shiftPreviewTooltip);
  }
  
  // Calculate impact on weekly demand
  const originalStart = parseDate(task.start_date);
  const originalEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || originalStart;
  
  if (!originalStart || !originalEnd) return;
  
  const newStart = new Date(originalStart);
  newStart.setDate(newStart.getDate() + daysDelta);
  const newEnd = new Date(originalEnd);
  newEnd.setDate(newEnd.getDate() + daysDelta);
  
  const direction = daysDelta > 0 ? 'later' : daysDelta < 0 ? 'earlier' : 'no change';
  const impact = Math.abs(daysDelta) === 1 ? '1 day' : `${Math.abs(daysDelta)} days`;
  
  shiftPreviewTooltip.innerHTML = `
    <div><strong>Shifting ${task.activity?.substring(0, 30) || 'Route'}...</strong></div>
    <div>Move: <span class="${daysDelta === 0 ? 'preview-neutral' : daysDelta > 0 ? 'preview-increase' : 'preview-decrease'}">${impact} ${direction}</span></div>
    <div>New dates: ${newStart.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${newEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
  `;
  
  shiftPreviewTooltip.style.left = `${mouseX + 15}px`;
  shiftPreviewTooltip.style.top = `${mouseY - 10}px`;
  shiftPreviewTooltip.style.display = 'block';
}

function hideShiftPreview() {
  if (shiftPreviewTooltip) {
    shiftPreviewTooltip.style.display = 'none';
  }
}

// Static mode: when true, loads data from /data/ folder instead of API
let staticMode = false;

// Map API endpoints to static JSON files (relative paths for GitHub Pages)
const STATIC_DATA_MAP = {
  '/api/tasks': 'data/tasks.json',
  '/api/conflicts': 'data/conflicts.json',
  '/api/asset-capacity': 'data/asset-capacity.json',
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
    const staticPath = STATIC_DATA_MAP[path];
    if (staticPath) {
      const response = await fetch(staticPath);
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

async function loadData() {
  const [tasksPayload, conflictsPayload, capacityPayload] = await Promise.all([
    api('/api/tasks'),
    api('/api/conflicts'),
    api('/api/asset-capacity')
  ]);
  state.tasks = tasksPayload.tasks || [];
  state.source = tasksPayload.source || '';
  state.bufferHours = tasksPayload.buffer_hours || 24;
  state.conflicts = conflictsPayload.conflicts || [];
  state.fleet = conflictsPayload.fleet || null;
  state.assetCapacity = normalizeAssetCapacityEntries(capacityPayload.asset_capacities || capacityPayload.entries || []);
  state.monthlyCapacityEntries = normalizeMonthlyCapacityEntries(capacityPayload.monthly_capacity_entries || []);
  render();
}

function normalizeAssetCapacityEntries(raw) {
  if (Array.isArray(raw)) {
    return raw.map(entry => ({
      asset: String(entry.asset || '').trim(),
      vessel_count: Math.min(10, Math.max(0, Number(entry.vessel_count ?? 1) || 1)),
      notes: String(entry.notes || ''),
      date_from: String(entry.date_from || ''),
      date_to: String(entry.date_to || '')
    })).filter(entry => entry.asset);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([asset, value]) => {
      const entry = value && typeof value === 'object' ? value : { vessel_count: value };
      return {
        asset: String(asset || '').trim(),
        vessel_count: Math.min(10, Math.max(0, Number(entry.vessel_count ?? 1) || 1)),
        notes: String(entry.notes || ''),
        date_from: String(entry.date_from || ''),
        date_to: String(entry.date_to || '')
      };
    }).filter(entry => entry.asset);
  }
  return [];
}

function parseMonthlyCapacityText(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  const patterns = [
    /(\d+)\s*(?:osvs?|vessels?)/,
    /(?:capacity|available|total)\D{0,24}(\d+)/,
    /(?:max|limit)\D{0,24}(\d+)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
    }
  }
  const numbers = text.match(/\d+/g);
  if (!numbers || !numbers.length) return null;
  const parsed = Number(numbers[numbers.length - 1]);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function getCapacityForAssetAtDate(asset, dateObj) {
  // Find the best matching capacity entry for this asset at this date
  if (!state.assetCapacity || !state.assetCapacity.length) return 1;
  
  // Normalize to date string for comparison (avoids timezone issues)
  const checkDate = dateObj.toISOString().split('T')[0];
  
  for (const entry of state.assetCapacity) {
    if (entry.asset !== asset) continue;
    
    const dateFrom = entry.date_from || '';
    const dateTo = entry.date_to || '';
    
    // Check if date falls within range (string comparison works for YYYY-MM-DD)
    if (dateFrom && checkDate < dateFrom) continue;
    if (dateTo && checkDate > dateTo) continue;
    
    return Math.max(0, Number(entry.vessel_count) || 1);
  }
  return 1; // Default capacity
}

function generateWeeklyCapacityForecast(asset, tasks) {
  // Generate week-by-week capacity vs demand for a specific asset
  const assetTasks = tasks.filter(t => t.asset === asset);
  if (!assetTasks.length) return [];
  
  // Get date range from tasks
  const dates = assetTasks.flatMap(t => [
    parseDate(t.offshore_start) || parseDate(t.start_date),
    parseDate(t.offshore_end) || parseDate(t.return_end)
  ]).filter(Boolean);
  
  if (!dates.length) return [];
  
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Start from the Monday of minDate's week
  const startWeek = new Date(minDate);
  startWeek.setDate(startWeek.getDate() - startWeek.getDay() + 1);
  startWeek.setHours(0, 0, 0, 0);
  
  const weeks = [];
  let weekStart = new Date(startWeek);
  
  while (weekStart <= maxDate) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Count concurrent routes for this week (offshore_start to offshore_end overlap)
    let peakConcurrent = 0;
    const dayChecks = [];
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const concurrent = assetTasks.filter(t => {
        const olStart = parseDate(t.offshore_start) || parseDate(t.start_date);
        const olEnd = parseDate(t.offshore_end) || parseDate(t.return_end);
        if (!olStart || !olEnd) return false;
        return olStart <= dayEnd && olEnd >= dayStart;
      }).length;
      
      if (concurrent > peakConcurrent) {
        peakConcurrent = concurrent;
      }
    }
    
    // Get capacity for this week (use mid-week date for lookup)
    const midWeek = new Date(weekStart);
    midWeek.setDate(midWeek.getDate() + 3);
    const capacity = getCapacityForAssetAtDate(asset, midWeek);
    
    // Find the capacity entry that applies (for notes)
    const capacityEntry = state.assetCapacity.find(entry => {
      if (entry.asset !== asset) return false;
      const dateFrom = entry.date_from ? new Date(entry.date_from) : null;
      const dateTo = entry.date_to ? new Date(entry.date_to) : null;
      if (dateFrom && midWeek < dateFrom) return false;
      if (dateTo && midWeek > dateTo) return false;
      return true;
    });
    
    weeks.push({
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      peakConcurrent,
      capacity,
      notes: capacityEntry?.notes || '',
      exceedsCapacity: peakConcurrent > capacity
    });
    
    weekStart.setDate(weekStart.getDate() + 7);
  }
  
  return weeks;
}

function normalizeMonthlyCapacityEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => ({
    capacity_text: String(entry.capacity_text || '').trim(),
    date_from: String(entry.date_from || ''),
    date_to: String(entry.date_to || '')
  })).filter(entry => entry.capacity_text || entry.date_from || entry.date_to);
}

function collectCapacityEntriesFromDom() {
  const rows = Array.from(els.fleetSummary.querySelectorAll('.capacity-row[data-capacity-index]'));
  return rows.map(row => {
    const index = Number(row.dataset.capacityIndex);
    const assetSelect = row.querySelector(`.capacity-asset-select[data-index="${index}"]`);
    const countInput = row.querySelector(`.capacity-count-input[data-index="${index}"]`);
    const notesInput = row.querySelector(`.capacity-notes-input[data-index="${index}"]`);
    const dateFromInput = row.querySelector(`.capacity-date-from-input[data-index="${index}"]`);
    const dateToInput = row.querySelector(`.capacity-date-to-input[data-index="${index}"]`);
    return {
      asset: String(assetSelect?.value || '').trim(),
      vessel_count: Math.min(10, Math.max(0, Number(countInput?.value || 1))),
      notes: notesInput?.value || '',
      date_from: dateFromInput?.value || '',
      date_to: dateToInput?.value || ''
    };
  });
}

function collectMonthlyCapacityEntriesFromDom() {
  const rows = Array.from(els.fleetSummary.querySelectorAll('.monthly-capacity-row[data-monthly-capacity-index]'));
  return rows.map(row => {
    const index = Number(row.dataset.monthlyCapacityIndex);
    const textInput = row.querySelector(`.monthly-capacity-text-input[data-index="${index}"]`);
    const dateFromInput = row.querySelector(`.monthly-capacity-date-from-input[data-index="${index}"]`);
    const dateToInput = row.querySelector(`.monthly-capacity-date-to-input[data-index="${index}"]`);
    return {
      capacity_text: String(textInput?.value || '').trim(),
      date_from: dateFromInput?.value || '',
      date_to: dateToInput?.value || ''
    };
  });
}

function peakConcurrentOnLocation(tasks) {
  const intervals = [];
  for (const task of tasks || []) {
    // From-port planning basis: Base Delivery Date (load and depart) to return completion.
    const start = parseDate(task.start_date) || parseDate(task.offshore_start);
    const end = parseDate(task.return_end) || parseDate(task.offshore_end) || start;
    if (!start || !end || end <= start) continue;
    intervals.push({ start, end, asset: task.asset || 'Unassigned' });
  }
  if (!intervals.length) {
    return { fleetPeak: 0, byAsset: [] };
  }

  const points = Array.from(new Set(intervals.flatMap(item => [item.start.getTime(), item.end.getTime()]))).sort((a, b) => a - b);
  let fleetPeak = 0;
  const perAssetPeak = new Map();

  for (let index = 0; index < points.length - 1; index += 1) {
    const startTime = points[index];
    const endTime = points[index + 1];
    if (endTime <= startTime) continue;
    const active = intervals.filter(item => item.start.getTime() < endTime && startTime < item.end.getTime());
    fleetPeak = Math.max(fleetPeak, active.length);
    const counts = new Map();
    active.forEach(item => counts.set(item.asset, (counts.get(item.asset) || 0) + 1));
    counts.forEach((count, asset) => {
      perAssetPeak.set(asset, Math.max(perAssetPeak.get(asset) || 0, count));
    });
  }

  const byAsset = Array.from(perAssetPeak.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([asset, peak]) => ({ asset, peak }));

  return { fleetPeak, byAsset };
}

async function loadSpotData() {
  const payload = await api('/api/spot-hire');
  state.spot.records = payload.records || [];
  state.spot.source = payload.source || '';
  state.spot.phaseColors = payload.phase_colors || {};
  hydrateSpotPhaseControls();
  renderSpotHire();
}

function switchView(view) {
  state.view = view;
  const isSpotHire = view === 'spotHire';
  els.routeTab.classList.toggle('active', !isSpotHire);
  els.spotHireTab.classList.toggle('active', isSpotHire);
  els.routeControls.hidden = isSpotHire;
  els.routeWorkspace.hidden = isSpotHire;
  els.spotControls.hidden = !isSpotHire;
  els.spotWorkspace.hidden = !isSpotHire;
  if (isSpotHire) renderSpotHire();
}

function filteredTasks() {
  const rangeStart = parseDateFilter(state.filters.dateFrom);
  const rangeEnd = parseDateFilter(state.filters.dateTo, true);
  return state.tasks.filter(task => {
    const routeStart = parseDate(task.start_date) || parseDate(task.offshore_start);
    const routeEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || routeStart;
    const overlapsRange = (!rangeStart || (routeEnd && routeEnd >= rangeStart)) &&
      (!rangeEnd || (routeStart && routeStart <= rangeEnd));
    return (state.filters.coordinator === 'all' || (task.coordinator || coordinatorForAsset(task.asset)) === state.filters.coordinator) &&
      (state.filters.asset === 'all' || task.asset === state.filters.asset) &&
      (state.filters.status === 'all' || task.status === state.filters.status) &&
      overlapsRange;
  }).sort((a, b) => (parseDate(a.start_date) || 0) - (parseDate(b.start_date) || 0));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function syncSelect(select, values, allLabel) {
  const current = select.value || 'all';
  select.innerHTML = `<option value="all">${allLabel}</option>` + values.map(value => `<option>${escapeHtml(value)}</option>`).join('');
  select.value = values.includes(current) ? current : 'all';
}

function fillSelect(select, values, selectedValue = '') {
  select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  if (selectedValue && values.includes(selectedValue)) {
    select.value = selectedValue;
  }
}

function fillSelectWithAll(select, values, allLabel) {
  const current = select.value || 'all';
  select.innerHTML = `<option value="all">${allLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = values.includes(current) ? current : 'all';
}

function coordinatorForAsset(asset) {
  return Object.entries(COORDINATOR_ASSETS).find(([, assets]) => assets.includes(asset))?.[0] || 'Unassigned';
}

function populateDemandAssets() {
  const coordinator = els.coordinatorInput.value;
  fillSelect(els.assetInput, COORDINATOR_ASSETS[coordinator] || ALL_ASSETS);
}

function hydrateCoordinatorControls() {
  const coordinators = Object.keys(COORDINATOR_ASSETS);
  fillSelect(els.coordinatorInput, coordinators, els.coordinatorInput.value || coordinators[0]);
  fillSelect(els.editCoordinator, coordinators, els.editCoordinator.value || coordinators[0]);
  populateDemandAssets();
}

function renderFilters() {
  syncSelect(els.coordinatorFilter, unique([...Object.keys(COORDINATOR_ASSETS), ...state.tasks.map(t => t.coordinator || coordinatorForAsset(t.asset))]), 'All coordinators');
  syncSelect(els.assetFilter, unique([...ALL_ASSETS, ...state.tasks.map(t => t.asset)]), 'All assets');
  syncSelect(els.statusFilter, unique(state.tasks.map(t => t.status)), 'All statuses');
  // Default to 'Planned' filter if not already set and option exists
  if (state.filters.status === 'Planned' && els.statusFilter.querySelector('option[value="Planned"]')) {
    els.statusFilter.value = 'Planned';
  }
}

function renderMetrics(tasks) {
  const assets = unique(tasks.map(t => t.asset)).length;
  const coordinators = unique(tasks.map(t => t.coordinator || coordinatorForAsset(t.asset))).length;
  const active = tasks.filter(t => String(t.status).toLowerCase() !== 'complete').length;
  const metrics = [
    { key: 'active', label: 'Active Routes', value: active },
    { key: 'assets', label: 'Assets', value: assets },
    { key: 'coordinators', label: 'Coordinators', value: coordinators },
    { key: 'watch', label: 'Demand Watch', value: state.conflicts.length }
  ];
  els.statusStrip.innerHTML = metrics.map(metric => `<button type="button" class="metric ${state.activeInsight === metric.key ? 'active' : ''}" data-insight="${metric.key}"><span>${metric.label}</span><strong>${metric.value}</strong></button>`).join('');
}

function groupCounts(items, keyFn) {
  const counts = new Map();
  items.forEach(item => {
    const key = keyFn(item) || 'Unassigned';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function routeCard(task) {
  return `<div class="insight-item"><strong>${escapeHtml(task.asset)} / ${escapeHtml(task.activity || 'Route')}</strong><span>${escapeHtml(task.coordinator || coordinatorForAsset(task.asset))} | BDD ${fmt(task.start_date)} | Back ${fmt(task.return_end)}</span></div>`;
}

function renderInsightPanel(tasks) {
  const activeTasks = tasks.filter(t => String(t.status).toLowerCase() !== 'complete');
  const panels = {
    active: {
      title: 'Active Routes',
      text: `${activeTasks.length} routes are not marked Complete.`,
      body: `<div class="insight-scroll"><div class="insight-list">${activeTasks.map(routeCard).join('') || '<div class="empty-state">No active routes in the current view.</div>'}</div></div>`
    },
    assets: {
      title: 'Asset Demand',
      text: 'Routes grouped by Gulf of America asset for the current view. Click an asset to drill into the Gantt schedule.',
      body: `<div class="insight-scroll"><div class="insight-grid">${groupCounts(tasks, t => t.asset).map(([asset, count]) => `<button type="button" class="insight-item insight-item-action ${state.filters.asset === asset ? 'active' : ''}" data-asset-drill="${escapeHtml(asset)}" title="${state.filters.asset === asset ? 'Show all assets' : `Filter schedule to ${asset}`}" aria-pressed="${state.filters.asset === asset ? 'true' : 'false'}"><strong>${escapeHtml(asset)}</strong><span>${count} route${count === 1 ? '' : 's'}</span></button>`).join('') || '<div class="empty-state">No asset demand in the current view.</div>'}</div></div>`
    },
    coordinators: {
      title: 'Coordinator Load',
      text: 'Routes grouped by logistics coordinator for the current view. Click a coordinator to filter.',
      body: `<div class="insight-scroll"><div class="insight-grid">${groupCounts(tasks, t => t.coordinator || coordinatorForAsset(t.asset)).map(([coordinator, count]) => `<button type="button" class="insight-item insight-item-action ${state.filters.coordinator === coordinator ? 'active' : ''}" data-coordinator-drill="${escapeHtml(coordinator)}" title="${state.filters.coordinator === coordinator ? 'Show all coordinators' : `Filter to ${coordinator}`}" aria-pressed="${state.filters.coordinator === coordinator ? 'true' : 'false'}"><strong>${escapeHtml(coordinator)}</strong><span>${count} route${count === 1 ? '' : 's'}</span></button>`).join('') || '<div class="empty-state">No coordinator demand in the current view.</div>'}</div></div>`
    },
    watch: (() => {
      const filteredAsset = state.filters.asset !== 'all' ? state.filters.asset : null;
      const relevantConflicts = filteredAsset
        ? state.conflicts.filter(c => c.asset === filteredAsset)
        : state.conflicts;
      
      let forecastHtml = '';
      if (filteredAsset) {
        const forecast = generateWeeklyCapacityForecast(filteredAsset, state.tasks);
        const exceedingWeeks = forecast.filter(w => w.exceedsCapacity);
        
        if (forecast.length) {
          const fmtWeek = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          forecastHtml = `<div class="capacity-forecast" style="margin-bottom:12px;">
            <div style="font-weight:600;margin-bottom:8px;color:#e2e8f0;">Weekly Capacity Forecast for ${escapeHtml(filteredAsset)}</div>
            <div style="display:grid;gap:4px;">
              ${forecast.map(w => {
                const weekLabel = `${fmtWeek(w.weekStart)} - ${fmtWeek(w.weekEnd)}`;
                const statusClass = w.exceedsCapacity ? 'style="background:#dc2626;color:white;padding:2px 6px;border-radius:3px;"' : 'style="background:#22c55e;color:white;padding:2px 6px;border-radius:3px;"';
                const statusText = w.exceedsCapacity ? 'EXCEEDS' : 'OK';
                const notesHtml = w.notes ? `<span style="color:#94a3b8;font-size:11px;margin-left:8px;">(${escapeHtml(w.notes)})</span>` : '';
                return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #334155;">
                  <span style="min-width:130px;color:#cbd5e1;">${weekLabel}</span>
                  <span style="min-width:80px;">Demand: ${w.peakConcurrent}</span>
                  <span style="min-width:80px;">Capacity: ${w.capacity}</span>
                  <span ${statusClass}>${statusText}</span>
                  ${notesHtml}
                </div>`;
              }).join('')}
            </div>
            ${exceedingWeeks.length ? `<div style="margin-top:8px;padding:8px;background:#7f1d1d;border-radius:4px;color:#fecaca;">${exceedingWeeks.length} week${exceedingWeeks.length === 1 ? '' : 's'} exceed${exceedingWeeks.length === 1 ? 's' : ''} assigned capacity</div>` : '<div style="margin-top:8px;padding:8px;background:#14532d;border-radius:4px;color:#bbf7d0;">All weeks within assigned capacity</div>'}
          </div>`;
        }
      }
      
      const conflictText = filteredAsset
        ? `${relevantConflicts.length} demand watch item${relevantConflicts.length === 1 ? '' : 's'} for ${filteredAsset}.`
        : `${relevantConflicts.length} demand watch item${relevantConflicts.length === 1 ? '' : 's'} detected across all assets.`;
      
      return {
        title: filteredAsset ? `Demand Watch - ${filteredAsset}` : 'Demand Watch',
        text: `${conflictText} Click any item to jump to the Gantt chart.`,
        body: `<div class="insight-scroll">${forecastHtml}<div class="insight-list">${relevantConflicts.map(item => {
          const label = item.type === 'fleet_monthly_capacity' ? 'Monthly OSV Capacity' : (item.asset || item.resource || '');
          const severityLabel = item.severity === 'warning' ? 'Demand warning' : 'Demand conflict';
          return `<button type="button" class="insight-item insight-item-action" data-conflict-tasks="${escapeHtml(JSON.stringify(item.task_ids || []))}" data-conflict-start="${escapeHtml(item.overlap_start || '')}"><strong>${escapeHtml(severityLabel)} - ${escapeHtml(label)}</strong><span>${escapeHtml(item.message)}</span></button>`;
        }).join('') || '<div class="empty-state">No demand watch items' + (filteredAsset ? ` for ${filteredAsset}` : '') + '.</div>'}</div></div>`
      };
    })()
  };
  const panel = panels[state.activeInsight] || panels.active;
  els.insightPanel.innerHTML = `<div class="insight-heading"><div><h2>${panel.title}</h2><p>${panel.text}</p></div></div>${panel.body}`;
}

function timelineBounds(tasks) {
  const dates = tasks.flatMap(t => [parseDate(t.start_date), parseDate(t.return_end)]).filter(Boolean);
  if (!dates.length) {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 7 * 86400000) };
  }
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  start.setDate(start.getDate() - 1);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function pct(date, bounds) {
  return ((date - bounds.start) / (bounds.end - bounds.start)) * 100;
}

function conflictTaskIds() {
  const ids = new Set();
  state.conflicts.forEach(c => (c.task_ids || []).forEach(id => ids.add(id)));
  return ids;
}

function buildAssetVesselSlots(tasks) {
  const byTaskId = new Map();
  const maxByAsset = new Map();
  const byAsset = new Map();

  tasks.forEach(task => {
    const asset = task.asset || 'Unassigned';
    const start = parseDate(task.start_date) || parseDate(task.offshore_start);
    const end = parseDate(task.return_end) || parseDate(task.offshore_end) || start;
    if (!start || !end) return;
    const rows = byAsset.get(asset) || [];
    rows.push({ task, start, end });
    byAsset.set(asset, rows);
  });

  byAsset.forEach((rows, asset) => {
    rows.sort((a, b) => a.start - b.start || a.end - b.end);
    const slotEndTimes = [];

    rows.forEach(row => {
      let slotIndex = slotEndTimes.findIndex(endTime => endTime <= row.start);
      if (slotIndex === -1) {
        slotIndex = slotEndTimes.length;
        slotEndTimes.push(row.end);
      } else {
        slotEndTimes[slotIndex] = row.end;
      }
      byTaskId.set(row.task.id, slotIndex + 1);
    });

    maxByAsset.set(asset, slotEndTimes.length);
  });

  return { byTaskId, maxByAsset };
}

function renderTimeline(tasks) {
  const bounds = timelineBounds(tasks);
  state.timelineBoundsStart = bounds.start;
  const totalDays = Math.max(1, Math.ceil((bounds.end - bounds.start) / 86400000));
  const routeLabelWidth = 220;
  const dayWidth = 112;
  els.timeline.dataset.dayWidth = String(dayWidth);
  const timelineWidth = routeLabelWidth + (totalDays * dayWidth);
  const dates = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(bounds.start);
    date.setDate(bounds.start.getDate() + index);
    return date;
  });
  const head = `<div class="time-head" style="min-width:${timelineWidth}px;"><div class="time-label"></div><div class="date-grid" style="grid-template-columns: repeat(${dates.length}, ${dayWidth}px);">${dates.map(date => `<div class="date-cell">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`).join('')}</div></div>`;

  const conflictIds = conflictTaskIds();
  const vesselSlots = buildAssetVesselSlots(tasks);
  const rows = tasks.map(task => {
    const start = parseDate(task.start_date);
    const offshoreStart = parseDate(task.offshore_start) || start;
    const offshoreEnd = parseDate(task.offshore_end) || offshoreStart;
    const end = parseDate(task.return_end) || offshoreEnd || start;
    if (!start || !end) return '';
    const span = Math.max(1, end - start);
    const left = Math.max(0, pct(start, bounds));
    const width = Math.max(1.5, pct(end, bounds) - left);
    const baseWidth = Math.max(0, ((offshoreStart - start) / span) * 100);
    const offshoreLeft = Math.max(0, ((offshoreStart - start) / span) * 100);
    const offshoreWidth = Math.max(0, ((offshoreEnd - offshoreStart) / span) * 100);
    const returnLeft = Math.max(0, ((offshoreEnd - start) / span) * 100);
    const returnWidth = Math.max(0, 100 - returnLeft);
    const routeTitle = [task.asset, task.activity || 'Route'].filter(Boolean).join(' / ');
    const routeProject = task.project || 'No project';
    const vesselSlot = vesselSlots.byTaskId.get(task.id) || 1;
    const multiVesselAsset = (vesselSlots.maxByAsset.get(task.asset || 'Unassigned') || 1) > 1;
    const vesselBadge = multiVesselAsset
      ? `<span class="vessel-count-badge vessel-slot-${Math.min(vesselSlot, 5)}" title="Allocated vessel slot V${vesselSlot} for ${escapeHtml(task.asset || 'Unassigned')}"><span class="vessel-icon" aria-hidden="true">&#9875;</span>V${vesselSlot}</span>`
      : '';
    const vesselLabel = multiVesselAsset
      ? `<span class="vessel-assignment vessel-slot-${Math.min(vesselSlot, 5)}">Allocated OSV: V${vesselSlot}</span>`
      : '';
    const hasConflict = conflictIds.has(task.id);
    const conflictBadge = hasConflict
      ? `<span class="conflict-badge" title="Demand watch item - see Demand Watch tab">!</span>`
      : '';
    return `<div class="route-row${hasConflict ? ' has-conflict' : ''}" data-task-id="${task.id}" style="min-width:${timelineWidth}px;">
      <div class="route-label"><strong>${escapeHtml(routeTitle)}</strong><span>${escapeHtml(routeProject)}</span>${vesselLabel}</div>
      <div class="bar-lane" style="background-size: ${dayWidth}px 100%;">
        <button class="task-bar${hasConflict ? ' conflict-bar' : ''}" data-edit="${task.id}" data-shift="${task.id}" style="left:${left}%;width:${width}%;" title="${multiVesselAsset ? `Allocated vessel slot V${vesselSlot}. ` : ''}${hasConflict ? 'Demand watch item - see Demand Watch tab. ' : ''}Drag to shift route dates. Click to edit ${escapeHtml(task.activity)}.">
          <span class="segment seg-base" style="left:0;width:${baseWidth}%;"></span>
          <span class="segment seg-offshore" style="left:${offshoreLeft}%;width:${offshoreWidth}%;"></span>
          <span class="segment seg-return" style="left:${returnLeft}%;width:${returnWidth}%;"></span>
          <span class="task-title">${conflictBadge}${vesselBadge}${escapeHtml(routeTitle)}</span>
        </button>
      </div>
    </div>`;
  }).join('');

  els.timeline.innerHTML = head + rows;
}

function statusClass(status) {
  const key = String(status || '').toLowerCase();
  if (key.includes('complete')) return 'status-complete';
  if (key.includes('progress')) return 'status-progress';
  if (key.includes('confirm')) return 'status-confirmed';
  return '';
}

function renderTable(tasks) {
  els.table.innerHTML = tasks.map(task => `<tr>
    <td class="route-name"><strong>${escapeHtml(task.asset)} / ${escapeHtml(task.activity)}</strong><span>${escapeHtml(task.project || 'No project')}</span></td>
    <td>${escapeHtml(task.coordinator || coordinatorForAsset(task.asset))}</td>
    <td>${fmt(task.start_date)}</td>
    <td>${fmt(task.offshore_start)}</td>
    <td>${fmt(task.offshore_end)}</td>
    <td>${fmt(task.return_end)}</td>
    <td><span class="status-pill ${statusClass(task.status)}">${escapeHtml(task.status || 'Planned')}</span></td>
    <td><div class="table-actions"><button type="button" data-edit="${task.id}">Edit</button><button type="button" class="danger-button" data-delete="${task.id}">Delete</button></div></td>
  </tr>`).join('') || '<tr><td colspan="8">No demand matches the current filters.</td></tr>';
}

function renderConflicts(demandTasks = state.tasks) {
  renderFleetSummary(demandTasks);
  if (!state.conflicts.length) {
    els.conflicts.innerHTML = '<div class="empty-state">No asset or fleet demand watch items.</div>';
    return;
  }
  els.conflicts.innerHTML = `<div class="empty-state">${state.conflicts.length} demand watch item${state.conflicts.length === 1 ? '' : 's'} found. Open the Demand Watch tab in the header to review and jump to impacted routes.</div>`;
}

function renderFleetSummary(demandTasks = state.tasks) {
  const demandCapacity = peakConcurrentOnLocation(demandTasks);
  const topAssets = demandCapacity.byAsset.slice(0, 5);
  const topAssetText = topAssets.length
    ? topAssets.map(item => `${item.asset}: ${item.peak}`).join(' | ')
    : 'No on-location demand found yet.';
  const existingAssets = state.assetCapacity.map(entry => entry.asset).filter(Boolean);
  const selectableAssets = Array.from(new Set([...ALL_ASSETS, ...existingAssets])).sort((a, b) => a.localeCompare(b));
  const rowsData = state.assetCapacity.length
    ? state.assetCapacity
    : [{ asset: ALL_ASSETS[0] || '', vessel_count: 1, notes: '', date_from: '', date_to: '' }];
  const capacityRows = rowsData.map((entry, index) => {
    const asset = entry.asset || '';
    const count = Number.isFinite(Number(entry.vessel_count)) ? Math.min(10, Math.max(0, Number(entry.vessel_count))) : 1;
    const countOptions = Array.from({ length: 11 }, (_, value) => {
      const selected = value === count ? ' selected' : '';
      return `<option value="${value}"${selected}>${value}</option>`;
    }).join('');
    const assetOptions = selectableAssets.map(option => {
      const selected = option === asset ? ' selected' : '';
      return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(option)}</option>`;
    }).join('');
    const notes = entry.notes || '';
    const dateFrom = entry.date_from || '';
    const dateTo = entry.date_to || '';
    
    // Check for conflicts (offshore overlaps) OR weekly demand exceeding capacity
    const hasOffshoreConflict = asset && state.conflicts.some(c => c.asset === asset);
    const weeklyForecast = asset ? generateWeeklyCapacityForecast(asset, state.tasks) : [];
    const hasCapacityExceeded = weeklyForecast.some(w => w.exceedsCapacity);
    const hasConflict = hasOffshoreConflict || hasCapacityExceeded;
    
    return `<div class="capacity-row${hasConflict ? ' capacity-row-conflict' : ''}" data-capacity-index="${index}">
      <select class="capacity-asset-select" data-index="${index}" title="Select asset"><option value="">Select asset</option>${assetOptions}</select>
      <select class="capacity-count-input" data-index="${index}" title="Vessel count available (0-10)">${countOptions}</select>
      <input type="date" class="capacity-date-from-input" data-index="${index}" value="${escapeHtml(dateFrom)}" title="Capacity effective from (leave blank for always)">
      <input type="date" class="capacity-date-to-input" data-index="${index}" value="${escapeHtml(dateTo)}" title="Capacity effective to (leave blank for always)">
      <input type="text" class="capacity-notes-input" data-index="${index}" value="${escapeHtml(notes)}" placeholder="Notes (optional)" title="Planning notes">
      <button type="button" data-remove-capacity-row="${index}" title="Remove this capacity row">Remove</button>
    </div>`;
  }).join('');
  const monthlyRowsData = state.monthlyCapacityEntries.length
    ? state.monthlyCapacityEntries
    : [{ capacity_text: '', date_from: '', date_to: '' }];
  const monthlyCapacityRows = monthlyRowsData.map((entry, index) => {
    const parsedCapacity = parseMonthlyCapacityText(entry.capacity_text);
    const parsedLabel = parsedCapacity === null
      ? 'Add text that includes the vessel count, for example: June 2026 total fleet capacity 8 vessels.'
      : `Detected fleet capacity: ${parsedCapacity} vessel${parsedCapacity === 1 ? '' : 's'}`;
    return `<div class="monthly-capacity-row" data-monthly-capacity-index="${index}">
      <input type="date" class="monthly-capacity-date-from-input" data-index="${index}" value="${escapeHtml(entry.date_from || '')}" title="Monthly capacity effective from">
      <input type="date" class="monthly-capacity-date-to-input" data-index="${index}" value="${escapeHtml(entry.date_to || '')}" title="Monthly capacity effective to">
      <div class="monthly-capacity-text-wrap">
        <textarea class="monthly-capacity-text-input" data-index="${index}" rows="2" placeholder="June 2026 total fleet capacity 8 vessels. Pontus shared with Sparta first half of month.">${escapeHtml(entry.capacity_text || '')}</textarea>
        <span class="monthly-capacity-hint${parsedCapacity === null ? ' is-warning' : ''}">${escapeHtml(parsedLabel)}</span>
      </div>
      <button type="button" data-remove-monthly-capacity-row="${index}" title="Remove this monthly capacity row">Remove</button>
    </div>`;
  }).join('');
  els.fleetSummary.innerHTML = `<div class="fleet-card">
    <strong>Demand-Based OSV Capacity (Auto)</strong>
    <span>This value is calculated from current demand as the peak number of simultaneous routes from Base Delivery Date through Return to Port.</span>
    <div class="demand-capacity-card">
      <label class="demand-capacity-label" for="demandCapacityValue">Calculated OSV Capacity</label>
      <input id="demandCapacityValue" class="demand-capacity-value" type="text" value="${escapeHtml(String(demandCapacity.fleetPeak))}" readonly>
      <span class="demand-capacity-subtext">Top concurrent from-port demand by asset: ${escapeHtml(topAssetText)}</span>
    </div>
    <strong>Asset Vessel Capacity</strong>
    <span>Add one or more capacity rows. You can reuse the same asset with different date ranges to represent changing demand or availability.</span>
    <div class="capacity-grid capacity-grid-dates">
      <div class="capacity-row capacity-row-header">
        <span class="capacity-asset-name"><em>Asset</em></span>
        <span style="font-size:11px;color:#94a3b8">Vessels</span>
        <span style="font-size:11px;color:#94a3b8">From</span>
        <span style="font-size:11px;color:#94a3b8">To</span>
        <span style="font-size:11px;color:#94a3b8">Notes</span>
        <span style="font-size:11px;color:#94a3b8">Action</span>
      </div>
      ${capacityRows}
    </div>
    <div class="monthly-capacity-card">
      <strong>Monthly OSV Capacity</strong>
      <span>Enter the Logistics Team monthly fleet-capacity note in free text. The scheduler will detect the vessel count from the text and apply it as a fleet-wide Schedule Watch limit for the selected date window.</span>
      <div class="monthly-capacity-grid">
        <div class="monthly-capacity-row monthly-capacity-row-header">
          <span style="font-size:11px;color:#94a3b8">From</span>
          <span style="font-size:11px;color:#94a3b8">To</span>
          <span style="font-size:11px;color:#94a3b8">Free text</span>
          <span style="font-size:11px;color:#94a3b8">Action</span>
        </div>
        ${monthlyCapacityRows}
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
      <button type="button" id="addCapacityRowBtn">Add Capacity Row</button>
      <button type="button" id="addMonthlyCapacityRowBtn">Add Monthly OSV Capacity</button>
      <button type="button" class="primary-button" id="saveCapacityBtn">Save Capacity Settings</button>
    </div>
  </div>`;
  document.getElementById('addCapacityRowBtn').addEventListener('click', () => {
    const draft = collectCapacityEntriesFromDom();
    draft.push({ asset: ALL_ASSETS[0] || '', vessel_count: 1, notes: '', date_from: '', date_to: '' });
    state.assetCapacity = draft;
    renderFleetSummary();
  });
  document.getElementById('addMonthlyCapacityRowBtn').addEventListener('click', () => {
    const draft = collectMonthlyCapacityEntriesFromDom();
    draft.push({ capacity_text: '', date_from: '', date_to: '' });
    state.monthlyCapacityEntries = draft;
    renderFleetSummary();
  });
  els.fleetSummary.querySelectorAll('[data-remove-capacity-row]').forEach(button => {
    button.addEventListener('click', () => {
      const removeIndex = Number(button.dataset.removeCapacityRow);
      const draft = collectCapacityEntriesFromDom().filter((_, index) => index !== removeIndex);
      state.assetCapacity = draft.length ? draft : [{ asset: ALL_ASSETS[0] || '', vessel_count: 1, notes: '', date_from: '', date_to: '' }];
      renderFleetSummary();
    });
  });
  els.fleetSummary.querySelectorAll('.monthly-capacity-text-input, .monthly-capacity-date-from-input, .monthly-capacity-date-to-input').forEach(input => {
    input.addEventListener('change', () => {
      state.monthlyCapacityEntries = collectMonthlyCapacityEntriesFromDom();
      renderFleetSummary();
    });
  });
  els.fleetSummary.querySelectorAll('[data-remove-monthly-capacity-row]').forEach(button => {
    button.addEventListener('click', () => {
      const removeIndex = Number(button.dataset.removeMonthlyCapacityRow);
      const draft = collectMonthlyCapacityEntriesFromDom().filter((_, index) => index !== removeIndex);
      state.monthlyCapacityEntries = draft.length ? draft : [{ capacity_text: '', date_from: '', date_to: '' }];
      renderFleetSummary();
    });
  });
  document.getElementById('saveCapacityBtn').addEventListener('click', saveAssetCapacity);
}

async function saveAssetCapacity() {
  const asset_capacities = collectCapacityEntriesFromDom().filter(entry => entry.asset);
  const monthly_capacity_entries = collectMonthlyCapacityEntriesFromDom().filter(entry => entry.capacity_text || entry.date_from || entry.date_to);
  await api('/api/asset-capacity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_capacities, monthly_capacity_entries })
  });
  showToast('Asset capacity saved');
  await loadData();
}

const DEFAULT_OSV_CAPACITY = 9;

// Per-week capacity storage
function getWeeklyCapacities() {
  try {
    const stored = localStorage.getItem('weeklyOsvCapacities');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setWeeklyCapacity(weekKey, capacity) {
  const capacities = getWeeklyCapacities();
  capacities[weekKey] = Math.max(1, Math.min(20, parseInt(capacity, 10) || DEFAULT_OSV_CAPACITY));
  localStorage.setItem('weeklyOsvCapacities', JSON.stringify(capacities));
  return capacities[weekKey];
}

function getCapacityForWeek(weekKey) {
  const capacities = getWeeklyCapacities();
  return capacities[weekKey] !== undefined ? capacities[weekKey] : DEFAULT_OSV_CAPACITY;
}

// For asset forecast, use average of visible weeks or default
function getOsvCapacity() {
  const capacities = getWeeklyCapacities();
  const values = Object.values(capacities);
  if (values.length === 0) return DEFAULT_OSV_CAPACITY;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function calculateWeeklyDemand(tasks) {
  const weeks = new Map();
  
  tasks.forEach(task => {
    const start = parseDate(task.start_date);
    const end = parseDate(task.return_end) || parseDate(task.offshore_end) || start;
    if (!start || !end) return;
    
    // Iterate through each day of the task
    const current = new Date(start);
    while (current <= end) {
      const weekStart = getWeekStart(current);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, { weekStart, tasks: new Set(), peakDemand: 0 });
      }
      weeks.get(weekKey).tasks.add(task.id);
      
      current.setDate(current.getDate() + 1);
    }
  });
  
  // Calculate peak concurrent demand per week
  weeks.forEach((weekData, weekKey) => {
    const weekStart = weekData.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Find tasks that overlap with this week
    const overlappingTasks = tasks.filter(task => {
      const taskStart = parseDate(task.start_date);
      const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
      if (!taskStart || !taskEnd) return false;
      return taskStart <= weekEnd && taskEnd >= weekStart;
    });
    
    // Calculate peak concurrent for each day in the week
    let peakDemand = 0;
    const dayCheck = new Date(weekStart);
    dayCheck.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    
    while (dayCheck <= weekEnd) {
      let concurrent = 0;
      overlappingTasks.forEach(task => {
        const taskStart = parseDate(task.start_date);
        const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
        if (!taskStart || !taskEnd) return;
        
        // Normalize to date-only comparison
        const checkDateOnly = new Date(dayCheck.getFullYear(), dayCheck.getMonth(), dayCheck.getDate());
        const startDateOnly = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
        const endDateOnly = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
        
        if (startDateOnly <= checkDateOnly && endDateOnly >= checkDateOnly) {
          concurrent++;
        }
      });
      peakDemand = Math.max(peakDemand, concurrent);
      dayCheck.setDate(dayCheck.getDate() + 1);
    }
    
    weekData.peakDemand = peakDemand;
  });
  
  return Array.from(weeks.values()).sort((a, b) => a.weekStart - b.weekStart);
}

function renderWeeklyDemandForecast(tasks = state.tasks) {
  if (!els.weeklyDemandGrid) return;
  
  // Check if filtering to a specific asset
  const filteredAsset = state.filters.asset !== 'all' ? state.filters.asset : null;
  const relevantTasks = filteredAsset ? tasks.filter(t => t.asset === filteredAsset) : tasks;
  
  // Update header based on filter
  const headerEl = document.getElementById('weeklyDemandHeader');
  const descEl = document.getElementById('weeklyDemandDesc');
  if (headerEl) {
    headerEl.textContent = filteredAsset ? `Weekly Demand Forecast - ${filteredAsset}` : 'Weekly Demand Forecast';
  }
  if (descEl) {
    if (filteredAsset) {
      const capacityEntry = state.assetCapacity.find(e => e.asset === filteredAsset);
      const capacityNote = capacityEntry?.notes ? ` (${capacityEntry.notes})` : '';
      descEl.textContent = `Showing ${filteredAsset} demand vs assigned vessel capacity${capacityNote}. Click over-capacity weeks to see routes.`;
    } else {
      descEl.textContent = '8-week lookahead. Click capacity to edit per week.';
    }
  }
  
  const weeklyData = calculateWeeklyDemand(relevantTasks);
  const weekDemandMap = new Map();
  weeklyData.forEach(w => {
    const key = w.weekStart.toISOString().split('T')[0];
    weekDemandMap.set(key, w.peakDemand);
  });
  
  // Always generate 8 weeks from current week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  
  const weeks = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekKey = weekStart.toISOString().split('T')[0];
    const demand = weekDemandMap.get(weekKey) || 0;
    weeks.push({ weekStart, weekKey, demand });
  }
  
  els.weeklyDemandGrid.innerHTML = weeks.map(week => {
    // Use asset-specific capacity when filtered, otherwise fleet capacity
    const capacity = filteredAsset 
      ? getCapacityForAssetAtDate(filteredAsset, week.weekStart)
      : getCapacityForWeek(week.weekKey);
    let statusClass = 'under-capacity';
    let statusText = `${capacity - week.demand} available`;
    const isOverCapacity = week.demand > capacity;
    
    if (isOverCapacity) {
      statusClass = 'over-capacity';
      statusText = `${week.demand - capacity} over!`;
    } else if (week.demand === capacity) {
      statusClass = 'at-capacity';
      statusText = 'At capacity';
    } else if (week.demand === 0) {
      statusText = 'No demand';
    }
    
    // Make over-capacity cards clickable to show conflicting routes
    const clickable = isOverCapacity ? 'clickable' : '';
    const clickAttr = isOverCapacity ? `data-show-conflicts="${week.weekKey}"` : '';
    const clickTitle = isOverCapacity ? 'title="Click to see conflicting routes"' : '';
    
    // For asset-filtered view, show capacity as text (not editable)
    const capacityDisplay = filteredAsset
      ? `<span class="week-capacity-value">${capacity}</span>`
      : `<input type="number" class="week-capacity-input" data-week-key="${week.weekKey}" value="${capacity}" min="1" max="20" title="Edit capacity for this week">`;
    
    return `<div class="week-card ${statusClass} ${clickable}" ${clickAttr} ${clickTitle}>
      <span class="week-label">${formatWeekLabel(week.weekStart)}</span>
      <div class="week-stats">
        <span class="week-demand">${week.demand}</span>
        <span class="week-divider">/</span>
        <span class="week-capacity-wrap">${capacityDisplay}</span>
      </div>
      <span class="week-status">${statusText}</span>
    </div>`;
  }).join('');
  
  // Add event listeners for per-week capacity inputs (fleet view only)
  els.weeklyDemandGrid.querySelectorAll('.week-capacity-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const weekKey = e.target.dataset.weekKey;
      setWeeklyCapacity(weekKey, e.target.value);
      renderWeeklyDemandForecast(tasks);
    });
  });
  
  // Add click handlers for over-capacity weeks to show conflicting routes
  els.weeklyDemandGrid.querySelectorAll('[data-show-conflicts]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('week-capacity-input')) return; // Don't trigger on input click
      const weekKey = card.dataset.showConflicts;
      showWeekConflictRoutes(weekKey, filteredAsset, relevantTasks);
    });
  });
  
  // Hide conflict details panel when not needed
  const conflictPanel = document.getElementById('weekConflictDetails');
  if (conflictPanel) conflictPanel.style.display = 'none';
}

function showWeekConflictRoutes(weekKey, asset, tasks) {
  const conflictPanel = document.getElementById('weekConflictDetails');
  if (!conflictPanel) return;
  
  const weekStart = new Date(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // Find tasks active during this week
  const activeTasks = tasks.filter(task => {
    const taskStart = parseDate(task.start_date);
    const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
    if (!taskStart || !taskEnd) return false;
    return taskStart <= weekEnd && taskEnd >= weekStart;
  });
  
  const capacity = asset 
    ? getCapacityForAssetAtDate(asset, weekStart)
    : getCapacityForWeek(weekKey);
  
  const weekLabel = formatWeekLabel(weekStart);
  
  conflictPanel.innerHTML = `
    <div class="conflict-routes-header">
      <strong>Demand Conflict: ${weekLabel}</strong>
      <span>${activeTasks.length} routes vs ${capacity} vessel${capacity !== 1 ? 's' : ''} capacity</span>
      <button type="button" class="close-conflict-panel" title="Close">×</button>
    </div>
    <div class="conflict-routes-list">
      ${activeTasks.map(task => `
        <button type="button" class="conflict-route-item" data-scroll-to-task="${task.id}">
          <strong>${escapeHtml(task.activity || 'Route')}</strong>
          <span>${escapeHtml(task.project || '')} | ${fmt(task.start_date)} - ${fmt(task.return_end)}</span>
        </button>
      `).join('')}
    </div>
  `;
  
  conflictPanel.style.display = 'block';
  
  // Close button handler
  conflictPanel.querySelector('.close-conflict-panel')?.addEventListener('click', () => {
    conflictPanel.style.display = 'none';
  });
  
  // Click to scroll to task handlers
  conflictPanel.querySelectorAll('[data-scroll-to-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.scrollToTask;
      scrollToConflictTasks([taskId], null);
      conflictPanel.style.display = 'none';
    });
  });
}

function populateForecastAssetSelect(tasks = state.tasks) {
  if (!els.forecastAssetSelect) return;
  const assets = unique([...ALL_ASSETS, ...tasks.map(t => t.asset)]).filter(Boolean).sort();
  els.forecastAssetSelect.innerHTML = '<option value="all">All assets</option>' + assets.map(asset => `<option value="${escapeHtml(asset)}">${escapeHtml(asset)}</option>`).join('');
}

function runAssetForecast() {
  if (!els.assetForecastResult) return;
  
  const selectedAsset = els.forecastAssetSelect?.value || 'all';
  const dateFrom = els.forecastDateFrom?.value ? parseDate(els.forecastDateFrom.value) : null;
  const dateTo = els.forecastDateTo?.value ? parseDate(els.forecastDateTo.value) : null;
  
  // Filter tasks
  let filteredTasks = state.tasks;
  
  if (selectedAsset !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.asset === selectedAsset);
  }
  
  if (dateFrom) {
    filteredTasks = filteredTasks.filter(t => {
      const taskEnd = parseDate(t.return_end) || parseDate(t.offshore_end) || parseDate(t.start_date);
      return taskEnd && taskEnd >= dateFrom;
    });
  }
  
  if (dateTo) {
    filteredTasks = filteredTasks.filter(t => {
      const taskStart = parseDate(t.start_date);
      return taskStart && taskStart <= dateTo;
    });
  }
  
  if (!filteredTasks.length) {
    els.assetForecastResult.innerHTML = '<div class="empty-state">No activities match the selected filters.</div>';
    return;
  }
  
  // Calculate peak concurrent demand
  let peakDemand = 0;
  let peakDate = null;
  
  // Get date range from tasks
  let minDate = null, maxDate = null;
  filteredTasks.forEach(task => {
    const start = parseDate(task.start_date);
    const end = parseDate(task.return_end) || parseDate(task.offshore_end) || start;
    if (start && (!minDate || start < minDate)) minDate = start;
    if (end && (!maxDate || end > maxDate)) maxDate = end;
  });
  
  if (!minDate || !maxDate) {
    els.assetForecastResult.innerHTML = '<div class="empty-state">No valid date range found.</div>';
    return;
  }
  
  // Check each day in the range for concurrent routes
  const checkDate = new Date(minDate);
  checkDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
  
  while (checkDate <= maxDate) {
    let concurrent = 0;
    filteredTasks.forEach(task => {
      const taskStart = parseDate(task.start_date);
      const taskEnd = parseDate(task.return_end) || parseDate(task.offshore_end) || taskStart;
      if (!taskStart || !taskEnd) return;
      
      // Normalize to date-only comparison
      const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const startDateOnly = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
      const endDateOnly = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
      
      if (startDateOnly <= checkDateOnly && endDateOnly >= checkDateOnly) {
        concurrent++;
      }
    });
    
    if (concurrent > peakDemand) {
      peakDemand = concurrent;
      peakDate = new Date(checkDate);
    }
    
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  const capacity = getOsvCapacity();
  const overCapacity = peakDemand > capacity;
  const spotHireNeeded = Math.max(0, peakDemand - capacity);
  
  const summaryHtml = `<div class="forecast-summary">
    <div class="forecast-stat">
      <span class="stat-value">${filteredTasks.length}</span>
      <span class="stat-label">Activities</span>
    </div>
    <div class="forecast-stat ${overCapacity ? 'over-capacity' : ''}">
      <span class="stat-value">${peakDemand}</span>
      <span class="stat-label">Peak Concurrent</span>
    </div>
    <div class="forecast-stat">
      <span class="stat-value">${capacity}</span>
      <span class="stat-label">OSV Capacity</span>
    </div>
    <div class="forecast-stat ${overCapacity ? 'over-capacity' : ''}">
      <span class="stat-value">${spotHireNeeded}</span>
      <span class="stat-label">Spot Hire Needed</span>
    </div>
  </div>`;
  
  const peakDateStr = peakDate ? peakDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A';
  const peakInfo = peakDemand > 0 ? `<p style="font-size:12px;color:var(--muted);margin:0 0 12px 0;">Peak demand of <strong>${peakDemand} vessels</strong> occurs on <strong>${peakDateStr}</strong>.</p>` : '';
  
  const activitiesHtml = `<div class="forecast-activities">
    <h4>Activities in Range (${filteredTasks.length})</h4>
    <div class="forecast-activity-list">
      ${filteredTasks.map(task => {
        const startStr = task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const endStr = task.return_end ? new Date(task.return_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : startStr;
        return `<div class="forecast-activity-item">
          <div>
            <span class="activity-name">${escapeHtml(task.asset)} - ${escapeHtml(task.activity || 'Route')}</span>
            <span class="activity-dates">${startStr} → ${endStr}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
  
  els.assetForecastResult.innerHTML = summaryHtml + peakInfo + activitiesHtml;
}

function scrollToConflictTasks(taskIds, conflictStart) {
  console.log('scrollToConflictTasks called:', { taskIds, conflictStart });
  if (!taskIds || !taskIds.length) {
    console.log('No task IDs provided');
    return;
  }
  
  // Find the task to get its asset
  const targetTask = state.tasks.find(t => t.id === taskIds[0]);
  const targetAsset = targetTask?.asset;
  
  // Switch to route view if needed
  if (state.view !== 'route') switchView('route');
  
  // Only clear filters that would hide the target task
  // Keep asset filter if it matches the target task's asset
  if (state.filters.asset !== 'all' && state.filters.asset !== targetAsset) {
    state.filters.asset = 'all';
    els.assetFilter.value = 'all';
  }
  state.filters.status = 'all';
  state.filters.coordinator = 'all';
  state.filters.dateFrom = '';
  state.filters.dateTo = '';
  els.statusFilter.value = 'all';
  els.coordinatorFilter.value = 'all';
  els.dateFromFilter.value = '';
  els.dateToFilter.value = '';
  render();
  
  // Use longer delay to ensure DOM is fully updated after render
  setTimeout(() => {
    console.log('Looking for row with task ID:', taskIds[0]);
    const row = els.timeline.querySelector(`[data-task-id="${taskIds[0]}"]`);
    console.log('Row found:', row);
    if (!row) {
      console.log('Row not found for task:', taskIds[0]);
      showToast('Route not found in current view');
      return;
    }
    
    // Get the task bar inside the row
    const taskBar = row.querySelector('.task-bar');
    
    // Step 1: Scroll the page to bring the row into view vertically
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Step 2: After vertical scroll, scroll timeline horizontally to show the task bar
    setTimeout(() => {
      if (taskBar) {
        const rowRect = row.getBoundingClientRect();
        const barRect = taskBar.getBoundingClientRect();
        const timelineRect = els.timeline.getBoundingClientRect();
        
        // Calculate where the bar is relative to the timeline viewport
        const barCenterX = barRect.left + barRect.width / 2;
        const timelineCenterX = timelineRect.left + timelineRect.width / 2;
        
        // Scroll timeline horizontally to center the task bar
        const scrollOffset = barCenterX - timelineCenterX;
        els.timeline.scrollLeft += scrollOffset;
      }
      
      // Flash highlight to draw attention
      row.classList.add('conflict-flash');
      setTimeout(() => row.classList.remove('conflict-flash'), 3000);
      showToast(`Scrolled to ${targetTask?.activity || 'route'}`);
    }, 500);
  }, 400);
}

function render() {
  renderFilters();
  const tasks = filteredTasks();
  renderMetrics(tasks);
  renderInsightPanel(tasks);
  els.sourceLabel.textContent = `${state.source} - ${state.bufferHours}h turnaround buffer`;
  els.rangeLabel.textContent = rangeText();
  renderTimeline(tasks);
  renderTable(tasks);
  renderConflicts(tasks);
  renderWeeklyDemandForecast(tasks);
  populateForecastAssetSelect(tasks);
  updateCapacityAlertBadge();  // NEW: Update capacity alert in header
}

function rangeText() {
  if (!state.filters.dateFrom && !state.filters.dateTo) {
    return 'Showing all entered demand. Drag empty schedule space to pan, or drag a route bar to shift it by whole days.';
  }
  const from = state.filters.dateFrom ? fmtDateOnly(`${state.filters.dateFrom}T00:00:00`) : 'earliest route';
  const to = state.filters.dateTo ? fmtDateOnly(`${state.filters.dateTo}T00:00:00`) : 'latest route';
  return `Showing demand from ${from} to ${to}.`;
}

function openEdit(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  els.editForm.elements.id.value = task.id;
  els.editForm.elements.coordinator.value = task.coordinator || coordinatorForAsset(task.asset);
  els.editForm.elements.status.value = task.status || 'Planned';
  els.editForm.elements.start_date.value = toLocalInput(task.start_date);
  els.editForm.elements.offshore_start.value = toLocalInput(task.offshore_start);
  els.editForm.elements.duration_hours.value = task.duration_hours || 24;
  els.editForm.elements.transit_hours.value = task.transit_hours || 12;
  els.editDialog.hidden = false;
}

function closeEdit() {
  els.editDialog.hidden = true;
}

async function saveEdit(event) {
  event.preventDefault();
  const data = new FormData(els.editForm);
  const change = {
    id: data.get('id'),
    coordinator: data.get('coordinator'),
    status: data.get('status'),
    start_date: fromLocalInput(data.get('start_date')),
    offshore_start: fromLocalInput(data.get('offshore_start')),
    duration_hours: Number(data.get('duration_hours') || 24),
    transit_hours: Number(data.get('transit_hours') || 12)
  };
  await api('/api/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [change] })
  });
  closeEdit();
  showToast('Route updated');
  await loadData();
}

function shiftIso(value, dayDelta) {
  const date = parseDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + dayDelta);
  return date.toISOString().slice(0, 19);
}

async function shiftRoute(taskId, dayDelta) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || !dayDelta) return;
  const change = {
    id: task.id,
    start_date: shiftIso(task.start_date, dayDelta),
    offshore_start: shiftIso(task.offshore_start, dayDelta),
    duration_hours: Number(task.duration_hours || 24),
    transit_hours: Number(task.transit_hours || 12)
  };
  await api('/api/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [change] })
  });
  showToast(`Route shifted ${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? '' : 's'} ${dayDelta > 0 ? 'later' : 'earlier'}`);
  await loadData();
}

async function deleteRoute(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  const label = `${task.asset} / ${task.activity || 'Route'}`;
  if (!confirm(`Delete ${label} from the schedule view?`)) return;
  await api(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  closeEdit();
  showToast('Route deleted from schedule view');
  await loadData();
}

async function addDemand(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    asset: data.get('asset'),
    coordinator: data.get('coordinator') || coordinatorForAsset(data.get('asset')),
    project: data.get('project') || '',
    activity: data.get('activity'),
    status: data.get('status'),
    start_date: fromLocalInput(data.get('start_date')),
    offshore_start: fromLocalInput(data.get('offshore_start')),
    duration_hours: Number(data.get('duration_hours') || 24),
    transit_hours: Number(data.get('transit_hours') || 12)
  };
  await api('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  form.reset();
  hydrateCoordinatorControls();
  showToast('Demand added');
  await loadData();
}

async function uploadWorkbook(event) {
  const file = event.target.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  await fetch('/api/upload', { method: 'POST', body: form }).then(response => {
    if (!response.ok) throw new Error('Workbook upload failed');
    return response.json();
  });
  showToast('Workbook uploaded');
  await loadData();
  await loadSpotData();
}

function spotPhaseNames() {
  return unique([...Object.keys(state.spot.phaseColors), ...state.spot.records.map(record => record.phase || 'Other')]);
}

function hydrateSpotPhaseControls() {
  const phases = spotPhaseNames();
  fillSelect(els.spotPhaseInput, phases, els.spotPhaseInput.value || phases[0]);
  fillSelect(els.spotEditPhase, phases, els.spotEditPhase.value || phases[0]);
}

function spotColorForPhase(phase) {
  return state.spot.phaseColors[phase] || '#16858c';
}

function filteredSpotRecords() {
  const rangeStart = parseDateFilter(state.spot.filters.dateFrom);
  const rangeEnd = parseDateFilter(state.spot.filters.dateTo, true);
  return state.spot.records.filter(record => {
    const start = parseDate(record.start_date);
    const end = parseDate(record.end_date) || start;
    const overlapsRange = (!rangeStart || (end && end >= rangeStart)) &&
      (!rangeEnd || (start && start <= rangeEnd));
    return (state.spot.filters.asset === 'all' || record.asset === state.spot.filters.asset) &&
      (state.spot.filters.phase === 'all' || record.phase === state.spot.filters.phase) &&
      (state.spot.filters.status === 'all' || (record.status || 'Planned') === state.spot.filters.status) &&
      overlapsRange;
  }).sort((a, b) => (parseDate(a.start_date) || 0) - (parseDate(b.start_date) || 0));
}

function renderSpotFilters() {
  fillSelectWithAll(els.spotAssetFilter, unique(state.spot.records.map(record => record.asset)), 'All assets');
  fillSelectWithAll(els.spotPhaseFilter, spotPhaseNames(), 'All phases');
  fillSelectWithAll(els.spotStatusFilter, unique(state.spot.records.map(record => record.status || 'Planned')), 'All statuses');
}

function renderSpotMetrics(records) {
  const active = records.filter(record => String(record.status || 'Planned').toLowerCase() !== 'complete').length;
  const assets = unique(records.map(record => record.asset)).length;
  const phases = unique(records.map(record => record.phase)).length;
  const dedicated = records.filter(record => String(record.phase).toLowerCase() === 'dedicated osv').length;
  const metrics = [
    { label: 'Active Activities', value: active },
    { label: 'Assets', value: assets },
    { label: 'Phases', value: phases },
    { label: 'Dedicated OSV', value: dedicated }
  ];
  els.spotStatusStrip.innerHTML = metrics.map(metric => `<div class="metric"><span>${metric.label}</span><strong>${metric.value}</strong></div>`).join('');
}

function spotBounds(records) {
  const dates = records.flatMap(record => [parseDate(record.start_date), parseDate(record.end_date)]).filter(Boolean);
  if (!dates.length) {
    return { start: new Date('2026-01-01T00:00:00'), end: new Date('2026-12-31T23:59:59') };
  }
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function renderSpotLegend() {
  const phases = spotPhaseNames();
  els.spotLegend.innerHTML = '<strong>Color codes</strong>' + phases.map(phase => `<span><i style="background:${escapeHtml(spotColorForPhase(phase))}"></i>${escapeHtml(phase)}</span>`).join('');
}

function renderSpotTimeline(records) {
  const bounds = spotBounds(records);
  const totalDays = Math.max(1, Math.ceil((bounds.end - bounds.start) / 86400000));
  const labelWidth = 240;
  const dayWidth = 16;
  els.spotTimeline.dataset.dayWidth = String(dayWidth);
  const timelineWidth = labelWidth + (totalDays * dayWidth);
  const weekDates = [];
  for (let index = 0; index < totalDays; index += 7) {
    const date = new Date(bounds.start);
    date.setDate(bounds.start.getDate() + index);
    weekDates.push(date);
  }
  const head = `<div class="time-head" style="min-width:${timelineWidth}px;grid-template-columns:${labelWidth}px 1fr;"><div class="time-label"></div><div class="date-grid" style="grid-template-columns: repeat(${weekDates.length}, ${dayWidth * 7}px);">${weekDates.map(date => `<div class="date-cell">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`).join('')}</div></div>`;

  const rows = records.map(record => {
    const start = parseDate(record.start_date);
    const end = parseDate(record.end_date) || start;
    if (!start || !end) return '';
    const inclusiveEnd = new Date(end);
    inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
    const left = Math.max(0, pct(start, bounds));
    const width = Math.max(1.2, pct(inclusiveEnd, bounds) - left);
    const color = record.color || spotColorForPhase(record.phase);
    return `<div class="route-row" style="min-width:${timelineWidth}px;grid-template-columns:${labelWidth}px 1fr;">
      <div class="route-label"><strong>${escapeHtml(record.asset)} / ${escapeHtml(record.phase || 'Phase')}</strong><span>${escapeHtml(record.activity)}${record.area ? ` / ${escapeHtml(record.area)}` : ''}</span></div>
      <div class="bar-lane" style="background-size:${dayWidth * 7}px 100%;">
        <button class="task-bar spot-bar" data-spot-edit="${record.id}" data-spot-shift="${record.id}" style="left:${left}%;width:${width}%;background:${escapeHtml(color)};" title="Drag to shift activity dates. Click to edit ${escapeHtml(record.activity)}.">
          <span class="task-title">${escapeHtml(record.asset)} / ${escapeHtml(record.activity)}</span>
        </button>
      </div>
    </div>`;
  }).join('');

  els.spotTimeline.innerHTML = head + rows;
}

function renderSpotTable(records) {
  els.spotTable.innerHTML = records.map(record => `<tr>
    <td class="route-name"><strong>${escapeHtml(record.activity)}</strong><span>${escapeHtml(record.notes || record.source || '')}</span></td>
    <td>${escapeHtml(record.asset)}</td>
    <td>${escapeHtml(record.area || '')}</td>
    <td><span class="status-pill" style="background:${escapeHtml(record.color || spotColorForPhase(record.phase))};color:white;">${escapeHtml(record.phase || 'Other')}</span></td>
    <td>${fmtDateOnly(record.start_date)}</td>
    <td>${fmtDateOnly(record.end_date)}</td>
    <td><span class="status-pill ${statusClass(record.status)}">${escapeHtml(record.status || 'Planned')}</span></td>
    <td><div class="table-actions"><button type="button" data-spot-edit="${record.id}">Edit</button><button type="button" class="danger-button" data-spot-delete="${record.id}">Delete</button></div></td>
  </tr>`).join('') || '<tr><td colspan="8">No spot-hire activities match the current filters.</td></tr>';
}

function renderSpotHire() {
  renderSpotFilters();
  renderSpotLegend();
  const records = filteredSpotRecords();
  renderSpotMetrics(records);
  els.spotSourceLabel.textContent = state.spot.source || 'No workbook source loaded';
  if (!state.spot.filters.dateFrom && !state.spot.filters.dateTo) {
    els.spotRangeLabel.textContent = 'Showing imported and app-entered demand. Drag empty schedule space to pan, or drag an activity bar to shift dates.';
  } else {
    const from = state.spot.filters.dateFrom ? fmtDateOnly(`${state.spot.filters.dateFrom}T00:00:00`) : 'earliest activity';
    const to = state.spot.filters.dateTo ? fmtDateOnly(`${state.spot.filters.dateTo}T00:00:00`) : 'latest activity';
    els.spotRangeLabel.textContent = `Showing spot-hire demand from ${from} to ${to}.`;
  }
  renderSpotTimeline(records);
  renderSpotTable(records);
}

async function addSpotRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const phase = data.get('phase');
  const payload = {
    asset: data.get('asset'),
    area: data.get('area') || '',
    activity: data.get('activity'),
    phase,
    color: spotColorForPhase(phase),
    status: data.get('status'),
    start_date: data.get('start_date'),
    end_date: data.get('end_date'),
    notes: data.get('notes') || ''
  };
  await api('/api/spot-hire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  form.reset();
  hydrateSpotPhaseControls();
  showToast('Spot hire activity added');
  await loadSpotData();
}

function openSpotEdit(recordId) {
  const record = state.spot.records.find(item => item.id === recordId);
  if (!record) return;
  const form = els.spotEditForm.elements;
  form.id.value = record.id;
  form.asset.value = record.asset || '';
  form.area.value = record.area || '';
  form.activity.value = record.activity || '';
  form.phase.value = record.phase || spotPhaseNames()[0] || 'Other';
  form.status.value = record.status || 'Planned';
  form.start_date.value = record.start_date || '';
  form.end_date.value = record.end_date || '';
  form.notes.value = record.notes || '';
  els.spotEditDialog.hidden = false;
}

function closeSpotEdit() {
  els.spotEditDialog.hidden = true;
}

async function saveSpotEdit(event) {
  event.preventDefault();
  const data = new FormData(els.spotEditForm);
  const phase = data.get('phase');
  const change = {
    id: data.get('id'),
    asset: data.get('asset'),
    area: data.get('area') || '',
    activity: data.get('activity'),
    phase,
    color: spotColorForPhase(phase),
    status: data.get('status'),
    start_date: data.get('start_date'),
    end_date: data.get('end_date'),
    notes: data.get('notes') || ''
  };
  await api('/api/spot-hire/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [change] })
  });
  closeSpotEdit();
  showToast('Spot hire activity updated');
  await loadSpotData();
}

function shiftDateOnly(value, dayDelta) {
  const date = parseDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

async function shiftSpotRecord(recordId, dayDelta) {
  const record = state.spot.records.find(item => item.id === recordId);
  if (!record || !dayDelta) return;
  await api('/api/spot-hire/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: [{ id: record.id, start_date: shiftDateOnly(record.start_date, dayDelta), end_date: shiftDateOnly(record.end_date, dayDelta) }] })
  });
  showToast(`Activity shifted ${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? '' : 's'} ${dayDelta > 0 ? 'later' : 'earlier'}`);
  await loadSpotData();
}

async function deleteSpotRecord(recordId) {
  const record = state.spot.records.find(item => item.id === recordId);
  if (!record) return;
  if (!confirm(`Delete ${record.asset} / ${record.activity} from the Spot Hire view?`)) return;
  await api(`/api/spot-hire/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  closeSpotEdit();
  showToast('Spot hire activity deleted from schedule view');
  await loadSpotData();
}

document.getElementById('demandForm').addEventListener('submit', event => addDemand(event).catch(err => showToast(err.message)));
document.getElementById('refreshButton').addEventListener('click', () => Promise.all([loadData(), loadSpotData()]).catch(err => showToast(err.message)));
document.getElementById('exportButton').addEventListener('click', () => { window.location.href = '/api/export'; });
document.getElementById('workbookInput').addEventListener('change', event => uploadWorkbook(event).catch(err => showToast(err.message)));
els.routeTab.addEventListener('click', () => switchView('route'));
els.spotHireTab.addEventListener('click', () => switchView('spotHire'));
document.getElementById('cancelEdit').addEventListener('click', closeEdit);
document.getElementById('deleteRoute').addEventListener('click', () => deleteRoute(els.editForm.elements.id.value).catch(err => showToast(err.message)));
els.editForm.addEventListener('submit', event => saveEdit(event).catch(err => showToast(err.message)));
els.spotForm.addEventListener('submit', event => addSpotRecord(event).catch(err => showToast(err.message)));
document.getElementById('cancelSpotEdit').addEventListener('click', closeSpotEdit);
document.getElementById('deleteSpotRecord').addEventListener('click', () => deleteSpotRecord(els.spotEditForm.elements.id.value).catch(err => showToast(err.message)));
els.spotEditForm.addEventListener('submit', event => saveSpotEdit(event).catch(err => showToast(err.message)));

els.statusStrip.addEventListener('click', event => {
  const metric = event.target.closest('[data-insight]');
  if (!metric) return;
  state.activeInsight = metric.dataset.insight;
  render();
});

els.insightPanel.addEventListener('click', event => {
  const assetButton = event.target.closest('[data-asset-drill]');
  if (assetButton) {
    const asset = assetButton.dataset.assetDrill;
    if (!asset) return;
    state.filters.asset = state.filters.asset === asset ? 'all' : asset;
    els.assetFilter.value = state.filters.asset;
    render();
    showToast(state.filters.asset === 'all' ? 'Showing all assets' : `Filtered to ${asset}`);
    return;
  }
  // NEW: Coordinator drill handler
  const coordinatorButton = event.target.closest('[data-coordinator-drill]');
  if (coordinatorButton) {
    const coordinator = coordinatorButton.dataset.coordinatorDrill;
    if (!coordinator) return;
    filterByCoordinator(coordinator);
    return;
  }
  const conflictButton = event.target.closest('[data-conflict-tasks]');
  if (conflictButton) {
    try {
      const taskIds = JSON.parse(conflictButton.dataset.conflictTasks);
      const conflictStart = conflictButton.dataset.conflictStart || null;
      scrollToConflictTasks(taskIds, conflictStart);
    } catch (_) {}
  }
});

els.conflicts.addEventListener('click', event => {
  const conflictButton = event.target.closest('[data-conflict-tasks]');
  if (!conflictButton) return;
  try {
    const taskIds = JSON.parse(conflictButton.dataset.conflictTasks);
    const conflictStart = conflictButton.dataset.conflictStart || null;
    scrollToConflictTasks(taskIds, conflictStart);
    // Switch the insight panel to demand conflict so the user can see the full list
    state.activeInsight = 'watch';
    render();
  } catch (_) {}
});

[els.coordinatorFilter, els.assetFilter, els.statusFilter].forEach(select => {
  select.addEventListener('change', () => {
    state.filters.coordinator = els.coordinatorFilter.value;
    state.filters.asset = els.assetFilter.value;
    state.filters.status = els.statusFilter.value;
    render();
  });
});

[els.dateFromFilter, els.dateToFilter].forEach(input => {
  input.addEventListener('change', () => {
    state.filters.dateFrom = els.dateFromFilter.value;
    state.filters.dateTo = els.dateToFilter.value;
    render();
  });
});

els.clearDateFilter.addEventListener('click', () => {
  els.dateFromFilter.value = '';
  els.dateToFilter.value = '';
  state.filters.dateFrom = '';
  state.filters.dateTo = '';
  render();
});

// === NEW FEATURE: Export Conflict Summary button ===
if (els.exportConflictSummaryBtn) {
  els.exportConflictSummaryBtn.addEventListener('click', exportConflictSummary);
}

// === NEW FEATURE: Next 2 Weeks button ===
if (els.next2WeeksBtn) {
  els.next2WeeksBtn.addEventListener('click', focusNext2Weeks);
}

// Asset Forecast button
if (els.runForecastBtn) {
  els.runForecastBtn.addEventListener('click', () => {
    runAssetForecast();
    if (els.clearForecastBtn) els.clearForecastBtn.style.display = 'inline-block';
  });
}

// Clear Forecast button
if (els.clearForecastBtn) {
  els.clearForecastBtn.addEventListener('click', () => {
    if (els.assetForecastResult) els.assetForecastResult.innerHTML = '';
    els.clearForecastBtn.style.display = 'none';
  });
}

[els.spotAssetFilter, els.spotPhaseFilter, els.spotStatusFilter].forEach(select => {
  select.addEventListener('change', () => {
    state.spot.filters.asset = els.spotAssetFilter.value;
    state.spot.filters.phase = els.spotPhaseFilter.value;
    state.spot.filters.status = els.spotStatusFilter.value;
    renderSpotHire();
  });
});

[els.spotDateFromFilter, els.spotDateToFilter].forEach(input => {
  input.addEventListener('change', () => {
    state.spot.filters.dateFrom = els.spotDateFromFilter.value;
    state.spot.filters.dateTo = els.spotDateToFilter.value;
    renderSpotHire();
  });
});

els.spotClearDateFilter.addEventListener('click', () => {
  els.spotDateFromFilter.value = '';
  els.spotDateToFilter.value = '';
  state.spot.filters.dateFrom = '';
  state.spot.filters.dateTo = '';
  renderSpotHire();
});

els.coordinatorInput.addEventListener('change', populateDemandAssets);
els.editDialog.addEventListener('click', event => {
  if (event.target === els.editDialog) closeEdit();
});
els.spotEditDialog.addEventListener('click', event => {
  if (event.target === els.spotEditDialog) closeSpotEdit();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeEdit();
  if (event.key === 'Escape') closeSpotEdit();
});

document.body.addEventListener('click', event => {
  if (event.target.closest('[data-delete]')) return;
  const editButton = event.target.closest('[data-edit]');
  if (editButton) openEdit(editButton.dataset.edit);
});

document.body.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) deleteRoute(deleteButton.dataset.delete).catch(err => showToast(err.message));
});

document.body.addEventListener('click', event => {
  if (event.target.closest('[data-spot-delete]')) return;
  const editButton = event.target.closest('[data-spot-edit]');
  if (editButton) openSpotEdit(editButton.dataset.spotEdit);
});

document.body.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-spot-delete]');
  if (deleteButton) deleteSpotRecord(deleteButton.dataset.spotDelete).catch(err => showToast(err.message));
});

function enableTimelineDrag() {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;

  els.timeline.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    if (event.target.closest('.task-bar')) return;
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

  function stopDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    els.timeline.classList.remove('dragging');
    if (moved) {
      event.preventDefault();
    }
  }

  document.addEventListener('mouseup', stopDrag);
  els.timeline.addEventListener('click', event => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }
  }, true);
}

function enableRouteShiftDrag() {
  let drag = null;
  let suppressEditClick = false;

  els.timeline.addEventListener('mousedown', event => {
    const bar = event.target.closest('.task-bar');
    if (!bar || event.button !== 0) return;
    drag = {
      id: bar.dataset.shift,
      startX: event.clientX,
      dayWidth: Number(els.timeline.dataset.dayWidth || 112),
      bar,
      dayDelta: 0,
      moved: false
    };
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
    // NEW: Show shift preview tooltip
    if (drag.moved && drag.id) {
      showShiftPreview(drag.id, drag.dayDelta, event.clientX, event.clientY);
    }
  });

  document.addEventListener('mouseup', event => {
    if (!drag) return;
    const finished = drag;
    drag = null;
    finished.bar.classList.remove('shifting');
    finished.bar.style.transform = '';
    hideShiftPreview();  // NEW: Hide shift preview tooltip
    if (finished.moved) {
      suppressEditClick = true;
      window.setTimeout(() => { suppressEditClick = false; }, 0);
      event.preventDefault();
      event.stopPropagation();
      shiftRoute(finished.id, finished.dayDelta).catch(err => showToast(err.message));
    }
  });

  els.timeline.addEventListener('click', event => {
    if (!suppressEditClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function enableSpotTimelineDrag() {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;

  els.spotTimeline.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    if (event.target.closest('.task-bar')) return;
    isDragging = true;
    moved = false;
    startX = event.clientX;
    scrollLeft = els.spotTimeline.scrollLeft;
    els.spotTimeline.classList.add('dragging');
    event.preventDefault();
  });

  document.addEventListener('mousemove', event => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 3) moved = true;
    els.spotTimeline.scrollLeft = scrollLeft - delta;
  });

  function stopDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    els.spotTimeline.classList.remove('dragging');
    if (moved) event.preventDefault();
  }

  document.addEventListener('mouseup', stopDrag);
  els.spotTimeline.addEventListener('click', event => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }
  }, true);
}

function enableSpotShiftDrag() {
  let drag = null;
  let suppressEditClick = false;

  els.spotTimeline.addEventListener('mousedown', event => {
    const bar = event.target.closest('.spot-bar');
    if (!bar || event.button !== 0) return;
    drag = {
      id: bar.dataset.spotShift,
      startX: event.clientX,
      dayWidth: Number(els.spotTimeline.dataset.dayWidth || 16),
      bar,
      dayDelta: 0,
      moved: false
    };
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
      shiftSpotRecord(finished.id, finished.dayDelta).catch(err => showToast(err.message));
    }
  });

  els.spotTimeline.addEventListener('click', event => {
    if (!suppressEditClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

hydrateCoordinatorControls();
enableTimelineDrag();
enableRouteShiftDrag();
enableSpotTimelineDrag();
enableSpotShiftDrag();

// ============== Snapshot Comparison Feature ==============

async function loadSnapshots() {
  try {
    const response = await fetch('/api/snapshots');
    if (!response.ok) return [];
    const data = await response.json();
    return data.snapshots || [];
  } catch {
    return [];
  }
}

async function createSnapshot() {
  if (staticMode) {
    showToast('Cannot create snapshots in read-only mode');
    return;
  }
  try {
    const response = await fetch('/api/snapshots', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to create snapshot');
    const data = await response.json();
    showToast(`Snapshot created: ${data.date} ${data.time}`);
    updateSnapshotStatus();
    return data;
  } catch (err) {
    showToast(err.message);
  }
}

async function updateSnapshotStatus() {
  if (!els.snapshotStatus) return;
  const snapshots = await loadSnapshots();
  if (snapshots.length === 0) {
    els.snapshotStatus.textContent = 'No snapshots yet. Create one to track changes.';
  } else {
    const latest = snapshots[0];
    els.snapshotStatus.textContent = `Latest: ${latest.date} ${latest.time} (${latest.task_count} tasks)`;
  }
}

async function openCompareDialog() {
  const snapshots = await loadSnapshots();
  
  if (snapshots.length === 0) {
    showToast('No snapshots available. Create a snapshot first.');
    return;
  }
  
  // Populate baseline dropdown
  els.baselineSnapshotSelect.innerHTML = snapshots.map(s => 
    `<option value="${escapeHtml(s.id)}">${escapeHtml(s.date)} ${escapeHtml(s.time)} (${s.task_count} tasks)</option>`
  ).join('');
  
  // Populate current dropdown
  els.currentSnapshotSelect.innerHTML = '<option value="current">Current Live Data</option>' +
    snapshots.map(s => 
      `<option value="${escapeHtml(s.id)}">${escapeHtml(s.date)} ${escapeHtml(s.time)} (${s.task_count} tasks)</option>`
    ).join('');
  
  // Populate asset filter from current tasks
  const assets = unique(state.tasks.map(t => t.asset).filter(Boolean)).sort();
  els.compareAssetFilter.innerHTML = '<option value="all">All Assets</option>' +
    assets.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  
  els.snapshotCompareResult.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <p style="color:var(--muted);margin-bottom:16px;">Select snapshots and click Compare to see changes.</p>
      <details style="text-align:left;max-width:600px;margin:0 auto;">
        <summary style="cursor:pointer;font-weight:600;color:var(--primary,#007bff);">📋 What is being tracked?</summary>
        <div style="background:#e8f4fd;color:#1a365d;padding:12px;border-radius:6px;margin-top:8px;font-size:13px;border:1px solid #bee3f8;">
          <p style="margin:0 0 8px 0;"><strong>Tasks matched by:</strong> Asset + Activity (similar routes paired by closest dates)</p>
          <p style="margin:0 0 8px 0;"><strong>Fields monitored for changes:</strong></p>
          <ul style="margin:0;padding-left:20px;">
            <li><strong>Start Date</strong> - Route scheduling date</li>
            <li><strong>Status</strong> - Planned → In Progress → Complete</li>
            <li><strong>Offshore Start</strong> - When vessel arrives offshore</li>
            <li><strong>Offshore End</strong> - When offload completes</li>
            <li><strong>Return End</strong> - Back to port time</li>
            <li><strong>Duration Hours</strong> - On-location time</li>
            <li><strong>Transit Hours</strong> - Return transit time</li>
            <li><strong>Vessel</strong> - Assigned vessel</li>
            <li><strong>Coordinator</strong> - Logistics coordinator</li>
          </ul>
        </div>
      </details>
    </div>`;
  els.snapshotCompareDialog.hidden = false;
}

function closeCompareDialog() {
  els.snapshotCompareDialog.hidden = true;
}

// Store last comparison data for summary generation
let lastComparisonData = null;

function generateLogisticsSummaryText(data) {
  if (!data) return '';
  
  const { summary, new_tasks, removed_tasks, changed_tasks, baseline, current } = data;
  const today = new Date();
  const lines = [];
  
  // Calculate key metrics
  const netRouteChange = summary.new_count - summary.removed_count;
  const totalActiveRoutes = summary.new_count + summary.changed_count + summary.unchanged_count;
  
  // Find significant date shifts (±3 days or more)
  const significantDateChanges = changed_tasks.filter(task => {
    const changes = task.changes || {};
    for (const field of ['start_date', 'offshore_start', 'offshore_end', 'return_end']) {
      if (changes[field]) {
        const oldDate = changes[field].old ? new Date(changes[field].old) : null;
        const newDate = changes[field].new ? new Date(changes[field].new) : null;
        if (oldDate && newDate) {
          const diffDays = Math.abs((newDate - oldDate) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) return true;
        }
      }
    }
    return false;
  });
  
  // Count routes pushed earlier vs later
  let pushedEarlier = 0, pushedLater = 0;
  for (const task of significantDateChanges) {
    const changes = task.changes || {};
    // Check start_date first, fall back to offshore_start
    const dateField = changes.start_date ? 'start_date' : 'offshore_start';
    if (changes[dateField]) {
      const oldDate = changes[dateField].old ? new Date(changes[dateField].old) : null;
      const newDate = changes[dateField].new ? new Date(changes[dateField].new) : null;
      if (oldDate && newDate) {
        if (newDate < oldDate) pushedEarlier++;
        else pushedLater++;
      }
    }
  }
  
  // Identify assets with most changes
  const assetChangeCounts = {};
  for (const task of [...new_tasks, ...removed_tasks, ...changed_tasks]) {
    const asset = task.asset || 'Unassigned';
    assetChangeCounts[asset] = (assetChangeCounts[asset] || 0) + 1;
  }
  const topChangedAssets = Object.entries(assetChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  // Find routes in the next 7 days that were added or shifted
  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);
  
  const urgentNewRoutes = new_tasks.filter(t => {
    const start = t.start_date ? new Date(t.start_date) : null;
    return start && start >= today && start <= next7Days;
  });
  
  const urgentShiftedRoutes = significantDateChanges.filter(t => {
    const start = t.start_date ? new Date(t.start_date) : null;
    return start && start >= today && start <= next7Days;
  });
  
  // Header
  lines.push(`OSV LOGISTICS UPDATE - Week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  lines.push('');
  
  // Executive Summary
  lines.push('OVERVIEW');
  lines.push('─'.repeat(50));
  
  // Net impact statement
  if (netRouteChange > 0) {
    lines.push(`Net increase of ${netRouteChange} route${netRouteChange !== 1 ? 's' : ''} compared to last week's plan. ${summary.new_count} new routes added, ${summary.removed_count} cancelled.`);
  } else if (netRouteChange < 0) {
    lines.push(`Net decrease of ${Math.abs(netRouteChange)} route${Math.abs(netRouteChange) !== 1 ? 's' : ''} compared to last week's plan. ${summary.removed_count} routes cancelled, ${summary.new_count} new routes added.`);
  } else {
    lines.push(`No net change in route count. ${summary.new_count} new routes offset by ${summary.removed_count} cancellations.`);
  }
  lines.push('');
  
  // Logistics impact highlights
  lines.push('KEY LOGISTICS IMPACTS');
  lines.push('─'.repeat(50));
  
  // Urgent items (next 7 days)
  if (urgentNewRoutes.length > 0 || urgentShiftedRoutes.length > 0) {
    const urgentCount = urgentNewRoutes.length + urgentShiftedRoutes.length;
    lines.push(`⚠️  IMMEDIATE ATTENTION: ${urgentCount} route${urgentCount !== 1 ? 's' : ''} in the next 7 days require coordination:`);
    if (urgentNewRoutes.length > 0) {
      lines.push(`    • ${urgentNewRoutes.length} newly added route${urgentNewRoutes.length !== 1 ? 's' : ''}`);
    }
    if (urgentShiftedRoutes.length > 0) {
      lines.push(`    • ${urgentShiftedRoutes.length} route${urgentShiftedRoutes.length !== 1 ? 's' : ''} with significant date changes`);
    }
    lines.push('');
  }
  
  // Significant date changes summary
  if (significantDateChanges.length > 0) {
    lines.push(`📅  DATE SHIFTS: ${significantDateChanges.length} route${significantDateChanges.length !== 1 ? 's' : ''} shifted by 3+ days`);
    if (pushedEarlier > 0 || pushedLater > 0) {
      const parts = [];
      if (pushedEarlier > 0) parts.push(`${pushedEarlier} moved earlier`);
      if (pushedLater > 0) parts.push(`${pushedLater} pushed later`);
      lines.push(`    • ${parts.join(', ')}`);
    }
    lines.push('');
  }
  
  // Assets most affected
  if (topChangedAssets.length > 0) {
    lines.push(`🚢  ASSETS MOST AFFECTED:`);
    for (const [asset, count] of topChangedAssets) {
      lines.push(`    • ${asset}: ${count} route change${count !== 1 ? 's' : ''}`);
    }
    lines.push('');
  }
  
  // Vessel demand note
  if (summary.new_count > summary.removed_count) {
    lines.push(`📈  CAPACITY NOTE: Increased demand - verify vessel availability for ${summary.new_count} additional routes.`);
    lines.push('');
  } else if (summary.removed_count > summary.new_count + 5) {
    lines.push(`📉  CAPACITY NOTE: Reduced demand - ${summary.removed_count} cancellations may free up vessel capacity.`);
    lines.push('');
  }
  
  // Detailed breakdown for reference
  lines.push('CHANGE BREAKDOWN');
  lines.push('─'.repeat(50));
  lines.push(`• New Routes: ${summary.new_count}`);
  lines.push(`• Cancelled: ${summary.removed_count}`);
  lines.push(`• Modified: ${summary.changed_count}`);
  lines.push(`• Unchanged: ${summary.unchanged_count}`);
  lines.push(`• Total Active: ${totalActiveRoutes}`);
  lines.push('');
  
  // Category breakdown if available
  const categoryCounts = summary.category_counts || {};
  const activeCategories = Object.entries(categoryCounts).filter(([_, count]) => count > 0);
  if (activeCategories.length > 0) {
    lines.push('MODIFICATION TYPES');
    lines.push('─'.repeat(50));
    const categoryLabels = {
      date_shift: 'Date Changes',
      duration_change: 'Duration Changes',
      status_update: 'Status Updates',
      vessel_change: 'Vessel Reassignments',
      coordinator_change: 'Coordinator Changes'
    };
    for (const [catId, count] of activeCategories) {
      lines.push(`• ${categoryLabels[catId] || catId}: ${count}`);
    }
    lines.push('');
  }
  
  // Footer
  lines.push('─'.repeat(50));
  lines.push(`Baseline: ${baseline.date || baseline.id}`);
  lines.push(`Current: ${current.id === 'current' ? 'Live Data' : (current.date || current.id)}`);
  lines.push(`Generated: ${today.toLocaleString()}`);
  
  return lines.join('\n');
}

function generateLogisticsSummaryHTML(data) {
  if (!data) return '';
  
  const { summary, new_tasks, removed_tasks, changed_tasks, baseline, current } = data;
  const today = new Date();
  
  // Calculate key metrics
  const netRouteChange = summary.new_count - summary.removed_count;
  const totalActiveRoutes = summary.new_count + summary.changed_count + summary.unchanged_count;
  
  // Find significant date shifts (±3 days or more)
  const significantDateChanges = changed_tasks.filter(task => {
    const changes = task.changes || {};
    for (const field of ['start_date', 'offshore_start', 'offshore_end', 'return_end']) {
      if (changes[field]) {
        const oldDate = changes[field].old ? new Date(changes[field].old) : null;
        const newDate = changes[field].new ? new Date(changes[field].new) : null;
        if (oldDate && newDate) {
          const diffDays = Math.abs((newDate - oldDate) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) return true;
        }
      }
    }
    return false;
  });
  
  // Count routes pushed earlier vs later
  let pushedEarlier = 0, pushedLater = 0;
  for (const task of significantDateChanges) {
    const changes = task.changes || {};
    const dateField = changes.start_date ? 'start_date' : 'offshore_start';
    if (changes[dateField]) {
      const oldDate = changes[dateField].old ? new Date(changes[dateField].old) : null;
      const newDate = changes[dateField].new ? new Date(changes[dateField].new) : null;
      if (oldDate && newDate) {
        if (newDate < oldDate) pushedEarlier++;
        else pushedLater++;
      }
    }
  }
  
  // Find routes in the next 7 days
  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);
  
  const urgentNewRoutes = new_tasks.filter(t => {
    const start = t.start_date ? new Date(t.start_date) : null;
    return start && start >= today && start <= next7Days;
  });
  
  const urgentShiftedRoutes = significantDateChanges.filter(t => {
    const start = t.start_date ? new Date(t.start_date) : null;
    return start && start >= today && start <= next7Days;
  });
  
  // Identify assets with most changes
  const assetChangeCounts = {};
  for (const task of [...new_tasks, ...removed_tasks, ...changed_tasks]) {
    const asset = task.asset || 'Unassigned';
    assetChangeCounts[asset] = (assetChangeCounts[asset] || 0) + 1;
  }
  const topChangedAssets = Object.entries(assetChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  // Helper to render route table
  const renderRouteTable = (routes, showChanges = false) => {
    if (!routes.length) return '<p style="color:var(--muted);font-style:italic;margin:8px 0;">No routes</p>';
    return `<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px;">
      <thead><tr style="background:var(--muted-bg,#2d3748);">
        <th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--border,#4a5568);">Asset</th>
        <th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--border,#4a5568);">Activity</th>
        <th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--border,#4a5568);">Start Date</th>
        ${showChanges ? '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--border,#4a5568);">Change</th>' : ''}
      </tr></thead>
      <tbody>${routes.map(t => {
        let changeInfo = '';
        if (showChanges && t.changes) {
          const dateField = t.changes.start_date ? 'start_date' : (t.changes.offshore_start ? 'offshore_start' : null);
          if (dateField && t.changes[dateField]) {
            const oldDate = new Date(t.changes[dateField].old);
            const newDate = new Date(t.changes[dateField].new);
            const diffDays = Math.round((newDate - oldDate) / (1000 * 60 * 60 * 24));
            const direction = diffDays > 0 ? 'later' : 'earlier';
            changeInfo = `<span style="color:${diffDays > 0 ? '#f6ad55' : '#68d391'};">${Math.abs(diffDays)}d ${direction}</span>`;
          }
        }
        return `<tr style="border-bottom:1px solid var(--border,#4a5568);">
          <td style="padding:6px 8px;">${escapeHtml(t.asset || '')}</td>
          <td style="padding:6px 8px;">${escapeHtml((t.activity || t.project || '').substring(0, 50))}${(t.activity || '').length > 50 ? '...' : ''}</td>
          <td style="padding:6px 8px;">${t.start_date ? new Date(t.start_date).toLocaleDateString() : 'TBD'}</td>
          ${showChanges ? `<td style="padding:6px 8px;">${changeInfo}</td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  };
  
  let html = `<div style="background:#1a202c;color:#e2e8f0;padding:16px;border-radius:6px;font-size:13px;">`;
  
  // Header
  html += `<div style="font-size:15px;font-weight:600;margin-bottom:12px;color:#90cdf4;">
    OSV LOGISTICS UPDATE - Week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </div>`;
  
  // Overview
  html += `<div style="margin-bottom:16px;">
    <div style="font-weight:600;color:#a0aec0;margin-bottom:4px;">OVERVIEW</div>
    <div style="border-top:1px solid #4a5568;padding-top:8px;">`;
  
  if (netRouteChange > 0) {
    html += `Net increase of ${netRouteChange} route${netRouteChange !== 1 ? 's' : ''} compared to last week's plan. ${summary.new_count} new routes added, ${summary.removed_count} cancelled.`;
  } else if (netRouteChange < 0) {
    html += `Net decrease of ${Math.abs(netRouteChange)} route${Math.abs(netRouteChange) !== 1 ? 's' : ''} compared to last week's plan. ${summary.removed_count} routes cancelled, ${summary.new_count} new routes added.`;
  } else {
    html += `No net change in route count. ${summary.new_count} new routes offset by ${summary.removed_count} cancellations.`;
  }
  html += `</div></div>`;
  
  // Key Logistics Impacts
  html += `<div style="margin-bottom:16px;">
    <div style="font-weight:600;color:#a0aec0;margin-bottom:4px;">KEY LOGISTICS IMPACTS</div>
    <div style="border-top:1px solid #4a5568;padding-top:8px;">`;
  
  // Immediate Attention (clickable)
  if (urgentNewRoutes.length > 0 || urgentShiftedRoutes.length > 0) {
    const urgentCount = urgentNewRoutes.length + urgentShiftedRoutes.length;
    html += `<details style="margin-bottom:12px;">
      <summary style="cursor:pointer;color:#f6e05e;font-weight:500;">
        ⚠️ IMMEDIATE ATTENTION: ${urgentCount} route${urgentCount !== 1 ? 's' : ''} in the next 7 days require coordination
      </summary>
      <div style="margin-left:20px;margin-top:8px;">`;
    
    if (urgentNewRoutes.length > 0) {
      html += `<details open style="margin-bottom:8px;">
        <summary style="cursor:pointer;color:#68d391;">• ${urgentNewRoutes.length} newly added route${urgentNewRoutes.length !== 1 ? 's' : ''}</summary>
        ${renderRouteTable(urgentNewRoutes)}
      </details>`;
    }
    
    if (urgentShiftedRoutes.length > 0) {
      html += `<details open style="margin-bottom:8px;">
        <summary style="cursor:pointer;color:#f6ad55;">• ${urgentShiftedRoutes.length} route${urgentShiftedRoutes.length !== 1 ? 's' : ''} with significant date changes</summary>
        ${renderRouteTable(urgentShiftedRoutes, true)}
      </details>`;
    }
    
    html += `</div></details>`;
  }
  
  // Date Shifts (clickable) - exclude routes already shown in IMMEDIATE ATTENTION
  const urgentShiftedIds = new Set(urgentShiftedRoutes.map(t => t.id));
  const nonUrgentDateChanges = significantDateChanges.filter(t => !urgentShiftedIds.has(t.id));
  
  if (nonUrgentDateChanges.length > 0) {
    html += `<details style="margin-bottom:12px;">
      <summary style="cursor:pointer;color:#90cdf4;">
        📅 DATE SHIFTS: ${nonUrgentDateChanges.length} additional route${nonUrgentDateChanges.length !== 1 ? 's' : ''} shifted by 3+ days`;
    // Recalculate earlier/later counts for non-urgent only
    let nonUrgentEarlier = 0, nonUrgentLater = 0;
    for (const task of nonUrgentDateChanges) {
      const changes = task.changes || {};
      const dateField = changes.start_date ? 'start_date' : 'offshore_start';
      if (changes[dateField]) {
        const oldDate = changes[dateField].old ? new Date(changes[dateField].old) : null;
        const newDate = changes[dateField].new ? new Date(changes[dateField].new) : null;
        if (oldDate && newDate) {
          if (newDate < oldDate) nonUrgentEarlier++;
          else nonUrgentLater++;
        }
      }
    }
    if (nonUrgentEarlier > 0 || nonUrgentLater > 0) {
      const parts = [];
      if (nonUrgentEarlier > 0) parts.push(`${nonUrgentEarlier} moved earlier`);
      if (nonUrgentLater > 0) parts.push(`${nonUrgentLater} pushed later`);
      html += ` <span style="color:#a0aec0;">(${parts.join(', ')})</span>`;
    }
    html += `</summary>
      <div style="margin-left:20px;margin-top:8px;">
        ${renderRouteTable(nonUrgentDateChanges, true)}
      </div>
    </details>`;
  }
  
  // Assets most affected
  if (topChangedAssets.length > 0) {
    html += `<div style="margin-bottom:12px;color:#ed8936;">
      🚢 ASSETS MOST AFFECTED:
      <ul style="margin:4px 0 0 20px;padding:0;">
        ${topChangedAssets.map(([asset, count]) => `<li>${asset}: ${count} route change${count !== 1 ? 's' : ''}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  // Capacity note
  if (summary.new_count > summary.removed_count) {
    html += `<div style="color:#68d391;margin-bottom:12px;">
      📈 CAPACITY NOTE: Increased demand - verify vessel availability for ${summary.new_count} additional routes.
    </div>`;
  } else if (summary.removed_count > summary.new_count + 5) {
    html += `<div style="color:#fc8181;margin-bottom:12px;">
      📉 CAPACITY NOTE: Reduced demand - ${summary.removed_count} cancellations may free up vessel capacity.
    </div>`;
  }
  
  html += `</div></div>`;
  
  // Change Breakdown
  html += `<div style="margin-bottom:16px;">
    <div style="font-weight:600;color:#a0aec0;margin-bottom:4px;">CHANGE BREAKDOWN</div>
    <div style="border-top:1px solid #4a5568;padding-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">
      <span>• New Routes: ${summary.new_count}</span>
      <span>• Cancelled: ${summary.removed_count}</span>
      <span>• Modified: ${summary.changed_count}</span>
      <span>• Unchanged: ${summary.unchanged_count}</span>
      <span style="grid-column:span 2;">• Total Active: ${totalActiveRoutes}</span>
    </div>
  </div>`;
  
  // Modification Types
  const categoryCounts = summary.category_counts || {};
  const activeCategories = Object.entries(categoryCounts).filter(([_, count]) => count > 0);
  if (activeCategories.length > 0) {
    const categoryLabels = {
      date_shift: 'Date Changes',
      duration_change: 'Duration Changes',
      status_update: 'Status Updates',
      vessel_change: 'Vessel Reassignments',
      coordinator_change: 'Coordinator Changes'
    };
    html += `<div style="margin-bottom:16px;">
      <div style="font-weight:600;color:#a0aec0;margin-bottom:4px;">MODIFICATION TYPES</div>
      <div style="border-top:1px solid #4a5568;padding-top:8px;">
        ${activeCategories.map(([catId, count]) => `<span style="display:inline-block;margin-right:16px;">• ${categoryLabels[catId] || catId}: ${count}</span>`).join('')}
      </div>
    </div>`;
  }
  
  // Footer
  html += `<div style="border-top:1px solid #4a5568;padding-top:8px;font-size:11px;color:#718096;">
    Baseline: ${baseline.date || baseline.id} | 
    Current: ${current.id === 'current' ? 'Live Data' : (current.date || current.id)} | 
    Generated: ${today.toLocaleString()}
  </div>`;
  
  html += `</div>`;
  
  return html;
}

function generateLogisticsSummary() {
  if (!lastComparisonData) {
    showToast('Run a comparison first');
    return '';
  }
  return generateLogisticsSummaryText(lastComparisonData);
}

function copyLogisticsSummary() {
  const summary = generateLogisticsSummary();
  if (!summary) return;
  
  navigator.clipboard.writeText(summary).then(() => {
    showToast('Logistics summary copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy summary');
  });
}

async function runComparison() {
  const baseline = els.baselineSnapshotSelect.value;
  const current = els.currentSnapshotSelect.value;
  const assetFilter = els.compareAssetFilter.value;
  
  if (!baseline) {
    showToast('Select a baseline snapshot');
    return;
  }
  
  // Hide volatility results when running comparison
  if (els.volatilityResult) els.volatilityResult.style.display = 'none';
  
  els.snapshotCompareResult.innerHTML = '<p style="text-align:center;">Loading comparison...</p>';
  
  try {
    let url = `/api/snapshots/compare?baseline=${encodeURIComponent(baseline)}&current=${encodeURIComponent(current)}`;
    if (assetFilter && assetFilter !== 'all') {
      url += `&asset=${encodeURIComponent(assetFilter)}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Comparison failed');
    const data = await response.json();
    lastComparisonData = data; // Store for summary generation
    renderComparisonResult(data, assetFilter);
  } catch (err) {
    els.snapshotCompareResult.innerHTML = `<p style="color:var(--danger);">Error: ${escapeHtml(err.message)}</p>`;
  }
}

async function runVolatilityAnalysis() {
  const assetFilter = els.compareAssetFilter.value;
  
  if (!els.volatilityResult) return;
  
  els.volatilityResult.style.display = 'block';
  els.volatilityResult.innerHTML = '<p style="text-align:center;">Analyzing schedule volatility...</p>';
  els.snapshotCompareResult.innerHTML = ''; // Clear comparison results
  
  try {
    let url = '/api/snapshots/volatility?days=30';
    if (assetFilter && assetFilter !== 'all') {
      url += `&asset=${encodeURIComponent(assetFilter)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Volatility analysis failed');
    }
    const data = await response.json();
    renderVolatilityResult(data);
  } catch (err) {
    els.volatilityResult.innerHTML = `<p style="color:var(--danger);">Error: ${escapeHtml(err.message)}</p>`;
  }
}

function renderVolatilityResult(data) {
  const { analysis_period, summary, by_asset, weekly_trend } = data;
  
  // Volatility label color
  const volColor = summary.volatility_label === 'High' ? '#e53e3e' : 
                   summary.volatility_label === 'Medium' ? '#dd6b20' : '#38a169';
  
  let html = `
    <div style="background:#1a202c;color:#e2e8f0;padding:20px;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;color:#90cdf4;">📈 Schedule Volatility Analysis</h3>
        <span style="font-size:12px;color:#a0aec0;">
          Last ${analysis_period.days} days | ${analysis_period.snapshots_analyzed} snapshots | ${analysis_period.asset_filter}
        </span>
      </div>
      
      <!-- Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
        <div style="background:#2d3748;padding:12px;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${volColor};">${summary.volatility_rate}%</div>
          <div style="font-size:11px;color:#a0aec0;">Volatility Rate</div>
          <div style="font-size:10px;color:${volColor};font-weight:600;">${summary.volatility_label}</div>
        </div>
        <div style="background:#2d3748;padding:12px;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#f6ad55;">${summary.avg_shift_days}</div>
          <div style="font-size:11px;color:#a0aec0;">Avg Days Shifted</div>
        </div>
        <div style="background:#2d3748;padding:12px;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#fc8181;">${summary.cancellation_rate}%</div>
          <div style="font-size:11px;color:#a0aec0;">Cancellation Rate</div>
        </div>
        <div style="background:#2d3748;padding:12px;border-radius:6px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#68d391;">${summary.new_route_rate}%</div>
          <div style="font-size:11px;color:#a0aec0;">New Route Rate</div>
        </div>
      </div>
      
      <!-- Totals Row -->
      <div style="display:flex;gap:16px;justify-content:center;margin-bottom:20px;font-size:12px;">
        <span style="color:#68d391;">+${summary.total_new} new</span>
        <span style="color:#fc8181;">-${summary.total_removed} cancelled</span>
        <span style="color:#f6ad55;">${summary.total_changed} modified</span>
        <span style="color:#a0aec0;">${summary.total_unchanged} unchanged</span>
        <span style="color:#90cdf4;">${summary.total_date_shifts} date shifts</span>
      </div>`;
  
  // Asset Volatility Rankings
  if (by_asset && by_asset.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <h4 style="margin:0 0 8px 0;color:#a0aec0;font-size:13px;">🏭 Most Volatile Assets</h4>
        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          <thead>
            <tr style="background:#2d3748;">
              <th style="padding:8px;text-align:left;border-bottom:1px solid #4a5568;">Asset</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #4a5568;">Volatility</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #4a5568;">New</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #4a5568;">Cancelled</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #4a5568;">Changed</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #4a5568;">Avg Shift</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const asset of by_asset.slice(0, 8)) {
      const assetVolColor = asset.volatility_rate > 30 ? '#fc8181' : 
                            asset.volatility_rate > 15 ? '#f6ad55' : '#68d391';
      html += `
            <tr style="border-bottom:1px solid #4a5568;">
              <td style="padding:8px;">${escapeHtml(asset.asset)}</td>
              <td style="padding:8px;text-align:center;color:${assetVolColor};font-weight:600;">${asset.volatility_rate}%</td>
              <td style="padding:8px;text-align:center;color:#68d391;">${asset.new}</td>
              <td style="padding:8px;text-align:center;color:#fc8181;">${asset.removed}</td>
              <td style="padding:8px;text-align:center;color:#f6ad55;">${asset.changed}</td>
              <td style="padding:8px;text-align:center;">${asset.avg_shift_days > 0 ? asset.avg_shift_days + 'd' : '-'}</td>
            </tr>`;
    }
    
    html += `
          </tbody>
        </table>
      </div>`;
  }
  
  // Weekly Trend
  if (weekly_trend && weekly_trend.length > 0) {
    html += `
      <div>
        <h4 style="margin:0 0 8px 0;color:#a0aec0;font-size:13px;">📅 Weekly Trend</h4>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;">`;
    
    for (const week of weekly_trend) {
      const weekVolColor = week.volatility_rate > 30 ? '#fc8181' : 
                           week.volatility_rate > 15 ? '#f6ad55' : '#68d391';
      html += `
          <div style="background:#2d3748;padding:10px;border-radius:6px;min-width:100px;text-align:center;flex-shrink:0;">
            <div style="font-size:10px;color:#718096;margin-bottom:4px;">${week.week}</div>
            <div style="font-size:18px;font-weight:700;color:${weekVolColor};">${week.volatility_rate}%</div>
            <div style="font-size:9px;color:#a0aec0;margin-top:4px;">
              +${week.new} / -${week.removed} / ~${week.changed}
            </div>
          </div>`;
    }
    
    html += `
        </div>
      </div>`;
  }
  
  // Interpretation
  html += `
      <div style="margin-top:16px;padding:12px;background:#2d3748;border-radius:6px;border-left:3px solid ${volColor};">
        <div style="font-size:12px;color:#e2e8f0;">
          <strong>Interpretation:</strong> `;
  
  if (summary.volatility_rate > 30) {
    html += `High schedule volatility indicates significant changes between planning cycles. Consider more frequent stakeholder coordination and shorter planning horizons.`;
  } else if (summary.volatility_rate > 15) {
    html += `Moderate schedule volatility is typical for dynamic operations. Continue monitoring for trends by asset or activity type.`;
  } else {
    html += `Low schedule volatility suggests stable planning. The schedule is reliable for downstream coordination.`;
  }
  
  html += `
        </div>
      </div>
    </div>`;
  
  els.volatilityResult.innerHTML = html;
}

function renderComparisonResult(data, assetFilter = 'all') {
  const { summary, new_tasks, removed_tasks, changed_tasks, unchanged_tasks = [], baseline, current } = data;
  
  const filterLabel = assetFilter && assetFilter !== 'all' 
    ? `<span style="background:var(--primary,#007bff);color:white;padding:2px 8px;border-radius:4px;margin-left:8px;">Filtered: ${escapeHtml(assetFilter)}</span>` 
    : '';
  
  // Build category summary badges
  const categoryLabels = {
    date_shift: { label: 'Date Shifts', icon: '📅', color: '#3182ce' },
    duration_change: { label: 'Duration', icon: '⏱️', color: '#805ad5' },
    status_update: { label: 'Status', icon: '🔄', color: '#38a169' },
    vessel_change: { label: 'Vessel', icon: '🚢', color: '#dd6b20' },
    coordinator_change: { label: 'Coordinator', icon: '👤', color: '#718096' }
  };
  
  const categoryCounts = summary.category_counts || {};
  const categoryBadgesHtml = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([catId, count]) => {
      const cat = categoryLabels[catId] || { label: catId, icon: '•', color: '#718096' };
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:${cat.color}22;color:${cat.color};border-radius:12px;font-size:12px;font-weight:500;border:1px solid ${cat.color}44;">
        ${cat.icon} ${count} ${cat.label}
      </span>`;
    }).join(' ');
  
  let html = `
    <div class="comparison-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:12px;">
      <div class="stat-card" style="background:var(--success-bg,#d4edda);padding:12px;border-radius:6px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:var(--success,#28a745);">${summary.new_count}</div>
        <div style="font-size:12px;color:var(--muted);">New Routes</div>
      </div>
      <div class="stat-card" style="background:var(--danger-bg,#f8d7da);padding:12px;border-radius:6px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:var(--danger,#dc3545);">${summary.removed_count}</div>
        <div style="font-size:12px;color:var(--muted);">Cancelled</div>
      </div>
      <div class="stat-card" style="background:var(--warning-bg,#fff3cd);padding:12px;border-radius:6px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:var(--warning,#ffc107);">${summary.changed_count}</div>
        <div style="font-size:12px;color:var(--muted);">Changed</div>
      </div>
      <div class="stat-card" style="background:var(--muted-bg,#e9ecef);padding:12px;border-radius:6px;text-align:center;">
        <div style="font-size:24px;font-weight:600;color:var(--text);">${summary.unchanged_count}</div>
        <div style="font-size:12px;color:var(--muted);">Unchanged</div>
      </div>
    </div>
    ${categoryBadgesHtml ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">${categoryBadgesHtml}</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <p style="font-size:12px;color:var(--muted);margin:0;">
        Comparing <strong>${escapeHtml(baseline.date || baseline.id)}</strong> (${baseline.task_count} tasks) 
        → <strong>${current.id === 'current' ? 'Live Data' : escapeHtml(current.date || current.id)}</strong> (${current.task_count} tasks)
        ${filterLabel}
      </p>
      <button onclick="copyLogisticsSummary()" style="padding:8px 16px;background:var(--primary,#007bff);color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px;">
        📋 Copy Weekly Summary
      </button>
    </div>
  `;
  
  // Changed tasks (show first - most important)
  if (changed_tasks.length > 0) {
    html += `<details open style="margin-bottom:16px;"><summary style="cursor:pointer;font-weight:600;color:var(--warning,#b58900);font-size:15px;">⚠️ Changed Tasks (${changed_tasks.length})</summary>
      <div style="max-height:45vh;overflow-y:auto;margin-top:8px;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:var(--muted-bg,#f8f9fa);position:sticky;top:0;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Asset</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Activity</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Start Date</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Category</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Changes</th>
          </tr></thead>
          <tbody>${changed_tasks.map(t => {
            // Build category badges for this task
            const taskCategories = (t.change_categories || []).map(cat => 
              `<span style="display:inline-block;padding:2px 6px;background:${cat.color}22;color:${cat.color};border-radius:8px;font-size:10px;font-weight:500;white-space:nowrap;margin:1px 0;">${cat.icon} ${cat.label}</span>`
            ).join('<br>');
            const changesHtml = Object.entries(t.changes || {}).map(([field, change]) => {
              const oldVal = change.old ? (field.includes('date') ? new Date(change.old).toLocaleString() : change.old) : '(empty)';
              const newVal = change.new ? (field.includes('date') ? new Date(change.new).toLocaleString() : change.new) : '(empty)';
              return `<div style="margin:2px 0;padding:2px 6px;background:var(--warning-bg,#fff3cd);border-radius:3px;font-size:11px;">
                <strong>${escapeHtml(field)}:</strong> <span style="text-decoration:line-through;opacity:0.7;">${escapeHtml(String(oldVal))}</span> → <span style="color:var(--success,#28a745);">${escapeHtml(String(newVal))}</span>
              </div>`;
            }).join('');
            return `<tr style="border-bottom:1px solid var(--border,#dee2e6);">
              <td style="padding:8px;vertical-align:top;font-weight:500;">${escapeHtml(t.asset || '')}</td>
              <td style="padding:8px;vertical-align:top;">${escapeHtml(t.activity || t.project || '')}</td>
              <td style="padding:8px;vertical-align:top;">${t.start_date ? new Date(t.start_date).toLocaleDateString() : ''}</td>
              <td style="padding:8px;vertical-align:top;">${taskCategories || '-'}</td>
              <td style="padding:8px;vertical-align:top;">${changesHtml}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }
  
  // New tasks (late additions)
  if (new_tasks.length > 0) {
    html += `<details style="margin-bottom:16px;"><summary style="cursor:pointer;font-weight:600;color:var(--success,#28a745);font-size:15px;">✅ New Tasks (${new_tasks.length})</summary>
      <div style="max-height:40vh;overflow-y:auto;margin-top:8px;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:var(--muted-bg,#f8f9fa);position:sticky;top:0;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Asset</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Activity</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Start Date</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Status</th>
          </tr></thead>
          <tbody>${new_tasks.map(t => `<tr style="border-bottom:1px solid var(--border,#dee2e6);">
            <td style="padding:8px;">${escapeHtml(t.asset || '')}</td>
            <td style="padding:8px;">${escapeHtml(t.activity || t.project || '')}</td>
            <td style="padding:8px;">${t.start_date ? new Date(t.start_date).toLocaleDateString() : ''}</td>
            <td style="padding:8px;">${escapeHtml(t.status || 'Planned')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }
  
  // Removed tasks
  if (removed_tasks.length > 0) {
    html += `<details style="margin-bottom:16px;"><summary style="cursor:pointer;font-weight:600;color:var(--danger,#dc3545);font-size:15px;">❌ Removed Tasks (${removed_tasks.length})</summary>
      <div style="max-height:40vh;overflow-y:auto;margin-top:8px;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:var(--muted-bg,#f8f9fa);position:sticky;top:0;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Asset</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Activity</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Start Date</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Status</th>
          </tr></thead>
          <tbody>${removed_tasks.map(t => `<tr style="border-bottom:1px solid var(--border,#dee2e6);">
            <td style="padding:8px;">${escapeHtml(t.asset || '')}</td>
            <td style="padding:8px;">${escapeHtml(t.activity || t.project || '')}</td>
            <td style="padding:8px;">${t.start_date ? new Date(t.start_date).toLocaleDateString() : ''}</td>
            <td style="padding:8px;">${escapeHtml(t.status || 'Planned')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }
  
  // Unchanged tasks (collapsed by default)
  if (unchanged_tasks.length > 0) {
    html += `<details style="margin-bottom:16px;"><summary style="cursor:pointer;font-weight:600;color:var(--muted);font-size:15px;">✓ Unchanged Tasks (${unchanged_tasks.length})</summary>
      <div style="max-height:30vh;overflow-y:auto;margin-top:8px;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:var(--muted-bg,#f8f9fa);position:sticky;top:0;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Asset</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Activity</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Start Date</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Status</th>
          </tr></thead>
          <tbody>${unchanged_tasks.map(t => `<tr style="border-bottom:1px solid var(--border,#dee2e6);">
            <td style="padding:8px;">${escapeHtml(t.asset || '')}</td>
            <td style="padding:8px;">${escapeHtml(t.activity || t.project || '')}</td>
            <td style="padding:8px;">${t.start_date ? new Date(t.start_date).toLocaleDateString() : ''}</td>
            <td style="padding:8px;">${escapeHtml(t.status || 'Planned')}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }
  
  if (summary.new_count === 0 && summary.removed_count === 0 && summary.changed_count === 0) {
    html += '<p style="text-align:center;color:var(--muted);padding:20px;">No changes detected between the selected snapshots.</p>';
  }
  
  // Generate and display logistics summary
  const logisticsSummaryHTML = generateLogisticsSummaryHTML(data);
  html += `
    <details open style="margin-top:20px;border-top:1px solid var(--border,#dee2e6);padding-top:12px;">
      <summary style="cursor:pointer;font-weight:600;color:var(--primary,#007bff);font-size:15px;">📊 Logistics Summary</summary>
      <div style="position:relative;margin-top:8px;">
        <button onclick="copyLogisticsSummary()" style="position:absolute;top:8px;right:8px;padding:6px 12px;background:var(--primary,#007bff);color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;z-index:1;">
          📋 Copy Text
        </button>
        ${logisticsSummaryHTML}
      </div>
    </details>`;
  
  // Add tracking info legend at the bottom
  html += `
    <details style="margin-top:20px;border-top:1px solid var(--border,#dee2e6);padding-top:12px;">
      <summary style="cursor:pointer;font-weight:600;color:var(--primary,#007bff);font-size:13px;">📋 What is being tracked?</summary>
      <div style="background:#e8f4fd;color:#1a365d;padding:12px;border-radius:6px;margin-top:8px;font-size:12px;border:1px solid #bee3f8;">
        <p style="margin:0 0 8px 0;"><strong>Tasks matched by:</strong> Asset + Activity (similar routes paired by closest dates)</p>
        <p style="margin:0 0 8px 0;"><strong>Fields monitored for changes:</strong></p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:4px;">
          <span>• <strong>Start Date</strong> - Route schedule</span>
          <span>• <strong>Status</strong> - Workflow state</span>
          <span>• <strong>Offshore Start</strong> - Arrival time</span>
          <span>• <strong>Offshore End</strong> - Offload complete</span>
          <span>• <strong>Return End</strong> - Back to port</span>
          <span>• <strong>Duration Hours</strong> - On-location time</span>
          <span>• <strong>Transit Hours</strong> - Return transit</span>
          <span>• <strong>Vessel</strong> - Assigned vessel</span>
          <span>• <strong>Coordinator</strong> - Logistics lead</span>
        </div>
      </div>
    </details>`;
  
  els.snapshotCompareResult.innerHTML = html;
}

// Snapshot event listeners
if (els.createSnapshotBtn) {
  els.createSnapshotBtn.addEventListener('click', createSnapshot);
}

if (els.compareSnapshotsBtn) {
  els.compareSnapshotsBtn.addEventListener('click', openCompareDialog);
}

if (els.closeCompareDialog) {
  els.closeCompareDialog.addEventListener('click', closeCompareDialog);
}

if (els.runCompareBtn) {
  els.runCompareBtn.addEventListener('click', runComparison);
}

if (els.runVolatilityBtn) {
  els.runVolatilityBtn.addEventListener('click', runVolatilityAnalysis);
}

if (els.snapshotCompareDialog) {
  els.snapshotCompareDialog.addEventListener('click', event => {
    if (event.target === els.snapshotCompareDialog) closeCompareDialog();
  });
}

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
  loadSpotData().catch(err => showToast(err.message));
  updateSnapshotStatus();
})();/* Cache bust: 2026-07-06 */
