import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Button } from '../../common';
import { DialogProps } from './types';
import '../Dialogs.css';

interface NewTuneDialogProps extends DialogProps {
  onCreated?: () => void;
}

export function NewTuneDialog({ isOpen, onClose, onCreated }: NewTuneDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    try {
      await invoke('new_tune');
      onCreated?.();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsCreating(false);
    }
  }, [onClose, onCreated]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Новый тюн"
      size="sm"
      closeOnBackdrop={!isCreating}
    >
      <Dialog.Body>
        {error && <div className="dialog-error">{error}</div>}

        <div className="dialog-info">
          <p>Создайте новый файл тюна для загруженного определения ЭБУ.</p>
          <p>Все несохранённые изменения текущего тюна будут потеряны.</p>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isCreating}>Отмена</Button>
        <Button variant="primary" onClick={handleCreate} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Создать новый тюн'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
