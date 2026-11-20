import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, Button, FormField } from "../common";
import "./BaseMapDialog.css";

interface BaseMapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user applies — passes the generated map JSON for the caller to use */
  onApply: (baseMap: BaseMapResult) => void;
  /** Whether a project is already open (affects the "apply" button label) */
  hasProject: boolean;
}

export interface BaseMapResult {
  engine_spec: EngineSpecValues;
  rpm_bins: number[];
  load_bins: number[];
  ve_table: number[][];
  ignition_table: number[][];
  afr_table: number[][];
  cranking_enrichment: [number, number][];
  warmup_enrichment: [number, number][];
  accel_enrichment: { tps_threshold: number; enrichment_pct: number; duration_cycles: number; taper_pct: number };
  iac: { cold_start_pct: number; warm_idle_pct: number; warm_threshold_c: number };
  prime_pulse_ms: number;
  req_fuel: number;
  scalars: Record<string, number>;
}

interface EngineSpecValues {
  cylinder_count: number;
  displacement_cc: number;
  injector_size_cc: number;
  fuel_type: string;
  aspiration: string;
  stroke_type: string;
  injection_mode: string;
  ignition_mode: string;
  idle_rpm: number;
  redline_rpm: number;
  boost_target_kpa?: number;
  target_wot_afr?: number;
}

export default function BaseMapDialog({
  isOpen,
  onClose,
  onApply,
  hasProject,
}: BaseMapDialogProps) {
  const [cylinders, setCylinders] = useState(4);
  const [displacement, setDisplacement] = useState(2000);
  const [injectorSize, setInjectorSize] = useState(440);
  const [fuelType, setFuelType] = useState("Gasoline");
  const [aspiration, setAspiration] = useState("NA");
  const [strokeType, setStrokeType] = useState("four_stroke");
  const [injectionMode, setInjectionMode] = useState("Sequential");
  const [ignitionMode, setIgnitionMode] = useState("wasted_spark");
  const [idleRpm, setIdleRpm] = useState(800);
  const [redlineRpm, setRedlineRpm] = useState(6500);
  const [boostTarget, setBoostTarget] = useState(200);
  const [wotAfr, setWotAfr] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BaseMapResult | null>(null);
  const [error, setError] = useState("");
  const [previewTab, setPreviewTab] = useState<"ve" | "ign" | "afr" | "enrich">("ve");

  const isBoosted = aspiration === "Turbo" || aspiration === "Supercharged";

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const map = await invoke<BaseMapResult>("generate_base_map", {
        cylinderCount: cylinders,
        displacementCc: displacement,
        injectorSizeCc: injectorSize,
        fuelType,
        aspiration,
        strokeType,
        injectionMode,
        ignitionMode,
        idleRpm,
        redlineRpm,
        boostTargetKpa: isBoosted ? boostTarget : null,
        targetWotAfr: wotAfr ? parseFloat(wotAfr) : null,
      });
      setResult(map);
    } catch (e) {
      setError(`Generation failed: ${e}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleApply() {
    if (result) {
      onApply(result);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Создать базовую карту"
      size="lg"
      className="basemap-dialog"
      closeOnBackdrop={!generating}
      closeOnEscape={!generating}
    >
      <Dialog.Body className="basemap-body">
        <p className="basemap-subtitle">
          Создайте безопасный стартовый тюн, на котором можно ездить, по параметрам вашего двигателя.
        </p>

        {!result ? (
          <div className="basemap-form">
            <div className="basemap-grid">
              <FormField label="Цилиндры">
                {(id) => (
                  <select id={id} value={cylinders} onChange={(e) => setCylinders(parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}
              </FormField>

              <FormField label="Рабочий объём (см³)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={displacement}
                    onChange={(e) => setDisplacement(parseFloat(e.target.value) || 0)}
                    min={50}
                    max={15000}
                  />
                )}
              </FormField>

              <FormField label="Размер форсунки (см³/мин)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={injectorSize}
                    onChange={(e) => setInjectorSize(parseFloat(e.target.value) || 0)}
                    min={50}
                    max={5000}
                  />
                )}
              </FormField>

              <FormField label="Тип топлива">
                {(id) => (
                  <select id={id} value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                    <option value="Gasoline">Бензин</option>
                    <option value="E85">E85</option>
                    <option value="E100">E100</option>
                    <option value="Methanol">Метанол</option>
                    <option value="LPG">Газ (СУГ) / пропан</option>
                  </select>
                )}
              </FormField>

              <FormField label="Наддув/атмосфера">
                {(id) => (
                  <select id={id} value={aspiration} onChange={(e) => setAspiration(e.target.value)}>
                    <option value="NA">Атмосферный</option>
                    <option value="Turbo">С турбонаддувом</option>
                    <option value="Supercharged">С нагнетателем</option>
                  </select>
                )}
              </FormField>

              <FormField label="Тип хода">
                {(id) => (
                  <select id={id} value={strokeType} onChange={(e) => setStrokeType(e.target.value)}>
                    <option value="four_stroke">4-тактный</option>
                    <option value="two_stroke">2-тактный</option>
                  </select>
                )}
              </FormField>

              <FormField label="Режим впрыска">
                {(id) => (
                  <select id={id} value={injectionMode} onChange={(e) => setInjectionMode(e.target.value)}>
                    <option value="Sequential">Последовательный</option>
                    <option value="Batch">Пакетный</option>
                    <option value="Simultaneous">Одновременный</option>
                    <option value="throttle_body">Дроссельный узел</option>
                  </select>
                )}
              </FormField>

              <FormField label="Режим зажигания">
                {(id) => (
                  <select id={id} value={ignitionMode} onChange={(e) => setIgnitionMode(e.target.value)}>
                    <option value="wasted_spark">Холостая искра</option>
                    <option value="coil_on_plug">Катушка на свече</option>
                    <option value="distributor">Распределитель</option>
                  </select>
                )}
              </FormField>

              <FormField label="Обороты холостого хода">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={idleRpm}
                    onChange={(e) => setIdleRpm(parseInt(e.target.value) || 500)}
                    min={400}
                    max={2000}
                  />
                )}
              </FormField>

              <FormField label="Обороты отсечки">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={redlineRpm}
                    onChange={(e) => setRedlineRpm(parseInt(e.target.value) || 6000)}
                    min={2000}
                    max={20000}
                  />
                )}
              </FormField>

              {isBoosted && (
                <FormField
                  label="Цель по наддуву (кПа абс.)"
                  help={`${((boostTarget - 101.325) / 100).toFixed(1)} bar / ${((boostTarget - 101.325) * 0.145).toFixed(1)} psi gauge`}
                >
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      value={boostTarget}
                      onChange={(e) => setBoostTarget(parseFloat(e.target.value) || 150)}
                      min={120}
                      max={400}
                    />
                  )}
                </FormField>
              )}

              <FormField label="Целевой AFR на WOT (необязательно)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={wotAfr}
                    onChange={(e) => setWotAfr(e.target.value)}
                    placeholder="Авто (безопасный расширенный)"
                    step={0.1}
                  />
                )}
              </FormField>
            </div>

            {error && <div className="basemap-error">{error}</div>}
          </div>
        ) : (
          <div className="basemap-preview">
            <div className="preview-summary">
              <span>reqFuel: <b>{result.req_fuel.toFixed(1)} ms</b></span>
              <span>Прайм: <b>{result.prime_pulse_ms.toFixed(1)} ms</b></span>
              <span>Диапазон оборотов: <b>{result.rpm_bins[0]}–{result.rpm_bins[result.rpm_bins.length - 1]}</b></span>
            </div>

            <div className="preview-tabs">
              <button className={previewTab === "ve" ? "active" : ""} onClick={() => setPreviewTab("ve")}>Таблица VE</button>
              <button className={previewTab === "ign" ? "active" : ""} onClick={() => setPreviewTab("ign")}>Зажигание</button>
              <button className={previewTab === "afr" ? "active" : ""} onClick={() => setPreviewTab("afr")}>Цель AFR</button>
              <button className={previewTab === "enrich" ? "active" : ""} onClick={() => setPreviewTab("enrich")}>Обогащения</button>
            </div>

            <div className="preview-content">
              {previewTab === "ve" && <TablePreview table={result.ve_table} rpms={result.rpm_bins} loads={result.load_bins} unit="%" />}
              {previewTab === "ign" && <TablePreview table={result.ignition_table} rpms={result.rpm_bins} loads={result.load_bins} unit="°" />}
              {previewTab === "afr" && <TablePreview table={result.afr_table} rpms={result.rpm_bins} loads={result.load_bins} unit="" />}
              {previewTab === "enrich" && (
                <div className="enrich-preview">
                  <h4>Обогащение при прокрутке</h4>
                  <div className="enrich-curve">
                    {result.cranking_enrichment.map(([temp, pct], i) => (
                      <div key={i} className="curve-point">
                        <span>{temp}°C</span><span>{pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                  <h4>Обогащение при прогреве</h4>
                  <div className="enrich-curve">
                    {result.warmup_enrichment.map(([temp, pct], i) => (
                      <div key={i} className="curve-point">
                        <span>{temp}°C</span><span>{pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                  <h4>Обогащение при ускорении</h4>
                  <div className="enrich-detail">
                    <span>Порог TPS: {result.accel_enrichment.tps_threshold}%/sec</span>
                    <span>Обогащение: {result.accel_enrichment.enrichment_pct}%</span>
                    <span>Длительность: {result.accel_enrichment.duration_cycles} cycles</span>
                  </div>
                  <h4>Регулятор холостого хода</h4>
                  <div className="enrich-detail">
                    <span>Холодный пуск: {result.iac.cold_start_pct}%</span>
                    <span>Тёплый холостой ход: {result.iac.warm_idle_pct}%</span>
                    <span>Порог прогрева: {result.iac.warm_threshold_c}°C</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        {!result ? (
          <>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generating || displacement < 50 || injectorSize < 50}
            >
              {generating ? "Generating..." : "Создать базовую карту"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setResult(null)}>← Изменить параметры</Button>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button variant="primary" onClick={handleApply}>
              {hasProject ? "Применить к текущему тюну" : "Использовать как стартовый тюн"}
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}

/** Mini table preview grid */
function TablePreview({
  table,
  rpms,
  loads,
  unit,
}: {
  table: number[][];
  rpms: number[];
  loads: number[];
  unit: string;
}) {
  const step = table.length > 12 ? 2 : 1;
  const rowIndices = Array.from({ length: Math.ceil(table.length / step) }, (_, i) => i * step);
  const colIndices = Array.from({ length: Math.ceil(rpms.length / step) }, (_, i) => i * step);

  return (
    <div className="table-preview-container">
      <table className="table-preview">
        <thead>
          <tr>
            <th className="corner">kPa\RPM</th>
            {colIndices.map((c) => (
              <th key={c}>{rpms[c]?.toFixed(0)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rowIndices].reverse().map((r) => (
            <tr key={r}>
              <th>{loads[r]?.toFixed(0)}</th>
              {colIndices.map((c) => {
                const val = table[r]?.[c] ?? 0;
                return (
                  <td key={c} title={`${val}${unit}`}>
                    {val.toFixed(val % 1 === 0 ? 0 : 1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
