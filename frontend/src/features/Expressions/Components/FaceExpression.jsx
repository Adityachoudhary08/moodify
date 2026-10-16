


import { useEffect, useRef, useState } from "react";
import { detect, init } from "../Utils/utils";
import "../styles/face-expression.scss";

export default function FaceExpression({ onClick = () => {} }) {
  const videoRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const streamref = useRef(null);

  const [expression, setExpression] = useState("Initializing camera...");
  const [detectedMood, setDetectedMood] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const stopCamera = () => {
    if (streamref.current) {
      streamref.current.getTracks().forEach((track) => track.stop());
      streamref.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraEnabled(false);
    setExpression("Camera off");
  };

  useEffect(() => {
    const start = async () => {
      await init({ videoRef, faceLandmarkerRef, streamref });
      setExpression("Camera ready");
    };

    const startCamera = async () => {
      try {
        await start();
      } catch (error) {
        console.error("Camera initialization failed:", error);
        setExpression("Camera unavailable");
        setIsCameraEnabled(false);
      }
    };

    startCamera();

    return () => {
      if (streamref.current) {
        streamref.current.getTracks().forEach((track) => track.stop());
        streamref.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const handleDetect = () => {
    if (!videoRef.current || !faceLandmarkerRef.current) {
      setExpression("Camera is still starting...");
      return;
    }

    const detection = detect({ setExpression, videoRef, faceLandmarkerRef });
    if (detection) {
      setDetectedMood(detection.mood);
      if (detection.confidence < 0.7) {
        setExpression("Your mood seems mixed. Try again or choose a mood below.");
        return;
      }
      setExpression(`Detected: ${detection.mood}`);
      setIsGenerating(true);

      Promise.resolve(onClick(detection)).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setDetectedMood(null);
      setExpression("No face detected");
    }
  };

  // Function to extract emoji from expression
  const getExpressionEmoji = () => {
    if (detectedMood === "happy") return "😊";
    if (detectedMood === "sad") return "😢";
    if (detectedMood === "surprised") return "😲";
    if (detectedMood === "relaxed") return "😐";
    return "📷";
  };

  return (
    <div className="face-expression-container">
      <div className="face-heading">
        <p className="face-kicker">MOODIFY / ANALYSIS</p>
        <h2 className="face-title">Read the room</h2>
        <p className="face-subtitle">Hold still. We&apos;re reading the vibe, not your mind.</p>
        <p className="privacy-note">Your camera is used only to understand your current expression. No frames or face images are stored.</p>
      </div>

      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
        />
        <div className={`camera-indicator ${expression === "Camera unavailable" ? "is-offline" : ""}`}>
          {expression === "Camera unavailable" ? "Offline" : expression === "Camera off" ? "Camera off" : "Live camera"}
        </div>
      </div>

      <div className="expression-status">
        <p className="status-label">Current reading</p>
        <p className={`expression-text ${detectedMood ? "has-detection" : ""}`}>
          <span className="emoji">{getExpressionEmoji()}</span>
          {expression}
        </p>
        {detectedMood && (
          <p className="playlist-note">{isGenerating ? "Finding a playlist that fits..." : `${detectedMood} playlist is ready below.`}</p>
        )}
      </div>

      <div className="camera-actions">
        <button
          className="detect-button"
          onClick={handleDetect}
          disabled={!isCameraEnabled || isGenerating}
        >
          {isGenerating ? "Finding songs that won&apos;t disappoint you..." : "Detect mood & find music"}
        </button>
        {isCameraEnabled && (
          <button className="camera-toggle" type="button" onClick={stopCamera}>
            Turn camera off
          </button>
        )}
      </div>
    </div>
  );
}