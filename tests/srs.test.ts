import { describe, expect, it } from 'vitest';
import { applyAnswer, newProgress, mastery } from '../src/domain/srs';
import { dayKey, parseDay } from '../src/domain/dates';

const at = (day: string, h = 10) => { const d = parseDay(day); d.setHours(h); return d.getTime(); };

describe('boîtes et échéances', () => {
  it('un élément nouveau est en boîte 1, à réviser tout de suite', () => {
    const p = newProgress('u', 'w', 'vocabulaire', '2026-11-19');
    expect(p.box).toBe(1);
    expect(p.due).toBe('2026-11-19');
  });

  it('monte d’une boîte avec les bons intervalles : 3, 7, 14, 30 jours', () => {
    let p = newProgress('u', 'w', 'vocabulaire', '2026-11-19');
    const steps: [string, number, string][] = [
      ['2026-11-19', 2, '2026-11-22'],
      ['2026-11-22', 3, '2026-11-29'],
      ['2026-11-29', 4, '2026-12-13'],
      ['2026-12-13', 5, '2027-01-12'],
      ['2027-01-12', 5, '2027-02-11'], // reste en boîte 5
    ];
    for (const [day, box, due] of steps) {
      p = applyAnswer(p, true, at(day));
      expect([p.box, p.due]).toEqual([box, due]);
    }
    expect(p.successes).toBe(5);
  });

  it('une erreur renvoie en boîte 1, à revoir le lendemain', () => {
    let p = { ...newProgress('u', 'w', 'vocabulaire', '2026-11-19'), box: 4, due: '2026-11-19' };
    p = applyAnswer(p, false, at('2026-11-19'));
    expect([p.box, p.due, p.failures]).toEqual([1, '2026-11-20', 1]);
  });

  it('une réussite hors échéance ne fait pas monter (pas deux boîtes le même jour)', () => {
    let p = newProgress('u', 'w', 'vocabulaire', '2026-11-19');
    p = applyAnswer(p, true, at('2026-11-19', 9));
    p = applyAnswer(p, true, at('2026-11-19', 18));
    expect(p.box).toBe(2);
    expect(p.successes).toBe(2);
  });

  it('une erreur hors échéance fait quand même redescendre', () => {
    let p = { ...newProgress('u', 'w', 'vocabulaire', '2026-11-19'), box: 3, due: '2026-11-25' };
    p = applyAnswer(p, false, at('2026-11-19'));
    expect(p.box).toBe(1);
  });

  it('une réponse en retard compte à partir du jour de la réponse', () => {
    let p = { ...newProgress('u', 'w', 'vocabulaire', '2026-11-01'), box: 2, due: '2026-11-04' };
    p = applyAnswer(p, true, at('2026-11-19'));
    expect([p.box, p.due]).toEqual([3, '2026-11-26']);
  });

  it('jour local', () => expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05'));
});

describe('état de maîtrise', () => {
  it('nouveau / en cours / acquis', () => {
    expect(mastery([1])).toBe('nouveau');
    expect(mastery([3])).toBe('en_cours');
    expect(mastery([5])).toBe('acquis');
    expect(mastery([5, 2])).toBe('en_cours');
  });
});
