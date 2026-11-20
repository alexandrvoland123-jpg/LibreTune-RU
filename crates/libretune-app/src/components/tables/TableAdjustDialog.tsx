import { Dialog, Button, FormField } from '../common';
import type { TableAdjustKind } from '../../utils/tableAdjustInput';

const COPY: Record<TableAdjustKind, { title: string; label: string; help: string }> = {
  add: {
    title: 'Увеличить',
    label: 'Сколько добавить',
    help: 'Добавляется к каждой выбранной ячейке. Пример: 10',
  },
  sub: {
    title: 'Уменьшить',
    label: 'Сколько вычесть',
    help: 'Вычитается из каждой выбранной ячейки. Пример: 10',
  },
  mul: {
    title: 'Умножить',
    label: 'Множитель',
    help: '1.1 = +10%, 0.9 = −10%.',
  },
};

interface Props {
  open: boolean;
  kind: TableAdjustKind;
  raw: string;
  error: string | null;
  cellCount: number;
  onChange: (raw: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function TableAdjustDialog({
  open,
  kind,
  raw,
  error,
  cellCount,
  onChange,
  onClose,
  onApply,
}: Props) {
  const copy = COPY[kind];
  return (
    <Dialog open={open} onClose={onClose} size="sm" title={copy.title}>
      <Dialog.Body>
        <FormField
          label={copy.label}
          help={`${copy.help} ${cellCount} cell(s).`}
          error={error}
        >
          {(id) => (
            <input
              id={id}
              type="text"
              inputMode="decimal"
              autoFocus
              value={raw}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onApply();
                }
              }}
            />
          )}
        </FormField>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={onApply}>
          Применить
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
