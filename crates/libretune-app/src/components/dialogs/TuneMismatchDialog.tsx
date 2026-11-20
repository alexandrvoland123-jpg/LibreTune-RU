import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Button } from '../common';
import DialogRenderer from './DialogRenderer';
import { DialogValueSourceProvider, type DialogValueSource } from './DialogValueSource';
import type { DialogDefinition, BackendTableData, CurveData } from './types';
import './TuneMismatchDialog.css';

export interface TuneMismatchInfo {
  ecu_pages: number[];
  project_pages: number[];
  diff_pages: number[];
}

interface TuneMismatchDialogProps {
  isOpen: boolean;
  mismatchInfo: TuneMismatchInfo | null;
  onClose: () => void;
  onUseProject: () => void;
  onUseECU: () => void;
}

interface DialogIndexEntry {
  name: string;
  title: string;
  changed_count: number;
}

interface DialogView {
  name: string;
  title: string;
  definition: DialogDefinition;
  changed_names: string[];
  project_numbers: Record<string, number>;
  ecu_numbers: Record<string, number>;
  project_strings: Record<string, string>;
  ecu_strings: Record<string, string>;
  project_tables: Record<string, BackendTableData>;
  ecu_tables: Record<string, BackendTableData>;
  project_curves: Record<string, CurveData>;
  ecu_curves: Record<string, CurveData>;
}

function toSource(
  view: DialogView,
  side: 'project' | 'ecu',
): DialogValueSource {
  return {
    readOnly: true,
    changedNames: new Set(view.changed_names),
    numbers: side === 'project' ? view.project_numbers : view.ecu_numbers,
    strings: side === 'project' ? view.project_strings : view.ecu_strings,
    tables: side === 'project' ? view.project_tables : view.ecu_tables,
    curves: side === 'project' ? view.project_curves : view.ecu_curves,
  };
}

export default function TuneMismatchDialog({
  isOpen,
  mismatchInfo,
  onClose,
  onUseProject,
  onUseECU,
}: TuneMismatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [index, setIndex] = useState<DialogIndexEntry[]>([]);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<DialogView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setView(null);
    setViewError(null);
    setApplyError(null);
    invoke<DialogIndexEntry[]>('get_tune_mismatch_dialog_index')
      .then(setIndex)
      .catch((err) => setViewError(String(err)));
  }, [isOpen]);

  const current = index[page] ?? null;

  useEffect(() => {
    if (!isOpen || !current) {
      setView(null);
      return;
    }
    let cancelled = false;
    setViewError(null);
    invoke<DialogView>('get_tune_mismatch_dialog_view', { name: current.name })
      .then((result) => {
        if (!cancelled) setView(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setView(null);
          setViewError(String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, current]);

  useEffect(() => {
    if (!isOpen || page + 1 >= index.length) return;
    const next = index[page + 1];
    if (!next) return;
    invoke('get_tune_mismatch_dialog_view', { name: next.name }).catch(() => {});
  }, [isOpen, page, index]);

  const projectSource = useMemo(() => (view ? toSource(view, 'project') : null), [view]);
  const ecuSource = useMemo(() => (view ? toSource(view, 'ecu') : null), [view]);

  if (!isOpen || !mismatchInfo) return null;

  const apply = async (cmd: 'use_project_tune' | 'use_ecu_tune', after: () => void) => {
    setIsLoading(true);
    setApplyError(null);
    try {
      await invoke(cmd);
      after();
      onClose();
    } catch (err) {
      setApplyError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const pageCount = Math.max(index.length, 1);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Отчёт о различиях"
      size="xl"
      className="tune-mismatch-dialog"
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Dialog.Body className="tune-mismatch-body">
        <p className="tune-mismatch-lead">
          Есть различия между настройками в LibreTune и настройками, найденными в ЭБУ. Просмотрите каждую страницу и выберите, какие настройки оставить.
        </p>

        <div className="tune-diff-columns">
          <section className="tune-diff-pane">
            <h3>Текущие настройки LibreTune</h3>
            {view && projectSource && (
              <DialogValueSourceProvider value={projectSource}>
                <DialogRenderer
                  definition={view.definition}
                  onBack={() => {}}
                  openTable={() => {}}
                  context={view.project_numbers}
                />
              </DialogValueSourceProvider>
            )}
          </section>
          <section className="tune-diff-pane">
            <h3>Настройки в ЭБУ</h3>
            {view && ecuSource && (
              <DialogValueSourceProvider value={ecuSource}>
                <DialogRenderer
                  definition={view.definition}
                  onBack={() => {}}
                  openTable={() => {}}
                  context={view.ecu_numbers}
                />
              </DialogValueSourceProvider>
            )}
          </section>
        </div>

        {!view && !viewError && current && (
          <p className="tune-mismatch-diff-status">Загрузка диалога…</p>
        )}
        {!current && !viewError && (
          <p className="tune-mismatch-diff-status">
            Различающихся именованных настроек INI нет. Неиспользуемые байты страниц могут отличаться; «Использовать настройки LibreTune» эти байты не придумает.
          </p>
        )}
        {viewError && <p className="tune-mismatch-diff-status error">{viewError}</p>}
        {applyError && <p className="tune-mismatch-diff-status error">{applyError}</p>}
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          variant="secondary"
          disabled={isLoading || page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Назад
        </Button>
        <span className="tune-diff-page">
          Страница {index.length === 0 ? 0 : page + 1} of {index.length}
        </span>
        <Button
          variant="secondary"
          disabled={isLoading || page + 1 >= index.length}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          Далее
        </Button>
        <span className="tune-diff-footer-spacer" />
        <Button
          variant="primary"
          disabled={isLoading}
          onClick={() => apply('use_project_tune', onUseProject)}
        >
          {isLoading ? 'Выполняется…' : 'Использовать настройки LibreTune'}
        </Button>
        <Button variant="secondary" disabled={isLoading} onClick={onClose}>
          Игнорировать
        </Button>
        <Button
          variant="secondary"
          disabled={isLoading}
          onClick={() => apply('use_ecu_tune', onUseECU)}
        >
          Использовать настройки ЭБУ
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
