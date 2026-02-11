-- Fix existing polygon_coords that were stored as JSONB strings instead of JSONB arrays
-- due to double JSON.stringify encoding
UPDATE delivery_zones
SET polygon_coords = polygon_coords::text::jsonb
WHERE is_polygon = true
  AND polygon_coords IS NOT NULL
  AND jsonb_typeof(polygon_coords) = 'string';