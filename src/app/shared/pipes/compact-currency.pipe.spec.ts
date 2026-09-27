import { CompactCurrencyPipe } from './compact-currency.pipe';

describe('CompactCurrencyPipe', () => {
  const pipe = new CompactCurrencyPipe();

  it('formatea montos en notación compacta', () => {
    expect(pipe.transform(284)).toBe('$284');
    expect(pipe.transform(34800)).toBe('$34.8K');
    expect(pipe.transform(1_250_000)).toBe('$1.3M');
  });

  it('muestra un guion si no hay valor', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });
});
