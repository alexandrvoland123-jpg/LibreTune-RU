import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, Button, FormField } from "../common";
import {
  GeneratableTableKind,
  generatableTableLabel,
} from "../../utils/tableGenerator";

interface GenerateTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** INI name/map of the table being generated (backend classifies it). */
  tableName: string;
  /** What kind of table this is, used for the title/copy. */
  kind: GeneratableTableKind;
  /** The table's current X axis (RPM) bins. */
  rpmBins: number[];
  /** The table's current Y axis (load) bins. */
  loadBins: number[];
  /** Called with the freshly generated grid (and optionally rebuilt axes). */
  onApply: (result: { zValues: number[][]; xBins?: number[]; yBins?: number[] }) => void;
}

interface GenerateTableResult {
  table_type: string;
  z_values: number[][];
  x_bins?: number[];
  y_bins?: number[];
}

/**
 * TunerStudio-style single-table generator. Seeds the open VE / ignition / AFR
 * table from basic engine parameters, over the table's *current* axes. The
 * result is handed back to the editor and applied through the normal edit
 * pipeline (so it lands in undo history and is only burned deliberately).
 */
export default function GenerateTableDialog({
  isOpen,
  onClose,
  tableName,
  kind,
  rpmBins,
  loadBins,
  onApply,
}: GenerateTableDialogProps) {
  const [fuelType, setFuelType] = useState("Gasoline");
  const [aspiration, setAspiration] = useState("NA");
  const [strokeType, setStrokeType] = useState("four_stroke");
  const [idleRpm, setIdleRpm] = useState(800);
  const [redlineRpm, setRedlineRpm] = useState(6500);
  const [boostKpa, setBoostKpa] = useState<string>("");
  const [wotAfr, setWotAfr] = useState<string>("");
  const [octane, setOctane] = useState<string>("93");
  const [compressionRatio, setCompressionRatio] = useState<string>("10.5");
  const [combustionChamber, setCombustionChamber] = useState("quench_two_valve");
  const [rebuildAxes, setRebuildAxes] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBoosted = aspiration === "Turbo" || aspiration === "Supercharged";
  const label = generatableTableLabel(kind);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await invoke<GenerateTableResult>("generate_table_values", {
        tableName,
        rpmBins,
        loadBins,
        // Fields that drive the VE/ignition/AFR surface shape:
        fuelType,
        aspiration,
        strokeType,
        idleRpm,
        redlineRpm,
        // Boost entered in psi (gauge); convert to absolute kPa for the model.
        boostTargetKpa:
          isBoosted && boostKpa ? 101.325 + parseFloat(boostKpa) * 6.89476 : null,
        targetWotAfr: wotAfr ? parseFloat(wotAfr) : null,
        // Spark-map knock model (ignition only).
        octane: kind === "ignition" && octane ? parseFloat(octane) : null,
        compressionRatio:
          kind === "ignition" && compressionRatio ? parseFloat(compressionRatio) : null,
        combustionChamber: kind === "ignition" ? combustionChamber : null,
        rebuildAxes,
        // Required by the command but not used by these generators — sensible
        // defaults keep the dialog focused on what actually changes the map.
        cylinderCount: 4,
        displacementCc: 2000,
        injectorSizeCc: 440,
        injectionMode: "sequential",
        ignitionMode: "wasted_spark",
      });

      if (!result?.z_values?.length) {
        setError("Генератор не вернул данных.");
        return;
      }
      onApply({ zValues: result.z_values, xBins: result.x_bins, yBins: result.y_bins });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`Generate ${label}`}
      size="md"
      closeOnBackdrop={!generating}
      closeOnEscape={!generating}
    >
      <Dialog.Body>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Начальное значение <b>{label}</b> по базовым параметрам двигателя, по текущим осям этой таблицы ({rpmBins.length} × {loadBins.length}). The result is
          added to your edit history — review it, then burn when you're happy.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <FormField label="Топливо">
            {(id) => (
              <select
                id={id}
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                {["Gasoline", "E85", "E100", "Methanol", "LPG"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="Наддув/атмосфера">
            {(id) => (
              <select
                id={id}
                value={aspiration}
                onChange={(e) => setAspiration(e.target.value)}
              >
                <option value="NA">Атмосферный</option>
                <option value="Turbo">С турбонаддувом</option>
                <option value="Supercharged">С нагнетателем</option>
              </select>
            )}
          </FormField>

          <FormField label="Ход поршня">
            {(id) => (
              <select
                id={id}
                value={strokeType}
                onChange={(e) => setStrokeType(e.target.value)}
              >
                <option value="four_stroke">4-тактный</option>
                <option value="two_stroke">2-тактный</option>
              </select>
            )}
          </FormField>

          <FormField label="Обороты холостого хода">
            {(id) => (
              <input
                id={id}
                type="number"
                value={idleRpm}
                min={300}
                max={2000}
                onChange={(e) => setIdleRpm(parseInt(e.target.value) || 0)}
              />
            )}
          </FormField>

          <FormField label="Обороты отсечки">
            {(id) => (
              <input
                id={id}
                type="number"
                value={redlineRpm}
                min={2000}
                max={12000}
                onChange={(e) => setRedlineRpm(parseInt(e.target.value) || 0)}
              />
            )}
          </FormField>

          {isBoosted && (
            <FormField label="Макс. наддув (psi)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  step="0.5"
                  value={boostKpa}
                  placeholder="15"
                  onChange={(e) => setBoostKpa(e.target.value)}
                />
              )}
            </FormField>
          )}

          {kind === "ignition" && (
            <FormField label="Камера сгорания">
              {(id) => (
                <select
                  id={id}
                  value={combustionChamber}
                  onChange={(e) => setCombustionChamber(e.target.value)}
                >
                  <option value="open_chamber">Открытая камера (больше опережения)</option>
                  <option value="quench_two_valve">2-клапанный квенч (типовой)</option>
                  <option value="swirl_multi_valve">Многоклапанный вихрь (меньше опережения)</option>
                </select>
              )}
            </FormField>
          )}

          {(kind === "afr" || kind === "ve") && (
            <FormField label="Целевой AFR на WOT (необязательно)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  step="0.1"
                  value={wotAfr}
                  placeholder="auto"
                  onChange={(e) => setWotAfr(e.target.value)}
                />
              )}
            </FormField>
          )}

          {kind === "ignition" && (
            <FormField label="Октановое число топлива (AKI)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  step="1"
                  value={octane}
                  placeholder="93"
                  onChange={(e) => setOctane(e.target.value)}
                />
              )}
            </FormField>
          )}

          {kind === "ignition" && (
            <FormField label="Степень сжатия (x:1)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  step="0.1"
                  value={compressionRatio}
                  placeholder="10.5"
                  onChange={(e) => setCompressionRatio(e.target.value)}
                />
              )}
            </FormField>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
          <input
            type="checkbox"
            checked={rebuildAxes}
            onChange={(e) => setRebuildAxes(e.target.checked)}
          />
          <span>Перестроить оси оборотов/нагрузки по холостому ходу и отсечке</span>
        </label>

        {error && (
          <div style={{ color: "var(--color-error, #d33)", marginTop: "0.75rem" }}>
            {error}
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose} disabled={generating}>
          Отмена
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generating || redlineRpm <= idleRpm}
        >
          {generating ? "Генерация…" : `Generate ${label}`}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
