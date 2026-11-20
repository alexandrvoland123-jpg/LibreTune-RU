# Технический справочник по сценариям Lua

LibreTune включает изолированную среду выполнения Lua 5.4 для расширенной автоматизации и пользовательских рабочих процессов настройки.

## Архитектура среды выполнения

### Изоляция

**Разрешённые библиотеки** (ограниченное подмножество):
- `BASE` — основные функции (`print`, `type`, `tonumber` и т. д.).
- `TABLE` — операции с таблицами (`table.insert`, `table.remove` и т. д.).
- `STRING` — операции со строками (`string.sub`, `string.format` и т. д.).
- `MATH` — математические функции (`math.sin`, `math.sqrt` и т. д.).

**Отключённые библиотеки** (из соображений безопасности):
- `OS` — взаимодействие с операционной системой (`os.execute`, `os.remove` и т. д.).
- `IO` — операции ввода-вывода файлов (`io.open`, `io.read` и т. д.).
- `PACKAGE` — загрузка модулей (`require`, `package.path` и т. д.).
- `DEBUG` — отладочные функции (`debug.getinfo` и т. д.).

**Причина ограничений:** сценарии не должны иметь возможности:
- читать и записывать произвольные файлы;
- выполнять системные команды;
- обращаться к сетевым ресурсам;
- загружать недоверенный код.

### Модель выполнения

**Однопоточное выполнение:**
```
Пользователь нажимает "Run" → команда Tauri → исполнитель Rust → mlua → виртуальная машина Lua → результат
```

**Защита по времени выполнения:**
```rust
lua.set_hook(HookTriggers::COUNT, move |_lua, _debug| {
    if execution_time > MAX_EXECUTION_TIME {
        Err(Error::RuntimeError("Script timeout".to_string()))
    } else {
        Ok(())
    }
});
```

**Тайм-аут по умолчанию:** 5 секунд (защита от бесконечных циклов).

## Справочник API

### Глобальные функции

#### `print(...)`

Перехватывает вывод и направляет его в консоль сценариев (не записывает данные в stdout).

**Пример:**
```lua
print("Hello from Lua!")
print("Value:", 42, "Bool:", true)
```

**Результат:**
```
Hello from Lua!
Value: 42 Bool: true
```

#### `type(value)`

Возвращает тип значения в виде строки.

**Пример:**
```lua
print(type(42))        -- "number"
print(type("hello"))   -- "string"
print(type({}))        -- "table"
```

#### `tonumber(str)`, `tostring(val)`

Функции преобразования типов.

**Пример:**
```lua
local n = tonumber("123.45")  -- 123.45
local s = tostring(42)        -- "42"
```

### Библиотека Table

#### `table.insert(list, [pos,] value)`

Вставляет значение в таблицу.

**Пример:**
```lua
local t = {10, 20, 30}
table.insert(t, 40)      -- {10, 20, 30, 40}
table.insert(t, 2, 15)   -- {10, 15, 20, 30, 40}
```

#### `table.remove(list, [pos])`

Удаляет значение из таблицы.

**Пример:**
```lua
local t = {10, 20, 30}
table.remove(t, 2)  -- {10, 30}
table.remove(t)     -- {10} (удаляется последний элемент)
```

#### `table.concat(list, [sep])`

Объединяет элементы таблицы в строку.

**Пример:**
```lua
local t = {"a", "b", "c"}
print(table.concat(t, ", "))  -- "a, b, c"
```

### Библиотека String

#### `string.sub(s, i, [j])`

Извлекает подстроку.

**Пример:**
```lua
local s = "hello world"
print(string.sub(s, 1, 5))   -- "hello"
print(string.sub(s, 7))      -- "world"
```

#### `string.format(fmt, ...)`

Форматирует строку (в стиле printf).

**Пример:**
```lua
local rpm = 3500
local afr = 14.7
print(string.format("RPM: %d, AFR: %.1f", rpm, afr))
-- "RPM: 3500, AFR: 14.7"
```

### Библиотека Math

#### `math.sin(x)`, `math.cos(x)`, `math.tan(x)`

Тригонометрические функции (углы задаются в радианах).

**Пример:**
```lua
local angle = math.pi / 4
print(math.sin(angle))  -- 0.707...
```

#### `math.sqrt(x)`, `math.pow(x, y)`

Извлечение корня и возведение в степень.

**Пример:**
```lua
print(math.sqrt(16))     -- 4.0
print(math.pow(2, 10))   -- 1024.0
```

#### `math.abs(x)`, `math.ceil(x)`, `math.floor(x)`

Модуль числа и округление.

**Пример:**
```lua
print(math.abs(-42))    -- 42
print(math.ceil(3.2))   -- 4
print(math.floor(3.8))  -- 3
```

#### `math.min(...)`

Возвращает минимальное значение.

**Пример:**
```lua
print(math.min(10, 5, 8))  -- 5
```

#### `math.max(...)`

Возвращает максимальное значение.

**Пример:**
```lua
print(math.max(10, 5, 8))  -- 10
```

## Сценарии использования

### 1. Пакетные операции с таблицами

**Задача:** применить пользовательскую формулу ко всем ячейкам таблицы VE.

**Решение:**
```lua
-- Example: Increase VE by 5% in RPM range 2000-4000
for rpm_idx = 1, 16 do
    local rpm = rpm_bins[rpm_idx]
    if rpm >= 2000 and rpm <= 4000 then
        for map_idx = 1, 16 do
            ve_table[rpm_idx][map_idx] = ve_table[rpm_idx][map_idx] * 1.05
        end
    end
end
```

### 2. Пользовательские формулы настройки

**Задача:** рассчитать требуемое значение VE для заданного давления наддува.

**Решение:**
```lua
-- Lambda target: 0.85 (rich for boost)
-- Boost: 10 psi (1.68 bar absolute)
-- Base VE: 85%

function boost_ve_correction(base_ve, boost_psi)
    local boost_ratio = (boost_psi * 0.0689 + 1.0) / 1.0  -- PSI to bar
    return base_ve * boost_ratio * 0.85  -- 15% enrichment
end

local corrected_ve = boost_ve_correction(85, 10)
print("Target VE:", corrected_ve)  -- ~122%
```

### 3. Проверка данных

**Задача:** найти и вывести значения, выходящие за допустимый диапазон.

**Решение:**
```lua
function validate_afr_table(afr_table)
    local errors = {}
    for i = 1, #afr_table do
        for j = 1, #afr_table[i] do
            local afr = afr_table[i][j]
            if afr < 10 or afr > 20 then
                table.insert(errors, string.format("Cell [%d][%d]: %.1f", i, j, afr))
            end
        end
    end
    return errors
end

local errors = validate_afr_table(afr_table)
if #errors > 0 then
    print("AFR table validation errors:")
    for _, err in ipairs(errors) do
        print(" - ", err)
    end
end
```

### 4. Преобразование единиц измерения

**Задача:** преобразовать всю таблицу из AFR в Lambda.

**Решение:**
```lua
-- Stoichiometric AFR for gasoline: 14.7
function afr_to_lambda(afr)
    return afr / 14.7
end

for i = 1, #afr_table do
    for j = 1, #afr_table[i] do
        lambda_table[i][j] = afr_to_lambda(afr_table[i][j])
    end
end
```

## Вывод сценариев

### Перехват print

**Реализация:**
```rust
let output = Arc::new(Mutex::new(String::new()));
let output_clone = Arc::clone(&output);

lua.globals().set(
    "print",
    lua.create_function(move |lua_ctx, args: mlua::Variadic<mlua::Value>| {
        let mut output = output_clone.lock().unwrap();
        let formatted = args.iter()
            .map(|v| format_value(v, lua_ctx))
            .collect::<Vec<_>>()
            .join("\t");
        output.push_str(&formatted);
        output.push('\n');
        Ok(())
    })?,
)?;
```

**Структура результата:**
```rust
pub struct LuaResult {
    pub stdout: String,       // All print() calls
    pub return_value: String, // Last expression value
    pub error: Option<String>, // Runtime error (if any)
}
```

### Обработка ошибок

**Синтаксические ошибки:**
```lua
local x = 10 +  -- Missing operand
```

**Вывод:**
```
Error: [string "script"]:1: unexpected symbol near '<eof>'
```

**Ошибки времени выполнения:**
```lua
local x = nil
print(x.field)  -- Attempt to index nil
```

**Вывод:**
```
Error: [string "script"]:2: attempt to index a nil value (local 'x')
```

## Характеристики производительности

| Операция | Сложность | Типичное время |
|---|---|---|
| Инициализация сценария | O(1) | <1 мс |
| Выполнение 100 строк | O(n) | <5 мс |
| Обход таблицы 16×16 | O(n²) | <1 мс |
| Объединение строк | O(n) | <1 мс на 1000 символов |

**Ограничения памяти:**
- размер кучи: 10 МБ на одно выполнение сценария;
- глубина стека: 1000 (ограничение рекурсии).

## Модель безопасности

### Модель угроз

**Защита предусмотрена от:**
- произвольного доступа к файловой системе;
- сетевого доступа;
- атак с внедрением кода;
- исчерпания ресурсов (за счёт тайм-аута);
- повышения привилегий.

**Защита НЕ предусмотрена от:**
- логических ошибок в пользовательских сценариях;
- намеренного повреждения данных калибровки;
- бесконечных циклов, загружающих CPU (они ограничиваются тайм-аутом).

### Рекомендации

1. **Всегда проверяйте сценарии на резервных копиях калибровок.**
2. **Перед запуском сценариев используйте контроль версий.**
3. **Проверяйте вывод сценария перед применением результатов.**
4. **Пишите небольшие сценарии, решающие одну задачу.**
5. **Избегайте жёстко заданных значений — используйте переменные.**

## Примеры сценариев

### Пример 1. Постепенное масштабирование VE

```lua
-- Scale VE table progressively by RPM
-- Low RPM: +0%, High RPM: +15%

local rpm_min, rpm_max = 1000, 7000
local scale_min, scale_max = 1.0, 1.15

for i = 1, #ve_table do
    local rpm = rpm_bins[i]
    local progress = (rpm - rpm_min) / (rpm_max - rpm_min)
    progress = math.max(0, math.min(1, progress))  -- Clamp 0-1
    
    local scale = scale_min + (scale_max - scale_min) * progress
    
    for j = 1, #ve_table[i] do
        ve_table[i][j] = ve_table[i][j] * scale
    end
end

print("VE table scaled progressively")
```

### Пример 2. Копирование области между таблицами

```lua
-- Copy high-load region from Table A to Table B

local rpm_start, rpm_end = 3000, 6000
local map_threshold = 80

for i = 1, #table_a do
    local rpm = rpm_bins[i]
    if rpm >= rpm_start and rpm <= rpm_end then
        for j = 1, #table_a[i] do
            local map = map_bins[j]
            if map >= map_threshold then
                table_b[i][j] = table_a[i][j]
            end
        end
    end
end
```
