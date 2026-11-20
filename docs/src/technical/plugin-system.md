# Система плагинов WASM

LibreTune использует нативную архитектуру плагинов **WebAssembly (WASM)** для динамического расширения возможностей приложения. С февраля 2026 года эта система заменила устаревшую поддержку плагинов Java/JRE.

## Обзор

Система плагинов WASM обеспечивает:
- **Изолированное выполнение:** плагины работают в изолированной среде с ограниченным набором API.
- **Отсутствие внешних зависимостей:** установка JRE не требуется.
- **Модель разрешений:** точный контроль доступа плагинов к ресурсам.
- **Функции хоста:** стабильный API для работы с данными настройки, обмена данными с ЭБУ и событиями интерфейса.
- **Небольшой размер:** минимальные требования к памяти и короткое время запуска.

## Архитектура

```
┌─────────────────────────────────────┐
│      LibreTune Application          │
│  (Rust + React + Tauri Frontend)    │
└────────────────┬────────────────────┘
                 │
         ┌───────▼────────┐
         │  WASM Runtime  │
         │   (wasmtime)   │
         └───────┬────────┘
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │Plugin1 │ │Plugin2 │ │Plugin3 │
  │ (WASM) │ │ (WASM) │ │ (WASM) │
  └────────┘ └────────┘ └────────┘
```

Каждый плагин представляет собой скомпилированный бинарный файл WASM (`.wasm`), содержащий:
- точки входа для событий жизненного цикла (init, destroy и т. д.);
- реализации обработчиков (hooks) плагина;
- вызовы функций хоста через API плагинов.

## Манифест плагина

Возможности плагина объявляются в манифесте `plugin.json`:

```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "description": "Example plugin",
  "author": "Your Name",
  "permissions": ["read_tune", "read_ecu_data"],
  "exports": {
    "init": "plugin_init",
    "on_tune_loaded": "plugin_on_tune_loaded"
  }
}
```

### Поля манифеста

| Поле | Тип | Описание |
|---|---|---|
| `name` | string | Идентификатор плагина (kebab-case) |
| `version` | string | Семантическая версия (например, "1.0.0") |
| `description` | string | Описание для пользователя |
| `author` | string | Имя автора плагина |
| `permissions` | array | Необходимые разрешения (см. таблицу ниже) |
| `exports` | object | Экспортируемые функции WASM для обработчиков событий |

## Разрешения

Плагины должны объявлять все необходимые разрешения. Попытка обратиться к ресурсу без соответствующего разрешения приводит к ошибке.

| Разрешение | Доступ |
|---|---|
| `read_tune` | Чтение констант и таблиц калибровки |
| `write_tune` | Изменение констант и таблиц калибровки |
| `read_ecu_data` | Чтение выходных каналов ЭБУ и данных реального времени |
| `send_ecu_command` | Отправка команд ЭБУ |
| `read_logs` | Доступ к журналам данных и диагностическим сообщениям |
| `ui_events` | Получение событий интерфейса (смена вкладок и т. п.) |

## Функции хоста

Плагины взаимодействуют с LibreTune через функции хоста — функции Rust, экспортируемые в WASM.

### Доступ к калибровке

```rust
// Read a constant value (scalar)
host_read_constant(name_ptr: i32, name_len: i32) -> f64

// Read a table cell value
host_read_table_cell(table_ptr: i32, table_len: i32, 
                     x: i32, y: i32) -> f64

// Write a table cell value  
host_write_table_cell(table_ptr: i32, table_len: i32,
                      x: i32, y: i32, value: f64) -> i32
```

### Обмен данными с ЭБУ

```rust
// Send a command to ECU
host_send_ecu_command(cmd_ptr: i32, cmd_len: i32) -> i32

// Get realtime channel value
host_get_realtime_value(channel_ptr: i32, channel_len: i32) -> f64

// Get current connection status
host_get_connection_status() -> i32  // 0=disconnected, 1=connected
```

### Журналирование

```rust
// Log a debug message
host_log_debug(msg_ptr: i32, msg_len: i32)

// Log an error message
host_log_error(msg_ptr: i32, msg_len: i32)
```

## Жизненный цикл плагина

```
1. Plugin Loaded
   ├─ Manifest validated
   ├─ Permissions checked
   └─ WASM module instantiated

2. Plugin Initialized
   ├─ host_init() called
   └─ Plugin ready for events

3. Plugin Active
   ├─ Hook functions called on events
   ├─ Host functions available
   └─ State maintained across calls

4. Plugin Unloaded
   ├─ host_destroy() called
   ├─ Cleanup performed
   └─ Resources released
```

## Обработчики событий плагина

Плагины могут экспортировать функции, которые LibreTune вызывает при наступлении определённых событий:

| Обработчик | Сигнатура | Когда вызывается |
|---|---|---|
| `init` | `() -> i32` | Плагин загружен, события ещё не поступали |
| `destroy` | `() -> void` | Плагин выгружается |
| `on_tune_loaded` | `() -> void` | Файл калибровки открыт или загружен |
| `on_tune_updated` | `() -> void` | Изменены константы калибровки |
| `on_ecu_connected` | `(connection_info_ptr: i32) -> void` | Выполнено подключение к ЭБУ |
| `on_realtime_update` | `() -> void` | Получены данные реального времени (каждые 100 мс) |
| `on_table_painted` | `(table_name_ptr: i32, table_name_len: i32) -> void` | Таблица отображена на экране |

## Пример плагина (Rust + WASM)

```rust
// Example: Simple VE table analyzer plugin
use std::panic;

#[panic_handler]
fn handle_panic(_: &panic::PanicInfo) -> ! {
    loop {}
}

extern "C" {
    fn host_read_table_cell(table_ptr: i32, table_len: i32, x: i32, y: i32) -> f64;
    fn host_log_debug(msg_ptr: i32, msg_len: i32);
}

#[no_mangle]
pub extern "C" fn plugin_init() -> i32 {
    let msg = b"VE Analyzer Plugin 1.0 loaded";
    unsafe {
        host_log_debug(msg.as_ptr() as i32, msg.len() as i32);
    }
    0  // Success
}

#[no_mangle]
pub extern "C" fn plugin_on_table_painted(table_ptr: i32, table_len: i32) -> () {
    // Analyze table whenever it's displayed
    unsafe {
        let value = host_read_table_cell(table_ptr, table_len, 0, 0);
        // Process value...
    }
}
```

## Сборка плагинов

### Необходимые компоненты

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Сборка

```bash
wasm-pack build --target web --release
```

### Распространение плагина

1. Создайте манифест `plugin.json`.
2. Скомпилируйте WASM-бинарный файл с помощью `wasm-pack`.
3. Упакуйте результат в файл `.wasm`.
4. Пользователь загружает плагин через интерфейс LibreTune или каталог конфигурации.

## Вопросы безопасности

- **Изоляция:** среда выполнения WASM отделена от основной системы.
- **Проверка разрешений:** нарушение ограничений приводит к ошибке во время выполнения.
- **Ограничения ресурсов:** для плагинов можно задать лимиты памяти.
- **Нет доступа к файлам:** плагины не могут напрямую обращаться к файловой системе.
- **Нет доступа к сети:** плагины не могут устанавливать внешние сетевые соединения.

## Отладка плагинов

Для журналирования backend LibreTune использует [`tracing`](https://docs.rs/tracing). По умолчанию установлен уровень журнала `info`, поэтому отладочные сообщения не отображаются при обычном запуске в режиме разработки. Чтобы включить более подробный вывод, задайте переменную окружения `RUST_LOG`.

Включить отладочное журналирование плагинов:

```bash
RUST_LOG=libretune_core::plugin_system=debug ./libretune
```

Включить отладочное журналирование протокола ЭБУ:

```bash
RUST_LOG=libretune_core::protocol=debug ./libretune
```

Можно объединить фильтры, например:

```bash
RUST_LOG=libretune_core::plugin_system=debug,libretune_core::protocol=warn ./libretune
```

Чтобы полностью отключить журналирование backend:

```bash
RUST_LOG=error ./libretune
```

Просматривайте журналы в окне вывода журнала приложения или в терминале, из которого была запущена LibreTune.

## См. также

- [Руководство по переходу с Java на WASM](../reference/java-to-wasm-migration.md)
- Подробное руководство по разработке плагинов пока не входит в документацию.
