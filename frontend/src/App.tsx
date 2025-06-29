import LoginScreen from "./components/LoginScreen";
import { useToken } from "./hooks/useToken";
import "./App.css";
import PreCallScreen from "./components/PreCallScreen";
import { MediaPermissionsProvider } from "./hooks/useMediaPermissions";

export default function App() {
  const { email } = useToken();

  if (!email) return <LoginScreen />;

  return (
    <MediaPermissionsProvider>
      <PreCallScreen />
    </MediaPermissionsProvider>
  );
}
