import { formatDate } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  Plugin,
  PointElement,
  ScriptableContext,
  Tooltip,
} from 'chart.js';

import { SalesForecast } from '@core/models/dashboard.models';
import { formatCompactCurrency } from '@shared/pipes/compact-currency.pipe';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);
Chart.defaults.font.family = 'Inter, sans-serif';

const COLORS = {
  actual: '#C26D38',
  predicted: '#4ADE80',
  grid: '#EAE4DC',
  tick: '#A8A29E',
  tooltipBg: '#292524',
  tooltipText: '#FBF9F5',
};

type SeriesValue = number | null;

/** Relleno degradado vertical que se desvanece hacia abajo. */
function verticalGradient(rgb: string, alpha: number) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return 'transparent';
    const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0.05, `rgba(${rgb}, ${alpha})`);
    gradient.addColorStop(0.95, `rgba(${rgb}, 0)`);
    return gradient;
  };
}

@Component({
  selector: 'gb-sales-chart',
  templateUrl: './sales-chart.component.html',
  styleUrl: './sales-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesChartComponent implements AfterViewInit, OnDestroy {
  readonly forecast = input.required<SalesForecast>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly locale = inject(LOCALE_ID);
  private chart?: Chart<'line', SeriesValue[], string>;
  private todayIndex = -1;

  /** Línea vertical punteada con la etiqueta "Hoy". */
  private readonly todayLine: Plugin<'line'> = {
    id: 'todayLine',
    afterDatasetsDraw: (chart) => {
      if (this.todayIndex < 0) return;
      const x = chart.scales['x'].getPixelForValue(this.todayIndex);
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = COLORS.grid;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.tick;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hoy', x, top - 4);
      ctx.restore();
    },
  };

  constructor() {
    effect(() => {
      const forecast = this.forecast();
      if (!this.chart) return;
      this.applyData(this.chart, forecast);
      this.chart.update();
    });
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvas().nativeElement, this.buildConfig());
    this.applyData(this.chart, this.forecast());
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private applyData(chart: Chart<'line', SeriesValue[], string>, forecast: SalesForecast): void {
    const points = forecast.points;
    const actual = points.map((p) => p.actual);
    const predicted = points.map((p) => p.predicted);

    this.todayIndex = points.findIndex((p) => p.date === forecast.today);
    // Une el pronóstico con el último valor real para que la línea sea continua.
    if (this.todayIndex >= 0 && predicted[this.todayIndex] == null) {
      predicted[this.todayIndex] = actual[this.todayIndex];
    }

    chart.data.labels = points.map((p) => formatDate(`${p.date}T00:00:00`, 'd MMM', this.locale));
    chart.data.datasets[0].data = actual;
    chart.data.datasets[1].data = predicted;
  }

  private buildConfig(): ChartConfiguration<'line', SeriesValue[], string> {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Real',
            data: [],
            borderColor: COLORS.actual,
            backgroundColor: verticalGradient('194, 109, 56', 0.15),
            borderWidth: 2,
            fill: 'start',
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Pronóstico',
            data: [],
            borderColor: COLORS.predicted,
            backgroundColor: verticalGradient('74, 222, 128', 0.12),
            borderWidth: 2,
            borderDash: [5, 4],
            fill: 'start',
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 14 } },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: COLORS.tick, font: { size: 10 } },
          },
          y: {
            grid: { color: COLORS.grid },
            border: { display: false, dash: [3, 3] },
            ticks: {
              color: COLORS.tick,
              font: { size: 10 },
              maxTicksLimit: 5,
              callback: (value) => formatCompactCurrency(Number(value)),
            },
          },
        },
        plugins: {
          tooltip: {
            backgroundColor: COLORS.tooltipBg,
            titleColor: COLORS.tooltipText,
            bodyColor: COLORS.tooltipText,
            padding: 8,
            cornerRadius: 8,
            displayColors: false,
            // En el punto de unión solo mostramos el valor real.
            filter: (item) =>
              item.raw != null && !(item.datasetIndex === 1 && item.dataIndex === this.todayIndex),
            callbacks: {
              label: (item) =>
                `${item.dataset.label}: $${Number(item.raw).toLocaleString('en-US')}`,
            },
          },
        },
      },
      plugins: [this.todayLine],
    };
  }
}
