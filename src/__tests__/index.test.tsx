import {
  CarTemplateError,
  LIMITS,
  validateAlert,
  validateTemplate,
  type InformationTemplate,
} from '../index';

jest.mock('../NativeCarScreens', () => ({ __esModule: true, default: null }));

const info = (
  over: Partial<InformationTemplate> = {}
): InformationTemplate => ({
  type: 'information',
  id: 'i',
  title: 'T',
  items: [],
  ...over,
});

describe('validateTemplate', () => {
  it('accepts a tabs template with information and list tabs', () => {
    expect(() =>
      validateTemplate({
        type: 'tabs',
        id: 'root',
        tabs: [
          info({ id: 'a' }),
          {
            type: 'list',
            id: 'b',
            title: 'L',
            sections: [{ items: [{ id: 'x', text: 'X' }] }],
          },
        ],
      })
    ).not.toThrow();
  });

  it('rejects missing ids, too many actions and duplicate list items', () => {
    expect(() => validateTemplate(info({ id: '' }))).toThrow(CarTemplateError);
    const actions = Array.from(
      { length: LIMITS.informationActions + 1 },
      (_, i) => ({ id: `a${i}`, title: 'A' })
    );
    expect(() => validateTemplate(info({ actions }))).toThrow(/at most/);
    expect(() =>
      validateTemplate({
        type: 'list',
        id: 'l',
        title: 'L',
        sections: [
          { items: [{ id: 'x', text: 'X' }] },
          { items: [{ id: 'x', text: 'Y' }] },
        ],
      })
    ).toThrow(/duplicate/);
  });

  it('rejects nested and empty tabs', () => {
    expect(() => validateTemplate({ type: 'tabs', id: 't', tabs: [] })).toThrow(
      CarTemplateError
    );
    expect(() =>
      validateTemplate({
        type: 'tabs',
        id: 't',
        tabs: [{ type: 'tabs', id: 'n', tabs: [] } as never],
      })
    ).toThrow(/nested/);
  });

  it('validates alerts', () => {
    expect(() => validateAlert({ id: 'a', title: 'Brake!' })).not.toThrow();
    expect(() => validateAlert({ id: 'a', title: '' })).toThrow(
      CarTemplateError
    );
    expect(() =>
      validateAlert({
        id: 'a',
        title: 'x',
        actions: [
          { id: '1', title: '1' },
          { id: '2', title: '2' },
          { id: '3', title: '3' },
        ],
      })
    ).toThrow(/at most/);
  });
});

describe('without the native module', () => {
  it('is a safe no-op', () => {
    const { CarScreens, isSupported } = require('../index');
    expect(isSupported).toBe(false);
    expect(() => CarScreens.setRoot(info())).not.toThrow();
    expect(CarScreens.isConnected()).toBe(false);
    const off = CarScreens.addListener(() => {});
    expect(typeof off).toBe('function');
    off();
  });
});
