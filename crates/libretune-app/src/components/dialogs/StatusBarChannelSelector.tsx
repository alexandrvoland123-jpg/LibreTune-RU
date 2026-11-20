import { useState } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, X, Plus, Lightbulb } from 'lucide-react';
import './StatusBarChannelSelector.css';

interface ChannelInfo {
  name?: string;
  label?: string;
  units?: string;
}

export interface StatusBarChannelSelectorProps {
  selectedChannels: string[];
  availableChannels: (string | ChannelInfo)[];
  onChannelsChange: (channels: string[]) => void;
  maxChannels?: number;
}

/**
 * StatusBarChannelSelector Component
 * 
 * Allows users to select which ECU channels to display in status bar.
 * Features:
 * - Add/remove channels
 * - Reorder via drag-drop
 * - Preview how many fit per row
 * - Keyboard navigation
 * - Remember selection
 */
export default function StatusBarChannelSelector({
  selectedChannels,
  availableChannels,
  onChannelsChange,
  maxChannels = 8,
}: StatusBarChannelSelectorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');

  // Normalize channels to ChannelInfo format - ensure name is always a string
  const normalizedChannels = availableChannels.map(ch => 
    typeof ch === 'string' ? { name: ch, label: ch } : { name: ch?.name ?? '', label: ch?.label, units: ch?.units }
  ).filter(ch => ch.name); // Filter out any with empty names

  const selectedSet = new Set(selectedChannels);
  const unselectedChannels = normalizedChannels.filter(ch => !selectedSet.has(ch.name || ''));
  const filteredUnselected = unselectedChannels.filter(ch =>
    (ch.name ?? '').toLowerCase().includes(filterText.toLowerCase()) ||
    (ch.label && ch.label.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleAddChannel = (channelName: string) => {
    if (selectedChannels.length < maxChannels) {
      onChannelsChange([...selectedChannels, channelName]);
      setFilterText('');
    }
  };

  const handleRemoveChannel = (index: number) => {
    const newChannels = selectedChannels.filter((_, i) => i !== index);
    onChannelsChange(newChannels);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newChannels = [...selectedChannels];
    const [draggedItem] = newChannels.splice(draggedIndex, 1);
    newChannels.splice(index, 0, draggedItem);
    onChannelsChange(newChannels);
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newChannels = [...selectedChannels];
      [newChannels[index - 1], newChannels[index]] = [newChannels[index], newChannels[index - 1]];
      onChannelsChange(newChannels);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < selectedChannels.length - 1) {
      const newChannels = [...selectedChannels];
      [newChannels[index], newChannels[index + 1]] = [newChannels[index + 1], newChannels[index]];
      onChannelsChange(newChannels);
    }
  };

  const handleResetToDefaults = () => {
    // Default safe channels that fit in most status bars
    const defaultChannels = ['rpm', 'afr', 'map', 'coolant'].filter(
      name => normalizedChannels.some(ch => ch.name === name)
    );
    onChannelsChange(defaultChannels);
  };

  const channelLabels = new Map(normalizedChannels.map(ch => [ch.name, ch]));

  return (
    <div className="channel-selector">
      <div className="selector-header">
        <h4>Каналы строки состояния</h4>
        <p className="selector-description">
          Выберите не более {maxChannels} каналов для отображения в строке состояния. Перетаскивайте для изменения порядка. Кнопки правки меняют порядок.
        </p>
      </div>

      {/* Selected Channels */}
      <div className="selected-section">
        <div className="section-header">
          <label>Выбранные каналы ({selectedChannels.length}/{maxChannels})</label>
          <button
            className="reset-btn"
            onClick={handleResetToDefaults}
            title="Сбросить к каналам по умолчанию"
          >
            <RotateCcw size={14} /> Сбросить к значениям по умолчанию
          </button>
        </div>

        {selectedChannels.length === 0 ? (
          <div className="empty-state">
            Каналы не выбраны. Нажмите «Добавить канал» ниже, чтобы начать.
          </div>
        ) : (
          <div className="selected-list">
            {selectedChannels.map((channelName, index) => {
              const ch = channelLabels.get(channelName);
              return (
                <div
                  key={`selected-${index}`}
                  className="channel-item selected"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(index, e)}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <div className="channel-info">
                    <span className="channel-name">{ch?.name}</span>
                    {ch?.label && <span className="channel-label">{ch.label}</span>}
                    {ch?.units && <span className="channel-units">{ch.units}</span>}
                  </div>
                  <div className="channel-controls">
                    <button
                      className="arrow-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Вверх"
                      aria-label={`Move ${ch?.name} up`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="arrow-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedChannels.length - 1}
                      title="Вниз"
                      aria-label={`Move ${ch?.name} down`}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveChannel(index)}
                      title="Удалить канал"
                      aria-label={`Remove ${ch?.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Channels */}
      {selectedChannels.length < maxChannels && (
        <div className="available-section">
          <div className="section-header">
            <label>Доступные каналы</label>
            <span className="available-count">{filteredUnselected.length} available</span>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Поиск каналов..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Поиск доступных каналов"
          />

          {filteredUnselected.length === 0 ? (
            <div className="empty-state">
              {filterText ? 'Нет каналов, подходящих под поиск.' : 'Все доступные каналы уже выбраны.'}
            </div>
          ) : (
            <div className="available-list">
              {filteredUnselected.map((ch) => (
                <div key={ch.name} className="channel-item available">
                  <div className="channel-info">
                    <span className="channel-name">{ch.name}</span>
                    {ch.label && <span className="channel-label">{ch.label}</span>}
                    {ch.units && <span className="channel-units">{ch.units}</span>}
                  </div>
                  <button
                    className="add-btn"
                    onClick={() => handleAddChannel(ch.name ?? '')}
                    title="Добавить канал"
                    aria-label={`Add ${ch.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="info-box">
        <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <Lightbulb size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong>Совет:</strong> Строка состояния показывает {Math.floor(12 / 1.5)} каналов по умолчанию. При подключении к ЭБУ для большего числа каналов может потребоваться постраничная загрузка.</span>
        </p>
      </div>
    </div>
  );
}
