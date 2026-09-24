CREATE TABLE users
(
    id                    UUID PRIMARY KEY,
    login                 VARCHAR(100)             NOT NULL UNIQUE,
    password_hash         VARCHAR(255)             NOT NULL,
    full_name             VARCHAR(255)             NOT NULL,
    active                BOOLEAN                  NOT NULL DEFAULT TRUE,
    must_change_password  BOOLEAN                  NOT NULL DEFAULT TRUE,
    failed_login_attempts INT                      NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP WITH TIME ZONE,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE user_roles
(
    user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE vacation_types
(
    id          UUID PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(1000),
    active      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE vacations
(
    id               UUID PRIMARY KEY,
    vacation_number  VARCHAR(80)              NOT NULL UNIQUE,
    employee_id      UUID                     NOT NULL REFERENCES users (id),
    vacation_type_id UUID                     NOT NULL REFERENCES vacation_types (id),
    title            VARCHAR(255)             NOT NULL,
    description      VARCHAR(4000),
    start_date       DATE                     NOT NULL,
    end_date         DATE                     NOT NULL,
    days_count       INT                      NOT NULL CHECK (days_count > 0),
    status           VARCHAR(20)              NOT NULL,
    urgent           BOOLEAN                  NOT NULL DEFAULT FALSE,
    priority         VARCHAR(20)              NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    version          BIGINT,
    archived         BOOLEAN                  NOT NULL DEFAULT FALSE,
    CHECK (start_date <= end_date)
);

CREATE TABLE vacation_tags
(
    vacation_id UUID         NOT NULL REFERENCES vacations (id) ON DELETE CASCADE,
    tag         VARCHAR(100) NOT NULL,
    PRIMARY KEY (vacation_id, tag)
);

CREATE TABLE vacation_notes
(
    id          UUID PRIMARY KEY,
    vacation_id UUID                     NOT NULL REFERENCES vacations (id) ON DELETE CASCADE,
    author_id   UUID                     NOT NULL REFERENCES users (id),
    text        VARCHAR(4000)            NOT NULL,
    pinned      BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE refresh_sessions
(
    id         UUID PRIMARY KEY,
    user_id    UUID                     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(128)             NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked    BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE audit_log
(
    id             UUID PRIMARY KEY,
    user_id        UUID REFERENCES users (id),
    event_type     VARCHAR(100)             NOT NULL,
    entity_type    VARCHAR(100)             NOT NULL,
    entity_id      UUID,
    correlation_id VARCHAR(100)             NOT NULL,
    description    VARCHAR(2000)            NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX ix_vacations_employee_dates ON vacations (employee_id, start_date, end_date);
CREATE INDEX ix_vacations_filters ON vacations (status, archived, start_date);
CREATE INDEX ix_audit_created ON audit_log (created_at);

CREATE TABLE departments
(
    id         UUID PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE shifts
(
    id            UUID PRIMARY KEY,
    department_id UUID         NOT NULL REFERENCES departments (id),
    name          VARCHAR(100) NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (department_id, name)
);

CREATE TABLE shift_plans
(
    id             UUID PRIMARY KEY,
    shift_id       UUID NOT NULL REFERENCES shifts (id),
    work_date      DATE NOT NULL,
    minimum_staff  INT  NOT NULL CHECK (minimum_staff >= 0),
    UNIQUE (shift_id, work_date)
);

CREATE TABLE shift_plan_assignments
(
    id          UUID PRIMARY KEY,
    plan_id     UUID NOT NULL REFERENCES shift_plans (id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users (id),
    work_date   DATE NOT NULL,
    UNIQUE (plan_id, employee_id),
    UNIQUE (work_date, employee_id)
);

CREATE INDEX ix_shift_plans_date ON shift_plans (work_date);
CREATE INDEX ix_shift_assignments_date_employee ON shift_plan_assignments (work_date, employee_id);
INSERT INTO vacation_types(id, code, name, description, active)

VALUES ('00000000-0000-0000-0000-000000000001', 'ANNUAL', 'Annual leave', 'Paid annual leave', true),
       ('00000000-0000-0000-0000-000000000002', 'SICK', 'Sick leave', 'Medical leave', true),
       ('00000000-0000-0000-0000-000000000003', 'UNPAID', 'Unpaid leave', 'Unpaid leave', true);

INSERT INTO users(
    id, login, password_hash,
    full_name, active, must_change_password, failed_login_attempts, created_at,
                  updated_at)
VALUES ('10000000-0000-0000-0000-000000000001', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Administrator', true, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('10000000-0000-0000-0000-000000000002', 'editor', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vacation Editor', true, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('10000000-0000-0000-0000-000000000003', 'viewer', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vacation Viewer', true, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('10000000-0000-0000-0000-000000000004', 'elena', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Elena Petrova', true, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('10000000-0000-0000-0000-000000000005', 'inactive', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Inactive User', false, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO user_roles
VALUES ('10000000-0000-0000-0000-000000000001', 'ADMIN'),
       ('10000000-0000-0000-0000-000000000002', 'EDITOR'),
       ('10000000-0000-0000-0000-000000000003', 'VIEWER'),
       ('10000000-0000-0000-0000-000000000004', 'VIEWER'),
       ('10000000-0000-0000-0000-000000000005', 'VIEWER');
