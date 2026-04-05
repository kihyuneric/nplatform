-- Migration 013: credit_balance 컬럼 추가 (O(n) 잔액 계산 최적화)
-- 기존: credit_transactions 전체 합산 (O(n))
-- 이후: users.credit_balance 단일 컬럼 조회 (O(1))

-- 1. users 테이블에 credit_balance 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;

-- 2. 기존 트랜잭션에서 현재 잔액 역산하여 초기값 세팅
UPDATE users u
SET credit_balance = COALESCE((
  SELECT SUM(ct.amount)
  FROM credit_transactions ct
  WHERE ct.user_id = u.id
), 0)
WHERE EXISTS (
  SELECT 1 FROM credit_transactions ct WHERE ct.user_id = u.id
);

-- 3. credit_balance가 음수가 되지 않도록 CHECK 제약
ALTER TABLE users
  ADD CONSTRAINT chk_credit_balance_non_negative
  CHECK (credit_balance >= 0);

-- 4. credit_transactions 삽입 시 users.credit_balance 자동 동기화하는 트리거
CREATE OR REPLACE FUNCTION sync_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET credit_balance = credit_balance + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_credit_balance ON credit_transactions;
CREATE TRIGGER trg_sync_credit_balance
  AFTER INSERT ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_credit_balance();

-- 5. credit_balance 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_users_credit_balance ON users(credit_balance);
