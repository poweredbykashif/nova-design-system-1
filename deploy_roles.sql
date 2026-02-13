-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full access to all system features'),
  ('Project Manager', 'Manage projects, timelines, and resources'),
  ('Freelancer', 'External contributor working on assigned tasks'),
  ('Presentation Designer', 'Specialized in creating presentation designs'),
  ('Finance Manager', 'Manage financial records, invoices, and payments')
ON CONFLICT (name) DO NOTHING;
