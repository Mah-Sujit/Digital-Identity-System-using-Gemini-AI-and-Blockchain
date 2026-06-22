import { useEffect, useState } from "react";
import { api } from "../api/client";

export function useMe(token) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!token) {
        setMe(null);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("/me", { auth: true });
        if (!ignore) setMe(res.data.user);
      } catch {
        if (!ignore) setMe(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [token]);

  return { me, loading };
}