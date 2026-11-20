import { useState, useRef, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Activity,
  MoveHorizontal,
  MoveVertical,
  Waves,
  ArrowRight,
  ArrowDown,
  Copy,
  Clipboard,
  Lock,
  LockOpen,
  Palette,
  Wand2,
} from 'lucide-react';

interface TableContextProps {
  x: number;
  y: number;
  cellValue: number;
  position: { top: number; left: number };
  visible: boolean;
  onClose: () => void;
  // Selection / Value
  onResetSelection?: () => void;
  onSetEqual: (value: number) => void;
  
  // Nudge
  onNudge: (up: boolean, large: boolean) => void;

  // Math
  onAddOffset: (offset: number) => void;
  onScale: (factor: number) => void;

  // Interpolation & Smoothing
  onInterpolate: () => void; // Bilinear
  onInterpolateLinear: (axis: 'row' | 'col') => void;
  onSmooth: () => void;
  
  // Fill
  onFill: (direction: 'right' | 'down') => void;

  // Tools
  onLock: () => void;
  onUnlock: () => void;
  isLocked: boolean;
  
  // Clipboard
  onCopy?: () => void;
  onPaste?: () => void;
  
  // View
  onToggleHeatmap?: () => void;
  onTraceOptions?: () => void;

  // Generate (TunerStudio-style table generator). Only wired for VE/ignition/
  // AFR tables; `generatableLabel` is the human label (e.g. "VE Table").
  onGenerate?: () => void;
  generatableLabel?: string;
}

export default function TableContextMenu({
  x,
  y,
  cellValue,
  position,
  visible,
  onClose,
  onSetEqual,
  onNudge,
  onAddOffset,
  onScale,
  onInterpolate,
  onInterpolateLinear,
  onSmooth,
  onFill,
  onLock,
  onUnlock,
  isLocked,
  onCopy,
  onPaste,
  onToggleHeatmap,
  onGenerate,
  generatableLabel,
}: TableContextProps) {
  // Shared input state for Scale/Offset operations
  const [inputValue, setInputValue] = useState('1.5');
  const [inputMode, setInputMode] = useState<'scale' | 'offset'>('scale');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  // Handler helpers
  const handleExecuteInput = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return;

    if (inputMode === 'scale') {
      onScale?.(val);
    } else {
      onAddOffset?.(val);
    }
    onClose();
  };

  const handleModeSwitch = (mode: 'scale' | 'offset') => {
    setInputMode(mode);
    // Set sensible defaults if user hasn't typed a custom value effectively
    if (mode === 'scale' && (inputValue === '0' || inputValue === '')) setInputValue('1.1');
    if (mode === 'offset' && (inputValue === '1.5' || inputValue === '0' || inputValue === '1.0')) setInputValue('10');
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      onClick={e => e.stopPropagation()} 
    >
      <div className="context-menu-header">
        <div className="context-menu-title">Ячейка [{x}, {y}]</div>
        <div className="context-menu-subtitle">Знач.: {cellValue?.toFixed(2) ?? '-'}</div>
      </div>

      <div className="context-menu-section">
        <div className="context-menu-item" onClick={() => { onSetEqual(cellValue); onClose(); }}>
          <span className="icon">═</span>
          <span>Уравнять</span>
          <span className="shortcut">=</span>
        </div>
      </div>

      <div className="context-menu-separator" />

      {/* Math Operations with Input */}
      <div className="context-menu-section input-section">
        <div className="input-mode-tabs">
          <button 
            className={`tab-btn ${inputMode === 'scale' ? 'active' : ''}`} 
            onClick={(e) => { e.stopPropagation(); handleModeSwitch('scale'); }}
            title="Умножить выбранные ячейки"
          >
            Масштаб
          </button>
          <button 
            className={`tab-btn ${inputMode === 'offset' ? 'active' : ''}`} 
            onClick={(e) => { e.stopPropagation(); handleModeSwitch('offset'); }}
            title="Прибавить/вычесть из ячеек"
          >
            Смещение
          </button>
        </div>
        <div className="input-row" onClick={(e) => e.stopPropagation()}>
          <span className="operator">{inputMode === 'scale' ? '×' : '+'}</span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecuteInput()}
            autoFocus
          />
          <button className="apply-btn" onClick={handleExecuteInput}>Применить</button>
        </div>
      </div>

      <div className="context-menu-separator" />

      {/* Nudge Tools */}
      <div className="context-menu-section">
        <div className="context-menu-item" onClick={() => { onNudge(true, false); onClose(); }}>
          <span className="icon"><ChevronUp size={14} /></span>
          <span>Увеличить значение</span>
          <span className="shortcut">+</span>
        </div>
        <div className="context-menu-item" onClick={() => { onNudge(false, false); onClose(); }}>
          <span className="icon"><ChevronDown size={14} /></span>
          <span>Уменьшить значение</span>
          <span className="shortcut">-</span>
        </div>
      </div>

      <div className="context-menu-separator" />

      {/* Interpolation Tools */}
      <div className="context-menu-section">
        <div className="context-menu-item" onClick={() => { onInterpolate(); onClose(); }}>
          <span className="icon"><Activity size={14} /></span>
          <span>Интерполировать (линейно)</span>
          <span className="shortcut">L</span>
        </div>
        <div className="context-menu-item" onClick={() => { onInterpolateLinear('row'); onClose(); }}>
          <span className="icon"><MoveHorizontal size={14} /></span>
          <span>Интерполировать по горизонтали</span>
          <span className="shortcut">H</span>
        </div>
        <div className="context-menu-item" onClick={() => { onInterpolateLinear('col'); onClose(); }}>
          <span className="icon"><MoveVertical size={14} /></span>
          <span>Интерполировать по вертикали</span>
          <span className="shortcut">V</span>
        </div>
        <div className="context-menu-item" onClick={() => { onSmooth(); onClose(); }}>
          <span className="icon"><Waves size={14} /></span>
          <span>Сгладить выделенное</span>
          <span className="shortcut">S</span>
        </div>
      </div>

      <div className="context-menu-separator" />

      {/* Fill Tools */}
      <div className="context-menu-section">
        <div className="context-menu-item" onClick={() => { onFill('right'); onClose(); }}>
          <span className="icon"><ArrowRight size={14} /></span>
          <span>Заполнить строку вправо</span>
        </div>
        <div className="context-menu-item" onClick={() => { onFill('down'); onClose(); }}>
          <span className="icon"><ArrowDown size={14} /></span>
          <span>Заполнить столбец вниз</span>
        </div>
      </div>

      {onGenerate && (
        <>
          <div className="context-menu-separator" />
          <div className="context-menu-section">
            <div className="context-menu-item" onClick={() => { onGenerate(); onClose(); }}>
              <span className="icon"><Wand2 size={14} /></span>
              <span>Сгенерировать {generatableLabel ?? 'Table'}…</span>
            </div>
          </div>
        </>
      )}

      <div className="context-menu-separator" />

      {/* Clipboard / State */}
      <div className="context-menu-section">
        <div className="context-menu-item" onClick={() => { onCopy?.(); onClose(); }}>
          <span className="icon"><Copy size={14} /></span>
          <span>Копировать</span>
          <span className="shortcut">Ctrl+C</span>
        </div>
        <div className="context-menu-item" onClick={() => { onPaste?.(); onClose(); }}>
          <span className="icon"><Clipboard size={14} /></span>
          <span>Вставить</span>
          <span className="shortcut">Ctrl+V</span>
        </div>
        <div className="context-menu-item" onClick={() => { if (isLocked) onUnlock(); else onLock(); onClose(); }}>
          <span className="icon">{isLocked ? <LockOpen size={14} /> : <Lock size={14} />}</span>
          <span>{isLocked ? 'Разблокировать ячейки' : 'Блокировка ячеек'}</span>
        </div>
        {onToggleHeatmap && (
          <div className="context-menu-item" onClick={() => { onToggleHeatmap(); onClose(); }}>
            <span className="icon"><Palette size={14} /></span>
            <span>Переключить тепловую карту</span>
          </div>
        )}
      </div>
    </div>
  );
}
