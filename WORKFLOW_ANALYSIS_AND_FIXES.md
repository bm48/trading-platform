# File Upload Workflow Analysis & Bug Fixes

## Root Cause Analysis

The file upload error occurred due to **database field name mismatches** between the frontend (camelCase) and database (snake_case). The error "Could not find the 'case_id' column of 'documents'" indicates the Supabase Storage service was trying to insert using incorrect column names.

## Current File Upload Workflow

1. **User Authentication**: ✅ Working (user authenticated successfully)
2. **Case Creation**: ✅ Working (case ID 9 created successfully) 
3. **File Upload Request**: ❌ Failed at database insertion step
4. **Error Location**: Supabase Storage service database insert operation

## Specific Bugs Found & Fixed

### 1. Database Column Name Mismatches
**Problem**: Supabase Storage service used `case_id`, `contract_id`, `file_name` but database has `caseid`, `contractid`, `filename`

**Fixed in**: `server/supabase-storage-service.ts`
- Changed `case_id` → `caseid`
- Changed `contract_id` → `contractid` 
- Changed `file_name` → `filename`

### 2. Return Value Field Mapping
**Problem**: Return values didn't match the corrected database field names

**Fixed in**: All return value mappings updated to use correct database field names

### 3. Query Field Names
**Problem**: Database queries used incorrect field names for filtering

**Fixed in**: Updated all query operations to use correct snake_case field names

## Complete Workflow After Fixes

```
1. User selects file in frontend
   ↓
2. Frontend validates file (size, type)
   ↓
3. File sent to /api/documents/upload endpoint
   ↓
4. Backend authenticates user (✅ Working)
   ↓
5. Multer processes uploaded file to temp location
   ↓
6. SupabaseStorageService.uploadFile() called
   ↓
7. File uploaded to Supabase Storage bucket
   ↓
8. Database record inserted with correct field names (✅ Fixed)
   ↓
9. Signed URL generated for file access
   ↓
10. Temp file cleaned up
    ↓
11. Success response returned to frontend
```

## Database Migration Required

The `supabase-storage-migration.sql` script handles field name standardization:
- Renames existing columns to match expected snake_case format
- Adds new Supabase Storage columns
- Sets up proper RLS policies
- Creates storage bucket with correct permissions

## Testing Steps

1. Run the migration script in Supabase SQL editor
2. Test file upload on case detail page
3. Verify file appears in document list
4. Test file download/preview functionality
5. Confirm files are stored in Supabase Storage bucket

## Expected Behavior After Fix

- File uploads succeed without database errors
- Files stored in organized Supabase Storage structure
- Secure access via signed URLs
- Proper file metadata in database
- Download/preview functionality working
- File listing by case/contract working correctly

## Security Features Maintained

- Private storage bucket (not publicly accessible)
- User authentication required for all operations
- RLS policies ensure users only access their own files
- File validation (size, type) before upload
- Signed URLs with expiration for secure access