import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [needRefresh, setNeedRefresh] = useState(false);

    const updateServiceWorker = registerSW({
        onNeedRefresh() {
            setNeedRefresh(true);
        },
        onOfflineReady() {
            console.log('App lista para uso offline');
        },
    });

    useEffect(() => {
        // Detectar si ya está instalada
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsInstalled(isStandalone);

        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setInstallPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
            setIsInstalled(true);
        }
    };

    // Detectar si es iOS
    const isIOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    };

    return {
        installPrompt,
        isInstalled,
        install,
        needRefresh,
        updateServiceWorker: () => updateServiceWorker(true),
        canInstall: !!installPrompt || (isIOS() && !isInstalled)
    };
};
