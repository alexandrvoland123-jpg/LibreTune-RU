
import { Dialog, Button } from '../../common';

interface Props {
  // New
  newOpen: boolean;
  newName: string;
  onNewNameChange: (v: string) => void;
  onNewClose: () => void;
  onNewCreate: () => void;

  // Rename
  renameOpen: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameClose: () => void;
  onRenameConfirm: () => void;

  // Delete
  deleteOpen: boolean;
  deleteTargetName: string;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
}

/**
 * New / Rename / Delete dashboard dialogs.
 * Extracted from TsDashboard during Phase C4.
 */
export default function DashboardManagementDialogs({
  newOpen,
  newName,
  onNewNameChange,
  onNewClose,
  onNewCreate,
  renameOpen,
  renameValue,
  onRenameValueChange,
  onRenameClose,
  onRenameConfirm,
  deleteOpen,
  deleteTargetName,
  onDeleteClose,
  onDeleteConfirm,
}: Props) {
  return (
    <>
      {/* New Dashboard Dialog */}
      <Dialog open={newOpen} onClose={onNewClose} title="Новая панель" size="sm">
        <Dialog.Body>
          <label>Название панели:</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="Моя панель"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onNewCreate()}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="secondary" onClick={onNewClose}>Отмена</Button>
          <Button variant="primary" onClick={onNewCreate} disabled={!newName.trim()}>
            Создать
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Rename Dashboard Dialog */}
      <Dialog open={renameOpen} onClose={onRenameClose} title="Переименовать панель" size="sm">
        <Dialog.Body>
          <label>Новое имя:</label>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            placeholder="Название панели"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onRenameConfirm()}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="secondary" onClick={onRenameClose}>Отмена</Button>
          <Button variant="primary" onClick={onRenameConfirm} disabled={!renameValue.trim()}>
            Переименовать
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={onDeleteClose} title="Удалить панель?" size="sm">
        <Dialog.Body>
          <p>Вы уверены, что хотите удалить «{deleteTargetName}"?</p>
          <p className="warning">Это действие нельзя отменить.</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="secondary" onClick={onDeleteClose}>Отмена</Button>
          <Button variant="danger" onClick={onDeleteConfirm}>Удалить</Button>
        </Dialog.Footer>
      </Dialog>
    </>
  );
}
