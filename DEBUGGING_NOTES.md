# Web Search Integration - Critical Debugging Notes

**Date**: 2026-01-29
**Issue**: Progress bars not showing, research data not parsing

## Root Causes Identified

### 1. Next.js Cache Issues
**Problem**: Code changes not being picked up by dev server
**Symptoms**: 
- New console.log statements don't appear
- Old parsing logic still running
- UI changes not reflecting

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next/cache

# Force browser hard refresh
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+R
```

### 2. Progress Bar Initialization
**Problem**: Progress bar UI only shows when `researchStage.active === true`, but that only gets set when SSE message arrives. Simulated progress runs before that.

**Solution**: Initialize research stage IMMEDIATELY when web search starts:
```typescript
if (useWebSearch) {
  setResearchStage({
    active: true,
    sourcesFound: 0,
    message: `Researching ${name} on the web...`,
  });
  
  // Then start interval
  researchProgressInterval = setInterval(...);
}
```

### 3. Research Data Parser
**Problem**: OpenAI returns nested bullet format that wasn't being captured:
```markdown
## Key Facts
- **Category header**
  Actual content line 1
  Actual content line 2
```

**Solution**: Rewrite parser to accumulate multi-line content:
```typescript
let currentItem = "";

// On bullet line: save previous item, start new
// On non-bullet line: append to current item
// On empty line or new section: save current item
```

### 4. SSE Progress Flow
**Problem**: Progress needs to show research completing at 100% before JSON generation starts

**Solution**:
```typescript
// On research_complete:
setGenProgress(50); // Show research at 100% (50% of total)
setResearchStage({ ...prev, active: false }); // Deactivate to show completion UI

// UI shows emerald progress bar at 100%
// Then JSON generation starts at 50-100% range
```

## Prevention Checklist

**Before claiming "it's fixed":**
- [ ] Clear .next/cache
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Check browser console for new logs
- [ ] Check server logs for new parsing output
- [ ] Verify checkbox is checked for web search
- [ ] Test actual generation, not just code inspection

**When adding new features:**
- [ ] Initialize UI state BEFORE async operations
- [ ] Add diagnostic logging at key points
- [ ] Test with cache cleared
- [ ] Verify SSE messages trigger state updates

**For server-side changes:**
- [ ] Touch the API route file after editing dependencies
- [ ] Check server logs show new code running
- [ ] Clear cache if changes not picked up

## Files Changed
- `/src/lib/ai/leader-research.ts` - Parser rewrite
- `/src/components/leaders/NewLeaderApp.tsx` - Progress bar initialization and transitions
- `/src/app/api/leader/generate/route.ts` - SSE event structure

## Testing Commands
```bash
# Clear cache and restart
rm -rf .next/cache

# Check for TypeScript errors
npx tsc --noEmit

# Tail server logs
tail -f /private/tmp/claude/-Users-am/tasks/babd920.output
```

---

**REMEMBER**: Next.js caches aggressively. When things "don't work", clear cache first!
