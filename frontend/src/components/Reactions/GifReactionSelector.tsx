"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react";
import { useReaction } from "@/hooks/useReaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebRTC } from "@/hooks/useWebRTC";

// Types
interface GifResult {
  id: string;
  name: string;
  src: string;
  preview?: string;
}

interface GifReactionSelectorProps {
  setShowGifSelector: (show: boolean) => void;
}

interface TenorResponse {
  results: Array<{
    id: string;
    media_formats: {
      gif?: { url: string };
      tinygif?: { url: string };
      preview?: { url: string };
    };
  }>;
}

// Constants
const TENOR_API = "https://tenor.googleapis.com/v2/search";
const API_KEY = "AIzaSyBfTkQgi-i1NSiwHM1nCYhNTP2fw9zWxwQ";
const DEFAULT_SEARCHES = ["baddie", "rizz", "sheesh", "fire", "slay", "mood"];
const RECENT_STORAGE_KEY = "peerspace_recent_reactions";
const MAX_RECENT = 8;

export const GifReactionSelector: React.FC<GifReactionSelectorProps> = ({
  setShowGifSelector,
}) => {
  const { playReaction } = useReaction();
  const { sendReaction } = useWebRTC();

  // State
  const [recent, setRecent] = useState<GifResult[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<"recent" | "search">("recent");

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load recent reactions on mount
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecent(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(RECENT_STORAGE_KEY);
      }
    }
  }, []);

  // Fetch GIFs from Tenor API
  const fetchGifs = useCallback(
    async (searchQuery: string) => {
      if (!isOnline) {
        throw new Error("Campus WiFi having an existential crisis 💀");
      }

      if (!searchQuery.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${TENOR_API}?q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&limit=12&media_filter=gif,tinygif`,
        );

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const data: TenorResponse = await response.json();

        const gifs: GifResult[] = data.results
          .filter(
            (r) => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
          )
          .map((r) => ({
            id: r.id,
            name: searchQuery,
            src:
              r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || "",
            preview: r.media_formats?.preview?.url,
          }));

        setResults(gifs);
        setActiveTab("search");
      } catch (err) {
        console.error("GIF search failed:", err);
        setError("Network said 'nope' louder than expected");
      } finally {
        setLoading(false);
      }
    },
    [isOnline],
  );

  // Handle GIF selection
  const handleGifSelect = useCallback(
    (gif: GifResult) => {
      playReaction({ type: "video", src: gif.src });

      // Update peer about this
      sendReaction({ type: "video", src: gif.src, name: gif.name });

      // Update recent reactions
      setRecent((prev) => {
        const updated = [gif, ...prev.filter((r) => r.id !== gif.id)].slice(
          0,
          MAX_RECENT,
        );
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      // Close selector
      setShowGifSelector(false);
    },
    [playReaction, setShowGifSelector],
  );

  // Handle search
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        fetchGifs(query.trim());
      }
    },
    [query, fetchGifs],
  );

  // Quick search buttons
  const handleQuickSearch = useCallback(
    (term: string) => {
      setQuery(term);
      fetchGifs(term);
    },
    [fetchGifs],
  );

  return (
    <Card className="w-[380px] max-w-[90vw] shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg">
            Reaction Arsenal
          </CardTitle>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGifSelector(false)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!isOnline || loading}
            className="pl-10 font-mono text-sm"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </form>

        {/* Quick Search Tags */}
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SEARCHES.map((term) => (
            <Badge
              key={term}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs"
              onClick={() => handleQuickSearch(term)}
            >
              {term}
            </Badge>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-400 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-yellow-400 text-sm">
              WiFi router needs therapy 📡
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("recent")}
            className={`flex-1 text-sm ${
              activeTab === "recent"
                ? "border-b-2 border-primary text-primary rounded-b-none"
                : "text-muted-foreground"
            }`}
          >
            Recent ({recent.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("search")}
            className={`flex-1 text-sm ${
              activeTab === "search"
                ? "border-b-2 border-primary text-primary rounded-b-none"
                : "text-muted-foreground"
            }`}
          >
            Search ({results.length})
          </Button>
        </div>

        {/* Content Area */}
        <ScrollArea className="h-48">
          {activeTab === "recent" ? (
            <div className="grid grid-cols-4 gap-2">
              {recent.length > 0 ? (
                recent.map((gif) => (
                  <Card
                    key={gif.id}
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 hover:shadow-lg border-border/30 overflow-hidden"
                    onClick={() => handleGifSelect(gif)}
                  >
                    <img
                      src={gif.preview || gif.src}
                      alt={gif.name}
                      className="w-full h-16 object-cover"
                      loading="lazy"
                    />
                  </Card>
                ))
              ) : (
                <div className="col-span-4 text-center text-muted-foreground text-sm py-8">
                  No recent reactions yet.
                  <br />
                  <span className="text-xs">
                    Search for some fire GIFs above! 🔥
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {results.length > 0 ? (
                results.map((gif) => (
                  <Card
                    key={gif.id}
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 hover:shadow-lg border-border/30 overflow-hidden"
                    onClick={() => handleGifSelect(gif)}
                  >
                    <img
                      src={gif.preview || gif.src}
                      alt={gif.name}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                    />
                  </Card>
                ))
              ) : query && !loading ? (
                <div className="col-span-3 text-center text-muted-foreground text-sm py-8">
                  No results found for "{query}".
                  <br />
                  <span className="text-xs">Try a different search term!</span>
                </div>
              ) : !query ? (
                <div className="col-span-3 text-center text-muted-foreground text-sm py-8">
                  Search for reactions above
                  <br />
                  <span className="text-xs">or use the quick tags</span>
                </div>
              ) : null}
            </div>
          )}
        </ScrollArea>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Convincing campus servers to cooperate...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GifReactionSelector;
