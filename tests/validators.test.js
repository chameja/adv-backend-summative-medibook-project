const { validatePatient, validateDoctor, parseId } = require('../src/utils/validators');

describe('parseId', () => {
  test('accepts positive integers from URL params and JSON bodies', () => {
    expect(parseId('42')).toBe(42);
    expect(parseId(7)).toBe(7);
  });

  test.each(['0', '-1', '1.5', '12abc', '007', '2147483648', '', null, undefined])(
    'rejects %p with a 400',
    (value) => {
      expect(() => parseId(value)).toThrow(expect.objectContaining({ status: 400 }));
    }
  );
});

describe('validatePatient', () => {
  const valid = { full_name: '  Ama Mensah ', email: 'Ama@Mail.com', phone: '0244-111-222' };

  test('accepts a valid patient and trims and lower-cases the email', () => {
    const { errors, values } = validatePatient(valid);
    expect(errors).toEqual([]);
    expect(values).toEqual({ full_name: 'Ama Mensah', email: 'ama@mail.com', phone: '0244-111-222' });
  });

  test('reports every problem at once, including unknown fields', () => {
    const { errors } = validatePatient({ full_name: '', email: 'not-an-email', phone: 'call me', age: 30 });
    expect(errors).toHaveLength(4);
    expect(errors.join(' ')).toMatch(/Unknown field\(s\): age/);
  });

  test('a full update (PUT) requires every field', () => {
    expect(validatePatient({ phone: '0244-999-000' }).errors).toHaveLength(2);
  });

  test('a partial update (PATCH) checks only the fields sent, but needs at least one', () => {
    expect(validatePatient({ phone: '0244-999-000' }, { partial: true }).errors).toEqual([]);
    expect(validatePatient({}, { partial: true }).errors).toHaveLength(1);
  });

  test('rejects a body that is not a JSON object', () => {
    expect(validatePatient([]).errors).toEqual(['Request body must be a JSON object']);
  });
});

describe('validateDoctor — consultation_fee', () => {
  const base = { full_name: 'Dr. Boateng', specialty: 'Dermatology', room: 'R-12' };

  test.each([150, '150', '150.5', '999999.99'])('accepts %p and stores it with 2 decimals', (fee) => {
    const { errors, values } = validateDoctor({ ...base, consultation_fee: fee });
    expect(errors).toEqual([]);
    expect(values.consultation_fee).toBe(Number(fee).toFixed(2));
  });

  test.each([0, -10, '12.345', '1000000', 'free', null])('rejects %p', (fee) => {
    expect(validateDoctor({ ...base, consultation_fee: fee }).errors).toHaveLength(1);
  });
});
