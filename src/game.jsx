import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { STICKERS } from "./stickers.js";

/* ==============================
   Config
============================== */
const VENMO_HANDLE = "thetipjar";
const UNLOCK_KEY = "sgmt_unlocked_v12";
const BASE = import.meta.env.BASE_URL; // works for subfolder deploys

// Use RELATIVE paths here; we’ll prepend BASE below.
const POSES = [
    { id: "pose-masturbate", label: "Tease", video: "assets/pose/pose-masturbate.mp4" },
    { id: "pose-vibrator", label: "Vibe", video: "assets/pose/pose-vibrator.mp4" },
    { id: "pose-pussy", label: "Spread", video: "assets/pose/pose-pussy.mp4" },
    { id: "pose-topoff", label: "Top Off", video: "assets/pose/pose-topoff.mp4" },
    { id: "pose-bounce", label: "Bounce", video: "assets/pose/pose-bounce.mp4" },
    { id: "pose-feet", label: "Feet", video: "assets/pose/pose-feet.mp4" },
    { id: "pose-ahegao", label: "Ahegao", video: "assets/pose/pose-ahegao.mp4" },
    { id: "pose-kiss", label: "Kiss", video: "assets/pose/pose-kiss.mp4" },
    { id: "pose-glasses", label: "Glasses On", video: "assets/pose/pose-glasses.mp4" },
    { id: "pose-change", label: "Change", video: "assets/pose/pose-change.mp4" }
];

/* ==============================
   Utilities / Hooks
============================== */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const rand = (a, b) => Math.random() * (b - a) + a;

// Normalize any "/path" to "BASE + path"
const withBase = (p) => (p.startsWith("http") ? p : `${BASE}${p.replace(/^\/+/, "")}`);

function useWindowSize() {
    const [s, set] = useState({ w: window.innerWidth, h: window.innerHeight });
    useEffect(() => {
        const onR = () => set({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener("resize", onR);
        return () => window.removeEventListener("resize", onR);
    }, []);
    return s;
}

/* ==============================
   Ambient Bubbles
============================== */
function Bubbles() {
    const items = Array.from({ length: 6 }, (_, i) => ({
        key: i,
        left: `${(i * 15 + 7) % 100}%`,
        size: 32 + (i % 4) * 14,
        delay: `${i * 1.2}s`,
        duration: `${14 + (i % 3) * 4}s`,
    }));
    return (
        <div className="bubble-layer" aria-hidden>
            {items.map((b) => (
                <span
                    key={b.key}
                    className="bubble"
                    style={{
                        left: b.left,
                        width: b.size,
                        height: b.size,
                        animationDelay: b.delay,
                        animationDuration: b.duration,
                    }}
                />
            ))}
        </div>
    );
}

/* ==============================
   Falling Stickers
============================== */
function StickerRain({ paused }) {
    const [stickers, setStickers] = useState([]);
    const win = useWindowSize();

    // spawn
    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => {
            const raw = STICKERS[Math.floor(Math.random() * STICKERS.length)];
            const src = withBase(raw); // ensure BASE prefix
            setStickers((prev) => [
                ...prev,
                {
                    id: uid(),
                    src,
                    x: rand(120, Math.max(121, win.w - 120)),
                    y: -60,
                    vx: rand(-0.28, 0.28),
                    vy: rand(0.14, 0.32),
                    r: rand(-0.015, 0.015),
                    rot: rand(0, Math.PI * 2),
                    size: rand(42, 72),
                    landed: false,
                },
            ]);
        }, 380);
        return () => clearInterval(t);
    }, [paused, win.w]);

    // animate
    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => {
            setStickers((prev) =>
                prev.map((s) =>
                    s.landed
                        ? s
                        : {
                            ...s,
                            y: s.y + s.vy * 3,
                            x: s.x + s.vx * 3,
                            vy: s.vy + 0.008,
                            rot: s.rot + s.r,
                            landed: s.y + s.vy * 3 >= win.h - 6,
                        }
                )
            );
        }, 16);
        return () => clearInterval(t);
    }, [paused, win.h]);

    return (
        <div className="stickers-layer" aria-hidden>
            {stickers.map((s) => (
                <img
                    key={s.id}
                    src={s.src}
                    className={"sticker" + (s.landed ? " landed" : "")}
                    style={{ left: s.x, top: s.y, width: s.size, transform: `rotate(${s.rot}rad)` }}
                    alt=""
                />
            ))}
        </div>
    );
}

/* ==============================
   App Shell (splash → paywall → game)
============================== */
function AppShell() {
    // Prepend BASE to all pose videos once
    const NPOSES = useMemo(() => POSES.map((p) => ({ ...p, video: withBase(p.video) })), []);
    const [stage, setStage] = useState("splash");
    const [currentPose, setCurrentPose] = useState(NPOSES[0].video);
    const [videoError, setVideoError] = useState(false);

    const goFromSplash = () => {
        const expStr = localStorage.getItem(UNLOCK_KEY);
        const exp = expStr ? parseInt(expStr, 10) : 0;
        if (exp > Date.now()) setStage("game");
        else {
            localStorage.removeItem(UNLOCK_KEY);
            setStage("paywall");
        }
    };

    const onUnlock = () => {
        localStorage.setItem(UNLOCK_KEY, (Date.now() + 30 * 864e5).toString());
        setStage("game");
    };

    const onPoseClick = (p) => {
        setVideoError(false);
        setCurrentPose(p.video); // p.video already normalized with BASE
    };

    return (
        <div className="app-root subtle-bg">
            <Bubbles />
            {stage !== "game" && <StickerRain paused={false} />}
            {stage === "game" && <StickerRain paused={true} />}

            <div className={`stage-wrapper ${stage}-stage`}>
                {stage === "splash" && <Splash onEnter={goFromSplash} />}
                {stage === "paywall" && <Paywall venmo={VENMO_HANDLE} onUnlocked={onUnlock} />}
                {stage === "game" && (
                    <Game
                        poses={NPOSES}
                        currentPose={currentPose}
                        onPoseClick={onPoseClick}
                        videoError={videoError}
                        setVideoError={setVideoError}
                    />
                )}
            </div>

            {/* bottom badge + links */}
            {/* footer block lives OUTSIDE the stage wrapper */}
            <div className="footer-container">
                <div className="footer-watermark">
                    <a
                        href="https://www.onlyfans.com/shegavemethree"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img src={withBase("assets/links.png")} alt="OnlyFans" />
                    </a>
                </div>

                <footer className="footer-credit">
                    <p>🛠️ by Del ✦ @shegavemethree ✦ Naughty Strip Game V.1.20</p>
                </footer>
            </div>
        </div>
    );
}

/* ==============================
   Splash
============================== */
function Splash({ onEnter }) {
    return (
        <div className="card soft-card">
            <div className="logo-top">
                <img src={withBase("assets/logo-2.png")} alt="Naughty Strip Game" />
            </div>

            <div className="logo">
                <img src={withBase("assets/logo.png")} alt="SheGaveMeThree" />
            </div>

            <button className="btn primary" onClick={onEnter}>
                18+ Enter ONLY
            </button>
        </div>
    );
}

/* ==============================
   Paywall
============================== */
function Paywall({ venmo, onUnlocked }) {
    const link = `https://venmo.com/u/${venmo}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        link
    )}`;

    return (
        <div className="card soft-card paywall-card">
            <img src={withBase("assets/logo-2.png")} alt="logo-2" className="paywall-logo" />
            <img src={withBase("assets/del.png")} alt="Del stamp" className="del-stamp" />
            <div className="honor-bubble">
                For now, <strong>this</strong> model operates on the honor system. There's no set amount to
                play! <em>However</em>, I worked <em>very very</em> hard all by <strong>myself</strong> to
                build this just for you. A tip helps keep the server running so I can create more versions
                of this game ^-^ (Or if you <strong>appreciate</strong> my hard work.. Tysm!!! 💗)
            </div>

            <div className="qr-row">
                <div className="qr-col">
                    <img className="qr fancy-border" src={qr} alt={`QR for Venmo @${venmo}`} />
                    <p className="fine">Venmo</p>
                    <a className="btn" href={link} target="_blank" rel="noreferrer">
                        Tip on Venmo
                    </a>
                </div>
                <div className="qr-col">
                    <img
                        className="qr fancy-border"
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http%3A%2F%2Fwww.throne.com%2Fsgm3%2Fcollections%2Ftip-here"
                        alt="QR for Throne tip page"
                    />
                    <p className="fine">Throne</p>
                    <a
                        className="btn"
                        href="http://www.throne.com/sgm3/collections/tip-here"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Tip on Throne
                    </a>
                </div>
            </div>

            <button className="btn primary pay-btn" onClick={onUnlocked}>
                I paid — unlock
            </button>

            <p className="paywall-note">
                After payment, the game remains unlocked on this device for 30 days.
            </p>
        </div>
    );
}

/* ==============================
   Game (video + toolbar)
============================== */
function Game({ poses, currentPose, onPoseClick, videoError, setVideoError }) {
    const videoRef = React.useRef(null);
    const [blocked, setBlocked] = React.useState(false);

    // Try to autoplay; if blocked, show "tap to play"
    useEffect(() => {
        setBlocked(false);
        setVideoError(false);
        const v = videoRef.current;
        if (!v) return;

        v.pause();
        v.load();

        const onLoaded = async () => {
            try {
                await v.play();
            } catch {
                setBlocked(true);
            }
        };

        v.addEventListener("loadeddata", onLoaded, { once: true });

        const t = setTimeout(async () => {
            try {
                await v.play();
            } catch {
                setBlocked(true);
            }
        }, 120);

        return () => {
            v.removeEventListener("loadeddata", onLoaded);
            clearTimeout(t);
        };
    }, [currentPose, setVideoError]);

    return (
        <div className="card soft-card game-card">
            <div className="video-wrap">
                {currentPose && !videoError ? (
                    <video
                        key={currentPose}
                        ref={videoRef}
                        src={currentPose}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="model-video"
                        onError={() => setVideoError(true)}
                    />
                ) : (
                    <div className="placeholder">
                        {currentPose ? `COULDN'T LOAD ${currentPose}` : "Add a video"}
                    </div>
                )}

                {blocked && (
                    <button
                        className="tap-btn"
                        onClick={() => videoRef.current && videoRef.current.play()}
                    >
                        tap to play
                    </button>
                )}
            </div>

            <div className="toolbar">
                {poses.map((p) => {
                    const isActive = currentPose === p.video;
                    return (
                        <div key={p.id} className="pose-item">
                            <button
                                className={`icon-btn ${isActive ? "active" : ""}`}
                                aria-pressed={isActive}
                                aria-label={p.label}
                                onClick={() => onPoseClick(p)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
                                }}
                            >
                                <span className="icon-inner">
                                    <img src={withBase(`assets/icons/${p.id}.png`)} alt="" />
                                </span>
                            </button>
                            <span className="pose-label">{p.label}</span>
                        </div>
                    );
                })}
            </div>

            <p className="toolbar-instruction">Tap any button to switch it up!</p>
        </div>
    );
}

/* ==============================
   Mount
============================== */
createRoot(document.getElementById("root")).render(<AppShell />);
