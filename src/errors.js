import { errorMessages } from './i18n.js';
// Stable public codes and reviewed messages, never native exception strings.
const messages = Object.freeze(Object.fromEntries(Object.entries(errorMessages).map(([key,value]) => [key,value.tr])));
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

export function publicFailure(error, fallback, language = 'tr') {
  const { status, code } = publicError(error, fallback);
  return { status, body: { ok: false, error: code, message: errorMessages[code][language === 'en' ? 'en' : 'tr'] } };
}

export function isPublicErrorCode(code) { return typeof code === 'string' && Object.hasOwn(messages, code); }
