# Контроль версий и перенос калибровок

LibreTune использует Git для контроля версий файлов калибровок и структурную идентификацию для обнаружения несовместимости с версиями INI.

## Интеграция с Git

### Структура репозитория

Каждый проект LibreTune является репозиторием Git:

```
MyProject/
├── .git/                    # Метаданные Git
├── CurrentTune.msq          # Активный файл калибровки
├── ProjectSettings.json     # Настройки проекта
├── pcVariableValues.msq     # Переменные PC
├── RestorePoints/           # Резервные файлы MSQ
│   ├── 2026-02-01_14-30-00.msq
│   └── 2026-02-02_09-15-45.msq
└── dashboards/              # Пользовательские панели приборов
    └── racing.ltdash.xml
```

### Система автоматических коммитов

**События, запускающие коммит:**
1. Ручное сохранение (Ctrl+S).
2. Запись данных в ЭБУ (Burn to ECU).
3. Создание точки восстановления.
4. Закрытие проекта (если есть несохранённые изменения).

**Настройки пользователя:**
```rust
pub enum AutoCommitMode {
    Always,   // Commit every save automatically
    Never,    // Manual commits only (git command palette)
    Ask,      // Prompt user with dialog
}
```

**Формат сообщения коммита:**
```
LibreTune: {commit_type} - {timestamp}

{user_annotation}

Modified tables: {table_names}
Changed constants: {constant_names}
```

**Подстановочные значения:**
- `{date}` → 2026-02-03
- `{time}` → 14:35:22
- `{table}` → veTable1
- `{user}` → имя пользователя системы
- `{signature}` → сигнатура INI (сокращённая)

### Аннотации изменений

**Диалог аннотации пользователя:**
```
┌─────────────────────────────────────┐
│ Commit Message                      │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Adjusted VE table for E85       ││
│ │ Increased fuel by 10% across    ││
│ │ mid-range RPM                   ││
│ └─────────────────────────────────┘│
│                                     │
│     [Cancel]  [Commit]              │
└─────────────────────────────────────┘
```

**Формат хранения:**
```
commit 1a2b3c4d5e6f...
Author: Pat <pat@example.com>
Date:   Sat Feb 3 14:35:22 2026 -0800

    LibreTune: Manual save - 2026-02-03 14:35:22
    
    LT-Note: Adjusted VE table for E85
    LT-Note: Increased fuel by 10% across mid-range RPM
    
    Modified tables: veTable1Tbl
    Changed constants: crankingRpm, crankingDwell
```

**Разбор аннотаций:**
```rust
pub fn extract_annotation(commit_message: &str) -> Option<String> {
    let lines: Vec<&str> = commit_message.lines()
        .filter(|line| line.starts_with("LT-Note:"))
        .map(|line| line.strip_prefix("LT-Note:").unwrap().trim())
        .collect();
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}
```

### История коммитов

**Представление в виде временной шкалы:**
```
┌────────────────────────────────────────────┐
│ Commit History                             │
│                                            │
│ ● 2026-02-03 14:35  Manual save           │
│   1a2b3c4d                                 │
│   Adjusted VE table for E85                │
│   [View Diff] [Checkout]                   │
│                                            │
│ ● 2026-02-03 11:20  Burn to ECU           │
│   2b3c4d5e                                 │
│   Baseline tune after dyno session         │
│   [View Diff] [Checkout]                   │
│                                            │
│ ● 2026-02-02 16:45  Manual save           │
│   3c4d5e6f                                 │
│   Initial commit                           │
│   [View Diff] [Checkout]                   │
└────────────────────────────────────────────┘
```

**Просмотр различий (Diff):**
```
┌────────────────────────────────────────────┐
│ Commit Diff: 1a2b3c4d vs 2b3c4d5e         │
│                                            │
│ Modified Files:                            │
│   CurrentTune.msq                          │
│                                            │
│ Changed Constants (2):                     │
│   crankingRpm:   500 → 550 (+50)          │
│   crankingDwell: 3.5 → 4.0 (+0.5)         │
│                                            │
│ Changed Tables (1):                        │
│   veTable1Tbl: 256 cells modified          │
│   Average change: +8.3%                    │
│                                            │
│         [Close]  [Checkout This Version]   │
└────────────────────────────────────────────┘
```

### Управление ветками

**Создание ветки:**
```rust
pub fn create_branch(&self, branch_name: &str) -> Result<(), String> {
    let repo = Repository::open(&self.project_path)?;
    let head = repo.head()?;
    let commit = head.peel_to_commit()?;
    repo.branch(branch_name, &commit, false)?;
    Ok(())
}
```

**Примеры использования:**
- **Ветка baseline:** заводская калибровка от производителя.
- **Ветки разработки:** экспериментальные калибровки.
- **Ветки клиентов:** отдельные конфигурации для разных автомобилей.

**Пример рабочего процесса:**
```
main (stock tune)
├── dev/e85 (E85 conversion)
├── dev/turbo (turbo upgrade)
└── customer/john-civic (customer-specific tune)
```

## Идентификация калибровки

### Структурный хеш

**Назначение:** обнаруживать изменения определения INI, которые могут нарушить совместимость калибровки.

**Расчёт хеша:**
```rust
pub fn compute_structural_hash(def: &EcuDefinition) -> String {
    let mut hasher = Sha256::new();
    
    // Hash all non-PC constants (sorted by name for determinism)
    let mut constants: Vec<_> = def.constants.iter()
        .filter(|(_, c)| !c.is_pc_variable)
        .collect();
    constants.sort_by_key(|(name, _)| *name);
    
    for (name, c) in constants {
        hasher.update(name.as_bytes());
        hasher.update(&[c.data_type as u8]);
        hasher.update(&c.page.to_le_bytes());
        hasher.update(&c.offset.to_le_bytes());
        hasher.update(&c.scale.to_le_bytes());
    }
    
    format!("{:x}", hasher.finalize())
}
```

**Что включается в хеш:**
- имена констант;
- типы данных;
- номера страниц;
- смещения;
- коэффициенты масштабирования.

**Что НЕ включается в хеш:**
- переменные PC (настраиваются пользователем и не являются данными ЭБУ);
- свойства отображения (единицы измерения, минимум/максимум, количество знаков);
- документация (текст справки, подсказки).

### Манифест констант

**Структура:**
```rust
pub struct ConstantManifestEntry {
    pub name: String,
    pub data_type: DataType,
    pub page: u8,
    pub offset: u16,
    pub scale: f64,
    pub translate: f64,
}
```

**Хранение в файле калибровки:**
```xml
<msq>
  <bibliography>...</bibliography>
  
  <iniMetadata>
    <signature>rusEFI 2025.08.19</signature>
    <name>rusEFI Proteus F4</name>
    <hash>a1b2c3d4e5f6...</hash>
    <specVersion>1.0</specVersion>
    <savedAt>2026-02-03T14:35:22Z</savedAt>
  </iniMetadata>
  
  <constantManifest>
    <entry name="crankingRpm" type="U16" page="1" offset="0" scale="1.0" translate="0.0"/>
    <entry name="coolantTemp" type="U08" page="1" offset="10" scale="1.0" translate="-40.0"/>
    ...
  </constantManifest>
  
  <page number="0">...</page>
</msq>
```

## Перенос калибровок

### Обнаружение необходимости переноса

**При загрузке калибровки:**
```rust
pub fn load_tune(&self, path: &str) -> Result<TuneFile, String> {
    let tune = TuneFile::load_from_file(path)?;
    
    if let Some(manifest) = &tune.constant_manifest {
        let current_manifest = self.definition.generate_constant_manifest();
        let report = compare_manifests(manifest, &current_manifest);
        
        if report.severity != "none" {
            emit_event("tune:migration_needed", &report);
        }
    }
    
    Ok(tune)
}
```

**Логика сравнения:**
```rust
pub struct MigrationReport {
    pub missing_in_tune: Vec<String>,      // New constants in INI
    pub missing_in_ini: Vec<String>,       // Removed constants
    pub type_changed: Vec<ConstantChange>, // Data type changes
    pub scale_changed: Vec<ConstantChange>, // Scale/translate changes
    pub can_auto_migrate: bool,
    pub requires_user_review: bool,
    pub severity: String,  // "none", "low", "medium", "high"
}

pub struct ConstantChange {
    pub name: String,
    pub old_type: Option<DataType>,
    pub new_type: Option<DataType>,
    pub old_scale: Option<f64>,
    pub new_scale: Option<f64>,
}
```

**Уровни серьёзности:**
- **None:** манифесты идентичны, перенос не требуется.
- **Low:** добавлены только новые константы (калибровка будет работать без изменений).
- **Medium:** изменились коэффициенты масштабирования (значения нужно пересчитать).
- **High:** константы удалены или изменились их типы (возможна потеря данных).

### Диалог переноса

**Интерфейс пользователя:**
```
┌─────────────────────────────────────────────────┐
│ ⚠ Tune Migration Required                      │
│                                                 │
│ This tune was created with a different INI     │
│ version. Review the changes below:             │
│                                                 │
│ Severity: HIGH                                  │
│                                                 │
│ ❌ Type Changes (2):                            │
│   • crankingRpm: U16 → U32                     │
│   • coolantTemp: U08 → S16                     │
│                                                 │
│ ⚠ Scale Changes (3):                            │
│   • afrTable: scale 0.1 → 0.01                 │
│   • mapSensor: scale 1.0 → 0.1                 │
│   • tpsPin: scale 1.0 → 0.2                    │
│                                                 │
│ ➕ New Constants (5):                           │
│   • fuelPressure, boostTarget, ...             │
│                                                 │
│ ➖ Removed Constants (1):                       │
│   • oldInjectorType                            │
│                                                 │
│ ⚠ High severity changes may cause issues.      │
│ Consider creating a backup before proceeding.   │
│                                                 │
│       [Cancel]  [Continue with Tune]            │
└─────────────────────────────────────────────────┘
```

### Автоматический перенос

**Безопасные изменения** (выполняются автоматически):
1. **Новые константы:** получают значения по умолчанию из INI.
2. **Изменение масштабирования:** пересчитывается отображаемое значение.
   ```
   old_display = (raw_bytes * old_scale) + old_translate
   new_raw_bytes = (old_display - new_translate) / new_scale
   ```

**Изменения, требующие участия пользователя:**
1. **Изменение типа:** программа запрашивает новое значение или предлагает значение по умолчанию.
2. **Удалённые константы:** выводится предупреждение о потере данных.
3. **Изменение смещения:** рекомендуется выполнить полную повторную синхронизацию с ЭБУ.

### Точки восстановления

**Точки восстановления создаются автоматически:**
- перед переносом (состояние до переноса);
- перед переключением на другой коммит (состояние до checkout);
- при ручном сохранении (если соответствующая настройка включена).

**Стратегия очистки старых точек:**
```rust
pub fn prune_restore_points(&self, keep: usize) -> Result<(), String> {
    let mut points = self.list_restore_points()?;
    points.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    for point in points.iter().skip(keep) {
        self.delete_restore_point(&point.filename)?;
    }
    
    Ok(())
}
```

**Настройки по умолчанию:**
- хранить 20 последних точек;
- автоматическая очистка при сохранении;
- предупреждать перед удалением.

## Характеристики производительности

| Операция | Сложность | Типичное время |
|---|---|---|
| Вычисление хеша | O(n) | <1 мс (1000 констант) |
| Создание манифеста | O(n) | <1 мс |
| Сравнение манифестов | O(n + m) | <5 мс |
| Коммит Git | O(p) | <50 мс (p = изменённые страницы) |
| Git diff | O(c) | <20 мс (c = коммиты) |

## Ссылки на исходный код

- Интеграция Git: `crates/libretune-core/src/project/version_control.rs`.
- Обнаружение необходимости переноса: `crates/libretune-core/src/tune/migration.rs`.
- Структурная идентификация: `crates/libretune-core/src/ini/mod.rs` (`compute_structural_hash`).
- Интерфейс:
  - `crates/libretune-app/src/components/dialogs/MigrationReportDialog.tsx`;
  - `crates/libretune-app/src/components/tuner-ui/TuneHistoryPanel.tsx`.
- Команды Tauri: `crates/libretune-app/src-tauri/src/lib.rs`.

## См. также

- [Контроль версий](../projects/version-control.md) — руководство по функциям Git.
- [Аннотации изменений](../projects/change-annotations.md) — примечания к изменениям калибровки.
- [Точки восстановления](../projects/restore-points.md) — использование точек восстановления.
- [Настройки и предпочтения](../getting-started/settings.md) — настройка автоматических коммитов.
