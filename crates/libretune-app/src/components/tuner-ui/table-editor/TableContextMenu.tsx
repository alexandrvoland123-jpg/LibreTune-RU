import { Check } from 'lucide-react';
import '../TableEditor.css';

interface TableContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  onResetToOriginal: () => void;
  onSetValue: () => void;
  onStepUp: () => void;
  onStepDown: () => void;
  onAddAmount: () => void;
  onSubtractAmount: () => void;
  onMultiplyBy: () => void;
  onInterpolate: () => void;
  onInterpolateHorizontal: () => void;
  onInterpolateVertical: () => void;
  onSmooth: () => void;
  onFloodFill: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSetStepAmount: () => void;
  onSetStepCount: () => void;
  onSetStepPercent: () => void;
  onToggleHeatmap: () => void;
  heatmapEnabled: boolean;
}

export default function TableContextMenu({
  x,
  y,
  onClose: _onClose,
  hasSelection,
  hasClipboard,
  onResetToOriginal,
  onSetValue,
  onStepUp,
  onStepDown,
  onAddAmount,
  onSubtractAmount,
  onMultiplyBy,
  onInterpolate,
  onInterpolateHorizontal,
  onInterpolateVertical,
  onSmooth,
  onFloodFill,
  onCopy,
  onPaste,
  onSetStepAmount,
  onSetStepCount,
  onSetStepPercent,
  onToggleHeatmap,
  heatmapEnabled,
}: TableContextMenuProps) {
  return (
    <div 
      className="table-context-menu" 
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="context-menu-item" onClick={onResetToOriginal} disabled={!hasSelection}>
        Сбросить к исходному <span className="shortcut">Esc</span>
      </button>
      
      <div className="context-menu-separator" />
      
      <button className="context-menu-item" onClick={onSetValue} disabled={!hasSelection}>
        Задать значение <span className="shortcut">=</span>
      </button>
      <button className="context-menu-item" onClick={onStepUp} disabled={!hasSelection}>
        Шаг вверх <span className="shortcut">&gt; or ,</span>
      </button>
      <button className="context-menu-item" onClick={onStepDown} disabled={!hasSelection}>
        Шаг вниз <span className="shortcut">&lt; or .</span>
      </button>
      <button className="context-menu-item" onClick={onAddAmount} disabled={!hasSelection}>
        Величина добавки <span className="shortcut">+</span>
      </button>
      <button className="context-menu-item" onClick={onSubtractAmount} disabled={!hasSelection}>
        Величина вычитания <span className="shortcut">-</span>
      </button>
      <button className="context-menu-item" onClick={onMultiplyBy} disabled={!hasSelection}>
        Умножить на <span className="shortcut">*</span>
      </button>
      
      <div className="context-menu-separator" />
      
      <button className="context-menu-item" onClick={onInterpolate} disabled={!hasSelection}>
        Автозаполнение <span className="shortcut">/</span>
      </button>
      <button className="context-menu-item" onClick={onInterpolateHorizontal} disabled={!hasSelection}>
        Заполнить по горизонтали <span className="shortcut">H</span>
      </button>
      <button className="context-menu-item" onClick={onInterpolateVertical} disabled={!hasSelection}>
        Заполнить по вертикали <span className="shortcut">V</span>
      </button>
      <button className="context-menu-item" onClick={onSmooth} disabled={!hasSelection}>
        Смешать выделенное <span className="shortcut">S</span>
      </button>
      <button className="context-menu-item" onClick={onFloodFill} disabled={!hasSelection}>
        Заливка <span className="shortcut">F</span>
      </button>
      
      <div className="context-menu-separator" />
      
      <button className="context-menu-item" onClick={onCopy} disabled={!hasSelection}>
        Копировать <span className="shortcut">Ctrl+C</span>
      </button>
      <button className="context-menu-item" onClick={onPaste} disabled={!hasClipboard}>
        Вставить <span className="shortcut">Ctrl+V</span>
      </button>
      
      <div className="context-menu-separator" />
      
      <button className="context-menu-item" onClick={onSetStepAmount}>
        Задать величину шага...
      </button>
      <button className="context-menu-item" onClick={onSetStepCount}>
        Задать множитель шага (Ctrl)...
      </button>
      <button className="context-menu-item" onClick={onSetStepPercent}>
        Задать процент шага (Shift)...
      </button>
      
      <div className="context-menu-separator" />
      
      <button className="context-menu-item" onClick={onToggleHeatmap}>
        {heatmapEnabled && <Check size={12} style={{ marginRight: 4 }} />}Цвет ячейки по значению
      </button>
    </div>
  );
}
