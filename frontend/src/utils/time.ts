/** Backend persistence uses naive UTC ISO timestamps.  Tell JavaScript that
 * explicitly before formatting; otherwise it assumes the browser's local zone.
 */
const asUtcDate = (value: string | Date) => {
  if (value instanceof Date) return value;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

export const formatIST = (value: string | Date, withDate = false) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  ...(withDate ? { day: '2-digit', month: 'short', year: 'numeric' } : {}),
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(asUtcDate(value)).replace(',', '') + ' IST';
