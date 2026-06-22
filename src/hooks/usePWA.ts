import { useState, useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [needRefresh, setNeedRefresh] = useState(false);
    const [showUpdated, setShowUpdated] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

    useEffect(() => {
        const updateServiceWorker = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
            },
            onOfflineReady() {
                console.log('App lista para uso offline');
            },
        });
        updateSWRef.current = updateServiceWorker;
    }, []);

    // Auto-activate when needRefresh becomes true
    useEffect(() => {
        if (needRefresh && updateSWRef.current) {
            updateSWRef.current(true);
            setUpdatedAt(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
            setShowUpdated(true);
            setNeedRefresh(false);
        }
    }, [needRefresh]);

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
        needRefresh,
        updateServiceWorker: () => updateSWRef.current?.(true),
        showUpdated,
        setShowUpdated,
        updatedAt,
        canInstall: !!installPrompt || (isIOS() && !isInstalled)
    };
};
