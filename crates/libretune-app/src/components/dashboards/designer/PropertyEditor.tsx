import { DashComponent, TsGaugeConfig, TsIndicatorConfig, isGauge, isIndicator } from '../dashTypes';
import PercentField from './PercentField';
import NumberField from './NumberField';

interface Props {
  component: DashComponent;
  onChange: (component: DashComponent) => void;
}

/**
 * Property editor panel for gauges and indicators.
 * Extracted from DashboardDesigner during Phase D.
 */
export default function PropertyEditor({ component, onChange }: Props) {
  if (isGauge(component)) {
    const gauge = component.Gauge;

    const updateGauge = (updates: Partial<TsGaugeConfig>) => {
      onChange({ Gauge: { ...gauge, ...updates } });
    };

    return (
      <div className="property-editor">
        <div className="property-group">
          <label>Заголовок</label>
          <input
            type="text"
            value={gauge.title || ''}
            onChange={(e) => updateGauge({ title: e.target.value })}
          />
        </div>

        <div className="property-group">
          <label>Выходной канал</label>
          <input
            type="text"
            value={gauge.output_channel}
            onChange={(e) => updateGauge({ output_channel: e.target.value })}
          />
        </div>

        <div className="property-row">
          <div className="property-group half">
            <label>Мин.</label>
            <NumberField
              label="Мин."
              value={gauge.min}
              onChange={(v) => updateGauge({ min: v ?? 0 })}
            />
          </div>
          <div className="property-group half">
            <label>Макс.</label>
            <NumberField
              label="Макс."
              value={gauge.max}
              onChange={(v) => updateGauge({ max: v ?? 100 })}
            />
          </div>
        </div>

        {gauge.default_min != null && gauge.default_max != null && (
          <div className="property-group">
            <button
              type="button"
              title={`Restore the range this gauge was authored with in TunerStudio (${gauge.default_min} … ${gauge.default_max})`}
              onClick={() => updateGauge({ min: gauge.default_min!, max: gauge.default_max! })}
            >
              Сбросить диапазон по умолчанию ({gauge.default_min} … {gauge.default_max})
            </button>
          </div>
        )}

        <div className="property-group">
          <label>Единицы</label>
          <input
            type="text"
            value={gauge.units || ''}
            onChange={(e) => updateGauge({ units: e.target.value })}
          />
        </div>

        <div className="property-row">
          <div className="property-group half">
            <label>Предупреждение</label>
            <NumberField
              label="Предупреждение"
              value={gauge.high_warning}
              nullable
              onChange={(v) => updateGauge({ high_warning: v })}
            />
          </div>
          <div className="property-group half">
            <label>Критично</label>
            <NumberField
              label="Критично"
              value={gauge.high_critical}
              nullable
              onChange={(v) => updateGauge({ high_critical: v })}
            />
          </div>
        </div>

        <div className="property-group">
          <label>Тип прибора</label>
          <select
            value={gauge.gauge_painter || 'AnalogGauge'}
            onChange={(e) => updateGauge({ gauge_painter: e.target.value as TsGaugeConfig['gauge_painter'] })}
          >
            <option value="AnalogGauge">Аналоговый прибор</option>
            <option value="BasicAnalogGauge">Простой аналоговый прибор</option>
            <option value="CircleAnalogGauge">Круглый аналоговый прибор</option>
            <option value="BasicReadout">Цифровое табло</option>
            <option value="HorizontalBarGauge">Горизонтальная полоса</option>
            <option value="HorizontalDashedBar">Горизонтальная штриховая полоса</option>
            <option value="VerticalBarGauge">Вертикальная полоса</option>
            <option value="VerticalDashedBar">Вертикальная штриховая полоса</option>
            <option value="HorizontalLineGauge">Горизонтальная линия</option>
            <option value="AnalogBarGauge">Аналоговая полоса</option>
            <option value="AnalogMovingBarGauge">Аналоговая подвижная полоса</option>
            <option value="AsymmetricSweepGauge">Прибор-развёртка</option>
            <option value="RoundGauge">Круглый прибор</option>
            <option value="RoundDashedGauge">Круглый штриховой прибор</option>
            <option value="Tachometer">Тахометр</option>
            <option value="FuelMeter">Расходомер топлива</option>
            <option value="LineGraph">Линейный график</option>
            <option value="Histogram">Гистограмма</option>
            <option value="TelemetryStat">Статистика телеметрии</option>
            <option value="MultiChannelTrend">График нескольких каналов</option>
          </select>
        </div>

        <div className="property-group">
          <label>Знаков</label>
          <NumberField
            label="Знаков"
            integer
            min={0}
            max={5}
            value={gauge.value_digits ?? 1}
            onChange={(v) => updateGauge({ value_digits: v ?? 0 })}
          />
        </div>

        <div className="property-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={gauge.shape_locked_to_aspect ?? false}
              onChange={(e) => updateGauge({ shape_locked_to_aspect: e.target.checked })}
            />
            Сохранять пропорции
          </label>
        </div>

        {gauge.gauge_painter === 'MultiChannelTrend' && (
          <TrendSeriesEditor gauge={gauge} updateGauge={updateGauge} />
        )}

        <div className="property-section">
          <h4>Положение и размер</h4>
          <div className="property-row">
            <PercentField
              label="X (%)"
              value={gauge.relative_x ?? 0}
              onChange={(v) => updateGauge({ relative_x: v })}
            />
            <PercentField
              label="Y (%)"
              value={gauge.relative_y ?? 0}
              onChange={(v) => updateGauge({ relative_y: v })}
            />
          </div>
          <div className="property-row">
            <PercentField
              label="Ширина (%)"
              value={gauge.relative_width ?? 0.25}
              onChange={(v) => updateGauge({ relative_width: v })}
            />
            <PercentField
              label="Высота (%)"
              value={gauge.relative_height ?? 0.25}
              onChange={(v) => updateGauge({ relative_height: v })}
            />
          </div>
        </div>

        <div className="property-section">
          <h4>Условия и поведение</h4>
          <div className="property-group">
            <label title="Логическое выражение в стиле INI. Когда ложь, прибор скрыт. Пусто = показывать всегда.">
              Условие включения
            </label>
            <input
              type="text"
              placeholder="e.g. hasLambdaSensor"
              value={gauge.enabled_condition ?? ''}
              onChange={(e) =>
                updateGauge({ enabled_condition: e.target.value.trim() ? e.target.value : null })
              }
            />
          </div>
          <div className="property-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={gauge.peak_hold ?? false}
                onChange={(e) => updateGauge({ peak_hold: e.target.checked })}
              />
              Удержание пика (показывать маркер максимума за всё время)
            </label>
          </div>
          <div className="property-group">
            <label title="Зона нечувствительности (в единицах канала) при переходах состояний предупреждение/критично.">
              Гистерезис
            </label>
            <NumberField
              label="Гистерезис"
              value={gauge.hysteresis}
              nullable
              step={0.1}
              placeholder="0"
              onChange={(v) => updateGauge({ hysteresis: v })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isIndicator(component)) {
    const indicator = component.Indicator;

    const updateIndicator = (updates: Partial<TsIndicatorConfig>) => {
      onChange({ Indicator: { ...indicator, ...updates } });
    };

    return (
      <div className="property-editor">
        <div className="property-group">
          <label>Выходной канал</label>
          <input
            type="text"
            value={indicator.output_channel}
            onChange={(e) => updateIndicator({ output_channel: e.target.value })}
          />
        </div>

        <div className="property-group">
          <label>Подпись «вкл»</label>
          <input
            type="text"
            value={indicator.on_text || ''}
            onChange={(e) => updateIndicator({ on_text: e.target.value })}
          />
        </div>

        <div className="property-group">
          <label>Подпись «выкл»</label>
          <input
            type="text"
            value={indicator.off_text || ''}
            onChange={(e) => updateIndicator({ off_text: e.target.value })}
          />
        </div>

        <div className="property-group">
          <label>Тип индикатора</label>
          <select
            value={indicator.indicator_painter || 'BasicRectangleIndicator'}
            onChange={(e) => updateIndicator({ indicator_painter: e.target.value as TsIndicatorConfig['indicator_painter'] })}
          >
            <option value="BasicRectangleIndicator">Прямоугольник</option>
            <option value="BulbIndicator">Лампа</option>
            <option value="Led">Светодиод</option>
          </select>
        </div>

        <div className="property-group">
          <label title="Логическое выражение в стиле INI. Когда ложь, индикатор скрыт.">
            Условие включения
          </label>
          <input
            type="text"
            placeholder="e.g. hasIacStepper"
            value={indicator.enabled_condition ?? ''}
            onChange={(e) =>
              updateIndicator({ enabled_condition: e.target.value.trim() ? e.target.value : null })
            }
          />
        </div>

        <div className="property-section">
          <h4>Положение и размер</h4>
          <div className="property-row">
            <PercentField
              label="X (%)"
              value={indicator.relative_x ?? 0}
              onChange={(v) => updateIndicator({ relative_x: v })}
            />
            <PercentField
              label="Y (%)"
              value={indicator.relative_y ?? 0}
              onChange={(v) => updateIndicator({ relative_y: v })}
            />
          </div>
          <div className="property-row">
            <PercentField
              label="Ширина (%)"
              value={indicator.relative_width ?? 0.1}
              onChange={(v) => updateIndicator({ relative_width: v })}
            />
            <PercentField
              label="Высота (%)"
              value={indicator.relative_height ?? 0.05}
              onChange={(v) => updateIndicator({ relative_height: v })}
            />
          </div>
        </div>
      </div>
    );
  }

  return <p>Неизвестный тип компонента</p>;
}

/**
 * Editor for the extra overlay series on a `MultiChannelTrend` gauge.
 * Series 1 is always the gauge's own Output Channel / Title / Min / Max
 * (edited above); slots 2-3 are stored as `lt_seriesN_*` keys in
 * `extra_attrs` so they round-trip through the `.ltdash.xml` format
 * without requiring a schema change.
 */
function TrendSeriesEditor({
  gauge,
  updateGauge,
}: {
  gauge: TsGaugeConfig;
  updateGauge: (updates: Partial<TsGaugeConfig>) => void;
}) {
  const attrs = gauge.extra_attrs || {};

  const setAttr = (key: string, value: string) => {
    const next = { ...attrs };
    if (value) next[key] = value;
    else delete next[key];
    updateGauge({ extra_attrs: next });
  };

  const seriesSlots = [2, 3] as const;

  return (
    <div className="property-section">
      <h4>Серии тренда (наложение каналов)</h4>
      <p className="property-hint">
        График всегда строит выходной канал выше как серию 1. Добавьте здесь до двух дополнительных каналов для наложения на тот же график, каждый масштабируется по своим мин/макс.
      </p>
      {seriesSlots.map((n) => (
        <div key={n} className="property-subsection">
          <label className="property-subsection-label">Серия {n}</label>
          <div className="property-row">
            <div className="property-group half">
              <label>Канал</label>
              <input
                type="text"
                placeholder="e.g. boost"
                value={attrs[`lt_series${n}_channel`] || ''}
                onChange={(e) => setAttr(`lt_series${n}_channel`, e.target.value)}
              />
            </div>
            <div className="property-group half">
              <label>Подпись</label>
              <input
                type="text"
                placeholder="e.g. BOOST"
                value={attrs[`lt_series${n}_label`] || ''}
                onChange={(e) => setAttr(`lt_series${n}_label`, e.target.value)}
              />
            </div>
          </div>
          <div className="property-row">
            <div className="property-group half">
              <label>Мин.</label>
              <input
                type="number"
                value={attrs[`lt_series${n}_min`] ?? ''}
                onChange={(e) => setAttr(`lt_series${n}_min`, e.target.value)}
              />
            </div>
            <div className="property-group half">
              <label>Макс.</label>
              <input
                type="number"
                value={attrs[`lt_series${n}_max`] ?? ''}
                onChange={(e) => setAttr(`lt_series${n}_max`, e.target.value)}
              />
            </div>
          </div>
          <div className="property-group">
            <label>Цвет</label>
            <input
              type="color"
              value={attrs[`lt_series${n}_color`] || '#94a3b8'}
              onChange={(e) => setAttr(`lt_series${n}_color`, e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
