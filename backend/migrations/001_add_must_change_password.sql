-- Adiciona coluna para forçar troca de senha no primeiro acesso
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Atualiza o superadmin existente para permitir login sem senha
-- (remove a senha antiga e marca para trocar)
UPDATE users 
SET password_hash = NULL, must_change_password = true 
WHERE email = 'tnicodemos@gmail.com';
