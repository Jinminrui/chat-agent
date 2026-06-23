import { describe, it, expect } from 'vitest';
import { success, error } from '../src/lib/response';
import { ErrorCodes } from '../src/lib/error-codes';

describe('response helpers', () => {
  it('success returns code 0 with data', () => {
    const result = success({ id: 1 });
    expect(result).toEqual({ code: 0, msg: 'ok', data: { id: 1 } });
  });

  it('success allows custom message', () => {
    const result = success({ id: 1 }, 'created');
    expect(result).toEqual({ code: 0, msg: 'created', data: { id: 1 } });
  });

  it('error returns code with message', () => {
    const result = error(ErrorCodes.AUTH_NOT_LOGGED_IN, '未登录');
    expect(result).toEqual({ code: 2001, msg: '未登录', data: null });
  });
});

describe('ErrorCodes', () => {
  it('has unique codes', () => {
    const values = Object.values(ErrorCodes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('SUCCESS is 0', () => {
    expect(ErrorCodes.SUCCESS).toBe(0);
  });
});
