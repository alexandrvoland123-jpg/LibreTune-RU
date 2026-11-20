# Операции с таблицами

LibreTune предоставляет несколько математических операций для обработки двумерных и трёхмерных таблиц. Эти операции реализованы в основной библиотеке, чтобы обеспечить единообразное поведение, и проверены тестами.

## Элементы управления редактора

Перед выполнением операции выберите ячейку или выделите прямоугольную область перетаскиванием.

| Клавиша/элемент | Действие |
|---|---|
| `=` | Установить для выбранных ячеек их среднее значение |
| `>` или `.` | Увеличить выбранные ячейки на 1% (`Ctrl`/`Cmd`: 5%) |
| `<`, `,`, `-` или `_` | Уменьшить выбранные ячейки на 1% (`Ctrl`/`Cmd`: 5%) |
| `+` | Увеличить выбранные ячейки на 10% (`Ctrl`/`Cmd`: 50%) |
| `*` | Открыть диалог коэффициента масштабирования |
| `/` | Интерполировать значения между угловыми ячейками выделенной области |
| `s` | Сгладить выбранные ячейки |
| `Page Up` / `Page Down` | Прибавить или вычесть 0.1 (`Shift`: 1; `Ctrl`/`Cmd`: 0.05) |

Масштабирование умножает каждое выбранное значение на заданный коэффициент: для увеличения на 5% используйте `1.05`, для уменьшения на 5% — `0.95`. Щелчок правой кнопкой по ячейке открывает её контекстное меню. Если ячейка находится за пределами текущего выделения, перед выполнением операции она становится активным выделением.

## Интерполяция

### Билинейная интерполяция (2D-таблицы)

Используется для вычисления значений между ячейками таблицы. Это необходимо, в частности, при переразбиении осей и отслеживании положения курсора.

**Алгоритм:**

Для двумерной таблицы с осью X (столбцы) и осью Y (строки) требуется найти значение в произвольной точке (x, y):

```
1. Найти окружающие ячейки:
   x1 < x < x2  (индексы столбцов i1, i2)
   y1 < y < y2  (индексы строк j1, j2)

2. Нормализовать положение внутри ячейки:
   tx = (x - x1) / (x2 - x1)
   ty = (y - y1) / (y2 - y1)

3. Интерполировать по оси X (для каждого Y):
   v_top = lerp(Z[j1][i1], Z[j1][i2], tx)
   v_bot = lerp(Z[j2][i1], Z[j2][i2], tx)

4. Интерполировать по оси Y:
   result = lerp(v_top, v_bot, ty)
```

Здесь `lerp(a, b, t) = a + (b - a) * t`.

**Реализация:**
```rust
pub fn interpolate_2d(
    x_bins: &[f64],
    y_bins: &[f64],
    z_values: &[Vec<f64>],
    x: f64,
    y: f64,
) -> Option<f64> {
    // Find X bracket
    let x_idx = x_bins.iter().position(|&bx| bx > x)?;
    if x_idx == 0 { return None; }
    let i1 = x_idx - 1;
    let i2 = x_idx;
    
    // Find Y bracket
    let y_idx = y_bins.iter().position(|&by| by > y)?;
    if y_idx == 0 { return None; }
    let j1 = y_idx - 1;
    let j2 = y_idx;
    
    // Normalize
    let tx = (x - x_bins[i1]) / (x_bins[i2] - x_bins[i1]);
    let ty = (y - y_bins[j1]) / (y_bins[j2] - y_bins[j1]);
    
    // Bilinear
    let v11 = z_values[j1][i1];
    let v12 = z_values[j1][i2];
    let v21 = z_values[j2][i1];
    let v22 = z_values[j2][i2];
    
    let v_top = v11 + (v12 - v11) * tx;
    let v_bot = v21 + (v22 - v21) * tx;
    
    Some(v_top + (v_bot - v_top) * ty)
}
```

**Сложность:** O(log n + log m) при бинарном поиске, O(n + m) при линейном поиске.

**Применение:**
- переразбиение таблиц по новым значениям осей;
- отслеживание положения курсора в 3D-визуализации;
- сглаживание (вычисление промежуточных значений между ячейками).

### Обработка граничных случаев

- **Точка за пределами таблицы:** возвращается `None` (либо значение ограничивается ближайшей границей).
- **Совпадение с узлом:** если `x == x_bin`, используется точное значение без интерполяции.
- **Одна строка или один столбец:** используется линейная одномерная интерполяция.

## Сглаживание

### Взвешенное усреднение по Гауссу

Сглаживание изменяет значения таблицы, усредняя их с соседними ячейками и учитывая расстояние до соседей.

**Алгоритм:**
```
Для каждой выбранной ячейки (i, j):
  1. Получить соседей в радиусе kernel_size
  2. Рассчитать гауссов вес каждого соседа:
     distance = sqrt((i - ni)² + (j - nj)²)
     weight = exp(-(distance²) / (2 * sigma²))
  3. Рассчитать взвешенное среднее:
     new_value = Σ(neighbor_value * weight) / Σ(weight)
```

**Параметры:**
- `kernel_size`: радиус сглаживания (1 = 3×3, 2 = 5×5 и т. д.).
- `sigma`: стандартное отклонение распределения Гаусса (по умолчанию `kernel_size / 2`).

**Реализация:**
```rust
pub fn smooth_table(
    z_values: &[Vec<f64>],
    selection: &[(usize, usize)],
    kernel_size: usize,
) -> Result<Vec<Vec<f64>>, String> {
    let mut result = z_values.to_vec();
    let sigma = (kernel_size as f64) / 2.0;
    let weights = calculate_gaussian_weights(kernel_size, sigma);
    
    for &(row, col) in selection {
        let neighbors = get_neighbors(z_values, row, col, kernel_size);
        let weighted_sum: f64 = neighbors.iter()
            .map(|(val, dist)| val * weights[*dist])
            .sum();
        let weight_sum: f64 = neighbors.iter()
            .map(|(_, dist)| weights[*dist])
            .sum();
        result[row][col] = weighted_sum / weight_sum;
    }
    
    Ok(result)
}

fn calculate_gaussian_weights(kernel_size: usize, sigma: f64) -> Vec<f64> {
    let max_dist = kernel_size as f64 * 1.415; // sqrt(2) * kernel_size
    (0..=(max_dist as usize))
        .map(|d| {
            let dist = d as f64;
            (-dist.powi(2) / (2.0 * sigma.powi(2))).exp()
        })
        .collect()
}
```

**Сложность:** O(k² * n), где k — размер ядра, n — количество выбранных ячеек.

**Применение:**
- удаление шума из записанных данных;
- сглаживание переходов между областями настройки;
- создание плавных градиентов после ручного редактирования.

**Пример:**
```
До:              После (kernel_size=1):
80  85  90       80.0  85.0  90.0
85  95  85   →   84.6  88.1  86.4
90  85  80       88.1  85.0  82.5
```

## Масштабирование

Умножает выбранные ячейки на постоянный коэффициент.

**Алгоритм:**
```
Для каждой выбранной ячейки (i, j):
  new_value = old_value * factor
```

**Реализация:**
```rust
pub fn scale_cells(
    z_values: &[Vec<f64>],
    selection: &[(usize, usize)],
    factor: f64,
) -> Result<Vec<Vec<f64>>, String> {
    let mut result = z_values.to_vec();
    for &(row, col) in selection {
        result[row][col] *= factor;
    }
    Ok(result)
}
```

**Сложность:** O(n), где n — количество выбранных ячеек.

**Применение:**
- быстрая корректировка в процентах (умножение на 1.05 = +5%);
- компенсация при изменении производительности форсунок;
- пакетная корректировка после изменения оборудования.

**Пример:**
```
Selection: [(0,0), (0,1), (1,0), (1,1)]
Factor: 1.10 (+10%)

Before:      After:
80  85  90   88   93.5  90
85  90  85   93.5 99    85
90  85  80   90   85    80
```

## Установить одинаковое значение (Set Equal)

Устанавливает для всех выбранных ячеек среднее значение выделенной области.

**Алгоритм:**
```
average = sum(selected_values) / count(selected_values)
Для каждой выбранной ячейки (i, j):
  new_value = average
```

**Реализация:**
```rust
pub fn set_cells_equal(
    z_values: &[Vec<f64>],
    selection: &[(usize, usize)],
) -> Result<Vec<Vec<f64>>, String> {
    let sum: f64 = selection.iter()
        .map(|&(row, col)| z_values[row][col])
        .sum();
    let avg = sum / selection.len() as f64;
    
    let mut result = z_values.to_vec();
    for &(row, col) in selection {
        result[row][col] = avg;
    }
    Ok(result)
}
```

**Сложность:** O(n), где n — количество выбранных ячеек.

**Применение:**
- создание ровных областей (например, зоны холостого хода);
- установка одинаковых базовых значений перед точной настройкой;
- удаление пиков или выбросов в выбранной области.

**Пример:**
```
Selection: [(0,0), (0,1), (1,0)]
Average: (80 + 85 + 85) / 3 = 83.33

Before:      After:
80  85  90   83.33  83.33  90
85  90  85   83.33  90     85
90  85  80   90     85     80
```

## Переразбиение (Re-binning)

Изменяет значения осей таблицы и интерполирует значения Z для новой сетки.

**Алгоритм:**
```
1. Для каждой новой точки осей (x_new, y_new):
   a. Найти положение в старых узлах осей
   b. Использовать билинейную интерполяцию для получения Z
   c. Сохранить значение в новой таблице
```

**Реализация:**
```rust
pub fn rebin_table(
    old_x_bins: &[f64],
    old_y_bins: &[f64],
    old_z_values: &[Vec<f64>],
    new_x_bins: &[f64],
    new_y_bins: &[f64],
) -> Result<Vec<Vec<f64>>, String> {
    let mut new_z_values = vec![vec![0.0; new_x_bins.len()]; new_y_bins.len()];
    
    for (j, &y) in new_y_bins.iter().enumerate() {
        for (i, &x) in new_x_bins.iter().enumerate() {
            new_z_values[j][i] = interpolate_2d(
                old_x_bins,
                old_y_bins,
                old_z_values,
                x,
                y,
            ).unwrap_or_else(|| {
                // Fallback: nearest edge value
                extrapolate_edge(old_x_bins, old_y_bins, old_z_values, x, y)
            });
        }
    }
    
    Ok(new_z_values)
}
```

**Сложность:** O(n * m * log(n_old * m_old)).

**Применение:**
- увеличение разрешения в важных областях (например, 12×12 → 16×16);
- изменение диапазона RPM после замены распредвала;
- объединение разреженных данных в более плотную таблицу.

**Пример:**
```
Old X bins: [1000, 2000, 3000]
New X bins: [1000, 1500, 2000, 2500, 3000]

Old table:
      1000  2000  3000
2000  80    85    90
3000  85    90    95

New table:
      1000  1500  2000  2500  3000
2000  80    82.5  85    87.5  90
3000  85    87.5  90    92.5  95
```

## Интерполяция ячеек

Линейная интерполяция между угловыми ячейками выделенной области.

**Алгоритм:**
```
1. Найти минимальные и максимальные индексы строк и столбцов выделения
2. Для каждой ячейки (i, j) в выделении:
   tx = (col - col_min) / (col_max - col_min)
   ty = (row - row_min) / (row_max - row_min)
   
   value = bilinear_interpolate(
     Z[row_min][col_min],  // верхняя левая
     Z[row_min][col_max],  // верхняя правая
     Z[row_max][col_min],  // нижняя левая
     Z[row_max][col_max],  // нижняя правая
     tx, ty
   )
```

**Реализация:**
```rust
pub fn interpolate_cells(
    z_values: &[Vec<f64>],
    selection: &[(usize, usize)],
) -> Result<Vec<Vec<f64>>, String> {
    let mut result = z_values.to_vec();
    
    let rows: Vec<usize> = selection.iter().map(|&(r, _)| r).collect();
    let cols: Vec<usize> = selection.iter().map(|&(_, c)| c).collect();
    
    let r_min = *rows.iter().min().unwrap();
    let r_max = *rows.iter().max().unwrap();
    let c_min = *cols.iter().min().unwrap();
    let c_max = *cols.iter().max().unwrap();
    
    let v11 = z_values[r_min][c_min];
    let v12 = z_values[r_min][c_max];
    let v21 = z_values[r_max][c_min];
    let v22 = z_values[r_max][c_max];
    
    for &(row, col) in selection {
        let ty = if r_max == r_min { 0.0 } else {
            (row - r_min) as f64 / (r_max - r_min) as f64
        };
        let tx = if c_max == c_min { 0.0 } else {
            (col - c_min) as f64 / (c_max - c_min) as f64
        };
        
        let v_top = v11 + (v12 - v11) * tx;
        let v_bot = v21 + (v22 - v21) * tx;
        result[row][col] = v_top + (v_bot - v_top) * ty;
    }
    
    Ok(result)
}
```

**Сложность:** O(n), где n — количество выбранных ячеек.

**Применение:**
- создание плавных переходов между двумя известными корректными значениями;
- заполнение областей с отсутствующими данными;
- построение начальных базовых карт.

**Пример:**
```
Selection: all cells in 3×3 region
Corner values: TL=80, TR=100, BL=70, BR=90

Before:      After:
80  ?   100  80   90   100
?   ?   ?    75   85   95
70  ?   90   70   80   90
```

## Оптимизация производительности

### Расположение данных в памяти

Таблицы хранятся как `Vec<Vec<f64>>` (построчно), что обеспечивает эффективный доступ с учётом кэш-памяти:
```
[row0[col0, col1, col2, ...],
 row1[col0, col1, col2, ...],
 ...]
```

### Векторизация

Для больших таблиц операции используют цепочки итераторов, что позволяет компилятору потенциально применять SIMD-оптимизацию:
```rust
let sum: f64 = z_values.iter()
    .flat_map(|row| row.iter())
    .sum();
```

### Операции на месте

По возможности операции изменяют существующие массивы, а не выделяют новые:
```rust
// Good (in-place)
result[row][col] *= factor;

// Avoid (allocates)
result = result.iter().map(|v| v * factor).collect();
```

## Обработка ошибок

Все операции с таблицами возвращают `Result<Vec<Vec<f64>>, String>`.

Распространённые ошибки:
- **Выход за границы:** `"Row X out of bounds (table has Y rows)"`.
- **Пустое выделение:** `"No cells selected"`.
- **Недопустимые размеры:** `"New X bins must match table columns"`.
- **Деление на ноль:** `"Cannot interpolate with coincident axis points"`.

## Ссылки на исходный код

- Реализация: `crates/libretune-core/src/table_ops.rs`.
- Тесты: `crates/libretune-core/tests/table_ops.rs`.
- Команды Tauri: `crates/libretune-app/src-tauri/src/lib.rs` (`smooth_table`, `rebin_table` и т. д.).
- Интеграция интерфейса: `crates/libretune-app/src/components/tables/TableEditor2D.tsx`.

## См. также

- [Редактирование 2D-таблиц](../features/table-editing/2d-tables.md) — руководство по операциям с таблицами.
- [3D-визуализация](../features/table-editing/3d-visualization.md) — визуализация интерполированных поверхностей.
- [Алгоритм AutoTune](./autotune-algorithm.md) — использует интерполяцию для сопоставления данных.
