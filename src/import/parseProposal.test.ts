import { describe, expect, it } from 'vitest';
import type { Catalog, DishLine } from '../model/types';
import { buildImport, closeLetterGaps, findBanner, namesFromPdf, parseMenuDate, parsePageItems, splitTags, type OcrLine, type ReadPdf } from './parseProposal';

const W = 2040;
/** A line of text as OCR reports it: on these pages name letters are about 27px wide, description letters about 14px. */
const line = (text: string, cx: number, y0: number, h: number, letter: number, confidence = 96): OcrLine =>
  ({ text, x0: cx - (text.length * letter) / 2, x1: cx + (text.length * letter) / 2, y0, y1: y0 + h, confidence });
const name = (text: string, cx: number, y0: number, confidence?: number) => line(text, cx, y0, 59, 27, confidence);
const desc = (text: string, cx: number, y0: number, confidence?: number) => line(text, cx, y0, 29, 14, confidence);
const LEFT = 502, RIGHT = 1500, CENTER = 1020;

describe('splitTags', () => {
  it('reads the tags in every form the menus use', () => {
    expect(splitTags('Lox (Pesc)')).toEqual({ name: 'Lox', tags: ['Pesc'], unknown: '' });
    expect(splitTags('Bacon (GF, DF)')).toEqual({ name: 'Bacon', tags: ['GF', 'DF'], unknown: '' });
    expect(splitTags('Pastries (Veg)')).toEqual({ name: 'Pastries', tags: ['Vegetarian'], unknown: '' });
    expect(splitTags('Shakshuka (Veg, GF)').tags).toEqual(['Vegetarian', 'GF']);
    expect(splitTags('Falafel (Vegan, GF)').tags).toEqual(['Vegan', 'GF']);
    expect(splitTags('Assorted Buns')).toEqual({ name: 'Assorted Buns', tags: [], unknown: '' });
  });
  it('copes with a parenthesis OCR dropped', () => {
    expect(splitTags('Falafel (Vegan, GF')).toMatchObject({ name: 'Falafel', tags: ['Vegan', 'GF'] });
    expect(splitTags('Falafel Vegan, GF)')).toMatchObject({ name: 'Falafel', tags: ['Vegan', 'GF'] });
  });
  it('keeps a parenthesis that is not tags, and reports it', () => {
    expect(splitTags('Shepherd Pie (no lamb)')).toEqual({ name: 'Shepherd Pie (no lamb)', tags: [], unknown: 'no lamb' });
  });
});

describe('parsePageItems', () => {
  it('reads two columns, top to bottom, left column first', () => {
    const items = parsePageItems([
      name('Bacon (GF, DF)', LEFT, 1320), name('Lox (Pesc)', RIGHT, 1320),
      desc('Crisp and smoky', LEFT, 1390), desc('With capers and onions', RIGHT, 1390),
      name('Falafel (Vegan, GF)', LEFT, 1450), desc('Homemade fritters', LEFT, 1520),
    ], W);
    expect(items.map((i) => i.name)).toEqual(['Bacon', 'Falafel', 'Lox']);
    expect(items[2]).toMatchObject({ tags: ['Pesc'], description: 'With capers and onions' });
  });
  it('reads a single centered column', () => {
    const items = parsePageItems([
      name('Salad World', CENTER, 1320), desc('Mixed greens, organic vegetables and dressings', CENTER, 1390),
      name('BBQ Ribs (GF)', CENTER, 1450), desc('Slow-cooked', CENTER, 1520),
    ], W);
    expect(items.map((i) => [i.name, i.description])).toEqual([
      ['Salad World', 'Mixed greens, organic vegetables and dressings'],
      ['BBQ Ribs', 'Slow-cooked'],
    ]);
  });
  it('joins a name that wrapped, with its tags on their own line', () => {
    const items = parsePageItems([
      name('Tofu Scramble with Vegan', LEFT, 1839), name('Sausage', LEFT, 1908), name('(Vegan, GF)', LEFT, 1974),
      desc('Plant-based plate', LEFT, 2044),
    ], W);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Tofu Scramble with Vegan Sausage', tags: ['Vegan', 'GF'], description: 'Plant-based plate' });
  });
  it('starts a new dish when a line has no description, using the gap and the closing tags', () => {
    const items = parsePageItems([
      name('Warm Pita', LEFT, 1320), name('Grilled Onions (Vegan)', LEFT, 1420), name('Hummus (GF)', LEFT, 1490), desc('Smooth', LEFT, 1560),
    ], W);
    expect(items.map((i) => i.name)).toEqual(['Warm Pita', 'Grilled Onions', 'Hummus']);
  });
  it('ignores the logo in the corner and stray specks', () => {
    const items = parsePageItems([
      name('Lox (Pesc)', RIGHT, 1320), desc('With capers', RIGHT, 1390),
      { text: '( MONKEY', x0: 1783, x1: 2010, y0: 2484, y1: 2557, confidence: 65 },
      { text: 'c', x0: 1000, x1: 1003, y0: 2554, y1: 2557, confidence: 55 },
    ], W);
    expect(items.map((i) => i.name)).toEqual(['Lox']);
  });
  it('tells a description from a name by letter width even when OCR draws its box too tall', () => {
    const items = parsePageItems([
      name('Cannolis (Veg)', RIGHT, 1761), line('Sweet ricotta, no pistachios', RIGHT, 1829, 40, 13),
      name('Fruit Tray (Vegan, GF)', RIGHT, 1909), desc('Seasonal fruit', RIGHT, 1981),
    ], W);
    expect(items.map((i) => [i.name, i.description])).toEqual([['Cannolis', 'Sweet ricotta, no pistachios'], ['Fruit Tray', 'Seasonal fruit']]);
  });
  it('treats every line as a dish when a page has no descriptions', () => {
    const items = parsePageItems([name('Sandwich Station', CENTER, 1320), name('Soup of the Day', CENTER, 1420)], W);
    expect(items.map((i) => i.name)).toEqual(['Sandwich Station', 'Soup of the Day']);
  });
  it('keeps the lowest confidence of the lines that made up a dish', () => {
    const items = parsePageItems([name('Blurry Salmon (Pesc)', LEFT, 1320, 74), desc('Cajun-spiced', LEFT, 1390, 90)], W);
    expect(items[0].confidence).toBe(74);
  });
  it('restores accents OCR tends to drop, and straightens quotes', () => {
    const items = parsePageItems([
      name('Sauteed Spinach', LEFT, 1320), desc('With creme fraiche', LEFT, 1390),
      name('Fixin’s', LEFT, 1450), desc('Salsa and limes', LEFT, 1520),
      name('Lox', LEFT, 1580), desc('With créme fraiche', LEFT, 1650),
    ], W);
    expect(items.map((i) => [i.name, i.description])).toEqual([
      ['Sautéed Spinach', 'With crème fraîche'],
      ["Fixin's", 'Salsa and limes'],
      ['Lox', 'With crème fraîche'],
    ]);
  });
});

describe('parseMenuDate', () => {
  const now = new Date(2026, 10, 6);
  it('finds the year from the weekday', () => {
    expect(parseMenuDate('WEDNESDAY, NOVEMBER 11', now)).toBe('2026-11-11');
    expect(parseMenuDate('SUNDAY NOVEMBER 15', now)).toBe('2026-11-15');
    expect(parseMenuDate('MONDAY, JANUARY 4', now)).toBe('2027-01-04');
    expect(parseMenuDate('SATURDAY, DECEMBER 6', new Date(2026, 0, 2))).toBe('2025-12-06');
  });
  it('uses the closest year when the weekday is unreadable or wrong', () => {
    expect(parseMenuDate('NOVEMBER 17', now)).toBe('2026-11-17');
    expect(parseMenuDate('FRIDAY, NOVEMBER 17', now)).toBe('2026-11-17');
  });
  it('returns null for anything that is not a date', () => {
    expect(parseMenuDate('', now)).toBeNull();
    expect(parseMenuDate('INCE 7X', now)).toBeNull();
    expect(parseMenuDate('FEBRUARY 31', now)).toBeNull();
  });
});

describe('namesFromPdf', () => {
  it('splits the tour and venue out of the PDF title first, then the file name', () => {
    expect(namesFromPdf('A Typo Proposed Menus Other Venue 2026.pdf', 'Test_Artist_Proposed_Menu_Great_Hall')).toEqual({ name: 'Test Artist', venue: 'Great Hall' });
    expect(namesFromPdf('Test Artist Proposed Menus Great Hall 2026.pdf', '')).toEqual({ name: 'Test Artist', venue: 'Great Hall' });
  });
  it('falls back to the whole file name', () => {
    expect(namesFromPdf('tour menus.PDF', 'Untitled')).toEqual({ name: 'tour menus', venue: '' });
  });
});

describe('closeLetterGaps', () => {
  /** Rows of "#" (ink) and "." (paper) into a grayscale image. */
  const image = (rows: string[]) => ({
    width: rows[0].length,
    height: rows.length,
    data: Uint8ClampedArray.from(rows.join('').split('').map((c) => (c === '#' ? 30 : 220))),
  });
  it('shrinks the gaps between letters, keeps word gaps wider, and trims the edges', () => {
    const bar = `..#${'.'.repeat(20)}#${'.'.repeat(20)}#${'.'.repeat(60)}#..`;
    const out = closeLetterGaps(image(Array(10).fill(bar)))!;
    const middle = Math.floor(out.height / 2);
    const row = Array.from(out.data.slice(middle * out.width, (middle + 1) * out.width)).map((v) => (v < 100 ? '#' : '.')).join('').replace(/^\.+|\.+$/g, '');
    const gaps = row.split('#').slice(1, -1).map((g) => g.length);
    expect(gaps[0]).toBe(gaps[1]);
    expect(gaps[0]).toBeLessThan(20);
    expect(gaps[2]).toBeGreaterThan(gaps[0]);
    expect(gaps[2]).toBeLessThan(60);
  });
  it('returns null when there is no ink', () => {
    expect(closeLetterGaps(image(['....', '....']))).toBeNull();
  });
});

describe('findBanner', () => {
  /** A 200 x 300 page of paper (220) with a photo (90) in the given box. */
  const pageWith = (left: number, top: number, right: number, bottom: number) => {
    const data = new Uint8ClampedArray(200 * 300).fill(220);
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) data[y * 200 + x] = 90;
    return { width: 200, height: 300, data };
  };
  const fallback = { left: 8, top: 4, right: 192, bottom: 120 };
  it('finds the edges of the cover banner', () => {
    expect(findBanner(pageWith(3, 2, 197, 110), fallback)).toEqual({ left: 3, top: 2, right: 197, bottom: 110 });
  });
  it('uses the standard banner position when no edge stands out', () => {
    const blank = { width: 200, height: 300, data: new Uint8ClampedArray(200 * 300).fill(220) };
    expect(findBanner(blank, fallback)).toEqual(fallback);
  });
});

describe('buildImport', () => {
  const catalog: Catalog = {
    dishes: [
      { id: 'scrambled', name: 'Organic Scrambled Eggs', category: 'Breakfast', tags: ['GF'], description: 'Catalog words' },
      { id: 'lox', name: 'Lox', category: 'Breakfast', tags: [], description: 'Catalog words' },
    ],
    templates: [], venues: [],
  };
  const page = (heading: string, date: string, lines: OcrLine[]) => ({ heading: { text: heading, confidence: 95 }, date: { text: date, confidence: 95 }, lines });
  const read = (...pages: ReadPdf['pages']): ReadPdf => ({ title: 'Test_Artist_Proposed_Menu_Great_Hall', pageWidth: W, pages });
  const now = new Date(2026, 10, 6);
  const dishes = [name('Organic Scrambled Eggs (GF)', LEFT, 1320), desc('Printed words', LEFT, 1390)];

  it('groups pages into days and meals, in order', () => {
    const { event } = buildImport(read(
      page('BREAKFAST', 'WEDNESDAY, NOVEMBER 11', dishes),
      page('LUNCH', 'WEDNESDAY, NOVEMBER 11', dishes),
      page('DINNER', 'THURSDAY, NOVEMBER 12', dishes),
    ), 'x.pdf', catalog, now);
    expect(event).toMatchObject({ name: 'Test Artist', venue: 'Great Hall', fileName: 'Test Artist Proposed Menu.pdf', coverIncludesScript: true });
    expect(event.days.map((d) => [d.date, d.dateLabel, d.meals.map((m) => m.type)])).toEqual([
      ['2026-11-11', 'Wednesday, November 11', ['Breakfast', 'Lunch']],
      ['2026-11-12', 'Thursday, November 12', ['Dinner']],
    ]);
    expect(event.days[0].meals[0].title).toBe('BREAKFAST');
  });
  it('keeps the printed tags and description but links a catalog dish', () => {
    const { event } = buildImport(read(page('BREAKFAST', 'WEDNESDAY, NOVEMBER 11', [name('Lox (Pesc)', LEFT, 1320), desc('Printed words', LEFT, 1390)])), 'x.pdf', catalog, now);
    expect(event.days[0].meals[0].lines[0]).toMatchObject({ kind: 'dish', dishName: 'Lox', tags: ['Pesc'], description: 'Printed words', sourceDishId: 'lox' });
  });
  it('corrects a small misread to the catalog spelling, but never guesses on short or distant names', () => {
    const { event } = buildImport(read(page('BREAKFAST', 'WEDNESDAY, NOVEMBER 11', [
      name('Organic Scrambied Eggs', LEFT, 1320), desc('Printed words', LEFT, 1390),
      name('Lux', LEFT, 1450), desc('Printed words', LEFT, 1520),
      name('Organic Scrambled Tofu', LEFT, 1580), desc('Printed words', LEFT, 1650),
    ])), 'x.pdf', catalog, now);
    const lines = event.days[0].meals[0].lines as DishLine[];
    expect(lines.map((l) => [l.dishName, l.sourceDishId])).toEqual([
      ['Organic Scrambled Eggs', 'scrambled'], ['Lux', undefined], ['Organic Scrambled Tofu', undefined],
    ]);
  });
  it('keeps the printed accents when the catalog spells a dish without them', () => {
    const accented = { ...catalog, dishes: [{ id: 'spinach', name: 'Sauteed Spinach', category: 'Vegetable' as const, tags: [], description: '' }] };
    const { event } = buildImport(read(page('LUNCH', 'WEDNESDAY, NOVEMBER 11', [name('Sautéed Spinach', LEFT, 1320), desc('Garlic and oil', LEFT, 1390)])), 'x.pdf', accented, now);
    expect(event.days[0].meals[0].lines[0]).toMatchObject({ dishName: 'Sautéed Spinach', sourceDishId: 'spinach' });
  });
  it('flags low-confidence lines and unknown parentheses for checking, and only those', () => {
    const { event, unsure } = buildImport(read(page('LUNCH', 'WEDNESDAY, NOVEMBER 11', [
      name('Clean Dish', LEFT, 1320), desc('Fine words', LEFT, 1390),
      name('Blurry Dish', LEFT, 1450, 60), desc('Fine words', LEFT, 1520),
      name('Odd Dish (no lamb)', LEFT, 1580), desc('Fine words', LEFT, 1650),
    ])), 'x.pdf', catalog, now);
    const lines = event.days[0].meals[0].lines as DishLine[];
    expect(unsure.map((u) => u.lineId)).toEqual([lines[1].id, lines[2].id]);
    expect(unsure[0].where).toBe('LUNCH, Wednesday, November 11');
  });
  it('reads a misread heading as the nearest meal, and keeps a special heading as a custom page', () => {
    const { event } = buildImport(read(
      page('LUNGH', 'WEDNESDAY, NOVEMBER 11', dishes),
      page('OVERNIGHT MEAL', 'WEDNESDAY, NOVEMBER 11', dishes),
    ), 'x.pdf', catalog, now);
    expect(event.days[0].meals.map((m) => [m.type, m.title])).toEqual([['Lunch', 'LUNCH'], ['Custom', 'OVERNIGHT MEAL']]);
  });
  it('reports pages with an unreadable date or heading, and keeps them with the day before', () => {
    const { event, problems } = buildImport(read(
      page('BREAKFAST', 'WEDNESDAY, NOVEMBER 11', dishes),
      page('', 'garbled', dishes),
    ), 'x.pdf', catalog, now);
    expect(event.days).toHaveLength(1);
    expect(event.days[0].meals[1]).toMatchObject({ type: 'Custom', title: 'MENU' });
    expect(problems).toEqual(["Page 2: couldn't read the meal name.", "Page 2: couldn't read the date, so it was put with the day before."]);
  });
  it('makes an undated day when the first page has no readable date', () => {
    const { event } = buildImport(read(page('LUNCH', '', dishes)), 'x.pdf', catalog, now);
    expect(event.days[0]).toMatchObject({ dateLabel: '' });
    expect(event.days[0].date).toBeUndefined();
  });
});
