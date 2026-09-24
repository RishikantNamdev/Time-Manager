import { describe, it, expect } from 'vitest';
import {
  calculateDurationMinutes,
  calculateDuration,
  parse24To12,
  format12To24,
  format24To12Display,
  calculateWorkRestRatio,
} from '../timeMath';

describe('timeMath', () => {
  describe('calculateDurationMinutes / calculateDuration', () => {
    it('calculates same-day duration correctly', () => {
      expect(calculateDurationMinutes('09:00', '10:30')).toBe(90);
      expect(calculateDurationMinutes('08:15', '09:00')).toBe(45);
      expect(calculateDurationMinutes('12:00', '12:00')).toBe(0);
      expect(calculateDuration('10:00', '11:15')).toBe(75);
    });

    it('calculates midnight-spanning rollover duration correctly', () => {
      // 23:00 to 01:30 = 60 mins (23:00 to 00:00) + 90 mins (00:00 to 01:30) = 150 mins
      expect(calculateDurationMinutes('23:00', '01:30')).toBe(150);
      // 22:00 to 06:00 = 8 hours = 480 mins
      expect(calculateDurationMinutes('22:00', '06:00')).toBe(480);
      // 23:59 to 00:01 = 2 mins
      expect(calculateDurationMinutes('23:59', '00:01')).toBe(2);
    });
  });

  describe('parse24To12 and format12To24 bidirectional conversions', () => {
    it('correctly parses 24-hour time to 12-hour components', () => {
      expect(parse24To12('00:00')).toEqual({ hour: 12, minute: 0, period: 'AM' });
      expect(parse24To12('09:00')).toEqual({ hour: 9, minute: 0, period: 'AM' });
      expect(parse24To12('12:00')).toEqual({ hour: 12, minute: 0, period: 'PM' });
      expect(parse24To12('14:30')).toEqual({ hour: 2, minute: 30, period: 'PM' });
      expect(parse24To12('23:59')).toEqual({ hour: 11, minute: 59, period: 'PM' });
    });

    it('correctly formats 12-hour components to 24-hour strings', () => {
      expect(format12To24(12, 0, 'AM')).toBe('00:00');
      expect(format12To24(9, 0, 'AM')).toBe('09:00');
      expect(format12To24(12, 0, 'PM')).toBe('12:00');
      expect(format12To24(2, 30, 'PM')).toBe('14:30');
      expect(format12To24(11, 59, 'PM')).toBe('23:59');
    });

    it('satisfies bidirectional conversion roundtrips', () => {
      const testCases = ['00:00', '01:15', '06:45', '11:59', '12:00', '13:05', '18:30', '23:59'];
      for (const time24 of testCases) {
        const { hour, minute, period } = parse24To12(time24);
        const reconstructed = format12To24(hour, minute, period);
        expect(reconstructed).toBe(time24);
      }
    });
  });

  describe('format24To12Display', () => {
    it('formats 00:00 to 12:00 AM', () => {
      expect(format24To12Display('00:00')).toBe('12:00 AM');
    });

    it('formats 12:00 to 12:00 PM', () => {
      expect(format24To12Display('12:00')).toBe('12:00 PM');
    });

    it('formats 23:59 to 11:59 PM', () => {
      expect(format24To12Display('23:59')).toBe('11:59 PM');
    });

    it('handles 24:00 edge case as 12:00 AM', () => {
      expect(format24To12Display('24:00')).toBe('12:00 AM');
    });

    it('handles empty or undefined strings gracefully', () => {
      expect(format24To12Display('')).toBe('');
      expect(format24To12Display(undefined)).toBe('');
    });
  });

  describe('calculateWorkRestRatio', () => {
    it('returns "0 : 0" when both work and rest minutes are 0', () => {
      expect(calculateWorkRestRatio(0, 0)).toBe('0 : 0');
    });

    it('returns "100% Focus (0m Rest)" when rest minutes are 0 and work is positive', () => {
      expect(calculateWorkRestRatio(60, 0)).toBe('100% Focus (0m Rest)');
      expect(calculateWorkRestRatio(1, 0)).toBe('100% Focus (0m Rest)');
      expect(calculateWorkRestRatio(480, 0)).toBe('100% Focus (0m Rest)');
    });

    it('computes rounded ratio correctly when rest minutes > 0', () => {
      expect(calculateWorkRestRatio(90, 30)).toBe('3.0 : 1');
      expect(calculateWorkRestRatio(100, 50)).toBe('2.0 : 1');
      expect(calculateWorkRestRatio(50, 100)).toBe('0.5 : 1');
      expect(calculateWorkRestRatio(125, 45)).toBe('2.8 : 1');
    });
  });
});

