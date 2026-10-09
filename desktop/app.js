import { t, locale, applyLanguage, initializeTranslations, currentLanguage } from './i18n.js';
import './theme.js';
await initializeTranslations();
const icons = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  link: '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>',
  text: '<path d="M4 5h16M12 5v15M8 20h8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-7 5 7"/>',
  file: '<path d="M14 2H5v20h14V7Z"/><path d="M14 2v6h5M8 13h8m-8 4h5"/>',
  transfer: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
};
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.file}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = svg(el.dataset.icon));
const $ = selector => document.querySelector(selector);
$('#connection-page .settings-grid').prepend($('#local-network-panel').content.cloneNode(true));
$('#settings-page .settings-grid').append($('#storage-panel').content.cloneNode(true));
$('#settings-page .settings-grid').prepend($('#language-settings').content.cloneNode(true));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
history.replaceState(null, '', location.pathname);
let state = { items: [], settings: {} }, view = 'history', filter = 'all', busy = false, toastTimer;
let networkBusy = false;
const thumbs = new Map();
const initial = await api('state');
applyLanguage(initial.preferences?.language || 'tr');
window.initializeTheme();
async function api(url, options = {}) {
  const response = await fetch('/api/' + url, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) { const value = await response.json().catch(() => ({})); throw new Error(value.message || value.error || t('m_bb9c7d5a790f')); }
  return response.json();
}
function toast(message, error = false) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, error ? 7000 : 3200); }
async function action(fn) { try { await fn(); } catch (error) { toast(error.message, true); } }
function bytes(value) { const units = value < 1024 ? [1, ' B'] : value < 1024 ** 2 ? [1024, ' KiB'] : [1024 ** 2, ' MiB']; return new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value / units[0]) + units[1]; }
function when(date) { return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date)); }
let directions = { inbound: 'iPhone → Windows', outbound: 'Windows → iPhone', local: t('m_ce0bf2403ef9') };
let types = { text: t('m_e5417667ec53'), image: t('m_ea7f441e1e93'), file: t('m_761d8b3a39ba') };
async function thumbnail(id, element) {
  try {
    if (!thumbs.has(id)) {
      const response = await fetch(`/api/items/${id}/thumbnail`, { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) return;
      thumbs.set(id, URL.createObjectURL(await response.blob()));
    }
    if (element.isConnected) { const img = document.createElement('img'); img.src = thumbs.get(id); img.alt = t('m_baead029ab7a'); element.replaceChildren(img); }
  } catch {}
}
function renderItems() {
  const query = $('#search').value.toLocaleLowerCase(locale());
  const items = state.items.filter(x => (view !== 'favorites' || x.favorite) && (filter === 'all' || x.type === filter) && ($('#direction').value === 'all' || x.direction === $('#direction').value) && (!query || `${x.filename} ${x.preview || ''}`.toLocaleLowerCase(locale()).includes(query)));
  $('#item-count').textContent = t('m_be555f5df9ee', { count: new Intl.NumberFormat(locale()).format(items.length) });
  $('#nav-count').textContent = new Intl.NumberFormat(locale()).format(state.items.length);
  const sort = $('#sort').value;
  const collator = new Intl.Collator(locale(), { numeric: true, sensitivity: 'base' });
  items.sort((a,b) => sort === 'name' ? collator.compare(a.filename,b.filename) : sort === 'size' ? b.size-a.size : (sort === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt)-Date.parse(b.createdAt)));
  $('#items').innerHTML = items.map(item => {
    const title = item.type === 'text' ? (item.preview?.split('\n').find(Boolean) || t('m_80422e38652c')) : item.filename;
    const ext = item.filename.includes('.') ? item.filename.split('.').pop().slice(0, 10).toUpperCase() : t('m_761d8b3a39ba');
    return `<article class="card" data-id="${item.id}"><div class="card-top"><span class="type-label">${svg(item.type)}${types[item.type]}</span><button class="favorite ${item.favorite ? 'selected' : ''}" data-action="favorite" title="${item.favorite ? t('m_3e7cd14ed050') : t('m_c1f494543af2')}" aria-label="${t('m_16729756506a')}" aria-pressed="${item.favorite}">${svg('star')}</button></div><button class="card-open" data-action="detail"><div class="card-preview ${item.type === 'text' ? 'text' : 'file-preview'}" ${item.thumbnail ? 'data-thumbnail="' + item.id + '"' : ''}>${item.type === 'text' ? escape(item.preview) : svg(item.type) + '<small>' + escape(ext) + '</small>'}</div><strong class="card-name">${escape(title)}</strong><div class="card-meta"><span>${when(item.createdAt)}</span><span>${bytes(item.size)}</span></div></button><div class="card-bottom"><span>${directions[item.direction] || t('m_cd2d2bde2833')}</span><button class="copy-button" data-action="copy">${svg('copy')}${t('m_a8bcca42d9ce')}</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-thumbnail]').forEach(el => thumbnail(el.dataset.thumbnail, el));
  $('#empty').hidden = items.length > 0;
  const filtered = state.items.length > 0 || view === 'favorites';
  $('#empty h2').textContent = filtered ? (view === 'favorites' ? t('m_8b16f7e6ba88') : t('m_92b1341e52b4')) : t('m_7c964bbd1f39');
  $('#empty p').textContent = filtered ? (view === 'favorites' ? t('m_e955d95c52c5') : t('m_1372149f65af')) : t('m_b774494f03bd');
  $('#empty-capture').hidden = filtered;
}
function switchView(next) {
  view = next;
  document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active', el.dataset.view === next));
  $('#history-page').hidden = !['history', 'favorites'].includes(next);
  $('#connection-page').hidden = next !== 'connection'; $('#settings-page').hidden = next !== 'settings';
  $('#breadcrumb').textContent = ({ history: t('m_27d702bcfdbd'), favorites: t('m_13e9f8c058c9'), connection: t('m_7916c8f0474b'), settings: t('m_80ad54ad05fa') })[next];
  $('#page-title').textContent = next === 'favorites' ? t('m_98f89433f5ae') : t('m_4df664cd3714');
  $('#page-subtitle').textContent = next === 'favorites' ? t('m_c11919473763') : t('m_23b0903bfcee');
  $('#list-title').textContent = next === 'favorites' ? t('m_52651980f216') : t('m_d6c98aa75a76');
  $('.bridge-card').hidden = next === 'favorites'; renderItems();
}
async function refresh() {
  if (busy) return; busy = true;
  try {
    const next = await api('state'); const changed = JSON.stringify(next.items) !== JSON.stringify(state.items);
    state = next;
    const currentIds = new Set(state.items.map(x => x.id)); for (const [id, url] of thumbs) if (!currentIds.has(id)) { URL.revokeObjectURL(url); thumbs.delete(id); }
    $('.status').classList.remove('offline'); $('.status').innerHTML = '<i></i>' + t('m_01165653479f');
    $('#machine').textContent = state.machine;
    $('#network-description').textContent = state.network.connected ? t('m_aeb81ef22a4c') : t('m_a0a1fc0f0eaa');
    $('#network-detail').innerHTML = `<p><strong>${state.network.connected ? t('m_6a24da597cb7') : t('m_2de58edca95b')}</strong></p><p class="mono">${escape(state.network.dnsName || t('m_a24c79aac480'))}</p>`;
    const local = state.localNetwork || { state: 'not_configured' };
    const localLabels = { ready: t('m_b89b2851f822', { name: local.activeNetworkName || t('m_876a4ff7ae7d') }), needs_permission: t('m_17821de8038d'), away: t('m_e21c3ab24cd2'), checking: t('m_783776374cb6'), error: t('m_89d03ef1811f'), disabled: t('m_829bc4047ba3'), not_configured: t('m_32e78795b1b9') };
    $('#local-status').textContent = localLabels[local.state] || t('m_897c8e451ed7');
    $('#local-address').textContent = local.hostname ? `https://${local.hostname}:${local.port}/api/v1/clipboard` : '';
    $('#local-kind-address').textContent = local.hostname ? $('#local-address').textContent + '/kind' : '';
    $('#local-health-address').textContent = local.hostname ? `https://${local.hostname}:${local.port}/health` : '';
    document.querySelectorAll('[data-copy-endpoint]').forEach(el => el.disabled = !local.hostname);
    $('#local-badge').textContent = local.state === 'ready' ? t('m_cbd63699a557') : t('m_7764ff934df6');
    $('#local-badge').classList.toggle('ready', local.state === 'ready');
    renderNetworks();
    $('#local-setup').disabled = !local.configured;
    $('#setup-wizard').disabled = !state.setup?.available || state.setup?.busy;
    $('#pair-local').disabled = local.state !== 'ready';
    if (local.state === 'ready') {
      $('#network-description').textContent = t('m_0fbf49de930d', { name: local.activeNetworkName || t('m_876a4ff7ae7d') });
      $('.connection-line small').textContent = t('m_b20bd33746f5');
    } else { $('.connection-line small').textContent = state.network.connected ? 'Tailscale' : t('m_0448fe3c9ef6'); }
    $('#history-enabled').checked = state.settings.enabled; $('#history-limit').value = state.settings.limit;
    const disk = state.storage;
    $('#storage-usage').textContent = disk ? t('m_6b86f05d6c8e', { total: bytes(disk.totalBytes), inbox: bytes(disk.inbox), history: bytes(disk.history), temp: bytes(disk.temp + disk.outbox), free: disk.freeBytes == null ? t('m_be41c575efb5') : bytes(disk.freeBytes) }) : t('m_1977db06e173');
    $('#storage-retention').disabled = !disk; $('#storage-retention').value = disk?.retentionDays || 0;
    $('#storage-cleanup').disabled = !disk?.retentionDays;
    $('#paused-label').hidden = state.settings.enabled; $('#retention').textContent = t('m_e8d78007f3e2', { count: new Intl.NumberFormat(locale()).format(state.settings.limit) });
    $('#capture').disabled = !state.settings.enabled; $('#empty-capture').disabled = !state.settings.enabled;
    const event = state.diagnostics.at(-1); const stages = { completed: t('m_e74a9e4f43d7'), failed: t('m_eba11dc4f5d7'), unauthorized: t('m_8e2b201ece2d'), reading: t('m_92d92763a889'), normalizing: t('m_c7eb8e06a94e'), writing_clipboard: t('m_cdb27add156f'), received: t('m_49c832f2b3fa') };
    $('#diagnostic').textContent = event ? `${when(event.startedAt)} · ${stages[event.stage] || event.stage}${event.transport === 'local' ? ' · ' + t('m_b20bd33746f5') : ''}${event.bytes ? ' · ' + bytes(event.bytes) : ''}${event.errorCode ? ' · ' + event.errorCode : ''}` : t('m_7965f034f6f3');
    if (changed || !$('#items').children.length) renderItems();
    $('.version span').textContent = state.version;
  } catch (error) { $('.status').classList.add('offline'); $('.status').innerHTML = '<i></i>' + t('m_5f90d4080338'); throw error; } finally { busy = false; }
}
async function copy(id) { await api(`items/${id}/copy`, { method: 'POST' }); toast(t('m_70de08dde036')); }
async function detail(id) {
  const item = await api('items/' + id);
  $('#detail-content').dataset.id = id;
  $('#detail-content').innerHTML = `<h2 class="detail-title">${escape(item.filename)}</h2>${item.type === 'text' ? '<pre class="detail-text">' + escape(item.content) + '</pre>' : item.thumbnail ? '<div class="detail-image" id="detail-image"></div>' : ''}<dl class="detail-properties"><dt>${t('m_a4ec50120fa1')}</dt><dd>${directions[item.direction]}</dd><dt>${t('m_6ff8021ebc21')}</dt><dd>${when(item.createdAt)}</dd><dt>${t('m_983d544e867b')}</dt><dd>${bytes(item.size)}</dd>${item.source ? '<dt>' + t('m_2f0db590c3dc') + '</dt><dd>' + escape(item.source) + '</dd>' : ''}</dl>${!item.available ? '<p class="muted">' + t('m_7c9f1b4d920f') + '</p>' : ''}<div class="dialog-actions"><button class="icon-button" id="remove-item" title="${t('m_993d52ddbd4c')}" aria-label="${t('m_993d52ddbd4c')}">${svg('trash')}</button>${item.source ? '<button class="secondary" id="reveal-item">' + t('m_8ccff522d4d8') + '</button>' : ''}<button class="primary" id="copy-item" ${item.available ? '' : 'disabled'}>${svg('copy')}${t('m_74fe94933629')}</button></div>`;
  if (item.thumbnail) thumbnail(id, $('#detail-image'));
  $('#copy-item').onclick = () => action(() => copy(id));
  if ($('#reveal-item')) $('#reveal-item').onclick = () => action(() => api(`items/${id}/reveal`, { method: 'POST' }));
  $('#remove-item').onclick = () => confirm(t('m_7428fe464b0f'), t('m_c03d1a9fa015'), async () => { await api('items/' + id, { method: 'DELETE' }); $('#details').close(); await refresh(); toast(t('m_c4ea157da203')); });
  $('#details').showModal();
}
function confirm(title, message, fn, label = t('m_f698e9b40f9f')) { $('#confirm-title').textContent = title; $('#confirm-text').textContent = message; $('#confirm-ok').textContent = label; $('#confirm-ok').className = label === t('m_4dbabacf0184') ? 'primary' : 'danger'; $('#confirm-ok').onclick = () => { $('#confirm').close(); action(fn); }; $('#confirm').showModal(); }

function renderNetworks() {
  const local = state.localNetwork || {};
  const locked = networkBusy || !!local.networkOperation;
  $('#scan-networks').disabled = locked || !local.configured;
  $('#cleanup-permissions').disabled = locked || !local.canCleanupPermissions;
  $('#network-operation').hidden = !locked;
  $('#network-operation').textContent = t('m_41ee14dfff4b');
  const connected = (local.connectedNetworks || []).map(net => `<div class="connected-network"><div><strong>${escape(net.name)}</strong><small>${escape(net.interfaceAlias)} · ${escape(net.address)} · ${net.category === 'Private' ? t('m_521125c1aeb3') : t('m_39feef2e68a7')}</small></div><button class="${net.trusted ? 'secondary' : 'primary'}" data-network-action="trust" data-network-key="${escape(net.key)}" ${locked ? 'disabled' : ''}>${net.trusted ? t('m_1ab70416ecfd') : t('m_0f8bbae399e8')}</button></div>`).join('') || '<p>' + t('m_270f0dbe243e') + '</p>';
  const trusted = (local.allowedNetworks || []).map(net => `<div class="trusted-network ${net.active ? 'active' : ''}"><span>${escape(net.connection)}</span><strong>${escape(net.name)}</strong><small>${net.active ? t('m_78595e5f06bb') : t('m_f243272e6325')}</small>${net.key ? `<button class="network-remove" data-network-action="remove" data-network-key="${escape(net.key)}" ${locked ? 'disabled' : ''}>${t('m_84aa5ca1faa8')}</button>` : ''}</div>`).join('') || '<p>' + t('m_9d4a37bf90ec') + '</p>';
  if ($('#connected-networks').innerHTML !== connected) $('#connected-networks').innerHTML = connected;
  if ($('#trusted-networks').innerHTML !== trusted) $('#trusted-networks').innerHTML = trusted;
}
async function changeNetwork(actionName, key) {
  networkBusy = true; renderNetworks();
  try {
    const result = await api('networks/' + actionName, { method: 'POST', body: JSON.stringify({ key, confirmed: true }) });
    await refresh(); toast(result.message);
  } finally { networkBusy = false; renderNetworks(); }
}
$('#connection-page').addEventListener('click', event => {
  const button = event.target.closest('[data-network-action]'); if (!button || button.disabled) return;
  const key = button.dataset.networkKey, actionName = button.dataset.networkAction;
  const local = state.localNetwork || {};
  const net = (actionName === 'trust' ? local.connectedNetworks : local.allowedNetworks)?.find(net => net.key === key);
  if (!net) return;
  if (actionName === 'trust') {
    confirm(t('m_2cf9306b4065'), t('m_20482d5a2669', { name: net.name, adapter: net.interfaceAlias }), () => changeNetwork('trust', key), t('m_4dbabacf0184'));
  } else {
    confirm(t('m_c86241864463'), t('m_d9e825365573', { name: net.name }), () => changeNetwork('remove', key), t('m_84aa5ca1faa8'));
  }
});
$('#scan-networks').onclick = () => action(async () => {
  $('#scan-networks').disabled = true;
  try { const data = await api('networks'); state.localNetwork.connectedNetworks = data.connected; state.localNetwork.networkOperation = data.operation; renderNetworks(); toast(t('m_9f4308fe8389')); }
  finally { $('#scan-networks').disabled = networkBusy; }
});
$('#cleanup-permissions').onclick = () => confirm(t('m_259236509020'), t('m_030098f40ab6'), () => changeNetwork('cleanup'), t('m_d7ab012af168'));
async function capture() { $('#capture').disabled = true; try { await api('capture', { method: 'POST' }); await refresh(); toast(t('m_1d11a88cf0c1')); } finally { $('#capture').disabled = !state.settings.enabled; } }
document.querySelectorAll('.nav').forEach(el => el.onclick = () => switchView(el.dataset.view));
document.querySelectorAll('.filter').forEach(el => el.onclick = () => { filter = el.dataset.filter; document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x === el)); renderItems(); });
$('#search').oninput = renderItems; $('#direction').onchange = $('#sort').onchange = renderItems;
$('#capture').onclick = $('#empty-capture').onclick = () => action(capture);
$('#refresh').onclick = () => action(refresh);
$('#connection-link').onclick = () => switchView('connection');
$('#items').onclick = event => { const button = event.target.closest('[data-action]'); if (!button) return; const id = button.closest('[data-id]').dataset.id; action(async () => { if (button.dataset.action === 'copy') await copy(id); else if (button.dataset.action === 'detail') await detail(id); else { await api(`items/${id}/favorite`, { method: 'POST' }); await refresh(); } }); };
$('#history-enabled').onchange = () => action(async () => { await api('settings', { method: 'POST', body: JSON.stringify({ enabled: $('#history-enabled').checked }) }); await refresh(); toast(state.settings.enabled ? t('m_cb209ce93bcb') : t('m_1afa38e02a0b')); });
$('#history-limit').onchange = () => action(async () => { await api('settings', { method: 'POST', body: JSON.stringify({ limit: Number($('#history-limit').value) }) }); await refresh(); });
$('#clear').onclick = () => confirm(t('m_47475d17f3c5'), t('m_aec8f966b438'), async () => { await api('clear', { method: 'POST' }); await refresh(); toast(t('m_6cb54297851f')); });
$('#storage-retention').onchange = () => action(async () => { await api('storage/policy', { method: 'POST', body: JSON.stringify({ retentionDays: Number($('#storage-retention').value) }) }); await refresh(); });
$('#storage-cleanup').onclick = () => confirm(t('m_bf4698208108'), t('m_eb36c0bb459f'), async () => { const result = await api('storage/cleanup', { method: 'POST', body: JSON.stringify({ confirmed: true }) }); await refresh(); toast(t('m_4f8f7fb0b082', { count: new Intl.NumberFormat(locale()).format(result.removed) })); });
$('#pair').onclick = () => action(async () => { $('#pair').disabled = true; try { const data = await api('pairing'); $('#qr').src = data.qr; $('#endpoint').textContent = data.endpoint; $('#pairing').showModal(); } finally { $('#pair').disabled = false; } });
$('#pairing').addEventListener('close', () => $('#qr').removeAttribute('src'));
$('#pair-local').onclick = () => action(async () => { const data = await api('pairing?transport=local'); $('#qr').src = data.qr; $('#endpoint').textContent = data.endpoint; $('#pairing').showModal(); });
async function renderSetup() {
  const data = await api('setup');
  const certificate = data.phase === 'certificate' && data.downloadUrl && data.expiresAt > Date.now();
  $('#setup-status').textContent = ({ not_started: t('m_4b74f5bb1400'), preparing: t('m_34c35d94b852'), interrupted: t('m_20a3c2f57846'), certificate: t('m_89f713eb7b1d'), complete: t('m_c7b639f72c5f') })[data.phase] || t('m_c65c6936bd50');
  $('#setup-select').hidden = !!certificate || data.phase === 'complete';
  $('#setup-certificate').hidden = !certificate;
  $('#setup-network').replaceChildren(...data.networks.map(net => { const option = document.createElement('option'); option.value = net.key; option.textContent = `${net.name} · ${net.interfaceAlias} · ${net.category}`; return option; }));
  $('#setup-begin').disabled = data.busy || !data.networks.length;
  $('#setup-stop').disabled = data.busy || data.phase === 'complete';
  if (certificate) { $('#setup-qr').src = data.qr; $('#setup-url').textContent = data.downloadUrl; $('#setup-fingerprint').textContent = data.fingerprint; }
  else { $('#setup-qr').removeAttribute('src'); $('#setup-url').textContent = ''; $('#setup-fingerprint').textContent = ''; }
  $('#setup-phone-fingerprint').value = ''; $('#setup-trust').checked = false;
}
$('#setup-wizard').onclick = () => action(async () => { await renderSetup(); $('#setup-dialog').showModal(); });
async function setupAction(route, body) {
  for (const id of ['setup-begin', 'setup-confirm', 'setup-stop']) $('#' + id).disabled = true;
  try { await api('setup/' + route, { method: 'POST', body: JSON.stringify(body) }); await renderSetup(); await refresh(); }
  finally { $('#setup-confirm').disabled = false; await renderSetup(); }
}
$('#setup-begin').onclick = () => action(() => setupAction('begin', { key: $('#setup-network').value, confirmed: true }));
$('#setup-confirm').onclick = () => action(() => setupAction('confirm', { fingerprintFromPhone: $('#setup-phone-fingerprint').value, confirmedTrust: $('#setup-trust').checked }));
$('#setup-stop').onclick = () => action(() => setupAction('cancel', { confirmed: true }));
document.querySelectorAll('[data-copy-endpoint]').forEach(button => button.onclick = () => action(async () => {
  const selectors = { clipboard: '#local-address', kind: '#local-kind-address', health: '#local-health-address' };
  const value = $(selectors[button.dataset.copyEndpoint]).textContent;
  if (!value) throw new Error(t('m_774be01543bd'));
  await navigator.clipboard.writeText(value); toast(t('m_d99fa7a1f4e0'));
}));
$('#local-setup').onclick = () => action(async () => {
  const data = await api('local-setup');
  let dialog = $('#local-setup-dialog');
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'local-setup-dialog'; document.body.append(dialog); }
  dialog.innerHTML = `<div class="dialog-top"><span class="eyebrow">${t('m_d43d39be69e5')}</span><button class="icon-button" aria-label="${t('m_7b31a9fc4816')}">×</button></div><h2>${t('m_c4ec69dc4883')}</h2><p>${t('m_9bdedf9ae4b9')}</p><img class="local-qr" alt="${t('m_a12f90594523')}" src="${data.qr}"><p class="mono">${escape(data.url)}</p><p class="muted">${t('m_a3b619807d17')}</p><p class="mono">SHA-256: ${escape(data.fingerprint)}</p>`;
  dialog.querySelector('button').onclick = () => dialog.close(); dialog.showModal();
});
$('#cancel').onclick = () => $('#confirm').close();
document.querySelectorAll('.close-dialog').forEach(el => el.onclick = () => el.closest('dialog').close());
document.addEventListener('keydown', event => { if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); switchView('history'); $('#search').focus(); } });
$('#language-select').onchange = () => action(async () => {
  const selected = $('#language-select').value;
  try {
    await api('settings', { method: 'POST', body: JSON.stringify({ language: selected }) });
    applyLanguage(selected);
    directions.local = t('m_ce0bf2403ef9'); types = { text: t('m_e5417667ec53'), image: t('m_ea7f441e1e93'), file: t('m_761d8b3a39ba') };
    switchView(view); await refresh();
    if ($('#details').open) await detail($('#detail-content').dataset.id);
    toast(t('m_5b9f88f9567e'));
  } catch(error) { $('#language-select').value = currentLanguage(); throw error; }
});
action(refresh); setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 5000);
