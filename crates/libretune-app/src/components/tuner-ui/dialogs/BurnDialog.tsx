import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Check, Flame } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Button } from '../../common';
import { DialogProps } from './types';
import '../Dialogs.css';

interface PinConflict {
  pin_label: string;
  constants: string[];
}

interface PinConflictReport {
  conflicts: PinConflict[];
}

interface BurnDialogProps extends DialogProps {
  connected: boolean;
  onBurned?: () => void;
}

export function BurnDialog({ isOpen, onClose, connected, onBurned }: BurnDialogProps) {
  const [isBurning, setIsBurning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [conflicts, setConflicts] = useState<PinConflict[]>([]);
  const [forceAck, setForceAck] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setConflicts([]);
      setForceAck(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const report = await invoke<PinConflictReport>('check_pin_conflicts');
        if (!cancelled) {
          setConflicts(report.conflicts ?? []);
        }
      } catch {
        if (!cancelled) {
          setConflicts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const hasConflicts = conflicts.length > 0;

  const handleBurn = useCallback(async () => {
    if (hasConflicts && !forceAck) {
      setError('Устраните конфликты выводов или подтвердите их, чтобы всё равно прошить.');
      return;
    }

    setIsBurning(true);
    setError(null);
    setSuccess(false);

    try {
      await invoke('burn_to_ecu', { force: hasConflicts && forceAck ? true : null });
      setSuccess(true);
      onBurned?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsBurning(false);
    }
  }, [onBurned, hasConflicts, forceAck]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Прошить в ЭБУ"
      size="md"
      closeOnBackdrop={!isBurning}
    >
      <Dialog.Body>
        {error && <div className="dialog-error" style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}
        {success && <div className="dialog-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={14} /> Прошивка успешно завершена!</div>}

        {!connected ? (
          <div className="dialog-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Нет подключения к ЭБУ. Сначала подключитесь.
          </div>
        ) : (
          <div className="dialog-info">
            <p>Это запишет все изменения из ОЗУ ЭБУ во flash-память.</p>
            <p><strong>Предупреждение:</strong> Эту операцию нельзя отменить.</p>
            <p>Убедитесь, что тюн проверен, перед прошивкой.</p>
          </div>
        )}

        {hasConflicts && (
          <div className="dialog-warning" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={14} />
              <strong>Конфликт назначения выводов</strong>
            </div>
            <p style={{ margin: '0 0 8px' }}>
              Один и тот же вывод используется несколькими выходами. Прошивка может привести ЭБУ в состояние ошибки настроек.
            </p>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              {conflicts.map((c) => (
                <li key={c.pin_label}>
                  Закрепить <strong>{c.pin_label}</strong>: {c.constants.join(', ')}
                </li>
              ))}
            </ul>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceAck}
                onChange={(e) => setForceAck(e.target.checked)}
              />
              Я понимаю — всё равно прошить
            </label>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isBurning}>Отмена</Button>
        <Button
          variant="danger"
          onClick={handleBurn}
          disabled={isBurning || !connected || (hasConflicts && !forceAck)}
        >
          {isBurning ? 'Burning...' : <><Flame size={14} /> Прошить в ЭБУ</>}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
