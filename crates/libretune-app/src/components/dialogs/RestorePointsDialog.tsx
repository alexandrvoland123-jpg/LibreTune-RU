//! Restore Points Dialog
//!
//! Allows user to view, load, and delete restore points for the current project.
//! Shows warning when loading if there are unsaved changes.

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock, Trash2, RotateCcw, AlertTriangle, FileArchive } from "lucide-react";
import { Dialog, Button } from '../common';
import "./RestorePointsDialog.css";

export interface RestorePointInfo {
  filename: string;
  path: string;
  created: string;
  size_bytes: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tuneModified: boolean;
  onRestorePointLoaded: () => void;
}

export default function RestorePointsDialog({
  isOpen,
  onClose,
  tuneModified,
  onRestorePointLoaded,
}: Props) {
  const [restorePoints, setRestorePoints] = useState<RestorePointInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  
  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);

  // Load restore points when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadRestorePoints();
    }
  }, [isOpen]);

  const loadRestorePoints = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const points = await invoke<RestorePointInfo[]>("list_restore_points");
      setRestorePoints(points);
    } catch (e) {
      console.error("Failed to load restore points:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestorePoint = async () => {
    setActionInProgress("creating");
    setError(null);
    
    try {
      await invoke("create_restore_point");
      await loadRestorePoints();
    } catch (e) {
      console.error("Failed to create restore point:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLoad = async (filename: string) => {
    // If tune is modified, show confirmation first
    if (tuneModified && !confirmLoad) {
      setConfirmLoad(filename);
      return;
    }
    
    setConfirmLoad(null);
    setActionInProgress(filename);
    setError(null);
    
    try {
      await invoke("load_restore_point", { filename });
      onRestorePointLoaded();
      onClose();
    } catch (e) {
      console.error("Failed to load restore point:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (filename: string) => {
    // Show confirmation first
    if (!confirmDelete || confirmDelete !== filename) {
      setConfirmDelete(filename);
      return;
    }
    
    setConfirmDelete(null);
    setActionInProgress(filename);
    setError(null);
    
    try {
      await invoke("delete_restore_point", { filename });
      await loadRestorePoints();
    } catch (e) {
      console.error("Failed to delete restore point:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const titleNode = (
    <>
      <FileArchive size={18} />
      Точки восстановления
    </>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={titleNode}
      size="md"
      className="restore-points-dialog"
      closeOnBackdrop={actionInProgress === null}
      closeOnEscape={actionInProgress === null}
    >
      <Dialog.Body className="restore-points-content">
          {error && (
            <div className="restore-points-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Load confirmation dialog */}
          {confirmLoad && (
            <div className="restore-points-confirm">
              <AlertTriangle size={16} className="warning-icon" />
              <div className="confirm-message">
                <strong>Несохранённые изменения будут потеряны</strong>
                <p>Загрузка этой точки восстановления отменит ваши текущие несохранённые изменения. Продолжить?</p>
              </div>
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmLoad(null)}>
                  Отмена
                </button>
                <button className="btn-danger" onClick={() => handleLoad(confirmLoad)}>
                  Всё равно загрузить
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation dialog */}
          {confirmDelete && (
            <div className="restore-points-confirm">
              <AlertTriangle size={16} className="warning-icon" />
              <div className="confirm-message">
                <strong>Удалить точку восстановления?</strong>
                <p>Это действие нельзя отменить.</p>
              </div>
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>
                  Отмена
                </button>
                <button className="btn-danger" onClick={() => handleDelete(confirmDelete)}>
                  Удалить
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="restore-points-loading">Загрузка точек восстановления...</div>
          ) : restorePoints.length === 0 ? (
            <div className="restore-points-empty">
              <FileArchive size={48} />
              <p>Точек восстановления пока нет</p>
              <span>Создайте точку восстановления, чтобы сохранить резервную копию текущего тюна.</span>
            </div>
          ) : (
            <div className="restore-points-list">
              {restorePoints.map((point) => (
                <div
                  key={point.filename}
                  className={`restore-point-item ${actionInProgress === point.filename ? "loading" : ""}`}
                >
                  <div className="restore-point-info">
                    <div className="restore-point-name">{point.filename}</div>
                    <div className="restore-point-meta">
                      <span className="restore-point-date">
                        <Clock size={12} />
                        {formatDate(point.created)}
                      </span>
                      <span className="restore-point-size">{formatSize(point.size_bytes)}</span>
                    </div>
                  </div>
                  <div className="restore-point-actions">
                    <button
                      className="btn-load"
                      onClick={() => handleLoad(point.filename)}
                      disabled={actionInProgress !== null}
                      title="Загрузить эту точку восстановления"
                    >
                      <RotateCcw size={14} />
                      Загрузить
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(point.filename)}
                      disabled={actionInProgress !== null}
                      title="Удалить эту точку восстановления"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Dialog.Body>

      {/* Footer */}
      <Dialog.Footer className="restore-points-footer">
        <span className="restore-points-count">
          {restorePoints.length} точка восстановления{restorePoints.length !== 1 ? "s" : ""}
        </span>
        <div className="footer-actions">
          <Button
            variant="primary"
            onClick={handleCreateRestorePoint}
            disabled={actionInProgress !== null}
          >
            {actionInProgress === "creating" ? "Creating..." : "Создать точку восстановления"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  );
}
