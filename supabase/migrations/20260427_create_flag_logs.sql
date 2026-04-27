CREATE TABLE flag_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES features(feature_id) ON DELETE CASCADE,
    flag_reason TEXT NOT NULL,
    resolution_note TEXT NOT NULL,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
