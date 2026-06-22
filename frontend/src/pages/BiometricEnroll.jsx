import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { startCamera, stopCamera, captureToBase64 } from "../utils/faceCapture";
import { getToken } from "../api/client";

export default function BiometricEnroll() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const token = getToken();

  useEffect(() => {
    (async () => {
      try {
        const s = await startCamera(videoRef.current);
        setStream(s);
      } catch {
        setErr("Camera permission denied / not available.");
      }
    })();
    return () => stopCamera(stream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enroll() {
    setMsg(""); setErr("");
    try {
      const image_base64 = captureToBase64(videoRef.current);
      const res = await api.post("/biometric/enroll", { image_base64 }, { auth: true });
      setMsg(`✅ Enrolled. template_hash: ${res.data.template_hash}`);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="page-wrap">
      <div className="app-card">
        <h2 style={{ marginBottom: 6 }}>Biometric Enroll (Step 1)</h2>
        <div style={{ color: "var(--muted)" }}>
          Capture selfie → backend creates embedding + stores template hash.
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 14 }}>
        <video
          ref={videoRef}
          style={{
            width: 380,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "black",
          }}
        />
        <div style={{ height: 12 }} />
        <button className="app-btn" onClick={enroll}>Enroll Selfie</button>

        {msg && <div style={{ marginTop: 12, color: "var(--success)", fontWeight: 800 }}>{msg}</div>}
        {err && <div style={{ marginTop: 12, color: "tomato", fontWeight: 800 }}>{err}</div>}
      </div>
    </div>
  );
}