import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Dialog, Button } from "../common";
import "./OpenTuneDialog.css";

interface MsqInfo {
  signature: string;
  version: string;
  file_name: string;
  file_size: number;
  constant_count: number;
  ini_name?: string;
  saved_at?: string;
  author?: string;
  description?: string;
}

interface IniEntry {
  id: string;
  name: string;
  signature: string;
  path: string;
}

interface OpenTuneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTune: (projectName: string, iniId: string, tunePath: string) => void;
  inis: IniEntry[];
  onImportIni: () => void;
}

export default function OpenTuneDialog({
  isOpen,
  onClose,
  onOpenTune,
  inis,
  onImportIni,
}: OpenTuneDialogProps) {
  const [tunePath, setTunePath] = useState("");
  const [msqInfo, setMsqInfo] = useState<MsqInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedIni, setSelectedIni] = useState("");
  const [matchedInis, setMatchedInis] = useState<IniEntry[]>([]);
  const [error, setError] = useState("");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTunePath("");
      setMsqInfo(null);
      setProjectName("");
      setSelectedIni("");
      setMatchedInis([]);
      setError("");
    }
  }, [isOpen]);

  // Auto-match INIs when msqInfo changes
  useEffect(() => {
    if (msqInfo) {
      const sig = msqInfo.signature.toLowerCase();
      const matched = inis.filter(
        (ini) =>
          ini.signature.toLowerCase() === sig ||
          ini.signature.toLowerCase().includes(sig) ||
          sig.includes(ini.signature.toLowerCase())
      );
      setMatchedInis(matched);
      if (matched.length === 1) {
        setSelectedIni(matched[0].id);
      } else if (matched.length === 0) {
        // Try partial match
        const partial = inis.filter((ini) => {
          const parts = sig.split(/\s+/);
          return parts.some((p) => ini.signature.toLowerCase().includes(p));
        });
        setMatchedInis(partial);
        if (partial.length === 1) {
          setSelectedIni(partial[0].id);
        }
      }
    }
  }, [msqInfo, inis]);

  async function browseTune() {
    try {
      const path = await open({
        multiple: false,
        filters: [
          { name: "Tune Files", extensions: ["msq", "xml"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (path && typeof path === "string") {
        setTunePath(path);
        setError("");
        setLoading(true);
        try {
          const info = await invoke<MsqInfo>("get_msq_info", { path });
          setMsqInfo(info);
          // Auto-generate project name from filename
          const fileName = info.file_name.replace(/\.(msq|xml)$/i, "");
          setProjectName(fileName);
        } catch (e) {
          setError(`Failed to read tune file: ${e}`);
          setMsqInfo(null);
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error("Error browsing for tune:", e);
    }
  }

  function handleCreate() {
    if (!projectName.trim() || !selectedIni || !tunePath) return;
    onOpenTune(projectName.trim(), selectedIni, tunePath);
  }

  if (!isOpen) return null;

  const canCreate = projectName.trim() && selectedIni && tunePath;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Открыть файл тюна"
      size="md"
      className="open-tune-dialog"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <Dialog.Body className="open-tune-content">
        <p className="dialog-subtitle">
          Выберите файл тюна (.msq) и определение ЭБУ, чтобы создать проект.
        </p>

        {/* File picker */}
        <div className="field-group">
          <label className="field-label">Файл тюна</label>
          <div className="file-picker">
            <input
              type="text"
              readOnly
              value={tunePath ? tunePath.split(/[\\/]/).pop() || tunePath : ""}
              placeholder="Файл не выбран"
              className="file-input"
            />
            <button className="browse-btn" onClick={browseTune}>
              Обзор...
            </button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {loading && <div className="loading-msg">Чтение файла тюна...</div>}

        {/* MSQ Info preview */}
        {msqInfo && (
          <div className="msq-preview">
            <div className="preview-row">
              <span className="preview-label">Сигнатура:</span>
              <span className="preview-value">{msqInfo.signature}</span>
            </div>
            <div className="preview-row">
              <span className="preview-label">Константы:</span>
              <span className="preview-value">{msqInfo.constant_count}</span>
            </div>
            {msqInfo.author && (
              <div className="preview-row">
                <span className="preview-label">Автор:</span>
                <span className="preview-value">{msqInfo.author}</span>
              </div>
            )}
            <div className="preview-row">
              <span className="preview-label">Размер:</span>
              <span className="preview-value">
                {(msqInfo.file_size / 1024).toFixed(1)} КБ
              </span>
            </div>
          </div>
        )}

        {/* INI selector */}
        {msqInfo && (
          <div className="field-group">
            <label className="field-label">Определение ЭБУ (INI)</label>
            {matchedInis.length > 0 ? (
              <select
                className="ini-select"
                value={selectedIni}
                onChange={(e) => setSelectedIni(e.target.value)}
              >
                <option value="">Выберите определение ЭБУ...</option>
                {matchedInis.map((ini) => (
                  <option key={ini.id} value={ini.id}>
                    {ini.name} — {ini.signature}
                  </option>
                ))}
                {/* Show all INIs below a divider if there are unmatched ones */}
                {inis.length > matchedInis.length && (
                  <>
                    <option disabled>── Все определения ──</option>
                    {inis
                      .filter((i) => !matchedInis.find((m) => m.id === i.id))
                      .map((ini) => (
                        <option key={ini.id} value={ini.id}>
                          {ini.name} — {ini.signature}
                        </option>
                      ))}
                  </>
                )}
              </select>
            ) : (
              <div className="no-ini-match">
                <p>Для сигнатуры этого тюна не найдено подходящего определения ЭБУ.</p>
                <button className="import-ini-btn" onClick={onImportIni}>
                  Импорт определения ЭБУ...
                </button>
                <select
                  className="ini-select"
                  value={selectedIni}
                  onChange={(e) => setSelectedIni(e.target.value)}
                  style={{ marginTop: 8 }}
                >
                  <option value="">Выбрать вручную...</option>
                  {inis.map((ini) => (
                    <option key={ini.id} value={ini.id}>
                      {ini.name} — {ini.signature}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Project name */}
        {msqInfo && selectedIni && (
          <div className="field-group">
            <label className="field-label">Название проекта</label>
            <input
              type="text"
              className="name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Мой тюн"
            />
          </div>
        )}

        {/* Actions */}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button variant="primary" onClick={handleCreate} disabled={!canCreate}>Открыть</Button>
      </Dialog.Footer>
    </Dialog>
  );
}
