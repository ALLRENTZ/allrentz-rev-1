CREATE OR REPLACE VIEW equipment_public AS
SELECT id,
    title,
    category,
    image_url,
    "left"(COALESCE(description, ''::text), 120) AS description_teaser,
    split_part(location, ','::text, 1) AS city,
    CASE
        WHEN daily_rate < 250::numeric THEN '$'::text
        WHEN daily_rate < 750::numeric THEN '$$'::text
        WHEN daily_rate < 2000::numeric THEN '$$$'::text
        ELSE '$$$$'::text
    END AS price_band,
    CASE
        WHEN daily_rate < 250::numeric THEN '<$250/day'::text
        WHEN daily_rate < 750::numeric THEN '$250–$750/day'::text
        WHEN daily_rate < 2000::numeric THEN '$750–$2,000/day'::text
        ELSE '$2,000+/day'::text
    END AS price_range_label,
    available,
    daily_rate
FROM equipment e;