// Stable public codes; never expose native exceptions, credentials or private paths.
export function publicError(error, fallback = 'operation_failed') {
  const codes = {
    ENOSPC: [507, 'disk_full'], EDQUOT: [507, 'disk_full'],
    EADDRINUSE: [409, 'port_in_use'], ERR_DATA_SCHEMA: [409, 'data_schema_incompatible'],
    ERR_INSTANCE_LOCKED: [409, 'instance_locked'], ERR_MIGRATION_REQUIRED: [409, 'migration_required'],
    ERR_TLS_CERT_ALTNAME_INVALID: [502, 'certificate_identity_mismatch'],
    DEPTH_ZERO_SELF_SIGNED_CERT: [502, 'certificate_not_trusted'],
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: [502, 'certificate_not_trusted'],
    ECONNREFUSED: [503, 'connection_unavailable'], ETIMEDOUT: [504, 'connection_timeout']
  };
  const [status, code] = codes[error?.code] || [error?.statusCode === 413 ? 413 : 500, error?.statusCode === 413 ? 'size_limit_exceeded' : fallback];
  return { status, code };
}
