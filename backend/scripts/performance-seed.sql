DO $$
BEGIN
    IF current_database() <> 'vacatime' THEN
        RAISE EXCEPTION 'Run only against the disposable local vacatime database';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = '10000000-0000-0000-0000-000000000001')
       OR NOT EXISTS (SELECT 1 FROM vacation_types WHERE id = '00000000-0000-0000-0000-000000000001') THEN
        RAISE EXCEPTION 'Run Liquibase demo migrations before seeding';
    END IF;
END $$;

DELETE FROM vacations WHERE vacation_number LIKE 'PERF-%';

INSERT INTO vacations (
    id, vacation_number, employee_id, vacation_type_id, title,
    start_date, end_date, days_count, status, urgent, priority,
    created_at, updated_at, version, archived
)
SELECT
    gen_random_uuid(),
    'PERF-' || lpad(sample_no::text, 5, '0'),
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Performance sample ' || sample_no,
    DATE '2020-01-01' + (sample_no % 3650),
    DATE '2020-01-01' + (sample_no % 3650) + 4,
    5, 'DRAFT', false, 'NORMAL', now(), now(), 0, false
FROM generate_series(1, 10000) AS sample_no;
