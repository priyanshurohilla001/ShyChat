# 🎭 PeerSpace Reaction System

> **Anonymous reactions for anonymous conversations**

The GIF Reaction system allows users to send animated reactions during video calls, bringing personality to peer-to-peer conversations while maintaining the ephemeral, anonymous nature of PeerSpace.

## 🚀 Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env.local` and add your Tenor API key:

```bash
cp .env.example .env.local
```

```env
# Get your free API key from: https://developers.google.com/tenor/guides/quickstart
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_api_key_here
```

### 2. Component Usage

```tsx
import { InCallDock } from "@/components/MainScreen/Dock/InCallDock";
import { ReactionProvider } from "@/hooks/useReaction";

// Wrap your app with ReactionProvider
<ReactionProvider>
  <InCallDock
    isAudioMuted={false}
    onMuteToggle={() => {}}
    isCameraOff={false}
    onVideoToggle={() => {}}
    onEndCall={() => {}}
  />
</ReactionProvider>
```

## 🎨 Components

### `GifReactionSelector`

A beautifully designed GIF search and selection interface that follows PeerSpace's design philosophy.

**Features:**
- 🔍 **Smart Search**: Tenor API integration with campus-friendly terms
- 🔥 **Recent Reactions**: Persistent localStorage-based history
- 📱 **Responsive Design**: Mobile-first with proper touch targets
- 🌐 **Offline Support**: Graceful degradation when WiFi fails
- ⚡ **Quick Tags**: Pre-selected trending terms (`baddie`, `rizz`, `sheesh`)
- 🎯 **Optimized Loading**: Image previews and lazy loading

**Props:**
```typescript
interface GifReactionSelectorProps {
  setShowGifSelector: (show: boolean) => void;
}
```

### `InCallDock` (Enhanced)

The main call controls dock with integrated GIF reaction support.

**Improvements:**
- ✅ **Fixed z-index issues** with proper stacking context
- ✅ **Better state management** with `useCallback` optimizations  
- ✅ **Backdrop dismissal** for better UX
- ✅ **Visual feedback** when GIF selector is active
- ✅ **TypeScript safety** with proper prop types

## 🎯 Design Principles

Following PeerSpace's **"Less is more"** philosophy:

### Visual Design
- **Dark-first**: Optimized for dark theme with light theme support
- **Shadcn Heavy**: Minimal custom styling, maximum component reuse
- **Student-friendly**: Campus humor in error messages
- **Techy Aesthetic**: Clean, confident, technically polished

### UX Patterns
- **Ephemeral Focus**: No permanent GIF history beyond local storage
- **Anonymous**: No user tracking or reaction analytics
- **Campus Context**: Error messages reference college life
- **Performance**: Optimized for campus WiFi limitations

## 🔧 Technical Details

### State Management
```typescript
// Recent reactions stored locally
const RECENT_STORAGE_KEY = "peerspace_recent_reactions";
const MAX_RECENT = 8;

// Network-aware loading states
const [isOnline, setIsOnline] = useState(navigator.onLine);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### API Integration
```typescript
// Tenor API with proper error handling
const TENOR_API = "https://tenor.googleapis.com/v2/search";
const fetchGifs = async (searchQuery: string) => {
  const response = await fetch(
    `${TENOR_API}?q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&limit=12&media_filter=gif,tinygif`
  );
  // ... error handling and response parsing
};
```

### Performance Optimizations
- **Image Lazy Loading**: `loading="lazy"` on all GIF images
- **Preview Images**: Uses Tenor's preview format when available
- **Debounced Search**: Prevents excessive API calls
- **Local Caching**: Recent reactions stored in localStorage

## 🎪 Brand Voice Examples

The reaction system includes PeerSpace's signature personality:

### Error Messages
```typescript
// Network issues
"Campus WiFi having an existential crisis 💀"
"Network said 'nope' louder than expected"
"WiFi router needs therapy 📡"

// Empty states  
"No recent reactions yet. Search for some fire GIFs above! 🔥"
"No results found. Try a different search term!"

// Loading states
"Convincing campus servers to cooperate..."
```

## 🐛 Troubleshooting

### Common Issues

**1. GIFs not loading**
```bash
# Check API key configuration
echo $NEXT_PUBLIC_TENOR_API_KEY

# Verify network connectivity
curl -I https://tenor.googleapis.com/v2/search
```

**2. Selector not showing**
```typescript
// Ensure ReactionProvider wraps your components
<ReactionProvider>
  <YourComponent />
</ReactionProvider>
```

**3. Z-index conflicts**
```css
/* GIF selector uses z-index: 60 */
/* Backdrop uses z-index: 55 */
/* Dock uses z-index: 50 */
```

### Development Mode

Enable debug logging:
```env
NEXT_PUBLIC_DEBUG_MODE=true
```

```typescript
// Check console for detailed API responses
console.log("GIF search response:", data);
```

## 🔐 Security & Privacy

### API Key Management
- ✅ Environment variables only (never hardcoded)
- ✅ Client-side key for public Tenor API
- ✅ Rate limiting handled by Tenor

### Data Privacy
- ✅ No user tracking or analytics
- ✅ Local storage only for recent reactions
- ✅ No server-side GIF storage
- ✅ Ephemeral: cleared on app restart

### Campus Network Compliance
- ✅ HTTPS-only API calls
- ✅ Graceful offline handling
- ✅ No external CDN dependencies for core functionality

## 📱 Mobile Support

Fully responsive design:
- **Touch targets**: 44px+ for all interactive elements
- **Scroll areas**: Native momentum scrolling on iOS
- **Viewport handling**: `max-w-[90vw]` prevents overflow
- **Orientation support**: Works in portrait and landscape

## 🚀 Future Enhancements

Planned improvements:
- [ ] **Custom GIF uploads** (if campus network allows)
- [ ] **Reaction history sync** across devices (privacy-preserving)
- [ ] **Keyboard shortcuts** for power users
- [ ] **Accessibility improvements** (ARIA labels, screen reader support)
- [ ] **Tenor API alternatives** (Giphy integration as fallback)

---

> **"Meet random people in your institute. No profiles, no history, just pure conversation... and fire GIFs."** 🔥

Built with love for IIIT Kota students, powered by WebRTC and campus WiFi (when it works).