import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radius: number;
    }
  | {
      type: "pencil";
      points: { x: number; y: number }[];
    };

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[] = [];
  private roomId: string;
  private socket: WebSocket;
  private clicked = false;
  private startX = 0;
  private startY = 0;
  private selectedTool: Tool = "rect";
  private currentPencilPoints: { x: number; y: number }[] = [];

  // CAMERA STATE
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private lastPanX = 0;
  private lastPanY = 0;
  private isPanning = false;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.roomId = roomId;
    this.socket = socket;
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.clearCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "chat") {
        const parsedShape = JSON.parse(message.message);
        this.existingShapes.push(parsedShape.shape);
        this.clearCanvas();
      }
    };
  }

  // Convert screen coordinates → world coordinates
  private screenToWorld(x: number, y: number) {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale,
    };
  }

  clearCanvas() {
    // reset transform before clearing
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // apply camera transform
    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY
    );

    // background
    this.ctx.fillStyle = "rgba(0,0,0,1)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw all shapes in world coords
    this.ctx.strokeStyle = "white";
    this.existingShapes.forEach((shape) => {
      if (shape.type === "rect") {
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
        this.ctx.beginPath();
        this.ctx.arc(
          shape.centerX,
          shape.centerY,
          Math.abs(shape.radius),
          0,
          Math.PI * 2
        );
        this.ctx.stroke();
      } else if (shape.type === "pencil" && shape.points.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        this.ctx.stroke();
      }
    });
  }

  mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 1) {
      // middle mouse for panning
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return;
    }

    this.clicked = true;
    const pos = this.screenToWorld(e.clientX, e.clientY);

    if (this.selectedTool === "pencil") {
      this.currentPencilPoints = [{ x: pos.x, y: pos.y }];
    } else {
      this.startX = pos.x;
      this.startY = pos.y;
    }
  };

  mouseUpHandler = (e: MouseEvent) => {
    if (e.button === 1) {
      this.isPanning = false;
      return;
    }

    this.clicked = false;
    const pos = this.screenToWorld(e.clientX, e.clientY);
    const width = pos.x - this.startX;
    const height = pos.y - this.startY;

    let shape: Shape | null = null;

    if (this.selectedTool === "rect") {
      shape = { type: "rect", x: this.startX, y: this.startY, width, height };
    } else if (this.selectedTool === "circle") {
      const radius = Math.max(width, height) / 2;
      shape = {
        type: "circle",
        radius,
        centerX: this.startX + radius,
        centerY: this.startY + radius,
      };
    } else if (this.selectedTool === "pencil") {
      shape = { type: "pencil", points: [...this.currentPencilPoints] };
      this.currentPencilPoints = [];
    }

    if (!shape) return;
    this.existingShapes.push(shape);

    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ shape }),
        roomId: this.roomId,
      })
    );
  };

  mouseMoveHandler = (e: MouseEvent) => {
    if (this.isPanning) {
      this.offsetX += e.clientX - this.lastPanX;
      this.offsetY += e.clientY - this.lastPanY;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.clearCanvas();
      return;
    }

    const pos = this.screenToWorld(e.clientX, e.clientY);

    if (this.clicked && this.selectedTool === "pencil") {
      this.currentPencilPoints.push({ x: pos.x, y: pos.y });
      this.clearCanvas();

      this.ctx.beginPath();
      for (let i = 0; i < this.currentPencilPoints.length - 1; i++) {
        const p1 = this.currentPencilPoints[i];
        const p2 = this.currentPencilPoints[i + 1];
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
      }
      this.ctx.stroke();
    } else if (this.clicked) {
      const width = pos.x - this.startX;
      const height = pos.y - this.startY;
      this.clearCanvas();

      if (this.selectedTool === "rect") {
        this.ctx.strokeRect(this.startX, this.startY, width, height);
      } else if (this.selectedTool === "circle") {
        const radius = Math.max(width, height) / 2;
        const centerX = this.startX + radius;
        const centerY = this.startY + radius;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
  };

  wheelHandler = (e: WheelEvent) => {
    const zoomSpeed = 0.001;
    const zoom = 1 - e.deltaY * zoomSpeed;

    const mouseBefore = this.screenToWorld(e.clientX, e.clientY);
    this.scale *= zoom;
    const mouseAfter = this.screenToWorld(e.clientX, e.clientY);

    // keep mouse position fixed while zooming
    this.offsetX += (mouseAfter.x - mouseBefore.x) * this.scale;
    this.offsetY += (mouseAfter.y - mouseBefore.y) * this.scale;

    this.clearCanvas();
    e.preventDefault();
  };

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("wheel", this.wheelHandler, {
      passive: false,
    });
  }
}
