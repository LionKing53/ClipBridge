// Stable public codes and reviewed messages, never native exception strings.
const messages = Object.freeze({
  operation_failed: 'İşlem tamamlanamadı. Yeniden dene; sürerse tanılama kodunu paylaş.',
  unauthorized: 'Erişim anahtarı eksik veya geçersiz. Eşleştirmeyi kontrol et.',
  network_not_allowed: 'Bu ağda yerel erişim kapalı. Güvenilen ağ seçimini kontrol et.',
  network_changed: 'İşlem sırasında ağ değişti. Listeyi yenileyip bağlı ağı tekrar seç.',
  permission_cancelled: 'Windows yönetici onayı iptal edildi. İzin işlemi tamamlanmadı.',
  permission_timeout: 'Windows izin işlemi zaman aşımına uğradı. Sonucu kontrol edip yeniden dene.',
  permission_failed: 'Windows izin işlemi tamamlanamadı. Kısmi değişiklikler için İzni onar seçeneğini kullan.',
  clipboard_read_failed: 'Windows panosu okunamadı. İçeriği yeniden kopyalayıp tekrar dene.',
  clipboard_write_failed: 'Windows panosuna yazılamadı. Panoyu kullanan uygulamayı kapatıp yeniden dene.',
  clipboard_update_failed: 'Gelen içerik işlenemedi. Metni veya dosyayı yeniden kopyala.',
  clipboard_timeout: 'Windows panosu yanıt vermedi. Biraz bekleyip yeniden dene.',
  clipboard_empty: 'Aktarılacak içerik yok. Önce bir metin veya dosya kopyala.',
  disk_full: 'Diskte yeterli boş alan yok. Yer açıp aktarımı yeniden dene.',
  size_limit_exceeded: 'İçerik bu aktarım yolunun boyut sınırını aşıyor.',
  connection_unavailable: 'Bağlantı kurulamadı. Bilgisayarı ve seçilen ağ bağlantısını kontrol et.',
  connection_timeout: 'Bağlantı zaman aşımına uğradı. Ağı kontrol edip yeniden dene.',
  transfer_interrupted: 'Aktarım kesildi. Bağlantıyı kontrol edip yeniden başlat.',
  certificate_identity_mismatch: 'Sertifika adresle eşleşmiyor. Eşleştirme adresini kontrol et; doğrulamayı kapatma.',
  certificate_not_trusted: 'Sertifika güveni doğrulanamadı. Parmak izini ve iPhone güven ayarını kontrol et.',
  certificate_expired: 'Sertifikanın süresi geçerli değil. Cihaz saatini ve sertifika yenilemeyi kontrol et.',
  port_in_use: 'Gerekli bağlantı noktası başka bir işlem tarafından kullanılıyor.',
  data_schema_incompatible: 'Bu veri sürümü uygulamayla uyumlu değil. Veriyi silme veya eski yedeği üzerine yazma.',
  instance_locked: 'Uygulama açık veya önceki kapanışın kontrol edilmesi gerekiyor.',
  migration_required: 'Mevcut veriler için kontrollü geçiş gerekiyor. Veriyi yeni kurulumun üzerine kopyalama.',
  invalid_request: 'İstek geçersiz. Kestirmedeki yöntem ve gövde alanlarını kontrol et.',
  invalid_content: 'İçerik biçimi desteklenmiyor veya eksik.',
  conflict: 'İşlem bu durumda uygulanamıyor. Ekranı yenileyip seçim ve onayları kontrol et.',
  not_found: 'İstenen öğe bulunamadı.',
  source_file_missing: 'Kaynak dosya taşınmış veya silinmiş. Dosyayı yeniden aktar.',
  preview_only: 'Bu uzun metnin yalnızca önizlemesi saklandı; yeniden aktar.',
  setup_required: 'Önce yerel ağ kurulumunu tamamla.',
  tailscale_unavailable: 'Bu yol için Windows Tailscale bağlantısı gerekiyor. Yerel ağı da seçebilirsin.',
  fingerprint_mismatch: 'Sertifika parmak izi veya elle güven onayı eşleşmiyor. Kurulumu tekrar kontrol et.',
  certificate_session_expired: 'Sertifika kurulum oturumu geçerli değil. Kurulumu yeniden başlat.',
});
const applicationCodes = Object.freeze({
  ERR_UNAUTHORIZED: [401, 'unauthorized'], ERR_NETWORK_NOT_ALLOWED: [403, 'network_not_allowed'],
  ERR_NETWORK_CHANGED: [409, 'network_changed'], ERR_PERMISSION_CANCELLED: [409, 'permission_cancelled'],
  ERR_PERMISSION_TIMEOUT: [504, 'permission_timeout'], ERR_PERMISSION_FAILED: [503, 'permission_failed'],
  ERR_CLIPBOARD_READ: [503, 'clipboard_read_failed'], ERR_CLIPBOARD_WRITE: [503, 'clipboard_write_failed'],
  ERR_CLIPBOARD_TIMEOUT: [504, 'clipboard_timeout'], ERR_CLIPBOARD_EMPTY: [422, 'clipboard_empty'],
  ERR_SOURCE_FILE_MISSING: [404, 'source_file_missing'], ERR_PREVIEW_ONLY: [409, 'preview_only'],
  ERR_SETUP_REQUIRED: [409, 'setup_required'], ERR_TAILSCALE_UNAVAILABLE: [503, 'tailscale_unavailable'],
  ERR_FINGERPRINT_MISMATCH: [409, 'fingerprint_mismatch'], ERR_CERTIFICATE_SESSION: [409, 'certificate_session_expired'],
});
export function operationError(code) {
  if (!Object.hasOwn(applicationCodes, code)) throw new TypeError('Unknown application error code.');
  const [statusCode, publicCode] = applicationCodes[code];
  return Object.assign(new Error(messages[publicCode]), { code, statusCode });
}
export function publicError(error, fallback = 'operation_failed') {
  const codes = {
    ...applicationCodes,
    ENOSPC: [507, 'disk_full'], EDQUOT: [507, 'disk_full'],
    EADDRINUSE: [409, 'port_in_use'], ERR_DATA_SCHEMA: [409, 'data_schema_incompatible'],
    ERR_INSTANCE_LOCKED: [409, 'instance_locked'], ERR_MIGRATION_REQUIRED: [409, 'migration_required'],
    ERR_TLS_CERT_ALTNAME_INVALID: [502, 'certificate_identity_mismatch'],
    DEPTH_ZERO_SELF_SIGNED_CERT: [502, 'certificate_not_trusted'],
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: [502, 'certificate_not_trusted'],
    CERT_HAS_EXPIRED: [502, 'certificate_expired'], CERT_NOT_YET_VALID: [502, 'certificate_expired'],
    SELF_SIGNED_CERT_IN_CHAIN: [502, 'certificate_not_trusted'],
    ECONNREFUSED: [503, 'connection_unavailable'], EHOSTUNREACH: [503, 'connection_unavailable'],
    ENETUNREACH: [503, 'connection_unavailable'], ENOTFOUND: [503, 'connection_unavailable'],
    EAI_AGAIN: [503, 'connection_unavailable'], ETIMEDOUT: [504, 'connection_timeout'],
    ECONNRESET: [503, 'transfer_interrupted'], EPIPE: [503, 'transfer_interrupted']
  };
  const statusCodes = { 400: 'invalid_request', 401: 'unauthorized', 403: 'network_not_allowed', 404: 'not_found', 409: 'conflict', 413: 'size_limit_exceeded', 422: 'invalid_content' };
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 0;
  const [status, code] = (Object.hasOwn(codes, error?.code) && codes[error.code]) ||
    (Object.hasOwn(statusCodes, statusCode) && [statusCode, statusCodes[statusCode]]) ||
    [500, Object.hasOwn(messages, fallback) ? fallback : 'operation_failed'];
  return { status, code };
}

export function publicFailure(error, fallback) {
  const { status, code } = publicError(error, fallback);
  return { status, body: { ok: false, error: code, message: messages[code] } };
}

export function isPublicErrorCode(code) { return typeof code === 'string' && Object.hasOwn(messages, code); }
