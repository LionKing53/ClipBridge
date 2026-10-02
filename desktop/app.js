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
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
history.replaceState(null, '', location.pathname);
let state = { items: [], settings: {} }, view = 'history', filter = 'all', busy = false, toastTimer;
let networkBusy = false;
const thumbs = new Map();
async function api(url, options = {}) {
  const response = await fetch('/api/' + url, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) { const value = await response.json().catch(() => ({})); throw new Error(value.error || 'Servise ulaşılamadı. Uygulamayı yeniden aç.'); }
  return response.json();
}
function toast(message, error = false) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, error ? 7000 : 3200); }
async function action(fn) { try { await fn(); } catch (error) { toast(error.message, true); } }
function bytes(value) { if (value < 1024) return value + ' B'; if (value < 1024 ** 2) return (value / 1024).toFixed(1) + ' KiB'; return (value / 1024 ** 2).toFixed(1) + ' MiB'; }
function when(date) { return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date)); }
const directions = { inbound: 'iPhone → Windows', outbound: 'Windows → iPhone', local: 'Bu bilgisayar' };
const types = { text: 'METİN', image: 'GÖRSEL', file: 'DOSYA' };
async function thumbnail(id, element) {
  try {
    if (!thumbs.has(id)) {
      const response = await fetch(`/api/items/${id}/thumbnail`, { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) return;
      thumbs.set(id, URL.createObjectURL(await response.blob()));
    }
    if (element.isConnected) { const img = document.createElement('img'); img.src = thumbs.get(id); img.alt = 'Görsel önizlemesi'; element.replaceChildren(img); }
  } catch {}
}
function renderItems() {
  const query = $('#search').value.toLocaleLowerCase('tr');
  const items = state.items.filter(x => (view !== 'favorites' || x.favorite) && (filter === 'all' || x.type === filter) && ($('#direction').value === 'all' || x.direction === $('#direction').value) && (!query || `${x.filename} ${x.preview || ''}`.toLocaleLowerCase('tr').includes(query)));
  $('#item-count').textContent = items.length + ' öğe';
  $('#nav-count').textContent = state.items.length;
  $('#items').innerHTML = items.map(item => {
    const title = item.type === 'text' ? (item.preview?.split('\n').find(Boolean) || 'Metin') : item.filename;
    const ext = item.filename.includes('.') ? item.filename.split('.').pop().slice(0, 10).toUpperCase() : 'DOSYA';
    return `<article class="card" data-id="${item.id}"><div class="card-top"><span class="type-label">${svg(item.type)}${types[item.type]}</span><button class="favorite ${item.favorite ? 'selected' : ''}" data-action="favorite" title="${item.favorite ? 'Favorilerden çıkar' : 'Favoriye ekle'}" aria-label="Favori" aria-pressed="${item.favorite}">${svg('star')}</button></div><button class="card-open" data-action="detail"><div class="card-preview ${item.type === 'text' ? 'text' : 'file-preview'}" ${item.thumbnail ? 'data-thumbnail="' + item.id + '"' : ''}>${item.type === 'text' ? escape(item.preview) : svg(item.type) + '<small>' + escape(ext) + '</small>'}</div><strong class="card-name">${escape(title)}</strong><div class="card-meta"><span>${when(item.createdAt)}</span><span>${bytes(item.size)}</span></div></button><div class="card-bottom"><span>${directions[item.direction] || 'Aktarım'}</span><button class="copy-button" data-action="copy">${svg('copy')}Kopyala</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-thumbnail]').forEach(el => thumbnail(el.dataset.thumbnail, el));
  $('#empty').hidden = items.length > 0;
  const filtered = state.items.length > 0 || view === 'favorites';
  $('#empty h2').textContent = filtered ? (view === 'favorites' ? 'Önemli olanları yakınında tut.' : 'Bu aramada kayıt bulunamadı.') : 'Köprünün ilk izini bırak.';
  $('#empty p').textContent = filtered ? (view === 'favorites' ? 'Bir kaydın yıldızına dokunarak favorilerine ekle.' : 'Başka bir kelime veya filtre deneyebilirsin.') : 'Yeni aktarımların burada görünecek. İstersen Windows panondaki öğeyi şimdi kaydet.';
  $('#empty-capture').hidden = filtered;
}
function switchView(next) {
  view = next;
  document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active', el.dataset.view === next));
  $('#history-page').hidden = !['history', 'favorites'].includes(next);
  $('#connection-page').hidden = next !== 'connection'; $('#settings-page').hidden = next !== 'settings';
  $('#breadcrumb').textContent = ({ history: 'Aktarım geçmişi', favorites: 'Favoriler', connection: 'Bağlantı', settings: 'Ayarlar' })[next];
  $('#page-title').textContent = next === 'favorites' ? 'Bir daha lazım olacaklar.' : 'Her şey, bir pano uzağında.';
  $('#page-subtitle').textContent = next === 'favorites' ? 'Yıldızladığın metinler, görseller ve dosyalar.' : 'Metinlerin, fotoğrafların ve dosyaların için ortak bir alan.';
  $('#list-title').textContent = next === 'favorites' ? 'Favori kayıtların' : 'Son aktarımlar';
  $('.bridge-card').hidden = next === 'favorites'; renderItems();
}
async function refresh() {
  if (busy) return; busy = true;
  try {
    const next = await api('state'); const changed = JSON.stringify(next.items) !== JSON.stringify(state.items);
    state = next;
    const currentIds = new Set(state.items.map(x => x.id)); for (const [id, url] of thumbs) if (!currentIds.has(id)) { URL.revokeObjectURL(url); thumbs.delete(id); }
    $('.status').classList.remove('offline'); $('.status').innerHTML = '<i></i>Köprü hazır';
    $('#machine').textContent = state.machine;
    $('#network-description').textContent = state.network.connected ? 'Windows Tailscale ağına bağlı. Aktarım için iPhone kestirmeni çalıştır.' : 'Köprü çalışıyor. Uzaktan aktarım için Tailscale bağlantısını aç.';
    $('#network-detail').innerHTML = `<p><strong>${state.network.connected ? '● Windows Tailscale’a bağlı' : '○ Tailscale bağlı değil'}</strong></p><p class="mono">${escape(state.network.dnsName || 'Adres henüz alınamadı')}</p>`;
    const local = state.localNetwork || { state: 'not_configured' };
    const localLabels = { ready: `${local.activeNetworkName || 'İzinli ağ'} üzerinde yerel HTTPS hazır. “Aynı Ağ” kestirmelerini kullanabilirsin.`, needs_permission: 'İzinli ağ bulundu. Aşağıdaki İzni onar düğmesiyle Windows ağ iznini tamamla.', away: 'İzinli bir ağda değilsin. Kendi ağındaysan aşağıdan ekleyebilir, uzaktayken Tailscale kestirmeni kullanabilirsin.', checking: 'İzinli ağlar denetleniyor…', error: 'Yerel bağlantı başlatılamadı. Tailscale yedek yolunu kullanabilir veya Windows izinlerini kontrol edebilirsin.', disabled: 'Yerel bağlantı kapalı.', not_configured: 'Yerel ağ kurulumu henüz hazırlanmadı.' };
    $('#local-status').textContent = localLabels[local.state] || 'Yerel bağlantı denetleniyor…';
    $('#local-address').textContent = local.hostname ? `https://${local.hostname}:${local.port}/api/v1/clipboard` : '';
    $('#local-kind-address').textContent = local.hostname ? $('#local-address').textContent + '/kind' : '';
    $('#local-health-address').textContent = local.hostname ? `https://${local.hostname}:${local.port}/health` : '';
    document.querySelectorAll('[data-copy-endpoint]').forEach(el => el.disabled = !local.hostname);
    $('#local-badge').textContent = local.state === 'ready' ? 'HTTPS · HAZIR' : 'YEREL · KAPALI';
    $('#local-badge').classList.toggle('ready', local.state === 'ready');
    renderNetworks();
    $('#local-setup').disabled = !local.configured;
    if (local.state === 'ready') {
      $('#network-description').textContent = `${local.activeNetworkName || 'İzinli ağ'} · Aynı Ağ kestirmesiyle aktar. Tailscale uzaktan kullanım için yedek.`;
      $('.connection-line small').textContent = 'Yerel HTTPS';
    } else { $('.connection-line small').textContent = state.network.connected ? 'Tailscale' : 'Yol kapalı'; }
    $('#history-enabled').checked = state.settings.enabled; $('#history-limit').value = state.settings.limit;
    $('#paused-label').hidden = state.settings.enabled; $('#retention').textContent = 'Son ' + state.settings.limit + ' kayıt';
    $('#capture').disabled = !state.settings.enabled; $('#empty-capture').disabled = !state.settings.enabled;
    const event = state.diagnostics.at(-1); const stages = { completed: 'Aktarım tamamlandı', failed: 'Aktarım başarısız', unauthorized: 'Yetkilendirme reddedildi', reading: 'İçerik alınıyor', normalizing: 'İçerik hazırlanıyor', writing_clipboard: 'Panoya yazılıyor', received: 'İstek alındı' };
    $('#diagnostic').textContent = event ? `${when(event.startedAt)} · ${stages[event.stage] || event.stage}${event.transport === 'local' ? ' · Yerel HTTPS' : ''}${event.bytes ? ' · ' + bytes(event.bytes) : ''}` : 'Henüz aktarım bilgisi yok.';
    if (changed || !$('#items').children.length) renderItems();
  } catch (error) { $('.status').classList.add('offline'); $('.status').innerHTML = '<i></i>Servise ulaşılamıyor'; throw error; } finally { busy = false; }
}
async function copy(id) { await api(`items/${id}/copy`, { method: 'POST' }); toast('Windows panosuna kopyalandı. İstediğin yere yapıştırabilirsin.'); }
async function detail(id) {
  const item = await api('items/' + id);
  $('#detail-content').innerHTML = `<h2 class="detail-title">${escape(item.filename)}</h2>${item.type === 'text' ? '<pre class="detail-text">' + escape(item.content) + '</pre>' : item.thumbnail ? '<div class="detail-image" id="detail-image"></div>' : ''}<dl class="detail-properties"><dt>Aktarım yönü</dt><dd>${directions[item.direction]}</dd><dt>Tarih</dt><dd>${when(item.createdAt)}</dd><dt>Boyut</dt><dd>${bytes(item.size)}</dd>${item.source ? '<dt>Kaynak</dt><dd>' + escape(item.source) + '</dd>' : ''}</dl>${!item.available ? '<p class="muted">Tam içerik şu anda kullanılamıyor. Kaynak dosya taşınmış olabilir veya yalnızca önizleme saklanmıştır.</p>' : ''}<div class="dialog-actions"><button class="icon-button" id="remove-item" title="Geçmişten kaldır" aria-label="Geçmişten kaldır">${svg('trash')}</button>${item.source ? '<button class="secondary" id="reveal-item">Klasörde göster</button>' : ''}<button class="primary" id="copy-item" ${item.available ? '' : 'disabled'}>${svg('copy')}Yeniden kopyala</button></div>`;
  if (item.thumbnail) thumbnail(id, $('#detail-image'));
  $('#copy-item').onclick = () => action(() => copy(id));
  if ($('#reveal-item')) $('#reveal-item').onclick = () => action(() => api(`items/${id}/reveal`, { method: 'POST' }));
  $('#remove-item').onclick = () => confirm('Bu kayıt kaldırılsın mı?', 'Kayıt ve uygulamanın sakladığı kopyası kaldırılır. Asıl dosyan silinmez.', async () => { await api('items/' + id, { method: 'DELETE' }); $('#details').close(); await refresh(); toast('Kayıt geçmişten kaldırıldı.'); });
  $('#details').showModal();
}
function confirm(title, message, fn, label = 'Sil') { $('#confirm-title').textContent = title; $('#confirm-text').textContent = message; $('#confirm-ok').textContent = label; $('#confirm-ok').className = label === 'Güven ve devam et' ? 'primary' : 'danger'; $('#confirm-ok').onclick = () => { $('#confirm').close(); action(fn); }; $('#confirm').showModal(); }

function renderNetworks() {
  const local = state.localNetwork || {};
  const locked = networkBusy || !!local.networkOperation;
  $('#scan-networks').disabled = locked || !local.configured;
  $('#network-operation').hidden = !locked;
  $('#network-operation').textContent = 'Ağ işlemi sürüyor. Windows onay penceresi varsa yanıtla; bu işlem birkaç saniye sürebilir.';
  const connected = (local.connectedNetworks || []).map(net => `<div class="connected-network"><div><strong>${escape(net.name)}</strong><small>${escape(net.interfaceAlias)} · ${escape(net.address)} · ${net.category === 'Private' ? 'Windows: Özel' : 'Windows: Genel'}</small></div><button class="${net.trusted ? 'secondary' : 'primary'}" data-network-action="trust" data-network-key="${escape(net.key)}" ${locked ? 'disabled' : ''}>${net.trusted ? 'İzni onar' : 'Bu ağı güvenilenlere ekle'}</button></div>`).join('') || '<p>Eklenebilecek bağlı bir yerel ağ bulunamadı. Wi-Fi, Ethernet veya USB bağlantını kontrol et.</p>';
  const trusted = (local.allowedNetworks || []).map(net => `<div class="trusted-network ${net.active ? 'active' : ''}"><span>${escape(net.connection)}</span><strong>${escape(net.name)}</strong><small>${net.active ? '● Aktif' : 'İzinli · şu an kullanılmıyor'}</small>${net.key ? `<button class="network-remove" data-network-action="remove" data-network-key="${escape(net.key)}" ${locked ? 'disabled' : ''}>Listeden çıkar</button>` : ''}</div>`).join('') || '<p>Henüz güvenilen ağ yok. Yukarıdaki kendi ağını ekleyebilirsin; Tailscale yolu etkilenmez.</p>';
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
    confirm('Bu ağa güvenilsin mi?', `“${net.name}” (${net.interfaceAlias}) için PanoKöprü yerel erişimi açılacak. Windows yönetici onayı isteyebilir. Bu ağ Özel yapılır; diğer uygulamaların mevcut Özel ağ kuralları da etkilenebilir. Yalnızca kendi ev veya kişisel paylaşım ağında devam et.`, () => changeNetwork('trust', key), 'Güven ve devam et');
  } else {
    confirm('Ağ listeden çıkarılsın mı?', `“${net.name}” için PanoKöprü yerel erişimi kapatılacak; aktif aktarım kesilebilir. Windows Özel/Genel ayarı ve güvenlik duvarı kuralları değişmez. Tailscale korunur. Yeniden eklemek için o ağa bağlı olman gerekir.`, () => changeNetwork('remove', key), 'Listeden çıkar');
  }
});
$('#scan-networks').onclick = () => action(async () => {
  $('#scan-networks').disabled = true;
  try { const data = await api('networks'); state.localNetwork.connectedNetworks = data.connected; state.localNetwork.networkOperation = data.operation; renderNetworks(); toast('Bağlı ağlar yenilendi.'); }
  finally { $('#scan-networks').disabled = networkBusy; }
});
async function capture() { $('#capture').disabled = true; try { await api('capture', { method: 'POST' }); await refresh(); toast('Windows panosu geçmişe eklendi.'); } finally { $('#capture').disabled = !state.settings.enabled; } }
document.querySelectorAll('.nav').forEach(el => el.onclick = () => switchView(el.dataset.view));
document.querySelectorAll('.filter').forEach(el => el.onclick = () => { filter = el.dataset.filter; document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x === el)); renderItems(); });
$('#search').oninput = renderItems; $('#direction').onchange = renderItems;
$('#capture').onclick = $('#empty-capture').onclick = () => action(capture);
$('#refresh').onclick = () => action(refresh);
$('#connection-link').onclick = () => switchView('connection');
$('#items').onclick = event => { const button = event.target.closest('[data-action]'); if (!button) return; const id = button.closest('[data-id]').dataset.id; action(async () => { if (button.dataset.action === 'copy') await copy(id); else if (button.dataset.action === 'detail') await detail(id); else { await api(`items/${id}/favorite`, { method: 'POST' }); await refresh(); } }); };
$('#history-enabled').onchange = () => action(async () => { await api('settings', { method: 'POST', body: JSON.stringify({ enabled: $('#history-enabled').checked }) }); await refresh(); toast(state.settings.enabled ? 'Geçmiş kaydı açıldı.' : 'Geçmiş duraklatıldı. Aktarım köprüsü çalışmaya devam ediyor.'); });
$('#history-limit').onchange = () => action(async () => { await api('settings', { method: 'POST', body: JSON.stringify({ limit: Number($('#history-limit').value) }) }); await refresh(); });
$('#clear').onclick = () => confirm('Aktarım geçmişi temizlensin mi?', 'Favoriler dahil tüm geçmiş kayıtları ve uygulamanın sakladığı kopyalar kaldırılacak. Asıl dosyalar silinmez. Bu işlem geri alınamaz.', async () => { await api('clear', { method: 'POST' }); await refresh(); toast('Geçmiş temizlendi. Asıl dosyalar korundu.'); });
$('#pair').onclick = () => action(async () => { $('#pair').disabled = true; try { const data = await api('pairing'); $('#qr').src = data.qr; $('#endpoint').textContent = data.endpoint; $('#pairing').showModal(); } finally { $('#pair').disabled = false; } });
$('#pairing').addEventListener('close', () => $('#qr').removeAttribute('src'));
document.querySelectorAll('[data-copy-endpoint]').forEach(button => button.onclick = () => action(async () => {
  const selectors = { clipboard: '#local-address', kind: '#local-kind-address', health: '#local-health-address' };
  const value = $(selectors[button.dataset.copyEndpoint]).textContent;
  if (!value) throw new Error('Yerel adres henüz hazır değil.');
  await navigator.clipboard.writeText(value); toast('Adres Windows panosuna kopyalandı.');
}));
$('#local-setup').onclick = () => action(async () => {
  const data = await api('local-setup');
  let dialog = $('#local-setup-dialog');
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'local-setup-dialog'; document.body.append(dialog); }
  dialog.innerHTML = `<div class="dialog-top"><span class="eyebrow">BİR DEFALIK YEREL KURULUM</span><button class="icon-button" aria-label="Kapat">×</button></div><h2>Aynı ağda Tailscale’siz aktar.</h2><p>İlk kurulum için telefonda Tailscale’ı açıp bu QR kodu kamerayla tara. Açılan sayfa sertifika kurulumu ve yerel kestirme adımlarını gösterir. Mevcut kurulum çalışıyorsa tekrar yükleme.</p><img class="local-qr" alt="Yerel kurulum QR kodu" src="${data.qr}"><p class="mono">${escape(data.url)}</p><p class="muted">Bu profil yalnızca sertifika içerir; cihaz yönetimi kaydı değildir. Kök sertifika güveni hassas bir ayardır: sertifika kimliğini doğrula.</p><p class="mono">SHA-256: ${escape(data.fingerprint)}</p>`;
  dialog.querySelector('button').onclick = () => dialog.close(); dialog.showModal();
});
$('#cancel').onclick = () => $('#confirm').close();
document.querySelectorAll('.close-dialog').forEach(el => el.onclick = () => el.closest('dialog').close());
document.addEventListener('keydown', event => { if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); switchView('history'); $('#search').focus(); } });
action(refresh); setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 5000);
