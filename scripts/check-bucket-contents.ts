import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '/Users/am/Desktop/Scripts/profilemaker/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
  console.log('🔍 Checking leader-assets bucket...\n');

  // List buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
    return;
  }

  console.log('📦 Available buckets:');
  buckets.forEach(b => console.log(`  - ${b.name} (${b.public ? 'public' : 'private'})`));

  const bucket = buckets.find(b => b.name === 'leader-assets');
  if (!bucket) {
    console.error('\n❌ leader-assets bucket NOT FOUND');
    return;
  }

  console.log('\n✅ leader-assets bucket exists\n');

  // List all files
  console.log('📁 Listing all files in bucket...\n');

  const { data: files, error: listError } = await supabase.storage
    .from('leader-assets')
    .list('', { limit: 1000 });

  if (listError) {
    console.error('❌ Error listing files:', listError);
    return;
  }

  console.log(`Found ${files.length} top-level items:`);
  files.forEach(f => console.log(`  - ${f.name} (${f.id || 'folder'})`));

  // List videos folder
  console.log('\n📹 Checking videos/ folder...\n');
  const { data: videos, error: videosError } = await supabase.storage
    .from('leader-assets')
    .list('videos', { limit: 1000 });

  if (videosError) {
    console.error('❌ Error listing videos:', videosError);
    return;
  }

  console.log(`Found ${videos.length} items in videos/:`);
  videos.forEach(v => console.log(`  - videos/${v.name}`));

  // List each leader's videos
  for (const folder of videos) {
    if (folder.name) {
      const { data: leaderVideos } = await supabase.storage
        .from('leader-assets')
        .list(`videos/${folder.name}`, { limit: 100 });

      if (leaderVideos && leaderVideos.length > 0) {
        console.log(`\n    📹 ${folder.name}:`);
        leaderVideos.forEach(v => {
          const size = v.metadata?.size ? ` (${(v.metadata.size / 1024 / 1024).toFixed(2)} MB)` : '';
          console.log(`      - ${v.name}${size}`);
        });
      }
    }
  }

  // Check images folder
  console.log('\n🖼️  Checking images/ folder...\n');
  const { data: images, error: imagesError } = await supabase.storage
    .from('leader-assets')
    .list('images', { limit: 1000 });

  if (imagesError) {
    console.error('❌ Error listing images:', imagesError);
  } else {
    console.log(`Found ${images.length} items in images/:`);
    images.forEach(i => console.log(`  - images/${i.name}`));
  }
}

checkBucket().catch(console.error);
