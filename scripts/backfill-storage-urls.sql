-- Rewrite legacy loopback storage URLs to the public /storage route.
-- Existing rows were saved as http://127.0.0.1:9000/lawmitran-documents/<key>
-- (unreachable from a browser). This points PUBLIC image columns at the HTTPS
-- proxy base instead. Private columns (certificates/property) are served
-- through the authenticated API proxy, which ignores the host, so they don't
-- need rewriting.
--
--   1. Set :newbase below to the SAME value you put in S3_PUBLIC_URL.
--   2. Run:  psql "$DATABASE_URL" -f scripts/backfill-storage-urls.sql
--
\set newbase 'https://dev.lawmitran.com/storage'

BEGIN;

UPDATE "User"
SET "avatarUrl" = replace(replace("avatarUrl",
      'http://127.0.0.1:9000/lawmitran-documents', :'newbase'),
      'http://localhost:9000/lawmitran-documents', :'newbase')
WHERE "avatarUrl" LIKE '%9000/lawmitran-documents/%';

UPDATE "Lawyer"
SET "profileImageUrl" = replace(replace("profileImageUrl",
      'http://127.0.0.1:9000/lawmitran-documents', :'newbase'),
      'http://localhost:9000/lawmitran-documents', :'newbase')
WHERE "profileImageUrl" LIKE '%9000/lawmitran-documents/%';

UPDATE "LawyerOffice"
SET "photoUrls" = (
  SELECT array_agg(
    replace(replace(u,
      'http://127.0.0.1:9000/lawmitran-documents', :'newbase'),
      'http://localhost:9000/lawmitran-documents', :'newbase'))
  FROM unnest("photoUrls") AS u)
WHERE array_to_string("photoUrls", ',') LIKE '%9000/lawmitran-documents/%';

-- Optional: normalise private columns too (cosmetic; proxy ignores the host).
-- UPDATE "Lawyer" SET "certificateImageUrl" = replace(replace("certificateImageUrl",
--     'http://127.0.0.1:9000/lawmitran-documents', :'newbase'),
--     'http://localhost:9000/lawmitran-documents', :'newbase')
--   WHERE "certificateImageUrl" LIKE '%9000/lawmitran-documents/%';

COMMIT;

-- Sanity check — expect 0 rows:
SELECT 'User' AS tbl, count(*) FROM "User" WHERE "avatarUrl" LIKE '%127.0.0.1:9000%'
UNION ALL SELECT 'Lawyer', count(*) FROM "Lawyer" WHERE "profileImageUrl" LIKE '%127.0.0.1:9000%'
UNION ALL SELECT 'LawyerOffice', count(*) FROM "LawyerOffice" WHERE array_to_string("photoUrls", ',') LIKE '%127.0.0.1:9000%';
