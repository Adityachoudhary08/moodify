

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const init = async ({ videoRef, faceLandmarkerRef, streamref, isCancelled = () => false }) => {
  const videoElement = videoRef.current
  if (!videoElement) return
  const cancelled = () => isCancelled() || videoRef.current !== videoElement

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  if (cancelled()) return

  const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });
  if (cancelled()) {
    faceLandmarker.close()
    return
  }
  faceLandmarkerRef.current = faceLandmarker

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
  });
  if (cancelled()) {
    stream.getTracks().forEach((track) => track.stop())
    faceLandmarkerRef.current?.close()
    faceLandmarkerRef.current = null
    return
  }

  streamref.current = stream
  videoElement.srcObject = stream
  try {
    await videoElement.play()
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    streamref.current = null
    if (videoElement.srcObject === stream) videoElement.srcObject = null
    if (error?.name !== 'AbortError' && !cancelled()) throw error
  }
};

export const detect = ({
  setExpression,
  videoRef,
  faceLandmarkerRef,
}) => {
  if (!faceLandmarkerRef.current || !videoRef.current) return;

  const results = faceLandmarkerRef.current.detectForVideo(
    videoRef.current,
    performance.now()
  );

  if (results.faceBlendshapes?.length > 0) {
    const shapes = results.faceBlendshapes[0].categories;

    const getScore = (name) =>
      shapes.find((s) => s.categoryName === name)?.score || 0;

    const smileLeft = getScore("mouthSmileLeft");
    const smileRight = getScore("mouthSmileRight");
    const jawOpen = getScore("jawOpen");
    const browUp = getScore("browInnerUp");
    const frownLeft = getScore("mouthFrownLeft");
    const frownRight = getScore("mouthFrownRight");

    let detectedMood = "neutral";
    let confidence = 0.55;

    if (smileLeft > 0.5 && smileRight > 0.5) {
      detectedMood = "happy";
      confidence = Math.min(0.99, (smileLeft + smileRight) / 2);
    } else if (frownLeft > 0.0001 && frownRight > 0.0001) {
      detectedMood = "sad";
      confidence = Math.min(0.99, Math.max(0.45, (frownLeft + frownRight) * 20));
    } else if (jawOpen > 0.2 && browUp > 0.2) {
      detectedMood = "surprised";
      confidence = Math.min(0.99, (jawOpen + browUp) / 2);
    }

    setExpression(`Detected: ${detectedMood}`);
    return { mood: detectedMood, confidence };
  }

  setExpression("No face detected");
};
