import { createContext, useContext, useEffect, type ReactNode } from "react";

type AnalyticsContextType = {
  sendEvent: (event: string, data?: Record<string, string>) => void;
};

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

type UmamiWindow = Window & {
  umami:
    | {
        track: (str: string, args: Record<string, string>) => void;
      }
    | undefined;
};

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  const enabled: boolean = import.meta.env.VITE_ENABLE_ANALYTICS === "true";

  useEffect(() => {
    if (!enabled) {
      return;
    }
    injectUmamiScript();
  }, []);

  const sendEvent = (event: string, data: Record<string, string> = {}) => {
    if (!enabled) {
      return;
    }
    const umami = (window as unknown as UmamiWindow).umami;
    if (!umami) {
      return;
    }

    umami.track(event, data);
  };

  const injectUmamiScript = () => {
    const script = document.createElement('script');
    script.defer = true;
    script.src = import.meta.env.VITE_UMAMI_URL;
    script.setAttribute('data-website-id', import.meta.env.VITE_UMAMI_PROJECT_ID);
    document.head.appendChild(script);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        sendEvent,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};


export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics() must be used within AnalyticsProvider");
  }

  return context;
};
