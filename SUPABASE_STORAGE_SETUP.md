# Supabase Storage Setup

## Required Bucket: `leader-assets`

Videos and images from Replicate are downloaded and uploaded to permanent Supabase Storage to avoid expiring URLs.

### Create the Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named: `leader-assets`
3. Set it to **Public** (so URLs are accessible without auth)
4. Configure CORS if needed

### Bucket Structure

```
leader-assets/
  ├── videos/
  │   └── {leaderId}/
  │       └── {predictionId}.mp4
  └── images/
      └── {leaderId}/
          └── {predictionId}.png (or .jpg)
```

### Storage Policies (RLS)

Since the bucket is public, you may want to restrict uploads:

```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'leader-assets');

-- Allow authenticated uploads (service role already has full access)
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'leader-assets' AND auth.role() = 'authenticated');
```

### Environment Variables Required

Make sure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REPLICATE_API_TOKEN=your-replicate-token
```

### How It Works

1. **Video Generation**:
   - Replicate generates video → returns temporary URL
   - API downloads blob from Replicate
   - Uploads to `leader-assets/videos/{leaderId}/{predictionId}.mp4`
   - Saves permanent Supabase URL to database

2. **Image Generation**:
   - Replicate generates image → returns temporary URL
   - API downloads blob from Replicate
   - Uploads to `leader-assets/images/{leaderId}/{predictionId}.png`
   - Saves permanent Supabase URL to database

### Migration Path

Existing leaders with Replicate URLs will continue to work as fallbacks. New generations will automatically use Supabase Storage.

To migrate old URLs, you would need to:
1. Fetch all leaders with Replicate URLs
2. Download each blob
3. Re-upload to Supabase Storage
4. Update database records

(Migration script not included - only new generations use blob storage)
