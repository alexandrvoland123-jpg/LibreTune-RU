import { Copy, Clipboard, Undo2, Redo2, Flame, Crosshair, Box, Wand2, Upload, Download, ArrowUpDown } from 'lucide-react';
import '../TableEditor.css';

interface TableToolbarProps {
  onSetEqual: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onIncreaseMore: () => void;
  onDecreaseMore: () => void;
  onScale: () => void;
  onInterpolate: () => void;
  onSmooth: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onBurn?: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  canUndo: boolean;
  canRedo: boolean;
  followMode: boolean;
  onToggleFollowMode: () => void;
  hasOutputChannels: boolean;
  /** Y axis zero at bottom (rows reversed). Toggles the global table_y_axis_bottom setting. */
  yAxisBottom: boolean;
  onToggleYAxisBottom: () => void;
  show3D: boolean;
  onToggle3D: () => void;
  /** Generate the whole table from engine specs (VE/ignition/AFR only). */
  onGenerate?: () => void;
  generatableLabel?: string;
  /** TunerStudio-compatible per-table .table file import/export. */
  onImportTable?: () => void;
  onExportTable?: () => void;
}

export default function TableToolbar({
  onSetEqual,
  onIncrease,
  onDecrease,
  onIncreaseMore,
  onDecreaseMore,
  onScale,
  onInterpolate,
  onSmooth,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onBurn,
  hasSelection,
  hasClipboard,
  canUndo,
  canRedo,
  followMode,
  onToggleFollowMode,
  hasOutputChannels,
  yAxisBottom,
  onToggleYAxisBottom,
  show3D,
  onToggle3D,
  onGenerate,
  generatableLabel,
  onImportTable,
  onExportTable,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar-group">
        <button
          className="table-toolbar-btn"
          onClick={onSetEqual}
          disabled={!hasSelection}
          title="Уравнять (=)"
        >
          =
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onDecrease}
          disabled={!hasSelection}
          title="Decrease (&lt;)"
        >
          &lt;
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onIncrease}
          disabled={!hasSelection}
          title="Increase (&gt;)"
        >
          &gt;
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onDecreaseMore}
          disabled={!hasSelection}
          title="Уменьшение — вычесть величину (−)"
        >
          −
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onIncreaseMore}
          disabled={!hasSelection}
          title="Увеличение — прибавить величину (+)"
        >
          +
        </button>
      </div>

      <div className="table-toolbar-separator" />

      <div className="table-toolbar-group">
        <button
          className="table-toolbar-btn"
          onClick={onScale}
          disabled={!hasSelection}
          title="Умножить (×)"
        >
          ×
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onInterpolate}
          disabled={!hasSelection}
          title="Интерполировать (/)"
        >
          /
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onSmooth}
          disabled={!hasSelection}
          title="Сгладить (s)"
        >
          s
        </button>
      </div>

      <div className="table-toolbar-separator" />

      <div className="table-toolbar-group">
        <button
          className="table-toolbar-btn"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Копировать (Ctrl+C)"
          aria-label="Копировать"
        >
          <Copy size={14} />
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onPaste}
          disabled={!hasClipboard}
          title="Вставить (Ctrl+V)"
          aria-label="Вставить"
        >
          <Clipboard size={14} />
        </button>
      </div>

      <div className="table-toolbar-separator" />

      <div className="table-toolbar-group">
        <button
          className="table-toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
          aria-label="Отменить"
        >
          <Undo2 size={14} />
        </button>
        <button
          className="table-toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
          aria-label="Повторить"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {onBurn && (
        <>
          <div className="table-toolbar-separator" />
          <button
            className="table-toolbar-btn table-toolbar-btn-burn"
            onClick={onBurn}
            title="Прошить в ЭБУ"
          >
            <Flame size={14} /> Прошить
          </button>
        </>
      )}

      <div className="table-toolbar-separator" />
      
      <button
        className={`table-toolbar-btn table-toolbar-btn-follow ${followMode ? 'active' : ''}`}
        onClick={onToggleFollowMode}
        disabled={!hasOutputChannels}
        title={hasOutputChannels ? `Follow Mode (F) - ${followMode ? 'ВКЛ' : 'ВЫКЛ'}` : 'Режим слежения недоступен (не заданы выходные каналы)'}
      >
        <Crosshair size={14} /> Следовать
      </button>
      
      <button
        className={`table-toolbar-btn ${yAxisBottom ? 'active' : ''}`}
        onClick={onToggleYAxisBottom}
        aria-pressed={yAxisBottom}
        aria-label="Нулевое значение оси Y внизу"
        title={`Y axis zero at ${yAxisBottom ? 'bottom' : 'top'} - click to flip`}
      >
        <ArrowUpDown size={14} /> Y{yAxisBottom ? '↑' : '↓'}
      </button>

      <button
        className={`table-toolbar-btn table-toolbar-btn-3d ${show3D ? 'active' : ''}`}
        onClick={onToggle3D}
        title={`3D View - ${show3D ? 'ВКЛ' : 'ВЫКЛ'}`}
      >
        <Box size={14} /> 3D
      </button>

      {onGenerate && (
        <>
          <div className="table-toolbar-separator" />
          <button
            className="table-toolbar-btn table-toolbar-btn-generate"
            onClick={onGenerate}
            title={`Generate ${generatableLabel ?? 'table'} from engine specs`}
          >
            <Wand2 size={14} /> Сгенерировать
          </button>
        </>
      )}

      {(onImportTable || onExportTable) && (
        <>
          <div className="table-toolbar-separator" />
          {onImportTable && (
            <button
              className="table-toolbar-btn"
              onClick={onImportTable}
              title="Загрузить таблицу из файла... (.table)"
              aria-label="Загрузить таблицу из файла"
            >
              <Upload size={14} />
            </button>
          )}
          {onExportTable && (
            <button
              className="table-toolbar-btn"
              onClick={onExportTable}
              title="Сохранить таблицу в файл... (.table)"
              aria-label="Сохранить таблицу в файл"
            >
              <Download size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

