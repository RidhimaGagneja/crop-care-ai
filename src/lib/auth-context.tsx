import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loginApi, signupApi } from "./services/cropcareApi";

export interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until we've checked localStorage for a saved login, once, on first load. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "cropcare.auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Runs once, client-side only (avoids SSR/localStorage mismatch).
  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);
  }, []);

  function persist(next: AuthUser | null) {
    setUser(next);
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  async function login(email: string, password: string) {
    const res = await loginApi(email, password);
    persist({ userId: res.user_id, email: res.email, name: res.name, token: res.access_token });
  }

  async function signup(email: string, password: string, name: string) {
    const res = await signupApi(email, password, name);
    persist({ userId: res.user_id, email: res.email, name: res.name, token: res.access_token });
  }

  function logout() {
    persist(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
