-- Enable realtime for boats table
ALTER TABLE public.boats REPLICA IDENTITY FULL;

-- Add boats table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.boats;