import React, { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Check if already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOS(true);
      return;
    }

    // Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            ✂️
          </div>
          <div className="flex-1 min-w-0">
            {showAndroid && (
              <>
                <p className="text-sm font-semibold text-foreground">Instalar BarberPRO</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicione o app à sua tela inicial para acesso rápido.
                </p>
                <Button size="sm" className="mt-2" onClick={handleInstall}>
                  <Download className="h-4 w-4 mr-1" />
                  Instalar
                </Button>
              </>
            )}
            {showIOS && (
              <>
                <p className="text-sm font-semibold text-foreground">Adicionar à Tela de Início</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toque em <Share className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> e depois em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
