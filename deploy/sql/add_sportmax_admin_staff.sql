BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE tmp_staff_seed (
    username text,
    email text,
    first_name text,
    last_name text,
    birth_date date,
    phone text,
    full_name text
) ON COMMIT DROP;

INSERT INTO tmp_staff_seed (
    username,
    email,
    first_name,
    last_name,
    birth_date,
    phone,
    full_name
) VALUES
    (
        'alla.kolesnik',
        'alla_koliesnikmail@mail.ru',
        'Алла Анатольевна',
        'Колесник',
        '1990-04-20',
        '79652804731',
        'Колесник Алла Анатольевна'
    ),
    (
        'mirab.arslanov',
        'mirab.arslanov@yandex.ru',
        'Мираб Алибекович',
        'Арсланов',
        '2007-02-07',
        '79680402394',
        'Арсланов Мираб Алибекович'
    ),
    (
        'elizaveta.krotova',
        'lizakrow08@ya.ru',
        'Елизавета Андреевна',
        'Кротова',
        '2008-11-18',
        '79296770863',
        'Кротова Елизавета Андреевна'
    ),
    (
        'taisiya.lisogorskaya',
        'xwxtai@yandex.ru',
        'Таисия Тарасовна',
        'Лисогорская',
        '2007-11-20',
        '79773581082',
        'Лисогорская Таисия Тарасовна'
    );

CREATE TEMP TABLE tmp_target_company (
    id bigint PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO tmp_target_company (id)
SELECT id
FROM companies_company
WHERE slug = 'sportmax'
  AND is_active = TRUE
LIMIT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tmp_target_company) THEN
        RAISE EXCEPTION 'Company sportmax not found';
    END IF;
END $$;

CREATE TEMP TABLE tmp_target_branch (
    id bigint PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO tmp_target_branch (id)
SELECT b.id
FROM branches_branch b
JOIN tmp_target_company c ON c.id = b.company_id
ORDER BY b.is_primary DESC, b.id ASC
LIMIT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tmp_target_branch) THEN
        RAISE EXCEPTION 'Branch for sportmax not found';
    END IF;
END $$;

INSERT INTO auth_user (
    password,
    last_login,
    is_superuser,
    username,
    first_name,
    last_name,
    email,
    is_staff,
    is_active,
    date_joined
)
SELECT
    '!' AS password,
    NULL AS last_login,
    FALSE AS is_superuser,
    s.username,
    s.first_name,
    s.last_name,
    s.email,
    TRUE AS is_staff,
    TRUE AS is_active,
    NOW() AS date_joined
FROM tmp_staff_seed s
ON CONFLICT (username) DO UPDATE
SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    is_staff = TRUE,
    is_active = TRUE;

WITH staff AS (
    SELECT
        s.*,
        u.id AS user_id,
        c.id AS company_id,
        b.id AS branch_id
    FROM tmp_staff_seed s
    JOIN auth_user u ON u.username = s.username
    CROSS JOIN tmp_target_company c
    CROSS JOIN tmp_target_branch b
)
INSERT INTO accounts_userprofile (
    user_id,
    phone,
    birth_date,
    created_at,
    updated_at
)
SELECT
    staff.user_id,
    staff.phone,
    staff.birth_date,
    NOW(),
    NOW()
FROM staff
ON CONFLICT (user_id) DO UPDATE
SET
    phone = EXCLUDED.phone,
    birth_date = EXCLUDED.birth_date,
    updated_at = NOW();

WITH staff AS (
    SELECT
        s.*,
        u.id AS user_id,
        c.id AS company_id,
        b.id AS branch_id
    FROM tmp_staff_seed s
    JOIN auth_user u ON u.username = s.username
    CROSS JOIN tmp_target_company c
    CROSS JOIN tmp_target_branch b
)
INSERT INTO accounts_companymembership (
    user_id,
    company_id,
    branch_id,
    role,
    is_active,
    created_at,
    updated_at
)
SELECT
    staff.user_id,
    staff.company_id,
    staff.branch_id,
    'admin',
    TRUE,
    NOW(),
    NOW()
FROM staff
ON CONFLICT (user_id, company_id) DO UPDATE
SET
    branch_id = EXCLUDED.branch_id,
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = NOW();

WITH staff AS (
    SELECT
        s.*,
        c.id AS company_id,
        b.id AS branch_id
    FROM tmp_staff_seed s
    CROSS JOIN tmp_target_company c
    CROSS JOIN tmp_target_branch b
)
INSERT INTO accounts_employeeinvitation (
    company_id,
    branch_id,
    invited_by_id,
    email,
    full_name,
    role,
    status,
    token,
    message,
    expires_at,
    accepted_at,
    created_at,
    updated_at
)
SELECT
    staff.company_id,
    staff.branch_id,
    NULL,
    staff.email,
    staff.full_name,
    'admin',
    'pending',
    gen_random_uuid(),
    '',
    NULL,
    NULL,
    NOW(),
    NOW()
FROM staff
ON CONFLICT ON CONSTRAINT uniq_employee_invitation_state_per_company_email DO UPDATE
SET
    branch_id = EXCLUDED.branch_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = 'pending',
    message = '',
    expires_at = NULL,
    accepted_at = NULL,
    updated_at = NOW();

COMMIT;
