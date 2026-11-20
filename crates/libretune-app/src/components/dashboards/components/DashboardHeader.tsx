
import { Plus, Copy, Pencil, Trash2, Save, RotateCw, AlertTriangle, Compass } from 'lucide-react';
import { ValidationReport } from '../utils/validation';

interface Props {
  title: string;
  showSelector: boolean;
  onToggleSelector: () => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSyncRanges: () => void;
  validationReport: ValidationReport | null;
  onToggleValidationPanel: () => void;
  legacyMode: boolean;
  onToggleLegacyMode: () => void;
}

/**
 * Dashboard toolbar header with title and action buttons.
 * Extracted from TsDashboard during Phase C4.
 */
export default function DashboardHeader({
  title,
  onToggleSelector,
  onNew,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
  onSyncRanges,
  validationReport,
  onToggleValidationPanel,
  legacyMode,
  onToggleLegacyMode,
}: Props) {
  return (
    <div className="ts-dashboard-header">
      <div className="ts-dashboard-header-left">
        <span className="ts-dashboard-title">{title}</span>
        <button className="ts-dashboard-selector-btn" onClick={onToggleSelector}>
          Изменение ▼
        </button>
      </div>
      <div className="ts-dashboard-header-right">
        <button className="ts-dashboard-action-btn" onClick={onNew} title="Новая панель">
          <Plus size={14} /> Новый
        </button>
        <button className="ts-dashboard-action-btn" onClick={onDuplicate} title="Дублировать панель">
          <Copy size={14} /> Дублировать
        </button>
        <button className="ts-dashboard-action-btn" onClick={onRename} title="Переименовать панель">
          <Pencil size={14} /> Переименовать
        </button>
        <button className="ts-dashboard-action-btn danger" onClick={onDelete} title="Удалить панель">
          <Trash2 size={14} /> Удалить
        </button>
        <button className="ts-dashboard-action-btn" onClick={onExport} title="Экспорт панели">
          <Save size={14} /> Экспорт
        </button>
        <button
          className="ts-dashboard-action-btn"
          onClick={onSyncRanges}
          title="Синхронизировать диапазоны приборов из INI"
        >
          <RotateCw size={14} /> Синхронизировать диапазоны
        </button>
        {validationReport && (
          <button
            className={`ts-dashboard-action-btn ${
              validationReport.errors.length > 0
                ? 'danger'
                : validationReport.warnings.length > 0
                  ? 'warn'
                  : ''
            }`}
            onClick={onToggleValidationPanel}
            title="Проблемы проверки панели"
          >
            <AlertTriangle size={14} /> Проверить ({validationReport.errors.length}E/
            {validationReport.warnings.length}W)
          </button>
        )}
        <button
          className={`ts-dashboard-action-btn ${legacyMode ? 'active' : ''}`}
          onClick={onToggleLegacyMode}
          title={legacyMode ? 'Устаревшая раскладка TS включена' : 'Включить устаревшую раскладку TS'}
        >
          <Compass size={14} /> Устаревшее: {legacyMode ? 'Вкл' : 'Выкл'}
        </button>
      </div>
    </div>
  );
}
