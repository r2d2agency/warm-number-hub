-- Seed do SuperAdmin
-- Execute este script APÓS o schema.sql
-- Senha: @N3tw0rk$ (hash bcrypt)

-- Insere o usuário superadmin (a senha já está hasheada com bcrypt)
INSERT INTO users (email, password_hash) 
VALUES (
    'tnicodemos@gmail.com',
    '$2a$10$QZGXsKD1xN8qYy8mVJLPWuXJe7Q7vO9V5EZ3aJ5Ey5Z7mC5zNt8Ky'
)
ON CONFLICT (email) DO NOTHING;

-- Atribui a role superadmin
INSERT INTO user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM users 
WHERE email = 'tnicodemos@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cria config padrão para o superadmin
INSERT INTO warming_config (user_id, min_delay_seconds, max_delay_seconds, messages_per_hour, active_hours_start, active_hours_end)
SELECT id, 60, 180, 20, 8, 22
FROM users 
WHERE email = 'tnicodemos@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
