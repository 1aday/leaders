// Script to completely clear all leaders from localStorage
// Run this in the browser console on localhost:3000

console.log('🗑️  Starting complete leader cleanup...');

// 1. Clear leaders from localStorage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (
    key.startsWith('profilemaker.') || 
    key.includes('leader') || 
    key.includes('Leader')
  )) {
    keysToRemove.push(key);
  }
}

console.log(`📋 Found ${keysToRemove.length} localStorage keys to remove:`, keysToRemove);

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`  ✓ Removed: ${key}`);
});

// 2. Clear all leaders from main storage
localStorage.removeItem('profilemaker.leaders.v1');
localStorage.removeItem('profilemaker.deletedLeaderIds.v1');

console.log('✅ localStorage cleared!');
console.log('🔄 Refresh the page to see changes.');
console.log('💡 To also delete from Supabase database, navigate to /leaders and click "Clear All" button.');

