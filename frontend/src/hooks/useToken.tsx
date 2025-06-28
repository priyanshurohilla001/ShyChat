import {
  useReducer,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

// ===================================================================================
// DEVELOPER NOTE:
// This hook deliberately ignores the expiration of the JWT on subsequent app loads.
// This is a conscious trade-off to support long-term offline use in a low-risk,
// local-only environment. The token is validated against the college domain only
// once during the initial login.
// ===================================================================================

interface DecodedToken {
  email: string;
  name: string;
  picture: string;
  exp: number;
}

// --- Configuration ---
const COLLEGE_EMAIL_DOMAIN = "@iiitkota.ac.in";
const GOOGLE_TOKEN_KEY = "google_id_token";

interface AuthState {
  email: string | null;
  name: string | null;
  picture: string | null;
  isValid: boolean;
}

const initialState: AuthState = {
  email: null,
  name: null,
  picture: null,
  isValid: false,
};

type AuthAction =
  | { type: "LOGIN_SUCCESS"; payload: Omit<DecodedToken, "exp"> }
  | { type: "LOGOUT" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        ...state,
        email: action.payload.email,
        name: action.payload.name,
        picture: action.payload.picture,
        isValid: true,
      };
    case "LOGOUT":
      return initialState;
    default:
      return state;
  }
}

interface TokenContextType extends AuthState {
  login: (googleToken: string) => void;
  logout: () => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const storedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    if (storedToken) {
      try {
        const decoded: DecodedToken = jwtDecode(storedToken);
        dispatch({ type: "LOGIN_SUCCESS", payload: decoded });
      } catch (error) {
        console.error("Failed to decode token on load:", error);
        localStorage.removeItem(GOOGLE_TOKEN_KEY);
      }
    }
  }, []);

  const login = useCallback((googleToken: string) => {
    try {
      const decoded: DecodedToken = jwtDecode(googleToken);

      if (!decoded.email || !decoded.email.endsWith(COLLEGE_EMAIL_DOMAIN)) {
        throw new Error("Email is not a valid college email.");
      }
      if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
        throw new Error("The provided Google token has already expired.");
      }

      localStorage.setItem(GOOGLE_TOKEN_KEY, googleToken);
      dispatch({ type: "LOGIN_SUCCESS", payload: decoded });
    } catch (error) {
      console.error("Failed to process Google token:", error);
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      dispatch({ type: "LOGOUT" });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    dispatch({ type: "LOGOUT" });
  }, []);

  const value = { ...state, login, logout };

  return (
    <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context;
}
