# Vacatime frontend

## Запуск

```sh
cp .env.example .env
bun install
bun run dev
```

Демо-логины: `admin`, `editor`, `viewer`, `elena`. Временный пароль `ChangeMe123!`.

### Демо-данные

```sh
API_URL=http://localhost:8080 SEED_LOGIN=admin SEED_PASSWORD='<пароль admin>' bun scripts/seed.ts
```

### Сборка

```sh
ORIGIN=http://localhost:3000 bun run build
API_URL=http://localhost:8080 PORT=3000 node build

docker compose up --build -d
# или в сети compose бэкенда:
docker compose -f compose.yaml -f compose.backend-network.yaml up --build -d
```

## Проверки

```sh
bun run check
bun run test:unit --run
bun run test:e2e
```
