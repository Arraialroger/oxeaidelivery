-- Fix polygon_coords stored as JSONB strings: extract text and re-parse as JSONB array
UPDATE delivery_zones
SET polygon_coords = (polygon_coords #>> '{}')::jsonb
WHERE is_polygon = true
  AND polygon_coords IS NOT NULL
  AND jsonb_typeof(polygon_coords) = 'string';