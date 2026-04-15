import React, { useEffect, useState } from "react";
import { CurrentUserContext } from "./CurrentUserContext";
import type { CurrentUser } from "./types";
import { fetchCurrentUser } from "./service";

interface Props {
  children: React.ReactNode
}

export function CurrentUserProvider({ children }: Props) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await fetchCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return (
    <CurrentUserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
