\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE fraud_observations (
  transaction_id integer PRIMARY KEY,
  account_id integer NOT NULL,
  transaction_time timestamptz NOT NULL
);
CREATE TEMP TABLE account_risk_history (
  update_id integer PRIMARY KEY,
  account_id integer NOT NULL,
  event_time timestamptz NOT NULL,
  available_at timestamptz NOT NULL,
  risk_score numeric NOT NULL
);
INSERT INTO fraud_observations VALUES
  (1, 10, '2026-10-03 10:00:00+00'),
  (2, 99, '2026-10-03 10:00:00+00'),
  (3, 20, '2026-10-03 10:00:00+00');
INSERT INTO account_risk_history VALUES
  (1, 10, '2026-10-03 09:45:00+00', '2026-10-03 09:45:08+00', 0.18),
  (2, 10, '2026-10-03 10:03:00+00', '2026-10-03 10:03:01+00', 0.91),
  (3, 10, '2026-10-03 09:55:00+00', '2026-10-03 10:08:00+00', 0.32),
  (4, 20, '2026-10-03 09:55:00+00', '2026-10-03 09:56:00+00', 0.40),
  (5, 20, '2026-10-03 09:55:00+00', '2026-10-03 09:56:00+00', 0.45);

CREATE TEMP VIEW serving_replay AS
WITH eligible AS (
  SELECT observation.transaction_id, feature.risk_score,
         ROW_NUMBER() OVER (
           PARTITION BY observation.transaction_id
           ORDER BY feature.event_time DESC, feature.available_at DESC,
                    feature.update_id DESC
         ) AS position
  FROM fraud_observations AS observation
  LEFT JOIN account_risk_history AS feature
    ON feature.account_id = observation.account_id
   AND feature.event_time <= observation.transaction_time
   AND feature.available_at <= observation.transaction_time
)
SELECT transaction_id, risk_score FROM eligible WHERE position = 1;

TABLE serving_replay;
DO $$
DECLARE event_only numeric;
BEGIN
  IF (SELECT risk_score FROM serving_replay WHERE transaction_id = 1) IS DISTINCT FROM 0.18 THEN
    RAISE EXCEPTION 'Replay must exclude both future events and late availability';
  END IF;
  SELECT risk_score INTO event_only FROM account_risk_history
    WHERE account_id = 10 AND event_time <= '2026-10-03 10:00:00+00'
    ORDER BY event_time DESC, available_at DESC, update_id DESC LIMIT 1;
  IF event_only IS DISTINCT FROM 0.32 THEN
    RAISE EXCEPTION 'Event-time-only historical lookup should include the late correction';
  END IF;
  IF NOT EXISTS (SELECT FROM serving_replay WHERE transaction_id = 2 AND risk_score IS NULL) THEN
    RAISE EXCEPTION 'Missing feature must stay missing, not silently become zero';
  END IF;
  IF (SELECT risk_score FROM serving_replay WHERE transaction_id = 3) IS DISTINCT FROM 0.45 THEN
    RAISE EXCEPTION 'Equal timestamps require the declared final update-id tie-breaker';
  END IF;
END $$;
ROLLBACK;
\echo PASS: availability replay, late correction, missing feature and tie-breaking
