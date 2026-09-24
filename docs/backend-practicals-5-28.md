# Отчёты по backend: практические работы № 5–28

## Практическая работа № 23. Производительность и кэширование

### Сценарий и условия

Измеряется `GET /api/vacations?search=PERF-&archived=false&page=0&size=100` на локальном PostgreSQL с 10 000 подготовленных записей. Скрипт делает 5 прогревочных и 100 измеряемых запросов, не выводит access token и сообщает p50/p95. Seed запускается только на локальной демонстрационной БД и удаляет перед заполнением записи с префиксом `PERF-`.

Подготовка и замер (команды из `backend/`):

```powershell
Get-Content .\scripts\performance-seed.sql -Raw | docker compose exec -T postgres psql -U vacatime -d vacatime
$env:VACATIME_ACCESS_TOKEN = '<access token>'
.\scripts\benchmark-vacation-search.ps1
```

**Результат:** замер в этой среде не выполнен: Docker и PostgreSQL-клиенты недоступны. До получения замера не добавлялись кэш и новые индексы. Целевой критерий для учебного стенда — p95 не более 2 секунд; сравнение и решение об оптимизации нужно заполнить после запуска на одном и том же стенде до/после.

## Практические работы № 5, 12 и 25. Backend-срез и систематические проверки

### Состояние backend

Сборка backend, Liquibase-подключение к БД, CRUD/API-обработчики, обработка ошибок и OpenAPI/Swagger уже реализованы. Локальный автоматический прогон выполнен командой `.\gradlew.bat '-Pkotlin.compiler.execution.strategy=in-process' check bootJar`: **BUILD SUCCESSFUL**, 26 тестов, 0 ошибок и 0 пропусков; также прошли форматирование Kotlin и сборка JAR.

Контейнерный smoke-тест, проверка сохранения данных после перезапуска PostgreSQL и PostgreSQL-специфичный `postgresTest` здесь не запускались: в среде нет Docker и PostgreSQL. Для повторного запуска использовать команды из `backend/README.md`.

### Матрица требований и проверок

| Требование | Проверка backend | Результат |
|---|---|---|
| FR-01: вход и жизненный цикл сессии | `AuthIntegrationTest`, `JwtServiceTest` | Покрыты тестами логин, refresh/logout, временный пароль и блокировка входа. |
| FR-02: роли и доступ | `AuthIntegrationTest`, `AdminIntegrationTest`, `VacationIntegrationTest`, `ActuatorIntegrationTest` | Проверяются запрет операции без роли, права ADMIN и доступ к metrics. |
| FR-03–06: чтение, CRUD, даты, версия и фильтры | `VacationIntegrationTest` | Проверяются список/фильтры, CRUD, пересечения дат, конфликт версии, архив и восстановление. |
| FR-07: заметки | `VacationNoteIntegrationTest` | CRUD заметки проверяется интеграционно. |
| FR-08: пользователи и типы отпусков | `AdminIntegrationTest` | Проверяются создание и сброс пароля, запрет не-ADMIN, неактивный тип. |
| FR-09: массовые операции | `VacationBulkIntegrationTest` | Проверяется результат частичного успеха и ошибки строк. |
| FR-10: CSV | `VacationCsvIntegrationTest` | Проверяются preview и применение импорта. |
| FR-11: аналитика и аудит | `AnalyticsIntegrationTest`, `AdminIntegrationTest` | Проверяются изменения сводных счётчиков после создания/архивации, поиск аудита и его доступ. |
| NFR-03: время ответа до 2 секунд на 10 000 записей | `scripts/benchmark-vacation-search.ps1` | Не измерено; см. результат работы № 23. |
| NFR-06: схема воспроизводима на PostgreSQL | Liquibase-интеграционные тесты H2; задача `postgresTest` | H2-проверка прошла в общем наборе; PostgreSQL-прогон ожидает доступную БД. |

### Реестр оставшихся проверок

| Пункт | Статус |
|---|---|
| Compose запуска API и БД, smoke API, сохранность после перезапуска | Не выполнено в этой среде: Docker недоступен. |
| Backup и восстановление БД | Инструкция подготовлена, восстановление не проверено без Docker/PostgreSQL. |
| Нагрузочный замер 10 000 записей | Сценарий подготовлен, замер ожидает PostgreSQL-стенд. |
