-- CREATE_TEXT_EXTRACTIONS_TABLE.sql
-- This script creates a text_extractions table to store extracted text data

-- Check if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'text_extractions') THEN
        -- Create the text_extractions table
        CREATE TABLE text_extractions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            extracted_text TEXT NOT NULL,
            word_count INTEGER NOT NULL,
            extraction_method VARCHAR(50) DEFAULT 'pdf_extraction',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX idx_text_extractions_user_id ON text_extractions(user_id);
        CREATE INDEX idx_text_extractions_document_id ON text_extractions(document_id);
        CREATE INDEX idx_text_extractions_created_at ON text_extractions(created_at);

        -- Enable Row Level Security (RLS)
        ALTER TABLE text_extractions ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own text extractions" ON text_extractions
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own text extractions" ON text_extractions
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own text extractions" ON text_extractions
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own text extractions" ON text_extractions
            FOR DELETE USING (auth.uid() = user_id);

        -- Create a trigger to update the updated_at timestamp
        CREATE TRIGGER update_text_extractions_updated_at
            BEFORE UPDATE ON text_extractions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'text_extractions table created successfully';
    ELSE
        RAISE NOTICE 'text_extractions table already exists';
    END IF;
END $$;

-- Verify the table was created
SELECT '=== TEXT_EXTRACTIONS TABLE STATUS ===' as info;
SELECT 
    table_name,
    table_type,
    is_insertable_into,
    is_typed
FROM information_schema.tables 
WHERE table_name = 'text_extractions';

-- Show table structure if it exists
SELECT '=== TABLE STRUCTURE ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'text_extractions'
ORDER BY ordinal_position;
