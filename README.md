# LikeMinds

Team 10 prototype: a welcoming path from anonymous self-expression to voluntary, meaningful connection.

People share anonymous thoughts as bubbles on a map, discover others who feel the same, connect only when both agree, form groups, and meet at events from verified hosts that spell out cost, language, transit, and accessibility.

Built with **Next.js 15 (App Router)**, **MongoDB**, and **Google Maps** (with an OpenStreetMap fallback). Runs on desktop and mobile browsers.

## Run it

You need Node.js 20.6 or newer and a MongoDB database (local `mongod`, Docker, or a free MongoDB Atlas cluster).

```bash
npm install
cp .env.example .env.local      # then edit the values
npm run seed                    # optional: loads demo data (clears LikeMinds collections first)
npm run dev
```

Open http://localhost:3000.

Quick local MongoDB with Docker: `docker run -d -p 27017:27017 --name likeminds-db mongo:7`

For Atlas, paste your `mongodb+srv://…` string into `MONGODB_URI` and allow your IP in Network Access.

### Google Maps setup

The map works without a key (it falls back to OpenStreetMap), but Google Maps gives better place search, address accuracy, and area names.

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project and turn on billing (Google's monthly free credit covers a prototype).
2. Enable three APIs: **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Create an API key. Under key restrictions, choose **Websites** and add `http://localhost:3000/*` (plus your deployed URL later). Restrict the key to the three APIs above.
4. Put it in `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Leave `NEXT_PUBLIC_GOOGLE_MAP_ID=DEMO_MAP_ID` for development; for production, create a Map ID under Map Management (that's also where you can give the map a custom style).
5. Restart `npm run dev`.

The key is public by design (it runs in the browser), which is why the website restriction in step 3 matters.

### Demo accounts (after `npm run seed`)

All use the password `likeminds123`.

| Email | Who | Try |
| --- | --- | --- |
| maria@likeminds.test | Newcomer in Chicago (EN/ES) | Pending connection request, chat, group, event feedback |
| sam@likeminds.test | Parent, bike fixer | Chat with Maria, group host |
| lin@likeminds.test | Retired caregiver, prefers online | Personalized event picks |
| jordan@likeminds.test | 16-year-old | Teen-safe experience |
| library@likeminds.test | Verified host (public library) | Host an event, Insights |
| township@likeminds.test | Verified host (township) | Community question + Insights |
| admin@likeminds.test | Moderator | Review queue, approve the pending café host |

## How the design doc maps to the app

| Journey step (from the doc) | Where |
| --- | --- |
| 1. Welcome and explore, no profile required | `/`, `/explore`, `/events` work signed out |
| 2. Sign up: private email, account | `/signup` step 1 (email, full name, age are never shown) |
| 3. Create profile: display name, optional interests, strengths, skills | `/signup` step 2, random anonymous display name |
| 4. Preferences: region, language, availability, access needs | `/signup` step 3, `/profile` |
| 5. Explore map or list, approximate locations | `/explore`: Google Maps with clustered bubbles, layer tabs (Everything / Thoughts / Events), filters, place search, "Near me" |
| 6. Share a thought: tags, audience, reply and contact permissions, content check | Share panel on `/explore` |
| 7. Open a bubble: read, reply, like / unlike, react, save | Map preview card, list cards, `/thoughts/[id]`; liked thoughts under Profile → Liked |
| 8–9. Request a connection; private chat only if both agree | `/connections`, `/chat/[id]` |
| 10. Create or join a group; each member consents | `/groups`, `/groups/[id]` (invites must be accepted) |
| 11. Explore events: organizer, cost, location, language, accessibility | `/events` with filters and "Picked for you" |
| 12. Register individually, optionally share access requests | `/events/[id]` |
| 13. Attend online or in person, optional check-in | `/events/[id]` |
| 14. Reflect: feedback, update preferences, keep connecting | `/events/[id]` after the event |
| Organizer journey | `/events/new` (apply → verified → publish), `/insights` |
| Governance: prompts that inform organizers and policy makers | Community questions on `/explore`, aggregated themes on `/insights` |

## Data model (MongoDB collections)

- **users**: email, fullName, passwordHash, age, isMinor, displayName (public), profile {intro, values, aspirations, skills, interests, strengths, tags}, prefs {region, home (blurred point), languages, availability, participation, access {freeOnly, transport, maxTravelMinutes, notes}}, privacy {profileVisibility, allowMessageRequests, showNameOnThoughts}, organizer {status, orgName, orgType}, savedThoughts
- **thoughts**: authorId, text, tags, audience, allowReplies, allowConnections, showName, location (GeoJSON, approximate), precision (neighborhood / town / region), areaName (e.g. "Wicker Park, Chicago"), promptId, status, moderation, reactions {like, relate, support, insight}, replyCount
- **replies**, **reports**
- **connections**: fromId, toId, status (pending / accepted / declined / ended), pairKey
- **messages**: connectionId (1:1 chat) or groupId (group chat)
- **groups**: members with roles, invites, suggestedEvents
- **events**: organizer, mode (in-person / online / hybrid), timing (live / self-paced), cost, languages, accessibility, transport, ageRange, capacity, attendees (with check-in and optional access request), feedback
- **prompts**: community questions from verified hosts

## Maps and location

- **Explore** is the map hub. Tabs switch between everything, thoughts only, or events only. Each layer has its own filters: thoughts by keyword, tag, time posted, and "liked by me"; events by date, format, language, cost, step-free access, and transit. A place search, "Near me", and distance limit apply to both.
- **Sharing a thought**: choose the spot by searching a place, using your device's GPS, or clicking the map, then choose how exact to be (neighborhood, town, or region). The app shows what others will see ("around Wicker Park, Chicago") before you post. The server always moves the pin slightly, so it never marks an exact address.
- **Events** use exact locations: hosts search for the venue, fine-tune the pin, and attendees get a Google Maps directions link.
- **Your area** (Profile → Preferences) powers "My area" on the map and nearby event suggestions. It's stored blurred to your region.

## AI and trust

AI is optional. Without `ANTHROPIC_API_KEY` everything still works with rule-based checks.

- **Moderation** (`lib/moderation.js`): rules catch harassment, crisis language, contact details, and links. With a key, Claude adds a second check. Nothing is silently deleted: flagged posts go to a human review queue, and the writer is told why. Posts that suggest someone is in crisis show support resources (988 in the US) right away.
- **Matching** (`lib/matching.js`): similar thoughts and event/group picks use transparent tag and keyword overlap. Every suggestion shows a plain-language reason. Only information users chose to share is used.
- **Translation**: one tap to translate a thought, reply, or message into your preferred language (needs a key).
- **Community insights**: hosts see aggregated themes only when at least 3 posts share them. AI summaries unlock at 5 responses and are instructed never to quote or identify anyone.
- **Privacy by default**: profiles start private; thoughts are anonymous unless the writer opts in; locations are blurred to a town or region; access needs are shared with hosts only if the attendee ticks a box.
- **Teen safety**: users 13–17 see only "everyone" posts, can't connect with adults, and get teen-only groups and events.
- **Verified hosts**: only people approved by a moderator can publish events.

## Project structure

```
app/            pages (App Router) and app/api/* route handlers
app/components  shared UI (map, share form, nav, etc.)
lib/            database, auth, moderation, matching, view shaping
scripts/seed.mjs demo data
```

## Before a real launch

This is a hackathon prototype. Still needed: a check that the Google API key restrictions are in place, email verification and password reset, rate limiting on sign-in, real-time chat (WebSockets instead of polling), image uploads for events, a geocoder for typed addresses, a fuller moderator toolset with audit logs, and an accessibility audit with real users.
# likeMinds
