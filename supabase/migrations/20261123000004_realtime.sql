-- Migration: 20261123000004_realtime.sql
-- Description: Configure Realtime Publication for Live Tables

-- Ensure supabase_realtime publication exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Enable replica identity FULL on live tables for complete update payloads
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_status_events REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE call_bells REPLICA IDENTITY FULL;
ALTER TABLE table_sessions REPLICA IDENTITY FULL;
ALTER TABLE print_jobs REPLICA IDENTITY FULL;

-- Add live tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_events;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE call_bells;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
