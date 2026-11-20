import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Dialog, Button } from '../../common';
import { DialogProps, TuneInfo } from './types';
import '../Dialogs.css';

interface SaveDialogProps extends DialogProps {
  onSaved?: (path: string) => void;
  autoBurnOnClose?: boolean;
}

export function SaveDialog({ isOpen, onClose, onSaved, autoBurnOnClose }: SaveDialogProps) {
  const [tuneInfo, setTuneInfo] = useState<TuneInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      invoke<TuneInfo>('get_tune_info')
        .then(setTuneInfo)
        .catch((e) => setError(String(e)));
    }
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const path = await invoke<string>('save_tune', { path: null });
      onSaved?.(path);

      // Auto-burn on close with confirmation
      if (autoBurnOnClose) {
        setShowBurnConfirm(true);
      } else {
        onClose();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  }, [onClose, onSaved, autoBurnOnClose]);

  // Handle burn after save with confirmation
  const handleBurnConfirm = useCallback(async () => {
    setShowBurnConfirm(false);
    try {
      await invoke('burn_to_ecu');
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }, [onClose]);

  const handleBurnCancel = useCallback(() => {
    setShowBurnConfirm(false);
    onClose();
  }, [onClose]);

  const handleSaveAs = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const selected = await save({
        title: 'Сохранить тюн как',
        filters: [
          { name: 'MSQ Tune File', extensions: ['msq'] },
          { name: 'JSON Tune File', extensions: ['json'] },
        ],
        defaultPath: tuneInfo?.path || undefined,
      });
      
      if (selected) {
        const path = await invoke<string>('save_tune_as', { path: selected });
        onSaved?.(path);
        onClose();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  }, [onClose, onSaved, tuneInfo]);

  if (!isOpen && !showBurnConfirm) return null;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        title="Сохранить тюн"
        size="md"
        closeOnBackdrop={!isSaving}
      >
        <Dialog.Body>
          {error && <div className="dialog-error">{error}</div>}

          <div className="dialog-info">
            <p><strong>ЭБУ:</strong> {tuneInfo?.signature || 'Unknown'}</p>
            {tuneInfo?.path && (
              <p><strong>Текущий файл:</strong> {tuneInfo.path.split('/').pop()}</p>
            )}
            {tuneInfo?.modified && (
              <p className="dialog-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> В тюне есть несохранённые изменения
              </p>
            )}
          </div>

          <div className="dialog-help">
            <p>Сохраните тюн в файл для резервной копии или переноса.</p>
            <p><strong>Формат MSQ</strong> совместим с другим ПО для тюнинга ЭБУ.</p>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          <Button variant="secondary" onClick={handleSaveAs} disabled={isSaving}>Сохранить как...</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !tuneInfo?.path}
          >
            {isSaving ? 'Saving...' : 'Сохранить'}
          </Button>
        </Dialog.Footer>
      </Dialog>

      {showBurnConfirm && (
        <Dialog
          open
          onClose={handleBurnCancel}
          title="Прошить тюн в ЭБУ?"
          size="sm"
        >
          <Dialog.Body>
            <p>Тюн успешно сохранён. Прошить его в ЭБУ сейчас?</p>
            <p className="dialog-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> Это запишет данные в память ЭБУ и может занять несколько секунд.
            </p>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="secondary" onClick={handleBurnCancel}>Отмена</Button>
            <Button variant="primary" onClick={handleBurnConfirm}>Прошить в ЭБУ</Button>
          </Dialog.Footer>
        </Dialog>
      )}
    </>
  );
}
