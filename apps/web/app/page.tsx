"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
      }}
    >
      <div>
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{
            padding: 10,
          }}
        />

        <button
          onClick={() => {
            router.push(`/room/${roomId}`);
          }}
          style={{
            padding: 10,
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
