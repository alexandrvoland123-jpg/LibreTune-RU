# Парсер INI

Парсер INI отвечает за чтение файлов описания ЭБУ и преобразование их в структурированные данные, которые LibreTune использует для редактирования, обмена данными и проверки конфигурации.

## Обзор формата файла

В INI-файлах определяются:
- **Константы** — настраиваемые параметры (скаляры, массивы, битовые поля)
- **Таблицы** — двумерные и трёхмерные таблицы с определениями осей
- **Меню** — иерархическая структура навигации
- **Диалоговые окна** — экраны настроек с расположением полей
- **Выходные каналы** — структура данных реального времени
- **Приборы** — конфигурации индикаторов приборной панели

## Архитектура парсера

### Потоковый парсер за один проход

Парсер читает файл один раз и постепенно формирует структуры данных:

```
File → Lines → Section Detection → Section Parser → Data Structures
```

**Преимущества:**
- Низкое потребление памяти (абстрактное синтаксическое дерево AST не создаётся)
- Высокая скорость разбора (не требуется несколько проходов)
- Ошибки обнаруживаются сразу

**Сложность:** O(n), где n — размер файла.

### Конечный автомат состояний

```rust
struct ParserState {
    current_section: Section,
    current_page: u8,
    last_offset: u16,           // For lastOffset keyword
    nested_depth: u32,          // For nested menus/dialogs
    line_number: usize,         // For error messages
}
```

## Разбор разделов

### [MegaTune] — метаданные

```ini
[MegaTune]
MTversion   = 2.25
queryCommand = "S"
signature   = "rusEFI 2025.08.19"
```

**Разбираемые поля:**
- `queryCommand` — команда для получения сигнатуры ЭБУ.
- `signature` — ожидаемая сигнатура прошивки ЭБУ (сравнение строк).

**Сопоставление сигнатур:**
```rust
pub enum SignatureMatchType {
    Exact,      // Byte-for-byte match
    Partial,    // ECU signature contains INI signature
    Mismatch,   // No match
}
```

### [Constants] — настраиваемые параметры

#### Скалярные константы

```ini
page = 1
crankingRpm = scalar, U16, 0, "rpm", 1, 0, 0, 3000, 0
```

**Формат:** `name = scalar, type, offset, units, scale, translate, min, max, digits` (имя, тип, смещение, единицы, масштаб, смещение значения, минимум, максимум, число знаков).

**Структура после разбора:**
```rust
pub struct Constant {
    pub name: String,
    pub data_type: DataType,     // U08, S16, U32, F32, etc.
    pub page: u8,
    pub offset: u16,
    pub units: String,
    pub scale: f64,
    pub translate: f64,
    pub min: f64,
    pub max: f64,
    pub digits: u8,
}
```

**Система типов:**
```rust
pub enum DataType {
    U08,   // Unsigned 8-bit  (0-255)
    S08,   // Signed 8-bit    (-128 to 127)
    U16,   // Unsigned 16-bit (0-65535)
    S16,   // Signed 16-bit   (-32768 to 32767)
    U32,   // Unsigned 32-bit
    S32,   // Signed 32-bit
    F32,   // 32-bit float
}
```

**Преобразование значений** (исходные байты ↔ отображаемое значение):
```
display_value = (raw_bytes * scale) + translate
raw_bytes = (display_value - translate) / scale
```

**Пример:**
```ini
coolantTemp = scalar, U08, 10, "°C", 1.0, -40.0, -40, 150, 0
```
- Raw byte: 80
- Display: (80 × 1.0) + (-40) = 40°C

#### Константы-массивы (таблицы)

```ini
veTable = array, U08, 100, [16x16], "VE", 0.5, 0, 0, 127.5, 1
```

**Формат:** `name = array, type, offset, [rows x cols], units, scale, translate, min, max, digits` (имя, тип, смещение, число строк и столбцов, единицы, масштаб, смещение значения, минимум, максимум, число знаков).

**Специальное ключевое слово:** `lastOffset`.
```ini
afrTable = array, U08, lastOffset, [16x16], "AFR", 0.1, 0, 7, 25.5, 1
```

`lastOffset` = смещение предыдущей константы + размер предыдущей константы.

#### Битовые константы (битовые поля)

```ini
engineType = bits, U08, 5, [0:1], "Gasoline", "E85", "Diesel", "Methanol"
```

**Формат:** `name = bits, type, offset, [start_bit:end_bit], "value0", "value1", ...` (имя, тип, смещение, диапазон битов, текстовые варианты).

**Извлечение битов:**
```rust
fn extract_bits(byte: u8, start: u8, end: u8) -> u8 {
    let mask = ((1 << (end - start + 1)) - 1) << start;
    (byte & mask) >> start
}
```

**Пример:**
- Byte value: 0b00101101
- Bits [2:4]: (0b00101101 & 0b00011100) >> 2 = 0b011 = 3

### [Menu] — структура навигации

```ini
menu = "&Fuel"
    subMenu = veTable, "VE &Table"
    subMenu = afrTable, "AFR Ta&ble"
menu = "&Ignition"
    subMenu = ignTable, "Ignition &Table"
```

**Структура после разбора:**
```rust
pub enum MenuItem {
    Menu { label: String, children: Vec<MenuItem> },
    SubMenu { label: String, target: String },
    Separator,
    Std(String),  // std_realtime, std_ms2gentherm, etc.
}
```

**Специальные цели:**
- `std_separator` — горизонтальный разделитель.
- `std_realtime` — открывает приборную панель.
- `std_port_edit` — открывает редактор портов ввода-вывода.
- Имена таблиц — открывают редактор таблиц.
- Имена диалогов — открывают диалог настроек.

**Встроенные панели `std_*`**, на которые ссылаются через `panel = std_*` внутри `dialog`, не определяются в INI директивой `dialog =` — это стандартные панели TunerStudio. LibreTune формирует их динамически на основе констант, фактически присутствующих в `[Constants]` (`EcuDefinition::std_panel_definition`):
- `std_injection` — константы Required Fuel / впрыска (`reqFuel`, `nCylinders`, `injType`, `divider`, `alternate`, `nInjectors`, `injOpen`). Отсутствующие элементы пропускаются, поэтому одна и та же панель адаптируется к Speeduino/MS2/MS3, несмотря на небольшие различия в именах.
- `std_ms3Rtc` — часы реального времени (Real Time Clock, `rtc_trim`); доступность управляется условием `{rtc_mode}` во внешнем диалоге.
Для остальных панелей `std_*`, которые генератор не поддерживает (например, `std_ms2gentherm`, `std_ms3SdConsole`), вместо них отображается понятная заглушка Label.

**Сочетания клавиш:** префикс `&` отмечает символ горячей клавиши.

### [UserDefined] — диалоговые окна

Здесь определяются экраны настроек, на которые ссылается `subMenu`. Каждая директива `dialog =` начинает новое определение; директивы с отступом добавляют в него компоненты.

```ini
dialog = moreIgnitionOptions2, ""
    field = "Use Prediction", use_prediction
    checkbox = "Use Prediction", use_prediction, { !use_prediction }
    checkbox = "Don't use Prediction", use_prediction, flipValue, { use_prediction }
    panel = std_injection, North
    commandButton = "Apply Defaults", cmd_apply_defaults, { !use_prediction }
```

**Разбираемые директивы** → варианты `DialogComponent`:

| Директива | Вариант | Примечания |
|---|---|---|
| `field` | `Field` | Подпись и константа; условия в фигурных скобках (одно — доступность, два — видимость и доступность) |
| `checkbox` | `Checkbox` | Подпись и константа; необязательный токен `flipValue` инвертирует логику (установлен ⇄ 0); условия в фигурных скобках работают так же, как для `field` |
| `slider` | `Slider` | Подпись и константа, связанные с регулятором диапазона; необязательный параметр ориентации `horizontal`/`vertical` (без учёта регистра); условия в фигурных скобках работают так же, как для `field` |
| `displayOnlyField` | `DisplayOnlyField` | Строка только для чтения: при наличии константы показывает её текущее значение (для `bits` — текст варианта); без константы (`blankfield`) отображается текстовая строка с условием; префиксы подписи `#`/`!` задают оформление заголовка/примечания |
| `topicHelp` (dialog context) | `DialogDefinition.topic_help` | Внешний URL справки отображается как ссылка в заголовке |
| `panel` | `Panel` | Встраивает диалог/панель индикаторов/показаний; порядок условий TunerStudio (`{enable}, {visibility}`) |
| `runtimeValue` | `RuntimeValue` | Отображение выходного канала в реальном времени |
| `liveGraph` / `graphLine` | `LiveGraph` | Заглушка графика реального времени |
| `table` | `Table` | Встроенный редактор таблиц |
| `indicator` | `Indicator` | Двухпозиционный индикатор |
| `commandButton` | `CommandButton` | Команда контроллера; необязательные флаги `clickOnClose*` |
| `settingSelector` / `settingOption` | `SettingSelector` | Раскрывающийся список предустановок, применяющий назначения констант |
| `gauge` | `Gauge` | Встроенный прибор |
| `field` with no constant | `Label` | Односоставная запись `field = "text"` становится статической подписью; `#` обозначает заголовок раздела, `!` — примечание |

Неподдерживаемые директивы без уведомления пропускаются в соответствии с мягкой стратегией восстановления парсера (см. [Восстановление после ошибок](#восстановление-после-ошибок)). В настоящее время это только `menuDialog` — подсказка TunerStudio о расположении главного окна, которой нет аналога в LibreTune и которая намеренно игнорируется.

### [TableEditor] — определения таблиц

```ini
table = veTableTbl, veTableMap, "VE Table", 1
    topicHelp = "veTableHelp"
    xBins = rpmBins, RPM
    yBins = mapBins, MAP
    zBins = veTable
    gridHeight = 2.0
    gridOrient = 250, 0, 340
    upDownLabel = "(RICHER)", "(LEANER)"
```

**Структура после разбора:**
```rust
pub struct TableDefinition {
    pub name: String,
    pub map_name: Option<String>,  // For menu lookup
    pub title: String,
    pub page: u8,
    pub x_axis: String,            // Constant name for X bins
    pub y_axis: String,            // Constant name for Y bins
    pub z_values: String,          // Constant name for Z values
    pub grid_height: Option<f32>,
    pub grid_orient: Option<(f32, f32, f32)>,
}
```

**Системы координат:**
- **Координаты таблицы:** `(row, col)`, где `row=0` — нижняя строка, `col=0` — левый столбец.
- **Хранение массива:** `z_values[row][col]`.
- **3D-визуализация:** ось Y направлена вверх, X — вправо, Z — вперёд.

### [OutputChannels] — данные реального времени

```ini
ochBlockSize = 75
ochGetCommand = "r\x00\x34\x00\x4b"

rpm = scalar, U16, 0, "rpm", 1, 0
afr = scalar, U16, 2, "AFR", 0.1, 0
coolant = scalar, S16, 4, "°C", 0.1, 0
```

**Структура после разбора:**
```rust
pub struct OutputChannel {
    pub name: String,
    pub data_type: DataType,
    pub offset: u16,         // Offset in data packet
    pub units: String,
    pub scale: f64,
    pub translate: f64,
}
```

**Протокол:**
1. Send `ochGetCommand` bytes to ECU
2. Read `ochBlockSize` bytes
3. Parse each channel from its offset using data type
4. Apply scale/translate to get display value

### [GaugeConfigurations] — приборы панели

```ini
gauge = rpmGauge
    displayMode = analog
    min = 0
    max = 8000
    loD = 500
    loW = 1000
    hiW = 6000
    hiD = 7000
    vd = 0
    ld = 1
```

**Структура после разбора:**
```rust
pub struct GaugeInfo {
    pub name: String,
    pub channel: String,
    pub title: String,
    pub units: String,
    pub min: f64,
    pub max: f64,
    pub low_danger: Option<f64>,
    pub low_warning: Option<f64>,
    pub high_warning: Option<f64>,
    pub high_danger: Option<f64>,
}
```

## Вычисление выражений

INI-файлы поддерживают выражения в определениях констант:

**Синтаксис:**
```ini
value = { expression }
```

**Пример:**
```ini
reqFuel = { 1000.0 / (injectorFlow * numCylinders / 60.0) }
```

**Поддерживаемые операторы:**
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `<`, `<=`, `>`, `>=`, `==`, `!=`
- Logical: `&&`, `||`, `!`
- Bitwise: `&`, `|`, `^`, `<<`, `>>`
- Functions: `sqrt()`, `pow()`, `abs()`, `min()`, `max()`

**Реализация:**
```rust
pub fn eval_expression(expr: &str, constants: &HashMap<String, f64>) -> Result<f64, String> {
    // Tokenize
    let tokens = tokenize(expr)?;
    // Parse to AST
    let ast = parse_tokens(tokens)?;
    // Evaluate with constant lookup
    evaluate_ast(&ast, constants)
}
```

**Сложность:** O(n) для токенизации + O(n) для разбора + O(n) для вычисления.

## Проверка корректности

### Структурная проверка

**Проверяется:**
- Существуют ли все константы, на которые имеются ссылки.
- Ссылаются ли оси таблиц на допустимые константы-массивы.
- Ссылаются ли пункты меню на существующие таблицы и диалоги.
- Ссылаются ли каналы приборов на существующие выходные каналы.
- Согласованы ли номера страниц.
- Не пересекаются ли смещения в пределах одной страницы.

**Example Error**:
```
Error: Table 'veTableTbl' references unknown X axis 'rpmBinsTypo' (line 245)
Hint: Did you mean 'rpmBins'?
```

### Семантическая проверка

**Проверяется:**
- Соответствуют ли типы данных назначению (например, для RPM следует использовать U16, а не S08).
- Имеют ли диапазоны min/max разумные значения.
- Не приводят ли коэффициенты масштабирования к переполнению.
- Соответствуют ли размеры массивов определениям осей.

**Example Warning**:
```
Warning: Constant 'coolantTemp' min=-40, max=150, but U08 with scale=1.0
can only represent -40 to 215. Consider using scale=0.5 for full range.
```

## Восстановление после ошибок

После обнаружения ошибки парсер пытается продолжить разбор файла.

**Стратегии:**
1. **Пропуск некорректных строк** — записать ошибку в журнал и перейти к следующей строке.
2. **Использование значений по умолчанию** — если необязательное поле отсутствует, использовать подходящее значение по умолчанию.
3. **Частичный разбор** — вернуть частично разобранное описание с предупреждениями.

**Пример:**
```
Line 123: Invalid constant definition (missing units field)
Skipping constant 'brokenValue'
Parsing continued, 456 constants loaded (1 error, 0 warnings)
```

## Производительность

### Скорость разбора

Типичные INI-файлы:
- **Небольшой** (Speeduino): около 1000 строк, разбор менее чем за 5 мс.
- **Средний** (rusEFI): около 5000 строк, разбор менее чем за 20 мс.
- **Большой** (FOME): около 10000 строк, разбор менее чем за 50 мс.

### Использование памяти

Размер структуры `EcuDefinition`:
- около 50 КБ для Speeduino;
- около 200 КБ для rusEFI;
- около 500 КБ для FOME (включая встроенную документацию).

### Методы оптимизации

1. **Интернирование строк:** общие строки (единицы измерения, типы данных) хранятся в одном экземпляре.
2. **Ленивое вычисление:** выражения вычисляются по запросу, а не во время разбора.
3. **Инкрементальное хеширование:** структурный хеш вычисляется по мере разбора.
4. **Разбор без копирования:** где возможно, используются срезы исходных строк.

## Ссылки на исходный код

- Main parser: `crates/libretune-core/src/ini/parser.rs`
- Data types: `crates/libretune-core/src/ini/types.rs`
- Constants: `crates/libretune-core/src/ini/constants.rs`
- Expression evaluator: `crates/libretune-core/src/ini/expression.rs`
- Tests: `crates/libretune-core/tests/corpus.rs`

## См. также

- [Формат INI-файлов](../reference/ini-format.md) — документация INI для пользователей.
- [Поддерживаемые ЭБУ](../reference/supported-ecus.md) — особенности INI для разных ЭБУ.
- [Перенос калибровок](./version-control.md#перенос-калибровок) — обработка изменений версии INI.
