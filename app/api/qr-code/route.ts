import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const { text, size = 300, color = "#000000", backgroundColor = "#FFFFFF" } = await req.json();
    
    if (!text) return Response.json({ error: "Missing text" }, { status: 400 });

    const qrCode = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: size,
      color: { dark: color, light: backgroundColor },
    });

    return Response.json({ 
      success: true, 
      qrCode,
      text 
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
