-- Limpar subscriptions antigas que usavam a chave VAPID anterior
DELETE FROM push_subscriptions;

-- Adicionar comentário para documentação
COMMENT ON TABLE push_subscriptions IS 'Subscriptions de push notifications. Limpa em 18/01/2026 após atualização das chaves VAPID.';