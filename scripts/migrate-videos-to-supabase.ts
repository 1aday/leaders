/**
 * Migration Script: Move Replicate Videos to Supabase Storage
 *
 * This script migrates existing video URLs from temporary Replicate hosting
 * to permanent Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/migrate-videos-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from project root
config({ path: '/Users/am/Desktop/Scripts/profilemaker/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Leader {
  leader_key: string;
  raw_json: any;
  welcome_video_url: string | null;
}

async function downloadAndUpload(replicateUrl: string, leaderId: string): Promise<string | null> {
  try {
    console.log(`  📥 Downloading from Replicate...`);
    const response = await fetch(replicateUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`  📦 Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Generate storage path
    const timestamp = Date.now();
    const storagePath = `videos/${leaderId}/migrated-${timestamp}.mp4`;

    console.log(`  📤 Uploading to Supabase: ${storagePath}`);
    const { data, error: uploadError } = await supabase.storage
      .from('leader-assets')
      .upload(storagePath, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('leader-assets')
      .getPublicUrl(storagePath);

    console.log(`  ✅ Uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error);
    return null;
  }
}

async function migrateVideos() {
  console.log('🚀 Starting video migration to Supabase Storage...\n');

  // Fetch all leaders with video URLs
  const { data: leaders, error } = await supabase
    .from('leaders')
    .select('leader_key, raw_json, welcome_video_url')
    .not('welcome_video_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching leaders:', error);
    return;
  }

  console.log(`📊 Found ${leaders.length} leaders with video URLs\n`);

  const replicateLeaders = leaders.filter((l: Leader) =>
    l.welcome_video_url?.includes('replicate.delivery')
  );

  console.log(`🎬 ${replicateLeaders.length} videos need migration from Replicate\n`);

  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < replicateLeaders.length; i++) {
    const leader = replicateLeaders[i] as Leader;
    console.log(`\n[${i + 1}/${replicateLeaders.length}] ${leader.leader_key}`);

    if (!leader.welcome_video_url) {
      console.log('  ⏭️  Skipping: no video URL');
      skipped++;
      continue;
    }

    // Download and upload to Supabase
    const newUrl = await downloadAndUpload(leader.welcome_video_url, leader.leader_key);

    if (!newUrl) {
      failed++;
      continue;
    }

    // Update database with new URL
    console.log(`  💾 Updating database...`);
    const { error: updateError } = await supabase
      .from('leaders')
      .update({ welcome_video_url: newUrl })
      .eq('leader_key', leader.leader_key);

    if (updateError) {
      console.error(`  ❌ Failed to update database:`, updateError);
      failed++;
      continue;
    }

    console.log(`  ✅ Migration complete!`);
    migrated++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));
}

migrateVideos().catch(console.error);
