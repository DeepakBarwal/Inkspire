import { useEffect, useState } from "react";
import { WS_URL } from "../app/config";

export function useSocket() {
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYWQ0ODRhNC1hMmM5LTQxYzAtYjc0Yi1iMzgzM2Q2MDE5N2QiLCJpYXQiOjE3NTUwODM5NTF9.xmQ-z8kookANuX2hfTK9NVS669wRO6v-dvgIq1WeiBs`
    );
    ws.onopen = () => {
      setLoading(false);
      setSocket(ws);
    };
  }, []);

  return {
    socket,
    loading,
  };
}
