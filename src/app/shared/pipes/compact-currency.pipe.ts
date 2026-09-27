import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 284 → "$284", 34800 → "$34.8K". Para usar fuera de templates. */
export function formatCompactCurrency(value: number | null | undefined): string {
  return value == null ? '—' : formatter.format(value);
}

/** Uso en templates: {{ monto | compactCurrency }}. */
@Pipe({ name: 'compactCurrency' })
export class CompactCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCompactCurrency(value);
  }
}
