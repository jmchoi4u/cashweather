import {
  createContext,
  type CSSProperties,
  type DragEvent,
  type PropsWithChildren,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DevicePicker, useMobileDevice } from "./Device";
import { useMobileCursor } from "./MobileCursor";

type ScreenPortalContextValue = {
  screenRef: RefObject<HTMLDivElement | null>;
};

const ScreenPortalContext = createContext<ScreenPortalContextValue | null>(null);

function suppressNativeDrag(event: DragEvent<HTMLElement>) {
  if (event.target instanceof Element && event.target.closest('[data-native-drag="true"]')) {
    return;
  }

  event.preventDefault();
}

export function useScreenPortal() {
  const context = useContext(ScreenPortalContext);

  if (!context) {
    throw new Error("useScreenPortal must be used inside PhoneFrame");
  }

  return context;
}

function getDeviceScale(deviceWidth: number, deviceHeight: number) {
  if (typeof window === "undefined") return 1;

  const horizontal = (window.innerWidth - 48) / deviceWidth;
  const vertical = (window.innerHeight - 48) / deviceHeight;

  return Math.max(0.42, Math.min(horizontal, vertical, 1));
}

/**
 * App mode drops the simulated device shell and lets the prototype fill a real
 * phone viewport. The screen portal, keyboard, and safe-area contracts are kept
 * intact — only the mockup chrome (bezel, camera, picker, custom cursor) is gone.
 *
 * `?app=1` forces it on, `?frame=1` forces the mockup, and an installed PWA
 * always runs bare.
 */
function detectAppMode() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("app") === "1") return true;
  if (params.get("frame") === "1") return false;

  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return window.matchMedia("(max-width: 820px) and (pointer: coarse)").matches;
}

function useAppMode() {
  const [appMode, setAppMode] = useState(detectAppMode);

  useEffect(() => {
    const update = () => setAppMode(detectAppMode());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return appMode;
}

function useDeviceScale(deviceWidth: number, deviceHeight: number) {
  const [scale, setScale] = useState(() => getDeviceScale(deviceWidth, deviceHeight));

  useEffect(() => {
    const update = () => setScale(getDeviceScale(deviceWidth, deviceHeight));

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, [deviceHeight, deviceWidth]);

  return scale;
}

export function PhoneFrame({ children }: PropsWithChildren) {
  const { device } = useMobileDevice();
  const { geometry } = device;
  const scale = useDeviceScale(geometry.device.width, geometry.device.height);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const contextValue = useMemo(() => ({ screenRef }), []);
  const mobileCursor = useMobileCursor();
  const appMode = useAppMode();

  if (appMode) {
    return (
      <ScreenPortalContext.Provider value={contextValue}>
        <div className="phone-stage phone-stage-app">
          <div
            ref={screenRef}
            className="device-screen device-screen-app"
            data-device={device.id}
            data-platform={device.platform}
            data-phone-screen
            data-testid="device-screen"
            onDragStartCapture={suppressNativeDrag}
            style={
              {
                // Real hardware reports its own inset; fall back to none on desktop.
                "--device-safe-area-bottom": "env(safe-area-inset-bottom, 0px)",
              } as CSSProperties
            }
          >
            {children}
          </div>
        </div>
      </ScreenPortalContext.Provider>
    );
  }

  return (
    <ScreenPortalContext.Provider value={contextValue}>
      <div className="phone-stage">
        <DevicePicker />
        <div
          className="phone-scale-box"
          style={{
            width: geometry.device.width * scale,
            height: geometry.device.height * scale,
          }}
        >
          <div
            className="phone-device"
            data-device={device.id}
            data-platform={device.platform}
            data-testid="phone-frame"
            onDragStartCapture={suppressNativeDrag}
            style={{
              width: geometry.device.width,
              height: geometry.device.height,
              transform: `scale(${scale})`,
            }}
          >
            <img
              className="phone-bezel"
              src={device.bezel}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ zIndex: device.bezelLayer === "above-screen" ? 2 : 1 }}
            />
            <div
              ref={screenRef}
              className="device-screen"
              data-cursor-debug={mobileCursor.cursorDebug ? "true" : "false"}
              data-device={device.id}
              data-phone-screen
              data-testid="device-screen"
              {...mobileCursor.cursorHandlers}
              style={
                {
                  "--device-safe-area-bottom": `${geometry.safeArea.bottom}px`,
                  left: geometry.screen.x,
                  top: geometry.screen.y,
                  width: geometry.screen.width,
                  height: geometry.screen.height,
                  borderRadius: geometry.screen.radius,
                  zIndex: device.bezelLayer === "above-screen" ? 1 : 2,
                } as CSSProperties
              }
            >
              {children}
              {device.camera ? (
                <span
                  className="device-camera"
                  data-testid="device-camera"
                  aria-hidden="true"
                  style={{
                    width: device.camera.size,
                    height: device.camera.size,
                    top: device.camera.top,
                    left: `calc(50% - ${device.camera.size / 2}px)`,
                  }}
                />
              ) : null}
              {mobileCursor.cursorElement}
            </div>
          </div>
        </div>
      </div>
    </ScreenPortalContext.Provider>
  );
}
