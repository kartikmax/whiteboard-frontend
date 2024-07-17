import axios from "axios";
import { ChromePicker } from "react-color";
import { drawLine } from "./utils/drawLine";
import { io } from "socket.io-client";
import { useDraw } from "./hooks/useDraw";
import { useState, useEffect } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const socket = io(backendUrl);

const App = () => {
  const [color, setColor] = useState("#000");
  const { canvasRef, onMouseDown, clear } = useDraw(createLine);
  const [sceneName, setSceneName] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");

    socket.emit("client-ready");

    socket.on("get-canvas-state", () => {
      if (!canvasRef.current?.toDataURL()) return;
      socket.emit("canvas-state", canvasRef.current.toDataURL());
    });

    socket.on("canvas-state-from-server", (state) => {
      const img = new Image();
      img.src = state;
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
    });

    socket.on("draw-line", ({ prevPoint, currentPoint, color }) => {
      if (!ctx) return;
      drawLine({ prevPoint, currentPoint, ctx, color });
    });

    socket.on("clear", clear);

    return () => {
      socket.off("get-canvas-state");
      socket.off("canvas-state-from-server");
      socket.off("draw-line");
      socket.off("clear");
    };
  }, []);

  function createLine({ prevPoint, currentPoint, ctx }) {
    socket.emit("draw-line", { prevPoint, currentPoint, ctx, color });
    drawLine({ prevPoint, currentPoint, ctx, color });
  }

  const saveScene = async () => {
    if (!sceneName) return;
    const sceneData = canvasRef.current.toDataURL();
    try {
      await axios.post(`${backendUrl}/save-scene`, {
        name: sceneName,
        data: sceneData,
      });
      alert("Scene saved successfully!");
      setShowDialog(false);
    } catch (error) {
      console.error("Error saving scene:", error);
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex justify-center items-center">
      <div className="flex flex-col gap-10 pr-10">
        <div>
          <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
        </div>
        <button
          type="button"
          className="p-2 rounded-md border border-black"
          onClick={() => {
            socket.emit("clear");
          }}
        >
          Clear canvas
        </button>
        <button
          type="button"
          className="p-2 rounded-md border border-black"
          onClick={() => setShowDialog(true)}
        >
          Save Scene
        </button>
        {showDialog && (
          <div className="dialog">
            <input
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="Enter scene name"
            />
            <button className="rounded-md border border-black p-1 mx-1" onClick={saveScene}>Save</button>
            <button className="rounded-md border border-black p-1 mx-1" onClick={() => setShowDialog(false)}>Cancel</button>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        width={450}
        height={450}
        className="border border-black rounded-md"
      />
    </div>
  );
};

export default App;
