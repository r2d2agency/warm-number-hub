-- Tabela de logs de aquecimento para auditoria
CREATE TABLE IF NOT EXISTS warming_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_warming_logs_user_id ON warming_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_warming_logs_created_at ON warming_logs(created_at);

-- Índice para buscar logs recentes por usuário
CREATE INDEX IF NOT EXISTS idx_warming_logs_user_recent ON warming_logs(user_id, created_at DESC);
