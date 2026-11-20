# Протокол обмена данными с ЭБУ

LibreTune поддерживает несколько протоколов связи с ЭБУ для разных семейств прошивок. В этом документе описаны низкоуровневые детали протоколов, структура команд и обработка ошибок.

## Типы протоколов

### Бинарный протокол (Speeduino, MS2, MS3)

**Характеристики:**
- команды и ответы фиксированной длины;
- бинарные пакеты данных;
- проверка CRC/контрольной суммы;
- синхронная схема «запрос — ответ».

### Текстовый протокол (rusEFI, FOME, epicEFI)

**Характеристики:**
- команды завершаются символом новой строки;
- ответы в текстовом формате ASCII;
- разбор построчно;
- поддержка интерактивной консоли и бинарного режима передачи данных.

## Структура команд

### Чтение и запись страниц (бинарный протокол)

**Чтение страницы:**
```
Command:  'R' + page_number (1 byte)
Response: page_data (variable length, typically 512-1024 bytes)
```

**Запись страницы:**
```
Command: 'W' + page_number (1 byte) + offset (2 bytes) + data (N bytes)
Response: ACK (1 byte, typically 0x01)
```

**Пример** (чтение страницы 1):
```
Send:    [0x52, 0x01]           # 'R', page 1
Receive: [0x50, 0x00, ...data...] # 512 bytes
```

### Чтение и запись памяти (MS2/MS3)

**Чтение памяти:**
```
Command: 'r' + offset (2 bytes BE) + length (2 bytes BE)
Response: data (length bytes)
```

**Пример** (чтение 10 байт со смещения 0x1234):
```
Send:    [0x72, 0x12, 0x34, 0x00, 0x0A]
Receive: [0xAA, 0xBB, ...10 bytes...]
```

### Запрос данных реального времени

**Speeduino:**
```
Command: 'A'
Response: 75 bytes of realtime data
```

**rusEFI/FOME:**
```
Command: "r\x00\x34\x00\x4b" (read 75 bytes from offset 0x34)
Response: 75 bytes of realtime data
```

**MS2/MS3:**
```
Command: 'r' + 0x0000 + length (from INI ochBlockSize)
Response: ochBlockSize bytes
```

## Транспортный уровень

### Настройка последовательного порта

**Параметры:**
```rust
pub struct ConnectionSettings {
    pub port_name: String,       // e.g., "/dev/ttyUSB0", "COM3"
    pub baud_rate: u32,          // 9600, 115200, etc.
    pub data_bits: DataBits,     // Eight (default)
    pub parity: Parity,          // None (default)
    pub stop_bits: StopBits,     // One (default)
    pub flow_control: FlowControl, // None (default)
    pub timeout_ms: u64,         // Default: 1000ms
}
```

**Автоматическое определение скорости порта:**

LibreTune последовательно проверяет распространённые скорости:
1. 115200 (значение по умолчанию для rusEFI/FOME).
2. 57600.
3. 38400.
4. 19200.
5. 9600 (значение по умолчанию для Speeduino).

### Обработка тайм-аутов

**Тайм-аут чтения** (между символами):
```rust
// Read until no data for timeout_ms
let mut buffer = Vec::new();
loop {
    match port.read_with_timeout(&mut byte, timeout_ms) {
        Ok(1) => buffer.push(byte[0]),
        Ok(0) | Err(Timeout) => break,  // No more data
        Err(e) => return Err(e),
    }
}
```

Чтение продолжается, пока данные поступают. Если в течение `timeout_ms` новых данных нет, чтение завершается.

**Тайм-аут записи:**
```rust
// Write all bytes or fail
port.write_all(&command_bytes)
    .map_err(|e| ProtocolError::WriteTimeout(e))?;
```

Команда должна быть записана полностью; в противном случае возвращается ошибка.

## Обнаружение ошибок

### Проверка CRC (MS2/MS3)

**CRC-32:**
```rust
fn calculate_crc32(data: &[u8]) -> u32 {
    let mut crc = 0xFFFFFFFF_u32;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}
```

**Формат пакета:**
```
[command_byte, ...data..., crc32 (4 bytes LE)]
```

### Проверка байта состояния (Speeduino)

**Кодирование байта состояния:**
```
bit 0: Burn pending
bit 1: Write pending
bit 2-3: Reserved
bit 4-7: Error code
```

**Распространённые коды ошибок:**
- `0x00`: успешно;
- `0x10`: недопустимая команда;
- `0x20`: недопустимый номер страницы;
- `0x30`: несовпадение CRC;
- `0x40`: переполнение буфера;
- `0x84`: несовпадение сигнатуры (132 в десятичной системе).

**Обработка ошибок:**
```rust
let status = response[0];
let error_code = (status >> 4) & 0x0F;
match error_code {
    0x0 => Ok(()),
    0x8 => Err(ProtocolError::SignatureMismatch),
    _ => Err(ProtocolError::EcuError(error_code)),
}
```

## Синхронизация данных

### Синхронизация страниц

**Полное чтение страниц:**
```rust
pub fn sync_ecu_data(&mut self) -> Result<Vec<Vec<u8>>, ProtocolError> {
    let mut pages = Vec::new();
    for page_num in 0..self.num_pages {
        match self.read_page(page_num) {
            Ok(data) => pages.push(data),
            Err(e) => {
                log::warn!("Failed to read page {}: {}", page_num, e);
                pages.push(vec![0; self.page_sizes[page_num]]);
                // Continue syncing other pages
            }
        }
    }
    Ok(pages)
}
```

**Частичная синхронизация** (при сбое):
- страницы, которые не удалось прочитать, заполняются нулями;
- в строке состояния отображается `⚠ Partial sync (X/Y pages)`;
- пользователь получает предупреждение о неполных данных.

### Кэширование с отложенной записью

**Стратегия:**
1. Пользователь редактирует данные → они немедленно записываются в локальный кэш (изменения видны сразу).
2. Пакетная запись → данные отправляются в ЭБУ в фоновом режиме (каждые 500 мс или при ручном сохранении).
3. Проверка → после записи данные считываются обратно и сравниваются.

**Структура кэша:**
```rust
pub struct TuneCache {
    pub pages: Vec<Vec<u8>>,         // Current state
    pub dirty_pages: HashSet<u8>,    // Pages needing ECU write
    pub write_queue: VecDeque<Write>, // Pending writes
}

pub struct Write {
    pub page: u8,
    pub offset: u16,
    pub data: Vec<u8>,
    pub timestamp: Instant,
}
```

## Протокол консоли (rusEFI/FOME/epicEFI)

### Текстовые команды

**Формат команды:**
```
command\n
```

**Формат ответа:**
```
output line 1
output line 2
...
prompt>
```

**Пример сеанса:**
```
> help\n
Available commands:
  help      - This help screen
  info      - ECU information
  set       - Set parameter
  get       - Get parameter
  ...
rusEFI>
```

### Бинарный режим данных

rusEFI поддерживает переключение в бинарный режим для ускоренной передачи данных.

**Вход в бинарный режим:**
```
Command: "binary\n"
Response: "OK\n"
```

**Бинарные команды** (в бинарном режиме):
```
[command_byte, ...args...]
```

**Выход из бинарного режима:**
```
Command: [0xFF]
Response: (returns to text mode)
```

### Ускоренный обмен FOME (FOME Fast Comms)

Прошивка FOME поддерживает оптимизированный протокол.

**Настройки:**
```rust
pub struct Settings {
    pub fome_fast_comms_enabled: bool,  // Default: true
}
```

**Оптимизация:**
- уменьшение служебных данных команд;
- сжатые пакеты ответов;
- автоматический переход на стандартный протокол при ошибке.

**Логика резервного перехода:**
```rust
if ecu_type == EcuType::FOME && settings.fome_fast_comms_enabled {
    match send_fast_command(cmd) {
        Ok(response) => return Ok(response),
        Err(e) => {
            log::warn!("Fast comms failed: {}, falling back to standard", e);
            // Fall through to standard protocol
        }
    }
}
send_standard_command(cmd)
```

## Автомат состояний подключения

```
┌─────────────┐
│ Disconnected│
└──────┬──────┘
       │ connect()
       ↓
┌─────────────┐
│ Connecting  │──→ (port open, baud detect, handshake)
└──────┬──────┘
       │ success
       ↓
┌─────────────┐
│  Connected  │──→ (sync data, start realtime stream)
└──────┬──────┘
       │ disconnect() or error
       ↓
┌─────────────┐
│ Disconnected│
└─────────────┘
```

**Переходы состояний:**
```rust
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected { signature: String, ecu_type: EcuType },
    Error { message: String },
}
```

## Показатели производительности

**Собираемые показатели:**
```rust
pub struct ConnectionMetrics {
    pub packets_sent: u64,
    pub packets_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub errors: u64,
    pub avg_latency_ms: f64,
}
```

**Измерение задержки:**
```rust
let start = Instant::now();
send_command(cmd)?;
let response = read_response()?;
let latency = start.elapsed().as_millis();
metrics.update_latency(latency);
```

## Диагностические инструменты

### Tooth Logger

**Команда** (Speeduino):
```
Send: 'H'
Response: 512 bytes (256 tooth times, 2 bytes each)
```

**Структура данных:**
```rust
pub struct ToothLogEntry {
    pub tooth_number: u16,
    pub tooth_time_us: u16,  // Microseconds since last tooth
    pub crank_angle: f32,    // Calculated
}
```

### Composite Logger

**Команда** (Speeduino):
```
Send: 'J' (primary trigger)
      'O' (secondary trigger)
      'X' (sync/cam trigger)
Response: Variable length, timestamps + logic levels
```

**Структура данных:**
```rust
pub struct CompositeLogEntry {
    pub time_us: u64,
    pub primary: bool,
    pub secondary: bool,
    pub sync: bool,
    pub voltage: Option<f32>,
}
```

## Вопросы безопасности

### Защита от переполнения буфера

**Ограниченное чтение:**
```rust
let mut buffer = vec![0u8; MAX_PACKET_SIZE];
let bytes_read = port.read(&mut buffer)?;
if bytes_read > MAX_PACKET_SIZE {
    return Err(ProtocolError::BufferOverflow);
}
buffer.truncate(bytes_read);
```

### Проверка команд

**Подход с белым списком:**
```rust
const ALLOWED_COMMANDS: &[u8] = b"RWArwABCEGHJOQSXZ";

fn validate_command(cmd: u8) -> Result<(), ProtocolError> {
    if ALLOWED_COMMANDS.contains(&cmd) {
        Ok(())
    } else {
        Err(ProtocolError::InvalidCommand(cmd))
    }
}
```

## Ссылки на исходный код

- Реализация протокола: `crates/libretune-core/src/protocol/`
  - `mod.rs` — trait протокола и общие типы.
  - `connection.rs` — управление подключением.
  - `commands.rs` — структуры команд и ответов.
  - `serial.rs` — абстракция последовательного порта.
- Интеграция с Tauri: `crates/libretune-app/src-tauri/src/lib.rs` (команды connect, sync и console).
- Интерфейс консоли: `crates/libretune-app/src/components/console/EcuConsole.tsx`.

## См. также

- [Подключение к ЭБУ](../getting-started/connecting.md) — руководство по настройке соединения.
- [Поддерживаемые ЭБУ](../reference/supported-ecus.md) — особенности протоколов разных платформ.
- [Диагностические регистраторы](../features/diagnostic-loggers.md) — использование Tooth Logger и Composite Logger.
