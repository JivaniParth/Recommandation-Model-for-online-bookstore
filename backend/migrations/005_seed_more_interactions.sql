-- Add more interaction data for better recommendations
-- Run after 004_seed_core.sql

-- More purchases
INSERT INTO user_interactions (user_id, product_id, interaction_type, ts) VALUES
  -- User 1 (Parth) - Likes Fantasy & Sci-Fi
  (1, 4, 'purchase', '2024-09-10 09:00:00'),
  (1, 5, 'purchase', '2024-09-10 09:00:00'),
  
  -- User 2 (Nirjari) already has purchases
  
  -- User 3 (John) already has purchases
  
  -- User 4 (Jane) already has purchases
  
  -- User 5 (Bob) - Likes Thriller & Mystery
  (5, 7, 'purchase', '2024-09-28 11:20:00'),
  (5, 8, 'purchase', '2024-09-28 11:20:00'),
  (5, 10, 'purchase', '2024-09-28 11:20:00'),
  
  -- User 6 (Alice) - Likes Classics & Romance
  (6, 1, 'purchase', '2024-09-30 14:30:00'),
  (6, 2, 'purchase', '2024-09-30 14:30:00'),
  (6, 6, 'purchase', '2024-09-30 14:30:00');

-- Add view interactions
INSERT INTO user_interactions (user_id, product_id, interaction_type, ts) VALUES
  (1, 3, 'view', '2024-10-01 10:00:00'),
  (1, 6, 'view', '2024-10-01 10:05:00'),
  (2, 3, 'view', '2024-10-02 11:00:00'),
  (2, 4, 'view', '2024-10-02 11:05:00'),
  (2, 5, 'view', '2024-10-02 11:10:00'),
  (3, 1, 'view', '2024-10-03 12:00:00'),
  (3, 2, 'view', '2024-10-03 12:05:00'),
  (3, 6, 'view', '2024-10-03 12:10:00'),
  (4, 7, 'view', '2024-10-04 13:00:00'),
  (4, 8, 'view', '2024-10-04 13:05:00'),
  (4, 10, 'view', '2024-10-04 13:10:00'),
  (5, 9, 'view', '2024-10-05 14:00:00'),
  (6, 4, 'view', '2024-10-06 15:00:00'),
  (6, 5, 'view', '2024-10-06 15:05:00');

-- Add cart additions
INSERT INTO user_interactions (user_id, product_id, interaction_type, ts) VALUES
  (1, 7, 'cart_add', '2024-10-07 10:00:00'),
  (2, 6, 'cart_add', '2024-10-07 11:00:00'),
  (3, 4, 'cart_add', '2024-10-07 12:00:00'),
  (4, 1, 'cart_add', '2024-10-07 13:00:00'),
  (5, 1, 'cart_add', '2024-10-07 14:00:00'),
  (6, 7, 'cart_add', '2024-10-07 15:00:00');
  
-- Refresh materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_unique ON mv_user_product_purchases(user_id, product_id);
REFRESH MATERIALIZED VIEW mv_user_product_purchases;