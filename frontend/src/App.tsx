import LoginScreen from "./components/LoginScreen";
import { useToken } from "./hooks/useToken";
import "./App.css";
import PreCallScreen from "./components/PreCallScreen";
import { MediaPermissionsProvider } from "./hooks/useMediaPermissions";
import { ReactionOverlay } from "./components/Reactions/ReactionOverlay";

export default function App() {
  const { email } = useToken();

  if (!email) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ReactionOverlay />
      <MediaPermissionsProvider>
        <PreCallScreen />
      </MediaPermissionsProvider>
    </div>
  );
}
