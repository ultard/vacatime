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

CREATE INDEX ix_refresh_sessions_user ON refresh_sessions(user_id);
CREATE INDEX ix_users_full_name ON users(full_name);
CREATE INDEX ix_audit_created ON audit_log (created_at);

CREATE INDEX ix_vacations_title ON vacations(title);
CREATE INDEX ix_vacations_type ON vacations(vacation_type_id);
CREATE INDEX ix_vacations_priority ON vacations(priority);
CREATE INDEX ix_vacations_urgent ON vacations(urgent);
CREATE INDEX ix_vacations_days_count ON vacations(days_count);
CREATE INDEX ix_vacations_employee_dates ON vacations (employee_id, start_date, end_date);

CREATE INDEX ix_vacation_tags_tag ON vacation_tags(tag);
CREATE INDEX ix_vacations_filters ON vacations (status, archived, start_date);
CREATE INDEX ix_vacation_notes_vacation ON vacation_notes(vacation_id);

CREATE INDEX ix_shift_plans_date ON shift_plans (work_date);
CREATE INDEX ix_shift_assignments_date_employee ON shift_plan_assignments (work_date, employee_id);