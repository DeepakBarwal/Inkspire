import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { AuthRequest, middleware } from "./middleware";
import {
  CreateUserSchema,
  SignInSchema,
  CreateRoomSchema,
} from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/signup", async (req, res) => {
  const parsedData = CreateUserSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  try {
    const createdUser = await prismaClient.user.create({
      data: {
        email: parsedData.data.username,
        password: parsedData.data.password, // TODO: hash it
        name: parsedData.data.name,
      },
    });
    res.json({
      userId: createdUser.id,
    });
  } catch (error) {
    res.status(411).json({
      message: "User already exists with this username",
    });
  }
});

app.post("/signin", async (req, res) => {
  const parsedData = SignInSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  try {
    // TODO: compare with hashed pwd here
    const user = await prismaClient.user.findFirst({
      where: {
        email: parsedData.data.username,
        password: parsedData.data.password,
      },
    });

    if (!user) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const token = jwt.sign({ userId: user?.id }, JWT_SECRET);
    res.json(token);
  } catch (error) {
    res.status(411).json({
      message: "Something went wrong",
    });
  }
});

app.post("/room", middleware, async (req: AuthRequest, res) => {
  const parsedData = CreateRoomSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.json({
      message: "Incorrect inputs",
    });
  }

  const userId = req.userId;

  try {
    const createdRoom = await prismaClient.room.create({
      data: {
        slug: parsedData.data.name,
        adminId: userId!,
      },
    });

    res.json({
      roomId: createdRoom.id,
    });
  } catch (error) {
    res.status(411).json({
      message: "Something went wrong",
    });
  }
});

app.get("/chats/:roomId", async (req, res) => {
  const roomId = Number(req.params.roomId);

  if (Number.isNaN(roomId)) {
    return res.status(404).json({
      message: "Not found",
    });
  }

  try {
    const messages = await prismaClient.chat.findMany({
      where: {
        roomId: roomId,
      },
      orderBy: {
        id: "desc",
      },
      take: 50,
    });

    res.json({
      messages,
    });
  } catch (error) {
    res.status(411).json({
      message: "Something went wrong",
    });
  }
});

app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;

  try {
    const room = await prismaClient.room.findFirst({
      where: {
        slug: slug,
      },
    });

    res.json({
      room,
    });
  } catch (error) {
    res.status(411).json({
      message: "Something went wrong",
    });
  }
});

app.listen(3001);
