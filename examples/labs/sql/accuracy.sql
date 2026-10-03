\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE accuracy_parent (id integer PRIMARY KEY);
CREATE TEMP TABLE accuracy_child (
  id integer PRIMARY KEY,
  parent_id integer REFERENCES accuracy_parent(id),
  email text UNIQUE,
  amount integer CHECK (amount > 0)
);
INSERT INTO accuracy_parent VALUES (1);
-- Nullable uniqueness, CHECK UNKNOWN and an omitted FK are all accepted.
INSERT INTO accuracy_child VALUES (1,NULL,NULL,NULL),(2,1,NULL,10);
CREATE TEMP TABLE accuracy_candidates (name text NOT NULL);
CREATE TEMP TABLE accuracy_holds (name text NOT NULL, cert text NOT NULL);
CREATE TEMP TABLE accuracy_required (cert text NOT NULL);
INSERT INTO accuracy_candidates VALUES ('Ada'),('Ben'),('Cy'),('Grace');
INSERT INTO accuracy_holds VALUES ('Ada','Java'),('Ada','SQL'),('Ben','Java'),('Cy','Java'),('Cy','SQL');
INSERT INTO accuracy_required VALUES ('Java'),('SQL');
CREATE TEMP VIEW accuracy_division AS
SELECT c.name FROM accuracy_candidates c
WHERE NOT EXISTS (
  SELECT 1 FROM accuracy_required r WHERE NOT EXISTS (
    SELECT 1 FROM accuracy_holds h WHERE h.name=c.name AND h.cert=r.cert
  )
);
DO $$
DECLARE found text[];
BEGIN
  IF (SELECT count(*) FROM accuracy_child WHERE email IS NULL) <> 2 THEN
    RAISE EXCEPTION 'Nullable UNIQUE changed';
  END IF;
  BEGIN
    INSERT INTO accuracy_child VALUES (3,99,'valid@example.test',1);
    RAISE EXCEPTION 'Foreign key did not reject missing parent';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO accuracy_child VALUES (3,1,'valid@example.test',-1);
    RAISE EXCEPTION 'CHECK did not reject false';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT count(*) FROM (VALUES (1),(1)) l(id)
      WHERE EXISTS (SELECT 1 FROM accuracy_parent p WHERE p.id=l.id)) <> 2 THEN
    RAISE EXCEPTION 'EXISTS wrongly removed left duplicates';
  END IF;
  SELECT array_agg(name ORDER BY name) INTO found FROM accuracy_division;
  IF found IS DISTINCT FROM ARRAY['Ada','Cy'] THEN RAISE EXCEPTION 'Division mismatch'; END IF;
  DELETE FROM accuracy_required;
  IF (SELECT count(*) FROM accuracy_division) <> 4 THEN
    RAISE EXCEPTION 'Empty divisor must qualify all explicit candidates';
  END IF;
  IF (SELECT count(DISTINCT name) FROM accuracy_holds h
      WHERE NOT EXISTS (SELECT 1 FROM accuracy_required)) <> 3 THEN
    RAISE EXCEPTION 'Holds-derived universe must omit Grace';
  END IF;
  RAISE NOTICE 'PASS: seven constraint/bag/division checks';
END $$;
ROLLBACK;
