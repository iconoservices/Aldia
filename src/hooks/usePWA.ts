import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

const LS_KEY = 'aldia_updated_at';

export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showUpdated, setShowUpdated] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string>('');

    // Check if we just came from an update (after reload)
    useEffect(() => {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            localStorage.removeItem(LS_KEY);
            setUpdatedAt(saved);
            setShowUpdated(true);
        }
    }, []);

    useEffect(() => {
        registerSW({
            onNeedRefresh() {
                // autoUpdate handles it silently
            },
            onOfflineReady() {
                console.log('App lista para uso offline');
            },
        });

        // When new SW takes control, save timestamp and reload
        let updated = false;
        const onControllerChange = () => {
            if (updated) return;
            updated = true;
            const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem(LS_KEY, time);
            location.reload();
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        }

        return () => {
            if (navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            }
        };
    }, []);

    useEffect(() => {
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

    const isIOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    };

    return {
        installPrompt,
        isInstalled,
        install,
        showUpdated,
        setShowUpdated,
        updatedAt,
        canInstall: !!installPrompt || (isIOS() && !isInstalled)
    };
};
