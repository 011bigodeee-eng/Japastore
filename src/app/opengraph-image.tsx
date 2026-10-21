import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#080808",
        color: "white",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ fontSize: 30, letterSpacing: 8 }}>JAPA STORE ®</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 100,
          fontWeight: 900,
          lineHeight: 1,
          marginTop: 50,
        }}
      >
        <span>SEU ESTILO.</span>
        <span>SUA IDENTIDADE.</span>
      </div>
      <div style={{ fontSize: 24, marginTop: 40, color: "#a1a1a1" }}>
        ESTILO QUE TRANSFORMA · SÃO CARLOS — SP
      </div>
    </div>,
    size,
  );
}
