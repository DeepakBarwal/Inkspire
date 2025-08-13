import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !(decoded as JwtPayload).userId) {
      return null;
    }

    return (decoded as JwtPayload).userId;
  } catch (error) {
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const url = request.url; // ws://localhost:3000?token=123
  if (!url) {
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId === null) {
    ws.close();
    return;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", function message(data) {
    try {
      const parsedData = JSON.parse(data as unknown as string); // {type: "join-room", roomId: 1}

      if (parsedData.type === "join_room" && parsedData?.roomId) {
        const user = users.find((x) => x.ws === ws);
        if (!user) {
          return;
        }
        user?.rooms.push(parsedData.roomId);
      }

      if (parsedData.type === "leave_room" && parsedData?.roomId) {
        const user = users.find((x) => x.ws === ws);
        if (!user) {
          return;
        }
        user.rooms = (user?.rooms ?? []).filter((x) => x !== parsedData.roomId);
      }

      if (
        parsedData.type === "chat" &&
        parsedData?.roomId &&
        parsedData?.message
      ) {
        const roomId = parsedData?.roomId;
        const message = parsedData?.message;

        users.forEach((user) => {
          if (user.rooms.includes(roomId)) {
            user.ws.send(
              JSON.stringify({
                type: "chat",
                message,
                roomId,
              })
            );
          }
        });
      }
    } catch (error) {
      return;
    }
  });
});
