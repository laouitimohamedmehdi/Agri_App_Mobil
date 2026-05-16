export const isCancelled = (e) =>
  e?.code === 'ERR_CANCELED' ||
  e?.name === 'AbortError' ||
  e?.name === 'CanceledError';
