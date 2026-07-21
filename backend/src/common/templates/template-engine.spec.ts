import { renderTemplate } from './template-engine';

describe('template engine', () => {
  it('substitutes plain variables', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Mani' })).toBe(
      'Hello Mani!',
    );
  });

  it('renders ruled blanks for missing/empty values', () => {
    expect(renderTemplate('Rent: {{rent}}', {})).toBe('Rent: __________');
    expect(renderTemplate('Rent: {{rent}}', { rent: '  ' })).toBe(
      'Rent: __________',
    );
  });

  it('handles {{#if}} truthy and falsy', () => {
    const t = '{{#if pets}}Pets allowed.{{else}}No pets.{{/if}}';
    expect(renderTemplate(t, { pets: true })).toBe('Pets allowed.');
    expect(renderTemplate(t, { pets: 'yes' })).toBe('Pets allowed.');
    expect(renderTemplate(t, { pets: false })).toBe('No pets.');
    expect(renderTemplate(t, { pets: 'false' })).toBe('No pets.');
    expect(renderTemplate(t, {})).toBe('No pets.');
  });

  it('handles {{#eq}} with quoted and bare values, case-insensitive', () => {
    const t =
      '{{#eq purpose "commercial"}}Commercial use{{else}}Residential use{{/eq}}';
    expect(renderTemplate(t, { purpose: 'Commercial' })).toBe('Commercial use');
    expect(renderTemplate(t, { purpose: 'residential' })).toBe(
      'Residential use',
    );
    expect(renderTemplate('{{#eq n 11}}eleven{{/eq}}', { n: 11 })).toBe(
      'eleven',
    );
  });

  it('nests blocks', () => {
    const t =
      '{{#if a}}A{{#eq b "x"}} and BX{{else}} and not-BX{{/eq}}{{else}}no-A{{/if}}';
    expect(renderTemplate(t, { a: 1, b: 'x' })).toBe('A and BX');
    expect(renderTemplate(t, { a: 1, b: 'y' })).toBe('A and not-BX');
    expect(renderTemplate(t, {})).toBe('no-A');
  });

  it('escapes HTML in values only when asked', () => {
    expect(renderTemplate('{{v}}', { v: '<b>&' })).toBe('<b>&');
    expect(renderTemplate('{{v}}', { v: '<b>&' }, { escapeHtml: true })).toBe(
      '&lt;b&gt;&amp;',
    );
  });

  it('wraps values and blanks for preview styling', () => {
    const out = renderTemplate(
      '{{a}} / {{b}}',
      { a: 'X' },
      { wrapValue: (v) => `<strong>${v}</strong>`, wrapBlank: (b) => `[${b}]` },
    );
    expect(out).toBe('<strong>X</strong> / [__________]');
  });

  it('keeps malformed closers as literal text (no crash)', () => {
    expect(renderTemplate('a {{/if}} b', {})).toBe('a {{/if}} b');
  });

  it('is deterministic on repeated renders', () => {
    const t = '{{#if x}}Y{{/if}}{{n}}';
    const a = renderTemplate(t, { x: 1, n: 2 });
    expect(renderTemplate(t, { x: 1, n: 2 })).toBe(a);
  });
});
