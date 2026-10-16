import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   ShareResult  —  share match outcome as an image card
   Props:
     visible     — boolean, show/hide
     onClose     — () => void
     result      — { won, scoreBlue, scoreRed, goals, tackles,
                     possession, goalType, teamSize, matchMinutes }
     riderName   — string
     horseName   — string
     t           — (ru, kz, en) => string
   ────────────────────────────────────────────────────────────── */

const CANVAS_W = 1080;
const CANVAS_H_STORY  = 1920;
const CANVAS_H_SQUARE = 1080;

const PREVIEW_W = 196;
const PREVIEW_H_STORY  = 348;
const PREVIEW_H_SQUARE = 196;

export function ShareResult({ visible, onClose, result, riderName = "", horseName = "", t }) {
  const [format, setFormat] = useState("story"); // "story" | "square"
  const hiddenCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const canvasH = format === "story" ? CANVAS_H_STORY : CANVAS_H_SQUARE;
  const previewH = format === "story" ? PREVIEW_H_STORY : PREVIEW_H_SQUARE;

  const {
    won = false,
    scoreBlue = 0,
    scoreRed = 0,
    goals = 0,
    tackles = 0,
    possession = 50,
    teamSize = "3",
    matchMinutes = 3,
  } = result || {};

  // Re-draw whenever format or result changes
  useEffect(() => {
    if (!visible) return;
    const hCanvas = hiddenCanvasRef.current;
    const pCanvas = previewCanvasRef.current;
    if (!hCanvas || !pCanvas) return;

    hCanvas.width  = CANVAS_W;
    hCanvas.height = canvasH;
    const ctx = hCanvas.getContext("2d");
    drawCard(ctx, CANVAS_W, canvasH, {
      won, scoreBlue, scoreRed, goals, tackles, possession,
      teamSize, matchMinutes, riderName, horseName, t
    });

    // Draw scaled preview
    pCanvas.width  = PREVIEW_W;
    pCanvas.height = previewH;
    const pCtx = pCanvas.getContext("2d");
    pCtx.drawImage(hCanvas, 0, 0, PREVIEW_W, previewH);
  }, [visible, format, won, scoreBlue, scoreRed, goals, tackles, possession,
      teamSize, matchMinutes, riderName, horseName]);

  if (!visible) return null;

  /* ── Share actions ──────────────────────────────────────────── */
  const canFileShare = typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "test.png", { type: "image/png" })] });

  async function getPngBlob() {
    return new Promise((resolve) => {
      hiddenCanvasRef.current?.toBlob(resolve, "image/png");
    });
  }

  async function shareVia(url) {
    if (canFileShare) {
      try {
        const blob = await getPngBlob();
        const file = new File([blob], "kokpar-result.png", { type: "image/png" });
        await navigator.share({
          files: [file],
          title: won ? "Жеңіс · Победа — Кокпар 3D" : "Нәтиже — Кокпар 3D",
          text: "Сыграй против меня! kokpar.online",
          url: "https://kokpar.online"
        });
        return;
      } catch {}
    }
    window.open(url, "_blank", "noopener");
  }

  async function savePhoto() {
    const blob = await getPngBlob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "kokpar-result.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function shareMore() {
    if (canFileShare) {
      try {
        const blob = await getPngBlob();
        const file = new File([blob], "kokpar-result.png", { type: "image/png" });
        await navigator.share({
          files: [file],
          title: won ? "Жеңіс · Победа — Кокпар 3D" : "Нәтиже — Кокпар 3D",
          text: "Сыграй против меня! kokpar.online",
          url: "https://kokpar.online"
        });
        return;
      } catch {}
    }
    await savePhoto();
  }

  const shareTitle = won
    ? t("Поделиться победой", "Жеңіспен бөлісу", "Share victory")
    : t("Поделиться результатом", "Нәтижемен бөлісу", "Share result");

  return (
    <div
      className="share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={shareTitle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="share-card">

        {/* Canvas preview column */}
        <div className="share-card-preview">
          <canvas
            ref={previewCanvasRef}
            className="share-canvas-preview"
            width={PREVIEW_W}
            height={previewH}
            style={{ width: PREVIEW_W, height: previewH }}
          />
        </div>

        {/* Controls column */}
        <div className="share-card-body">

          {/* Header */}
          <div className="share-header">
            <span className="share-title">{shareTitle}</span>
            <button type="button" className="share-close-btn" onClick={onClose} aria-label={t("Закрыть", "Жабу", "Close")}>
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>

          {/* Format toggle */}
          <div className="share-format-toggle">
            <button
              type="button"
              className={`share-format-btn${format === "story" ? " active" : ""}`}
              onClick={() => setFormat("story")}
            >
              {t("История 9:16", "Тарих 9:16", "Story 9:16")}
            </button>
            <button
              type="button"
              className={`share-format-btn${format === "square" ? " active" : ""}`}
              onClick={() => setFormat("square")}
            >
              {t("Пост 1:1", "Пост 1:1", "Post 1:1")}
            </button>
          </div>

          {/* Share buttons 2×2 */}
          <div className="share-buttons-grid">
            <button
              type="button"
              className="share-btn"
              onClick={() => shareVia("https://www.instagram.com/")}
            >
              <span className="share-btn-icon">📸</span>
              Instagram Stories
            </button>
            <button
              type="button"
              className="share-btn"
              onClick={() => shareVia("https://t.me/share/url?url=https://kokpar.online&text=" + encodeURIComponent("Сыграй против меня"))}
            >
              <span className="share-btn-icon">✈️</span>
              Telegram
            </button>
            <button
              type="button"
              className="share-btn"
              onClick={() => shareVia("https://wa.me/?text=" + encodeURIComponent("Сыграй против меня https://kokpar.online"))}
            >
              <span className="share-btn-icon">💬</span>
              WhatsApp
            </button>
            <button
              type="button"
              className="share-btn"
              onClick={savePhoto}
            >
              <span className="share-btn-icon">📥</span>
              {t("Сохранить фото", "Фото сақтау", "Save photo")}
            </button>
          </div>

          {/* More */}
          <button type="button" className="share-more-btn" onClick={shareMore}>
            {t("Ещё другие приложения…", "Басқа қолданбалар…", "More apps…")}
          </button>

        </div>
      </div>

      {/* Hidden full-res canvas */}
      <canvas
        ref={hiddenCanvasRef}
        width={CANVAS_W}
        height={canvasH}
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Canvas drawing function — draws the full-resolution share card
   ────────────────────────────────────────────────────────────── */
function drawCard(ctx, w, h, {
  won, scoreBlue, scoreRed, goals, tackles, possession,
  teamSize, matchMinutes, riderName, horseName, t
}) {
  const isStory = h > w;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(46,28,8,1)");
  bg.addColorStop(1, "rgba(21,12,3,1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal lines texture
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = "rgba(242,226,184,1)";
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();

  // Top gold gradient band
  const topGrad = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.65);
  topGrad.addColorStop(0, "rgba(208,160,48,0.28)");
  topGrad.addColorStop(1, "rgba(208,160,48,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.5);

  // ── Logo row ──────────────────────────────────────────────────
  const topY = isStory ? 110 : 70;
  ctx.save();
  ctx.fillStyle = "rgba(208,160,48,0.82)";
  ctx.font = `700 ${isStory ? 44 : 28}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("◆  КӨКПАР 3D", w / 2, topY);
  ctx.restore();

  // Match info line
  ctx.save();
  ctx.fillStyle = "rgba(214,178,110,0.50)";
  ctx.font = `400 ${isStory ? 28 : 18}px Manrope, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${teamSize}×${teamSize} · ${matchMinutes} мин`, w / 2, topY + (isStory ? 52 : 34));
  ctx.restore();

  // ── Result section ────────────────────────────────────────────
  const resultY = isStory ? h * 0.35 : h * 0.32;

  // Outcome label
  const outcomeLabel = won ? "ЖЕҢІС · ПОБЕДА" : "ЖЕҢІЛІС · ПОРАЖЕНИЕ";
  ctx.save();
  ctx.font = `700 ${isStory ? 52 : 34}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  if (won) {
    const goldGrad = ctx.createLinearGradient(0, resultY - 50, 0, resultY + 10);
    goldGrad.addColorStop(0, "#f2e2b8");
    goldGrad.addColorStop(1, "#d4a028");
    ctx.fillStyle = goldGrad;
    ctx.shadowColor = "rgba(208,160,48,0.55)";
    ctx.shadowBlur = 28;
  } else {
    ctx.fillStyle = "rgba(214,178,110,0.45)";
  }
  ctx.fillText(outcomeLabel, w / 2, resultY);
  ctx.restore();

  // Score
  const scoreY = resultY + (isStory ? 140 : 90);
  const scoreSize = isStory ? 200 : 130;
  ctx.save();
  ctx.font = `600 ${scoreSize}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  // Blue score
  ctx.fillStyle = "#7ec8f0";
  ctx.fillText(`${scoreBlue}`, w / 2 - (isStory ? 160 : 105), scoreY);
  // Colon
  ctx.fillStyle = "rgba(214,178,110,0.7)";
  ctx.font = `600 ${isStory ? 120 : 80}px Oswald, sans-serif`;
  ctx.fillText(":", w / 2, scoreY - (isStory ? 20 : 12));
  // Red score
  ctx.fillStyle = "#f3a196";
  ctx.font = `600 ${scoreSize}px Oswald, sans-serif`;
  ctx.fillText(`${scoreRed}`, w / 2 + (isStory ? 160 : 105), scoreY);
  ctx.restore();

  // Rider + horse line
  const nameY = scoreY + (isStory ? 80 : 52);
  if (riderName || horseName) {
    ctx.save();
    ctx.fillStyle = "rgba(214,178,110,0.80)";
    ctx.font = `600 ${isStory ? 34 : 22}px Manrope, sans-serif`;
    ctx.textAlign = "center";
    const nameText = [riderName, horseName].filter(Boolean).join(horseName ? ` на ${horseName}` : "");
    ctx.fillText(riderName && horseName ? `${riderName} на ${horseName}` : (riderName || horseName), w / 2, nameY);
    ctx.restore();
  }

  // ── Stats tiles ───────────────────────────────────────────────
  const statsY = nameY + (isStory ? 100 : 64);
  const tileW  = isStory ? 280 : 180;
  const tileH  = isStory ? 120 : 76;
  const tileGap = isStory ? 18 : 12;
  const totalTilesW = tileW * 3 + tileGap * 2;
  const tilesStartX = (w - totalTilesW) / 2;

  const statTiles = [
    { label: "ГОЛЫ", value: `${goals}` },
    { label: "ОТБОРЫ", value: `${tackles}` },
    { label: "ВЛАДЕНИЕ", value: `${possession}%` },
  ];

  statTiles.forEach((tile, i) => {
    const tx = tilesStartX + i * (tileW + tileGap);
    const ty = statsY;

    // Tile background
    ctx.save();
    ctx.fillStyle = "rgba(52,32,10,0.70)";
    roundRect(ctx, tx, ty, tileW, tileH, isStory ? 16 : 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(190,148,60,0.28)";
    ctx.lineWidth = isStory ? 2 : 1.5;
    roundRect(ctx, tx, ty, tileW, tileH, isStory ? 16 : 10);
    ctx.stroke();
    ctx.restore();

    // Value
    ctx.save();
    ctx.fillStyle = "#f0c347";
    ctx.font = `700 ${isStory ? 52 : 34}px Oswald, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(tile.value, tx + tileW / 2, ty + tileH * 0.62);
    ctx.restore();

    // Label
    ctx.save();
    ctx.fillStyle = "rgba(214,178,110,0.55)";
    ctx.font = `700 ${isStory ? 20 : 13}px Manrope, sans-serif`;
    ctx.textAlign = "center";
    ctx.letterSpacing = "0.1em";
    ctx.fillText(tile.label, tx + tileW / 2, ty + tileH * 0.90);
    ctx.restore();
  });

  // ── Footer ─────────────────────────────────────────────────────
  const footerY = h - (isStory ? 90 : 58);

  ctx.save();
  ctx.fillStyle = "rgba(214,178,110,0.30)";
  ctx.font = `400 ${isStory ? 26 : 16}px Manrope, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("СЫГРАЙ ПРОТИВ МЕНЯ", isStory ? 80 : 52, footerY);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#d4a028";
  ctx.font = `700 ${isStory ? 34 : 22}px Oswald, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("kokpar.online", isStory ? 80 : 52, footerY + (isStory ? 50 : 32));
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(214,178,110,0.40)";
  ctx.font = `400 ${isStory ? 24 : 14}px Manrope, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("@kokpar.online", w - (isStory ? 80 : 52), footerY + (isStory ? 50 : 32));
  ctx.restore();
}

/* Helper: draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
