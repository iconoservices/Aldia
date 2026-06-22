import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showUpdated, setShowUpdated] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string>('');

    useEffect(() => {
        registerSW({
            onNeedRefresh() {
                // With autoUpdate, the SW activates automatically.
                // Listen for controllerchange to know when it took over.
            },
            onOfflineReady() {
                console.log('App lista para uso offline');
            },
        });

        // Detect when a new service worker takes control
        let updated = false;
        const onControllerChange = () => {
            if (updated) return;
            updated = true;
            setUpdatedAt(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
            setShowUpdated(true);
            setTimeout(() => location.reload(), 2000);
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
