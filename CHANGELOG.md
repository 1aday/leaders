# Profilemaker Changelog

A running log of what we've built, organized by date.

---

## January 8, 2026

### Core Features

**Built AI Leader Generation**
- Full Leader Bible JSON generation using OpenAI Structured Outputs
- Creates complete character profiles with 17+ sections: identity, visual, voice, video, personality matrix, expertise, communication style, backstory, values, boundaries, behavioral protocols, audience relationship, content pillars, LLM prompts, and more
- Random leader generation from 24 curated archetypes spanning finance, health, business, tech, education, relationships, and lifestyle
- Custom leader generation from name + description
- Famous person detection—automatically adjusts image prompts to use names directly (works better with image models)

**Built Chat with Leader**
- Real-time streaming chat with AI personas using OpenAI
- Full character embodiment—leaders speak in first person with their unique voice, opinions, and quirks
- System prompt built dynamically from Leader Bible (personality, beliefs, hot takes, vocabulary, catchphrases)
- Chat history saved to localStorage (persists across sessions)
- Viewable system instructions—see exactly how the AI is prompted

**Built AI Avatar Generation**
- Profile picture generation using OpenAI (prompt) + Replicate (image)
- Prompt preview—see the image prompt before generating
- Famous person support—uses names instead of physical descriptions for better recognition
- 1:1 square aspect ratio optimized for profile pics

**Built AI Intro Video Generation**
- ~10 second intro videos using Replicate Kling v2.6
- Uses profile photo as reference image for identity consistency
- Shared trailer style guide across all leaders
- Video prompt viewer—see exactly what was sent to the model
- Progress polling with 15-minute timeout (videos can take a while)

**Built Supabase Persistence**
- Cloud database storage for leaders, avatars, and videos
- Bidirectional sync between localStorage and Supabase
- Deleted leaders tracked locally—prevents re-sync of removed items
- Automatic hydration from DB when visiting leader pages

**Built Leader Gallery**
- Card-based gallery with hero images
- Filter by vertical, tier, status (Draft/Review/Approved)
- Sort by recently updated, score, or name
- Delete leaders with confirmation dialog
- Empty state with quick-start options

**Built Leader Detail Page**
- Full profile display with profile pic or video
- All Leader Bible sections in tabbed interface
- Composite score calculation from character/competence/impact
- Copy JSON to clipboard, download as file
- Edit and re-save capability

**Built Leader Import**
- Drop zone for JSON file upload
- Paste JSON directly
- Load sample leader for quick start
- Validation with helpful error messages
- Preview before saving

---

### Quality of Life

**Built Photo Collage Header**
- Gallery header shows scattered photos of existing leaders
- Hover effects with rotation
- Handles missing/broken images gracefully

**Built Video Hover Preview**
- Gallery cards play video on hover (if video exists)
- Audio starts muted, unmutes on play
- Falls back to image or initials

**Built Prompt Inspection**
- "Preview prompt" button shows image prompt without generating
- Collapsible prompt viewers for both image and video
- Copy prompts to clipboard

**Built Chat Instructions Viewer**
- "Instructions" button reveals the full system prompt
- See exactly how the AI is being instructed to embody the leader
- Copyable for debugging/iteration

**Built Confirmation Dialogs**
- Reusable confirm dialog component
- Used for delete actions to prevent accidents
- Danger variant with red styling

**Built JSON Syntax Highlighting**
- Color-coded JSON display (keys, strings, numbers, booleans)
- Auto-pretty-prints minified JSON
- Used in leader preview and detail views

**Built Smart Filtering**
- Filter by vertical (Finance, Health, Tech, etc.)
- Filter by tier (Competent, Strong, Exceptional, Legendary)
- Filter by status (Draft, Review, Approved)
- Reset button when filters active

**Built Composite Score Calculation**
- Calculates from character, competence, and impact scores
- Uses weighted formula: (char × 0.3) + (comp × 0.35) + (impact × 0.35)
- Displayed prominently on cards and detail pages

**Built Deleted Leader Tracking**
- Locally deleted leaders won't reappear from DB sync
- Tracks deleted IDs in localStorage
- Prevents re-seeding of sample data

**Built Responsive Layout**
- Mobile-friendly gallery and detail pages
- Scrollable tabs with arrow buttons
- Collapsible sections on smaller screens

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **AI:** OpenAI (GPT-5-nano-2025-08-07 for all operations), Replicate (Nano Banana for images, Kling v2.6 for video)
- **Database:** Supabase (PostgreSQL)
- **Storage:** localStorage + cloud sync

---

*This changelog is updated as features are built.*
