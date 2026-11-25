const { calculateRefund, refundPercentage } = require('../src/utils/scheduling');

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const appointment = new Date(2026, 11, 10, 9, 0);

// Returns the moment that gives exactly the given notice before the appointment.
const noticeOf = (ms) => new Date(appointment.getTime() - ms);

describe('calculateRefund — policy: >48h 100%, 24h to 48h inclusive 50%, <24h 0%', () => {
  test('more than 48 hours notice refunds 100%', () => {
    const result = calculateRefund('150.00', appointment, noticeOf(72 * HOUR));
    expect(result.percentage).toBe(100);
    expect(result.refundAmount).toBe('150.00');
    expect(result.hoursNotice).toBe(72);
  });

  test('one minute over 48 hours still refunds 100%', () => {
    expect(calculateRefund('150.00', appointment, noticeOf(48 * HOUR + MINUTE)).percentage).toBe(100);
  });

  test('exactly 48 hours notice is in the 50% tier (boundary)', () => {
    const result = calculateRefund('150.00', appointment, noticeOf(48 * HOUR));
    expect(result.percentage).toBe(50);
    expect(result.refundAmount).toBe('75.00');
  });

  test('between 24 and 48 hours notice refunds 50%', () => {
    const result = calculateRefund('100.00', appointment, noticeOf(36 * HOUR));
    expect(result.percentage).toBe(50);
    expect(result.refundAmount).toBe('50.00');
  });

  test('exactly 24 hours notice is still in the 50% tier (boundary)', () => {
    const result = calculateRefund('100.00', appointment, noticeOf(24 * HOUR));
    expect(result.percentage).toBe(50);
    expect(result.refundAmount).toBe('50.00');
  });

  test('one minute under 24 hours refunds nothing', () => {
    expect(calculateRefund('100.00', appointment, noticeOf(24 * HOUR - MINUTE)).percentage).toBe(0);
  });

  test('less than 24 hours notice refunds 0%', () => {
    const result = calculateRefund('250.00', appointment, noticeOf(2 * HOUR));
    expect(result.percentage).toBe(0);
    expect(result.refundAmount).toBe('0.00');
  });

  test('refunds are based on the amount actually paid, not the consultation fee', () => {
    expect(calculateRefund('120.00', appointment, noticeOf(30 * HOUR)).refundAmount).toBe('60.00');
  });

  test('half of an odd amount is rounded to the nearest cent without floating-point drift', () => {
    expect(calculateRefund('99.99', appointment, noticeOf(30 * HOUR)).refundAmount).toBe('50.00');
    expect(calculateRefund('0.10', appointment, noticeOf(30 * HOUR)).refundAmount).toBe('0.05');
  });

  test('accepts the amount as a number as well as a DECIMAL string from MySQL', () => {
    expect(calculateRefund(150, appointment, noticeOf(72 * HOUR)).refundAmount).toBe('150.00');
  });
});

describe('refundPercentage — tier lookup by hours of notice', () => {
  test.each([
    [100, 100],
    [48.01, 100],
    [48, 50],
    [30, 50],
    [24, 50],
    [23.99, 0],
    [0.5, 0],
  ])('%p hours of notice -> %p%%', (hours, expected) => {
    expect(refundPercentage(hours)).toBe(expected);
  });
});
