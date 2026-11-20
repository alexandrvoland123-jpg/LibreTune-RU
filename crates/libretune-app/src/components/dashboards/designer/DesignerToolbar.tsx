import {
  Undo2, Redo2, Copy, Clipboard, Trash2, Grid3X3, Save, X,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
} from 'lucide-react';

interface DesignerToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasClipboard: boolean;
  hasSelection: boolean;
  showGrid: boolean;
  gridSnap: number;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onShowGridChange: (v: boolean) => void;
  onGridSnapChange: (v: number) => void;
  onSave: () => void;
  onExit: () => void;
  /** Plan v2 / D-7a — align selection to canvas. Disabled when no selection. */
  onAlign?: (edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
}

export default function DesignerToolbar({
  canUndo,
  canRedo,
  hasClipboard,
  hasSelection,
  showGrid,
  gridSnap,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onShowGridChange,
  onGridSnapChange,
  onSave,
  onExit,
  onAlign,
}: DesignerToolbarProps) {
  return (
    <div className="designer-toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onUndo} disabled={!canUndo} title="Отменить (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="toolbar-btn" onClick={onRedo} disabled={!canRedo} title="Повторить (Ctrl+Y)">
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onCopy} disabled={!hasSelection} title="Копировать (Ctrl+C)">
          <Copy size={16} />
        </button>
        <button className="toolbar-btn" onClick={onPaste} disabled={!hasClipboard} title="Вставить (Ctrl+V)">
          <Clipboard size={16} />
        </button>
        <button className="toolbar-btn danger" onClick={onDelete} disabled={!hasSelection} title="Удалить (Del)">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${showGrid ? 'active' : ''}`}
          onClick={() => onShowGridChange(!showGrid)}
          title="Переключить сетку"
        >
          <Grid3X3 size={16} />
        </button>
        <select
          className="toolbar-select"
          value={gridSnap}
          onChange={(e) => onGridSnapChange(parseInt(e.target.value))}
          title="Размер шага сетки"
        >
          <option value={0}>Без привязки</option>
          <option value={1}>1%</option>
          <option value={2}>2%</option>
          <option value={5}>5%</option>
          <option value={10}>10%</option>
        </select>
      </div>

      <div className="toolbar-separator" />

      {onAlign && (
        <>
          <div className="toolbar-group" title="Выровнять выделенное по холсту">
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('left')} title="По левому краю">
              <AlignStartVertical size={16} />
            </button>
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('hcenter')} title="По центру по горизонтали">
              <AlignCenterVertical size={16} />
            </button>
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('right')} title="По правому краю">
              <AlignEndVertical size={16} />
            </button>
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('top')} title="По верхнему краю">
              <AlignStartHorizontal size={16} />
            </button>
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('vcenter')} title="По центру по вертикали">
              <AlignCenterHorizontal size={16} />
            </button>
            <button className="toolbar-btn" disabled={!hasSelection} onClick={() => onAlign('bottom')} title="По нижнему краю">
              <AlignEndHorizontal size={16} />
            </button>
          </div>
          <div className="toolbar-separator" />
        </>
      )}

      <div className="toolbar-group">
        <button className="toolbar-btn primary" onClick={onSave} title="Сохранить панель (Ctrl+S)">
          <Save size={16} />
          <span>Сохранить</span>
        </button>
        <button className="toolbar-btn" onClick={onExit} title="Выйти из режима дизайнера">
          <X size={16} />
          <span>Выход</span>
        </button>
      </div>
    </div>
  );
}
