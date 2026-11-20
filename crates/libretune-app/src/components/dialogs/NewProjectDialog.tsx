import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Wrench } from "lucide-react";
import { Dialog, Button } from "../common";
import "./NewProjectDialog.css";

interface IniEntry {
  id: string;
  name: string;
  signature: string;
  path: string;
}

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inis: IniEntry[];
  /** Called after an INI is imported via Browse, so parent can update the list */
  onIniImported?: (entry: IniEntry) => void;
  /** Creates a project with the given INI. Returns true on success. */
  onCreateProject: (projectName: string, iniId: string) => Promise<boolean>;
  /** Called when user chooses to import an existing tune file */
  onImportTune: (tunePath: string) => void;
  /** Called when user chooses to generate a base map */
  onGenerateBaseMap: () => void;
}

type Step = "select-ini" | "choose-tune";

export default function NewProjectDialog({
  isOpen,
  onClose,
  inis,
  onIniImported,
  onCreateProject,
  onImportTune,
  onGenerateBaseMap,
}: NewProjectDialogProps) {
  const [step, setStep] = useState<Step>("select-ini");
  const [projectName, setProjectName] = useState("");
  const [selectedIni, setSelectedIni] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [browsing, setBrowsing] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep("select-ini");
      setProjectName("");
      setSelectedIni("");
      setCreating(false);
      setError("");
      setBrowsing(false);
    }
  }, [isOpen]);

  async function handleCreate() {
    if (!projectName.trim() || !selectedIni) return;
    setCreating(true);
    setError("");
    try {
      const success = await onCreateProject(projectName.trim(), selectedIni);
      if (success) {
        setStep("choose-tune");
      }
    } catch (e) {
      setError(`Failed to create project: ${e}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleBrowseIni() {
    setBrowsing(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "INI Definition", extensions: ["ini"] }],
      });
      if (selected && typeof selected === "string") {
        const entry = await invoke<IniEntry>("import_ini", { sourcePath: selected });
        // Notify parent to update its INI list
        onIniImported?.(entry);
        // Auto-select the newly imported INI
        setSelectedIni(entry.id);
      }
    } catch (e) {
      setError(`Failed to import INI: ${e}`);
    } finally {
      setBrowsing(false);
    }
  }

  async function handleImportTune() {
    try {
      const path = await open({
        multiple: false,
        filters: [
          { name: "Tune Files", extensions: ["msq", "xml"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (path && typeof path === "string") {
        onImportTune(path);
        onClose();
      }
    } catch (e) {
      console.error("Error browsing for tune:", e);
    }
  }

  function handleGenerateBaseMap() {
    onGenerateBaseMap();
    onClose();
  }

  function handleSkip() {
    // Close dialog — project is already created with empty/default tune
    onClose();
  }

  if (!isOpen) return null;

  const canCreate = projectName.trim() && selectedIni;
  const title = step === "select-ini" ? "Новый проект" : "Проект создан";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      className="new-project-dialog"
      closeOnBackdrop={!creating && !browsing}
      closeOnEscape={!creating && !browsing}
    >
      <Dialog.Body className="new-project-content">

        {step === "select-ini" && (
          <>
            <p className="dialog-subtitle">
              Выберите определение ЭБУ (INI) и назовите проект.
            </p>

            <div className="field-group">
              <label className="field-label">Определение ЭБУ (INI)</label>
              <div className="ini-select-row">
                {inis.length > 0 ? (
                  <select
                    className="ini-select"
                    value={selectedIni}
                    onChange={(e) => setSelectedIni(e.target.value)}
                  >
                    <option value="">Выберите определение ЭБУ...</option>
                    {inis.map((ini) => (
                      <option key={ini.id} value={ini.id}>
                        {ini.name} — {ini.signature}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="no-ini-placeholder">
                    Файлы INI не найдены — выберите файл для импорта
                  </div>
                )}
                <button
                  className="browse-ini-btn"
                  onClick={handleBrowseIni}
                  disabled={browsing}
                  title="Выбрать файл определения INI"
                >
                  {browsing ? "..." : "Browse..."}
                </button>
              </div>
            </div>

            {/* Project name */}
            <div className="field-group">
              <label className="field-label">Название проекта</label>
              <input
                type="text"
                className="name-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. My SR20 Build"
                onKeyDown={(e) => { if (e.key === "Enter" && canCreate) handleCreate(); }}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}
          </>
        )}

        {step === "choose-tune" && (
          <>
            <p className="dialog-subtitle">
              Как вы хотите начать тюнинг?
            </p>

            <div className="tune-choice-cards">
              <button className="tune-choice-card" onClick={handleImportTune}>
                <span className="choice-icon"><FolderOpen size={32} /></span>
                <span className="choice-label">Импорт существующего тюна</span>
                <span className="choice-desc">
                  Загрузить существующий файл тюна .msq или .xml в этот проект
                </span>
              </button>

              <button className="tune-choice-card" onClick={handleGenerateBaseMap}>
                <span className="choice-icon"><Wrench size={32} /></span>
                <span className="choice-label">Создать базовую карту</span>
                <span className="choice-desc">
                  Создайте безопасный стартовый тюн по параметрам вашего двигателя
                </span>
              </button>
            </div>
          </>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        {step === "select-ini" ? (
          <>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!canCreate || creating}>
              {creating ? "Creating..." : "Создать проект"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={handleSkip}>
            Пропустить — начать со значений по умолчанию
          </Button>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
