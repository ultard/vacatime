UPDATE users SET password_hash = '$2a$10$8wMQ7hBWJD7Ogo9Dy5W5BeL9DiU2DTNNGbwSSHmi.fTWiAYXbBx1.', must_change_password = true;

ALTER TABLE user_roles ADD CONSTRAINT ck_user_role CHECK (role IN ('VIEWER', 'EDITOR', 'ADMIN'));
ALTER TABLE vacations ADD CONSTRAINT ck_vacation_status CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
ALTER TABLE vacations ADD CONSTRAINT ck_vacation_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH'));
ALTER TABLE users ADD CONSTRAINT ck_failed_attempts CHECK (failed_login_attempts >= 0);

CREATE INDEX ix_vacations_type ON vacations(vacation_type_id);
CREATE INDEX ix_vacations_priority ON vacations(priority);
CREATE INDEX ix_vacations_urgent ON vacations(urgent);
CREATE INDEX ix_vacations_days_count ON vacations(days_count);
CREATE INDEX ix_vacation_tags_tag ON vacation_tags(tag);
CREATE INDEX ix_vacation_notes_vacation ON vacation_notes(vacation_id);
CREATE INDEX ix_refresh_sessions_user ON refresh_sessions(user_id);
CREATE INDEX ix_users_full_name ON users(full_name);
CREATE INDEX ix_vacations_title ON vacations(title);

INSERT INTO vacations (
    id, vacation_number, employee_id, vacation_type_id, title, description,
    start_date, end_date, days_count, status, urgent, priority,
    created_at, updated_at, version, archived
) VALUES
    ('20000000-0000-0000-0000-000000000001', 'VAC-DEMO-001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Demo leave 1', 'Sample employee vacation for filters and analytics', '2027-01-05', '2027-01-07', 3, 'DRAFT', true, 'HIGH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000002', 'VAC-DEMO-002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Demo leave 2', 'Sample employee vacation for filters and analytics', '2027-02-05', '2027-02-11', 7, 'PENDING', false, 'NORMAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000003', 'VAC-DEMO-003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Demo leave 3', 'Sample employee vacation for filters and analytics', '2027-03-05', '2027-03-18', 14, 'APPROVED', false, 'NORMAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000004', 'VAC-DEMO-004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Demo leave 4', 'Sample employee vacation for filters and analytics', '2027-04-05', '2027-04-25', 21, 'REJECTED', true, 'HIGH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000005', 'VAC-DEMO-005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Demo leave 5', 'Sample employee vacation for filters and analytics', '2027-05-05', '2027-05-09', 5, 'CANCELLED', false, 'NORMAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000006', 'VAC-DEMO-006', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Demo leave 6', 'Sample employee vacation for filters and analytics', '2027-06-05', '2027-06-07', 3, 'DRAFT', false, 'LOW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000007', 'VAC-DEMO-007', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Demo leave 7', 'Sample employee vacation for filters and analytics', '2027-07-05', '2027-07-11', 7, 'PENDING', true, 'HIGH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000008', 'VAC-DEMO-008', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Demo leave 8', 'Sample employee vacation for filters and analytics', '2027-08-05', '2027-08-18', 14, 'APPROVED', false, 'NORMAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, false),
    ('20000000-0000-0000-0000-000000000009', 'VAC-DEMO-009', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Demo leave 9', 'Sample employee vacation for filters and analytics', '2027-09-05', '2027-09-25', 21, 'REJECTED', false, 'HIGH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, true),
    ('20000000-0000-0000-0000-000000000010', 'VAC-DEMO-010', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Demo leave 10', 'Sample employee vacation for filters and analytics', '2027-10-05', '2027-10-09', 5, 'CANCELLED', true, 'HIGH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, true);

INSERT INTO vacation_tags(vacation_id, tag) VALUES
    ('20000000-0000-0000-0000-000000000001', 'summer'),
    ('20000000-0000-0000-0000-000000000002', 'family'),
    ('20000000-0000-0000-0000-000000000003', 'medical'),
    ('20000000-0000-0000-0000-000000000005', 'summer'),
    ('20000000-0000-0000-0000-000000000007', 'family'),
    ('20000000-0000-0000-0000-000000000009', 'medical');
