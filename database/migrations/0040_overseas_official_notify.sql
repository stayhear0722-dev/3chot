-- Overseas official Feishu target. The row starts disabled. Enabling it is setTargetEnabled,
-- which stamps enabled_at so items from the pause window are not backfilled.
-- Widens the purpose check; existing rows stay valid. ON CONFLICT does not turn a row on.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'notify_targets'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%purpose%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notify_targets DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE notify_targets
  ADD CONSTRAINT notify_targets_purpose_check
  CHECK (purpose IN ('content', 'alert', 'feedback', 'overseas'));

INSERT INTO notify_targets (key, purpose, kind, enabled, config_ref, note)
VALUES (
  'feishu-overseas-official',
  'overseas',
  'feishu_chat',
  false,
  'FEISHU_OVERSEAS_CHAT_ID',
  '海外运营情报：美国站及直接相关跨境的紧急政策。默认暂停。启用时刷新 enabled_at，不补推暂停期间的内容。'
)
ON CONFLICT (key) DO NOTHING;
