import LoginScreen from "./components/LoginScreen";
import { useToken } from "./hooks/useToken";
import "./app.css";

export default function App() {
  const { email } = useToken();

  if (!email) return <LoginScreen />;

  return <div>hello</div>;
}
