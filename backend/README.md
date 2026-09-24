# Vacatime backend

Spring Boot/Kotlin API for managing employee vacations.

## Запуск

Требуются JDK 25 и Docker. Для запуска задайте случайный `JWT_SECRET` длиной
не менее 32 байт; секрет по умолчанию не используется.

```powershell
$env:JWT_SECRET = '<случайная строка не короче 32 байт>'
docker compose up -d postgres
.\gradlew.bat bootRun
```

Для Compose скопируйте `.env.example` в `.env` и замените `JWT_SECRET` случайным
секретом. Файл `.env` не попадает в Git.

```powershell
docker compose up --build -d
docker compose ps
```

После запуска API доступен на `http://localhost:8080`; остановить контейнеры
можно командой `docker compose down`. Данные PostgreSQL сохраняются в volume
`postgres-data`.

Значения PostgreSQL по умолчанию и `.env.example` предназначены только для
локальной разработки. Для развёртывания задайте собственные `DB_USER`,
`DB_PASSWORD` и `JWT_SECRET` вне репозитория.

Swagger: http://localhost:8080/swagger-ui/index.html. Получите access token через
`POST /api/auth/login` и вставьте его в Swagger Authorize.

Liquibase создаёт схему и демоданные: 5 пользователей, 3 типа отпуска и 10 отпусков.
Логины: `admin`, `editor`, `viewer`, `elena`, `inactive`. Временный пароль:
`ChangeMe123!`. При первом входе обязателен `POST /api/auth/change-password`.
После смены пароля войдите повторно; старые refresh-сессии отзываются.
Пользователь `inactive` отключён.

Переменные окружения: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.
Значения БД по умолчанию соответствуют `compose.yaml`. Для рабочего окружения задайте
собственный JWT secret длиной не меньше 32 байт.

## Проверка

```powershell
.\gradlew.bat formatKotlin
.\gradlew.bat checkKotlinFormat
.\gradlew.bat test
.\gradlew.bat bootJar
```

Обычные тесты используют H2 в PostgreSQL-режиме и запускают Liquibase.
Для прогона тех же тестов с PostgreSQL и `ddl-auto=validate` укажите отдельную
тестовую БД (тесты добавляют данные):

```powershell
$env:TEST_DB_URL = 'jdbc:postgresql://localhost:5432/vacatime_test'
.\gradlew.bat postgresTest
```

Тесты покрывают JWT, refresh/logout, блокировку входа, временные пароли,
права доступа, CRUD, бизнес-правила, фильтры, optimistic locking, заметки,
массовые операции, CSV и аудит.
