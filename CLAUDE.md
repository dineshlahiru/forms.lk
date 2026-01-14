# Claude Session Notes

## Last Session Summary (2026-01-14)

### What Was Built: Institution Intelligence Module

A complete module for managing institution contacts with sync capabilities from government websites.

### Key Features Implemented

1. **Contact Management**
   - CRUD operations for contacts and divisions
   - SQLite storage with IndexedDB persistence
   - Support for head office contacts and branch contacts

2. **District Offices Support**
   - District offices stored as divisions with location info (address, phones, fax, email)
   - JSON import supports both `camelCase` and `snake_case` formats
   - Example: `districtOffices` or `district_offices`

3. **UI Features**
   - Searchable Divisions tab with left/right panel layout
   - Clickable phone numbers with `tel:` links throughout the app
   - Contact edit/delete functionality
   - Budget monitor for API usage tracking

4. **JSON Import**
   - Import contacts from JSON files (useful when API sync unavailable)
   - Format documented in `/Users/dinesh/Documents/coding/files.lk/files/JSON_FORMAT_INSTRUCTIONS.md`
   - Sample JSON: `/Users/dinesh/Documents/coding/files.lk/files/dmtgovelkdivision_2.json`

### Key Files

| File | Purpose |
|------|---------|
| `src/pages/InstitutionIntelligencePage.tsx` | Main page with tabs for Overview, Contacts, Divisions, Sync, History |
| `src/components/institution-intel/SyncPanel.tsx` | JSON import and website sync controls |
| `src/services/local/divisions.ts` | Division CRUD operations |
| `src/services/local/contacts.ts` | Contact CRUD operations |
| `src/services/local/syncOrchestrator.ts` | Coordinates sync process |
| `src/lib/localDb.ts` | SQLite schema and migrations |
| `src/types/institution-intel.ts` | TypeScript types for the module |

### Database Tables Added

- `divisions` - with columns: address, phones, fax, email, location_type, district
- `contacts` - individual contacts within divisions
- `institution_sync_logs` - sync history tracking
- `api_usage` - API cost tracking
- `api_budget_settings` - budget configuration

### How to Test

1. Start dev server: `npm run dev`
2. Go to Admin page
3. Click on an institution (e.g., "Department of Motor Traffic")
4. Use "Import from JSON" in the Sync tab
5. Select the JSON file from `/files/` directory
6. Check Divisions tab for searchable district offices with clickable phone numbers

### Pending/Future Work

- Website scraping with Claude API (scraper.ts has the structure but needs API key)
- Auto-sync scheduling based on frequency settings
- More institution JSON files to import
