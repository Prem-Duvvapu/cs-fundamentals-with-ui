\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE customers (id integer PRIMARY KEY, name text NOT NULL);
CREATE TEMP TABLE orders (id integer PRIMARY KEY, customer_id integer REFERENCES customers(id), amount numeric(10,2) CHECK (amount >= 0), placed date NOT NULL, status text NOT NULL);
CREATE TEMP TABLE payments (id integer PRIMARY KEY, order_id integer NOT NULL REFERENCES orders(id), amount numeric(10,2) NOT NULL CHECK (amount > 0));
INSERT INTO customers VALUES (1,'Ada'),(2,'Lin'),(3,'Grace');
INSERT INTO orders VALUES (101,1,100,'2026-01-01','paid'),(102,1,50,'2026-01-02','paid'),(103,2,80,'2026-01-01','paid'),(104,2,80,'2026-01-03','cancelled');
INSERT INTO payments VALUES (1,101,100),(2,102,30),(3,102,20),(4,103,80);
CREATE INDEX orders_customer_placed ON orders(customer_id,placed,id);

-- Predict before running: Ada 150, Lin 80, Grace 0.
CREATE TEMP VIEW revenue AS
SELECT c.id,c.name,COALESCE(SUM(o.amount),0)::numeric(10,2) revenue
FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.status='paid'
GROUP BY c.id,c.name;
SELECT * FROM revenue ORDER BY id;

-- One-to-many payment fan-out makes SUM(order.amount) wrong for Ada.
SELECT c.name,SUM(o.amount) naive_total,COUNT(*) joined_rows,COUNT(DISTINCT o.id) distinct_orders
FROM customers c JOIN orders o ON o.customer_id=c.id JOIN payments p ON p.order_id=o.id
GROUP BY c.id,c.name ORDER BY c.id;

-- Aggregate the child to its intended grain before joining.
WITH paid_per_order AS (SELECT order_id,SUM(amount) paid FROM payments GROUP BY order_id)
SELECT c.name,SUM(o.amount) ordered,SUM(p.paid) paid
FROM customers c JOIN orders o ON o.customer_id=c.id JOIN paid_per_order p ON p.order_id=o.id
GROUP BY c.id,c.name ORDER BY c.id;

SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id);
SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders UNION ALL SELECT NULL::integer);
SELECT id,customer_id,amount,ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC,id) position,
DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) amount_rank FROM orders ORDER BY customer_id,id;
SELECT id FROM orders ORDER BY placed,id LIMIT 2 OFFSET 0;
SELECT id FROM orders ORDER BY placed,id LIMIT 2 OFFSET 2;
EXPLAIN (ANALYZE,BUFFERS) SELECT * FROM orders WHERE customer_id=1 ORDER BY placed,id;

DO $$
DECLARE actual numeric; ids integer[];
BEGIN
  IF (SELECT array_agg(revenue ORDER BY id) FROM revenue) <> ARRAY[150,80,0]::numeric[] THEN RAISE EXCEPTION 'Revenue/LEFT JOIN result mismatch'; END IF;
  IF (SELECT COUNT(*) FROM customers WHERE id NOT IN (SELECT customer_id FROM orders UNION ALL SELECT NULL::integer)) <> 0 THEN RAISE EXCEPTION 'NULL NOT IN mismatch'; END IF;
  IF (SELECT COUNT(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id)) <> 1 THEN RAISE EXCEPTION 'NOT EXISTS mismatch'; END IF;
  SELECT SUM(o.amount) INTO actual FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.customer_id=1;
  IF actual <> 200 THEN RAISE EXCEPTION 'Fan-out trace mismatch'; END IF;
  SELECT array_agg(id) INTO ids FROM (SELECT id FROM orders ORDER BY placed,id LIMIT 2 OFFSET 2) page;
  IF ids <> ARRAY[102,104] THEN RAISE EXCEPTION 'Deterministic pagination mismatch'; END IF;
  IF (SELECT COUNT(*) FROM (SELECT DENSE_RANK() OVER (ORDER BY amount DESC) rank FROM orders WHERE customer_id=2) ranked WHERE rank=1) <> 2 THEN RAISE EXCEPTION 'Tie ranking mismatch'; END IF;
  BEGIN
    INSERT INTO payments VALUES (99,101,-1);
    RAISE EXCEPTION 'Negative payment unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS: six query checks and the negative-payment constraint';
END $$;
SAVEPOINT before_change;
UPDATE orders SET amount=999 WHERE id=101;
ROLLBACK TO SAVEPOINT before_change;
DO $$ BEGIN IF (SELECT amount FROM orders WHERE id=101) <> 100 THEN RAISE EXCEPTION 'Savepoint rollback mismatch'; END IF; RAISE NOTICE 'PASS: savepoint rollback'; END $$;
ROLLBACK;
-- All objects were temporary and the transaction has ended. No permanent fixture remains.
