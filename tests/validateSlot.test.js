const { validateSlot, parseDay } = require('../src/utils/scheduling');

const now = new Date(2026, 11, 1, 8, 0);

describe('validateSlot — future, 09:00 to 17:00, 30-minute boundary', () => {
  test('accepts a future slot on the hour and normalises it for MySQL', () => {
    const result = validateSlot('2026-12-02 09:00', now);
    expect(result.ok).toBe(true);
    expect(result.slot.sql).toBe('2026-12-02 09:00:00');
    expect(result.slot.day).toBe('2026-12-02');
  });

  test('accepts the ISO "T" separator and explicit zero seconds', () => {
    expect(validateSlot('2026-12-02T10:30', now).ok).toBe(true);
    expect(validateSlot('2026-12-02 10:30:00', now).ok).toBe(true);
  });

  test('16:30 is the last bookable slot because it ends at 17:00', () => {
    expect(validateSlot('2026-12-02 16:30', now).ok).toBe(true);
  });

  test('17:00 exactly is rejected: a 30-minute slot would end after closing', () => {
    expect(validateSlot('2026-12-02 17:00', now)).toMatchObject({ ok: false, reason: 'OUTSIDE_WORKING_HOURS' });
  });

  test('rejects slots before opening time', () => {
    expect(validateSlot('2026-12-02 08:30', now)).toMatchObject({ ok: false, reason: 'OUTSIDE_WORKING_HOURS' });
    expect(validateSlot('2026-12-02 00:00', now)).toMatchObject({ ok: false, reason: 'OUTSIDE_WORKING_HOURS' });
  });

  test('09:15 is not on a 30-minute boundary', () => {
    expect(validateSlot('2026-12-02 09:15', now)).toMatchObject({ ok: false, reason: 'NOT_ON_SLOT_BOUNDARY' });
  });

  test('non-zero seconds are not on a slot boundary', () => {
    expect(validateSlot('2026-12-02 09:30:30', now)).toMatchObject({ ok: false, reason: 'NOT_ON_SLOT_BOUNDARY' });
  });

  test('rejects slots in the past', () => {
    expect(validateSlot('2026-11-30 10:00', now)).toMatchObject({ ok: false, reason: 'IN_THE_PAST' });
  });

  test('a slot starting at this exact moment is no longer in the future', () => {
    const atNine = new Date(2026, 11, 2, 9, 0);
    expect(validateSlot('2026-12-02 09:00', atNine)).toMatchObject({ ok: false, reason: 'IN_THE_PAST' });
  });

  test.each([
    ['not a date at all', 'tomorrow'],
    ['a date with no time', '2026-12-02'],
    ['a single-digit hour', '2026-12-02 9:00'],
    ['an impossible calendar date', '2026-02-30 10:00'],
    ['hour 24', '2026-12-02 24:00'],
    ['minute 60', '2026-12-02 10:60'],
    ['a timezone suffix', '2026-12-02T09:00:00Z'],
    ['an empty string', ''],
    ['null', null],
    ['a number', 20261202],
  ])('treats %s as malformed', (_label, value) => {
    expect(validateSlot(value, now)).toMatchObject({ ok: false, reason: 'MALFORMED' });
  });

  test('29 February is valid in a leap year only', () => {
    const later = new Date(2027, 0, 1);
    expect(validateSlot('2028-02-29 10:00', later).ok).toBe(true);
    expect(validateSlot('2027-02-29 10:00', later)).toMatchObject({ ok: false, reason: 'MALFORMED' });
  });
});

describe('parseDay — waitlist dates', () => {
  test('returns a valid calendar day unchanged', () => {
    expect(parseDay('2026-12-02')).toBe('2026-12-02');
  });

  test.each(['2026-02-30', '2026-13-01', '2026-12-2', '2026-12-02 09:00', '', undefined])(
    'rejects %p',
    (value) => {
      expect(parseDay(value)).toBeNull();
    }
  );
});
