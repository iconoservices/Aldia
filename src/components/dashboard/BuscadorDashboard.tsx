import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Sparkles, 
    Globe, 
    Settings, 
    HelpCircle, 
    X, 
    Copy, 
    Check, 
    Shield, 
    Code, 
    BookOpen, 
    MessageSquare, 
    ChevronRight,
    CornerDownRight,
    Monitor,
    ExternalLink,
    RefreshCw,
    Maximize2,
    AlertTriangle
} from 'lucide-react';

export const BuscadorDashboard = () => {
    // Basic search states
    const [query, setQuery] = useState('');
    const [exactPhrase, setExactPhrase] = useState('');
    const [excludeWords, setExcludeWords] = useState('');
    const [site, setSite] = useState('');
    const [fileType, setFileType] = useState('');
    const [dateRange, setDateRange] = useState('any');
    const [inTitleOrUrl, setInTitleOrUrl] = useState('any');

    // Preset Toggles
    const [realOpinions, setRealOpinions] = useState(false);
    const [devMode, setDevMode] = useState(false);
    const [noSpam, setNoSpam] = useState(false); // Default to clean search
    const [academic, setAcademic] = useState(false);
    const [socialSearch, setSocialSearch] = useState(false); // Búsqueda de personas/social
    const [mentionMode, setMentionMode] = useState(false); // Buscar donde mencionan a alguien
    const [telegramSearch, setTelegramSearch] = useState(false); // Buscar grupos Telegram

    // Location / Country filter
    const [location, setLocation] = useState('');

    // Copy to clipboard notification
    const [copied, setCopied] = useState(false);

    // AI Keyword Assistant State
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantSuggestions, setAssistantSuggestions] = useState<{
        query: string;
        exact: string;
        exclude: string;
        site: string;
        tags: string[];
    } | null>(null);

    // Generated raw query string
    const [generatedQuery, setGeneratedQuery] = useState('');

    // Embedded panel states
    const [embeddedUrl, setEmbeddedUrl] = useState('');
    const [showPanel, setShowPanel] = useState(false);
    const [viewMode, setViewMode] = useState<'tab' | 'panel'>('tab');
    const [embedBlockedMsg, setEmbedBlockedMsg] = useState('');
    const [panelExpanded, setPanelExpanded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Custom scrapper/crawler state (fetched via CORS proxies)
    const [scrapedResults, setScrapedResults] = useState<{ title: string; url: string; snippet: string; matchType?: 'exact' | 'partial' | 'similar' | 'none' }[]>([]);
    const [scrapingLoading, setScrapingLoading] = useState(false);
    const [scrapingError, setScrapingError] = useState('');
    const [scrapingQuery, setScrapingQuery] = useState('');
    const [scrapingOffset, setScrapingOffset] = useState(0);

    // URL Analyzer ("Leer Página") state
    const [urlInput, setUrlInput] = useState('');
    const [urlAnalyzing, setUrlAnalyzing] = useState(false);
    const [urlAnalyzeError, setUrlAnalyzeError] = useState('');
    const [urlResult, setUrlResult] = useState<{
        title: string;
        description: string;
        image: string;
        siteName: string;
        bodyText: string;
        domain: string;
        url: string;
    } | null>(null);

    // Update the generated query in real-time
    useEffect(() => {
        let parts: string[] = [];
        
        // Base Query / Keyword
        if (query.trim()) {
            if (inTitleOrUrl === 'title') {
                parts.push(`intitle:"${query.trim()}"`);
            } else if (inTitleOrUrl === 'url') {
                parts.push(`inurl:"${query.trim()}"`);
            } else {
                parts.push(query.trim());
            }
        }

        // Exact Phrase
        if (exactPhrase.trim()) {
            parts.push(`"${exactPhrase.trim()}"`);
        }

        // Excludes
        let excludesList: string[] = [];
        if (excludeWords.trim()) {
            excludesList = excludeWords.split(',').map(w => w.trim()).filter(Boolean);
        }
        if (noSpam) {
            excludesList.push('comprar', 'precio', 'tienda', 'amazon', 'ebay', 'aliexpress', 'mercadolibre', 'costo', 'oferta');
        }
        excludesList = Array.from(new Set(excludesList)); // Deduplicate
        excludesList.forEach(w => parts.push(`-${w}`));

        // Site Filters
        let siteParts: string[] = [];
        if (site.trim()) {
            siteParts.push(`site:${site.trim()}`);
        }
        if (realOpinions) {
            siteParts.push('site:reddit.com', 'site:quora.com');
        }
        if (devMode) {
            siteParts.push('site:stackoverflow.com', 'site:github.com', 'site:gist.github.com');
        }
        if (academic) {
            siteParts.push('site:*.edu', 'site:researchgate.net', 'site:arxiv.org');
        }

        if (socialSearch) {
            siteParts.push('site:facebook.com', 'site:instagram.com', 'site:linkedin.com', 'site:twitter.com');
        }

        // Mention mode: buscar donde alguien fue mencionado en posts públicos
        // Usa Google con site: de redes sociales + frase exacta del nombre
        if (mentionMode) {
            // La query ya tiene el nombre; añadimos los sitios sociales para menciones
            siteParts.push(
                'site:facebook.com',
                'site:instagram.com',
                'site:twitter.com',
                'site:tiktok.com',
                'site:threads.net'
            );
        }

        // Telegram groups mode: buscar grupos/canales públicos
        if (telegramSearch) {
            siteParts.push('site:t.me');
        }

        if (siteParts.length > 0) {
            if (siteParts.length === 1) {
                parts.push(siteParts[0]);
            } else {
                parts.push(`(${siteParts.join(' OR ')})`);
            }
        }

        // Location filter
        if (location.trim()) {
            parts.push(`"${location.trim()}"`);
        }

        // File Type
        if (fileType) {
            parts.push(`filetype:${fileType}`);
        }

        // Date Range
        if (dateRange && dateRange !== 'any') {
            const currentYear = new Date().getFullYear();
            if (dateRange === '1y') {
                parts.push(`after:${currentYear - 1}-01-01`);
            } else if (dateRange === '3y') {
                parts.push(`after:${currentYear - 3}-01-01`);
            } else if (dateRange === '5y') {
                parts.push(`after:${currentYear - 5}-01-01`);
            }
        }

        setGeneratedQuery(parts.join(' '));
    }, [query, exactPhrase, excludeWords, site, location, fileType, dateRange, inTitleOrUrl, realOpinions, devMode, noSpam, academic, socialSearch, mentionMode, telegramSearch]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedQuery);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        setQuery('');
        setExactPhrase('');
        setExcludeWords('');
        setSite('');
        setFileType('');
        setDateRange('any');
        setInTitleOrUrl('any');
        setRealOpinions(false);
        setDevMode(false);
        setNoSpam(true);
        setAcademic(false);
        setSocialSearch(false);
        setMentionMode(false);
        setTelegramSearch(false);
        setLocation('');
        setScrapedResults([]);
        setScrapingError('');
        setScrapingLoading(false);
    };

    // ENGINES that block iframe embedding
    const BLOCKED_ENGINES: Record<string, string> = {
        google: 'Google bloquea la previsualización embebida.',
        bing: 'Bing también bloquea iframes (X-Frame-Options). Se abre en nueva pestaña.',
        brave: 'Brave Search bloquea iframes. Se abre en nueva pestaña.',
        ddg: 'DuckDuckGo bloquea iframes. Abre en nueva pestaña.',
        facebook: 'Facebook requiere que inicies sesión en su sitio. Se abre en nueva pestaña.',
        instagram: 'Instagram no permite previsualización embebida.',
        linkedin: 'LinkedIn requiere inicio de sesión.',
        reddit: 'Reddit bloquea iframes en sitios externos.',
        scholar: 'Google Scholar bloquea iframes.',
        menciones_google: 'Google bloquea previsualización embebida. Se abre en nueva pestaña.',
        telegram_google: 'Google bloquea previsualización embebida. Se abre en nueva pestaña.',
        tgstat: 'TGStat bloquea iframes. Se abre en nueva pestaña.',
        wayback: 'Wayback Machine puede no cargar en iframe.',
    };

    // EMBEDDABLE engines - only SearXNG reliably allows iframes
    const getEmbedUrl = (engine: string, encodedQuery: string, _rawQuery: string, _rawExact: string): string => {
        switch (engine) {
            case 'searx':
                return `https://searx.be/search?q=${encodedQuery}&language=es&format=html`;
            default:
                return '';
        }
    };

    // Open link: either in embedded panel or new tab based on viewMode
    const handleSearchWithMode = (engine: string) => {
        const encodedQuery = encodeURIComponent(generatedQuery);

        if (viewMode === 'panel') {
            setShowPanel(true);
            setEmbedBlockedMsg('');
            setEmbeddedUrl('');
            setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

            if (BLOCKED_ENGINES[engine]) {
                setEmbedBlockedMsg(BLOCKED_ENGINES[engine]);
                // Also launch in tab so user still gets results
                handleSearchLaunch(engine);
                // Show clean scraped results as bonus
                runWebScraper();
                return;
            }

            const embedUrl = getEmbedUrl(engine, encodedQuery, query, exactPhrase);
            if (embedUrl) {
                setEmbeddedUrl(embedUrl);
                return;
            }

            // Fallback: fetch clean scraped results for any engine
            runWebScraper();
            handleSearchLaunch(engine);
            return;
        }
        // Default: new tab
        handleSearchLaunch(engine);
    };

    // Helper to highlight matching words in search results
    const highlightText = (text: string, searchQuery: string) => {
        if (!text || !searchQuery || !searchQuery.trim()) return <span>{text}</span>;
        
        // Extract words longer than 2 characters
        const words = searchQuery.toLowerCase().split(/\s+/)
            .map(w => w.replace(/[+\-]/g, '').trim()) // strip search query operator prefixes
            .filter(w => w.length > 2);
            
        if (words.length === 0) return <span>{text}</span>;

        // Escape regex special chars
        const escaped = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        try {
            const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
            const parts = text.split(regex);
            
            return (
                <span>
                    {parts.map((part, i) => 
                        regex.test(part) ? (
                            <mark 
                                key={i} 
                                style={{ 
                                    background: 'rgba(242, 133, 0, 0.15)', 
                                    color: '#773401', 
                                    padding: '1px 3px', 
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    borderBottom: '1px solid rgba(242, 133, 0, 0.25)'
                                }}
                            >
                                {part}
                            </mark>
                        ) : (
                            part
                        )
                    )}
                </span>
            );
        } catch (e) {
            return <span>{text}</span>;
        }
    };

    // Helper to calculate matching level
    const getResultMatchType = (title: string, snippet: string, searchQuery: string): 'exact' | 'partial' | 'similar' | 'none' => {
        const fullText = `${title} ${snippet}`.toLowerCase();
        const cleanQuery = searchQuery.toLowerCase().trim();
        if (!cleanQuery) return 'none';

        // 1. Exact phrase match
        if (fullText.includes(cleanQuery)) {
            return 'exact';
        }

        // 2. Word by word check
        const words = cleanQuery.split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return 'none';

        let matchCount = 0;
        words.forEach(w => {
            if (fullText.includes(w)) {
                matchCount++;
            }
        });

        if (matchCount === words.length) {
            return 'partial';
        } else if (matchCount > 0) {
            return 'similar';
        }
        return 'none';
    };

    // Client-side web scraper - builds its own filters from current state
    const runWebScraper = async (overrideQuery?: string, append = false, offset = 0) => {
        // Build the search query: prefer the passed query, then generated, then raw
        const searchQuery = (overrideQuery || generatedQuery || query || exactPhrase || '').trim();
        if (!searchQuery) return;

        setScrapingLoading(true);
        setScrapingError('');
        if (!append) {
            setScrapedResults([]);
            setScrapingOffset(0);
        }
        setEmbeddedUrl('');
        setEmbedBlockedMsg('');
        setScrapingQuery(searchQuery);

        // Map date range filter to DuckDuckGo "df" param
        let ddgDateParam = '';
        if (dateRange === '1y') ddgDateParam = '&df=y';
        else if (dateRange === '3y') ddgDateParam = '&df=y&df=y'; // DDG only supports 1y, so use 'y' as closest
        else if (dateRange === '5y') ddgDateParam = '&df=y';
        else if (dateRange === '1m') ddgDateParam = '&df=m';
        else if (dateRange === '1w') ddgDateParam = '&df=w';

        const offsetParam = offset > 0 ? `&s=${offset}` : '';

        // Use Vite's dev-server proxy to bypass CORS (server-side routing)
        // /api/ddg-search → https://html.duckduckgo.com/html/ (no CORS, no preflight)
        const queryString = `?q=${encodeURIComponent(searchQuery)}&kp=-1&kl=es-es${ddgDateParam}${offsetParam}`;
        const proxies = [
            `/api/ddg-search${queryString}`,
            // Fallback: DDG lite (simpler, less JS, but works)
            `https://lite.duckduckgo.com/lite${queryString}`,
        ];

        let success = false;

        for (let i = 0; i < proxies.length; i++) {
            if (success) break;
            try {
                const proxyUrl = proxies[i];
                const res = await fetch(proxyUrl);
                if (!res.ok) {
                    console.warn(`Proxy ${i} returned HTTP ${res.status}`);
                    continue;
                }
                const html = await res.text();

                // Flexible check: DDG html results use 'result__a' or 'results'
                const hasResults = html.includes('result__a') || html.includes('class="result') || html.includes("class='result") || html.includes('result__snippet') || html.includes('<td class="result-link"');
                if (!html || !hasResults) {
                    console.warn(`Proxy ${i} returned empty or no results`);
                    continue;
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const parsedResults: { title: string; url: string; snippet: string; matchType?: 'exact' | 'partial' | 'similar' | 'none' }[] = [];

                // Try DDG HTML format first (.result__a)
                const resultElements = doc.querySelectorAll('.result');
                resultElements.forEach(el => {
                    const titleEl = el.querySelector('.result__a, a[href]');
                    const snippetEl = el.querySelector('.result__snippet, .result__body, .snippet');
                    if (titleEl) {
                        let linkUrl = titleEl.getAttribute('href') || '';
                        // Clean DDG redirect links
                        if (linkUrl.includes('uddg=')) {
                            try {
                                const urlObj = new URL('https://duckduckgo.com' + linkUrl);
                                const uddg = urlObj.searchParams.get('uddg');
                                if (uddg) linkUrl = decodeURIComponent(uddg);
                            } catch {
                                const match = linkUrl.match(/uddg=([^&]+)/);
                                if (match) linkUrl = decodeURIComponent(match[1]);
                            }
                        }
                        if (linkUrl.startsWith('//')) linkUrl = 'https:' + linkUrl;
                        if (!linkUrl.startsWith('http') || linkUrl.includes('duckduckgo.com')) return;
                        
                        const titleText = titleEl.textContent?.trim() || linkUrl;
                        const snippetText = snippetEl?.textContent?.trim() || '';
                        const matchType = getResultMatchType(titleText, snippetText, searchQuery);

                        parsedResults.push({
                            title: titleText,
                            url: linkUrl,
                            snippet: snippetText,
                            matchType
                        });
                    }
                });

                // Fallback: try DDG Lite table format
                if (parsedResults.length === 0) {
                    const liteLinks = doc.querySelectorAll('td.result-link a, a.result-link__title');
                    liteLinks.forEach(a => {
                        const linkUrl = a.getAttribute('href') || '';
                        if (!linkUrl.startsWith('http') || linkUrl.includes('duckduckgo.com')) return;
                        // Try to find the snippet in the next sibling td
                        const row = a.closest('tr');
                        const snippetRow = row?.nextElementSibling;
                        const snippetText = snippetRow?.querySelector('td.result-snippet')?.textContent?.trim() || '';
                        const titleText = a.textContent?.trim() || linkUrl;
                        const matchType = getResultMatchType(titleText, snippetText, searchQuery);

                        parsedResults.push({
                            title: titleText,
                            url: linkUrl,
                            snippet: snippetText,
                            matchType
                        });
                    });
                }

                if (parsedResults.length > 0) {
                    if (append) {
                        setScrapedResults(prev => [...prev, ...parsedResults]);
                        setScrapingOffset(offset);
                    } else {
                        setScrapedResults(parsedResults);
                        setScrapingOffset(0);
                    }
                    success = true;
                    break;
                }
            } catch (err) {
                console.error(`Scraper error with proxy ${i}:`, err);
            }
        }

        if (!success) {
            setScrapingError('No se pudieron cosechar más resultados. El cosechador usa proxies que pueden estar ocupados. Intenta de nuevo en unos segundos o usa los botones de motores para abrir en pestaña.');
        }
        setScrapingLoading(false);
    };

    // URL Analyzer: fetch a specific URL and extract Open Graph + body content
    const analyzeUrl = async (targetUrl?: string) => {
        const url = (targetUrl || urlInput || '').trim();
        if (!url) return;
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

        setUrlAnalyzing(true);
        setUrlAnalyzeError('');
        setUrlResult(null);

        try {
            // Route through Vite proxy → allorigins (server-side, no CORS)
            const proxyUrl = `/api/fetch-page?url=${encodeURIComponent(normalizedUrl)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const html: string = data.contents || '';

            if (!html) {
                setUrlAnalyzeError('La página no devolvió contenido. Puede requerir inicio de sesión (Facebook, Instagram) o estar protegida.');
                setUrlAnalyzing(false);
                return;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const getMeta = (name: string) =>
                doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
                doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';

            const title = getMeta('og:title') || doc.querySelector('title')?.textContent?.trim() || '';
            const description = getMeta('og:description') || getMeta('description') || '';
            const image = getMeta('og:image') || getMeta('twitter:image') || '';
            const siteName = getMeta('og:site_name') || '';

            // Extract meaningful body text (skip nav/header/footer/script)
            ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript'].forEach(tag => {
                doc.querySelectorAll(tag).forEach(el => el.remove());
            });
            const bodyText = (doc.querySelector('main, article, [role="main"], body')?.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 2000);

            let domain = '';
            try { domain = new URL(normalizedUrl).hostname.replace('www.', ''); } catch { domain = ''; }

            // Detect login wall (FB, IG redirect to login)
            const loginWall = html.includes('login') && (html.includes('Log in') || html.includes('Iniciar sesión')) && !title;

            if (loginWall || (!title && !description && !bodyText)) {
                setUrlAnalyzeError(`Esta página requiere inicio de sesión o bloqueó el acceso (${domain}). Solo funcionan sitios públicos sin autenticación.`);
                setUrlAnalyzing(false);
                return;
            }

            setUrlResult({ title, description, image, siteName, bodyText, domain, url: normalizedUrl });
        } catch (err) {
            console.error('analyzeUrl error:', err);
            setUrlAnalyzeError('No se pudo acceder a la página. Verifica que la URL sea válida y pública.');
        }
        setUrlAnalyzing(false);
    };

    // Keyword Assistant Parser (Local Rule-based NLP)
    const runKeywordAssistant = () => {
        if (!assistantInput.trim()) return;

        const text = assistantInput.toLowerCase();
        
        // Stop words in Spanish and English to filter out
        const stopWords = new Set([
            'como', 'como-hacer', 'como-arreglar', 'como-configurar', 'cómo', 'hacer', 'arreglar', 'configurar',
            'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'para', 'por', 'sobre',
            'que', 'qué', 'y', 'o', 'es', 'son', 'un', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'quiero', 'saber',
            'buscar', 'obtener', 'error', 'problema', 'no', 'si', 'tengo', 'me', 'se', 'lo', 'le', 'al', 'nos',
            'how', 'to', 'fix', 'solve', 'find', 'the', 'a', 'an', 'in', 'on', 'at', 'of', 'for', 'with', 'and', 'or', 'not'
        ]);

        const techKeywords = [
            'react', 'vue', 'angular', 'node', 'express', 'python', 'javascript', 'typescript', 'css', 'html', 
            'cors', 'firebase', 'firestore', 'auth', 'database', 'sql', 'postgres', 'mongodb', 'docker', 'git',
            'nextjs', 'vite', 'tailwind', 'django', 'flask', 'api', 'json', 'npm', 'yarn', 'deploy', 'vercel'
        ];

        const words = text
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
            .split(/\s+/)
            .map(w => w.trim())
            .filter(Boolean);

        const extractedTags: string[] = [];
        const extractedQueryWords: string[] = [];
        let siteSuggestion = '';
        let exactPhraseSuggestion = '';
        let excludeSuggestion = '';

        // Check for specific tech to auto-categorize
        words.forEach(word => {
            if (techKeywords.includes(word)) {
                extractedTags.push(word);
            }
            if (!stopWords.has(word) && word.length > 2) {
                extractedQueryWords.push(word);
            }
        });

        // Smart suggestions based on phrase patterns
        if (text.includes('libro') || text.includes('pdf') || text.includes('manual') || text.includes('guia') || text.includes('guía')) {
            extractedTags.push('documento');
        }
        if (text.includes('codigo') || text.includes('código') || text.includes('error') || text.includes('bug') || text.includes('consola')) {
            extractedTags.push('desarrollo');
            siteSuggestion = 'stackoverflow.com';
        }
        if (text.includes('opinion') || text.includes('opinión') || text.includes('foro') || text.includes('que tal') || text.includes('experiencia')) {
            extractedTags.push('foros');
            siteSuggestion = 'reddit.com';
        }

        // Exact phrases detection (things inside quotes or key terms)
        if (text.includes('cors')) {
            exactPhraseSuggestion = 'Access-Control-Allow-Origin';
        } else if (text.includes('firebase')) {
            exactPhraseSuggestion = 'Firebase App';
        }

        // Suggested output
        const finalQuerySuggestion = extractedQueryWords.slice(0, 4).join(' ');

        setAssistantSuggestions({
            query: finalQuerySuggestion,
            exact: exactPhraseSuggestion,
            exclude: excludeSuggestion,
            site: siteSuggestion,
            tags: extractedTags
        });
    };

    const applyAssistantSuggestions = () => {
        if (!assistantSuggestions) return;
        setQuery(assistantSuggestions.query);
        if (assistantSuggestions.exact) setExactPhrase(assistantSuggestions.exact);
        if (assistantSuggestions.site) setSite(assistantSuggestions.site);
        
        // Auto-enable presets based on tags
        if (assistantSuggestions.tags.includes('desarrollo')) {
            setDevMode(true);
        }
        if (assistantSuggestions.tags.includes('foros')) {
            setRealOpinions(true);
        }
        
        // Clear assistant
        setAssistantSuggestions(null);
        setAssistantInput('');
    };

    // Open link in new window helper
    const handleSearchLaunch = (engine: string) => {
        let url = '';
        const encodedQuery = encodeURIComponent(generatedQuery);

        switch (engine) {
            case 'google':
                url = `https://www.google.com/search?q=${encodedQuery}`;
                break;
            case 'bing':
                url = `https://www.bing.com/search?q=${encodedQuery}&setlang=es`;
                break;
            case 'ddg':
                url = `https://duckduckgo.com/?q=${encodedQuery}`;
                break;
            case 'brave':
                url = `https://search.brave.com/search?q=${encodedQuery}`;
                break;
            case 'searx':
                url = `https://searx.be/search?q=${encodedQuery}`;
                break;
            case 'reddit':
                url = `https://www.reddit.com/search/?q=${encodeURIComponent(query || exactPhrase)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/search/top?q=${encodeURIComponent(query || exactPhrase)}`;
                break;
            case 'instagram':
                url = `https://www.instagram.com/explore/tags/${encodeURIComponent((query || exactPhrase).replace(/\s+/g, ''))}/`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query || exactPhrase)}`;
                break;
            // Telegram: buscar grupos/canales públicos vía Google indexando t.me
            case 'telegram_google': {
                const tgTerm = query.trim() || exactPhrase.trim();
                url = `https://www.google.com/search?q=site%3At.me+%22${encodeURIComponent(tgTerm)}%22`;
                break;
            }
            // tgstat: directorio de grupos/canales con filtros
            case 'tgstat':
                url = `https://tgstat.com/search?q=${encodeURIComponent(query || exactPhrase)}`;
                break;
            // Buscar menciones en FB/IG/Twitter vía Google
            case 'menciones_google': {
                const name = exactPhrase.trim() || query.trim();
                url = `https://www.google.com/search?q=%22${encodeURIComponent(name)}%22+(site%3Afacebook.com+OR+site%3Ainstagram.com+OR+site%3Atwitter.com+OR+site%3Atiktok.com)`;
                break;
            }
            case 'scholar':
                url = `https://scholar.google.com/scholar?q=${encodedQuery}`;
                break;
            case 'wayback':
                url = `https://web.archive.org/web/*/${encodeURIComponent(query)}`;
                break;
            default:
                return;
        }

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div style={{ paddingBottom: '6rem', maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#944a18', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>travel_explore</span>
                        Super Buscador Web
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#877369', fontWeight: 600 }}>
                        Busca en la web de forma inteligente, libre de spam de marketing y burbujas de filtro.
                    </p>
                </div>
                <button 
                    onClick={handleClear}
                    style={{
                        background: 'rgba(148, 74, 24, 0.08)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        color: '#944a18',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(148, 74, 24, 0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(148, 74, 24, 0.08)')}
                >
                    <X size={14} />
                    Limpiar Filtros
                </button>
            </div>

            {/* Bento Layout Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* ROW 1: Query Preview & Main Input */}
                <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(148,74,24,0.1)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* Main Search Input */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <span style={{ position: 'absolute', left: '16px', color: '#877369' }}>
                                <Search size={22} />
                            </span>
                            <input 
                                type="text" 
                                placeholder="Escribe tus palabras clave principales... (Ej: react renderizar vacio)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        setShowPanel(true);
                                        runWebScraper();
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '16px 110px 16px 52px',
                                    borderRadius: '16px',
                                    border: '2px solid rgba(148, 74, 24, 0.15)',
                                    background: '#FDFDFD',
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    color: 'var(--text-carbon)',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#944a18')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148, 74, 24, 0.15)')}
                            />
                            <button
                                onClick={() => {
                                    setShowPanel(true);
                                    runWebScraper();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    background: '#944a18',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 20px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(148,74,24,0.15)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#773401'}
                                onMouseLeave={e => e.currentTarget.style.background = '#944a18'}
                            >
                                Buscar
                            </button>
                        </div>

                        {/* Live Query Codeblock */}
                        <div style={{ 
                            background: '#F7F4F2', 
                            borderRadius: '14px', 
                            padding: '12px 16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            border: '1px dashed rgba(148,74,24,0.2)',
                            minHeight: '50px'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.08)', padding: '2px 6px', borderRadius: '6px', marginTop: '2px' }}>
                                    QUERY
                                </span>
                                <span style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.9rem', 
                                    color: '#54433a', 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    fontWeight: 700
                                }}>
                                    {generatedQuery || 'Completa campos o escribe algo para generar tu query...'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', alignItems: 'center' }}>
                                <button 
                                    onClick={() => {
                                        setShowPanel(true);
                                        runWebScraper();
                                    }}
                                    disabled={!generatedQuery.trim() && !query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #944a18 0%, #773401 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0 14px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        transition: 'all 0.2s',
                                        opacity: (generatedQuery.trim() || query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        boxShadow: '0 2px 6px rgba(148, 74, 24, 0.15)'
                                    }}
                                    title="Buscar y extraer resultados directamente dentro de AlDía (Sin anuncios ni filtros)"
                                >
                                    <Sparkles size={13} />
                                    <span>Cosechar en AlDía</span>
                                </button>

                                <button 
                                    onClick={handleCopy}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: generatedQuery.trim() ? 'white' : 'transparent',
                                        border: '1px solid rgba(148, 74, 24, 0.15)',
                                        borderRadius: '8px',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        color: '#944a18',
                                        opacity: generatedQuery.trim() ? 1 : 0.4,
                                        transition: 'all 0.2s'
                                    }}
                                    title="Copiar Query al Portapapeles"
                                >
                                    {copied ? <Check size={16} color="#4CAF50" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ROW 2: Bento Grid configuration */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '1.5rem' 
                }}>

                    {/* Card A: Advanced Operators Builder */}
                    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-carbon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={18} color="#944a18" />
                            Operadores Avanzados
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            
                            {/* Exact Phrase */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                    Frase Exacta (`"frase"`)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Access-Control-Allow-Origin" 
                                    value={exactPhrase}
                                    onChange={e => setExactPhrase(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(148,74,24,0.15)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        fontWeight: 600,
                                        color: 'var(--text-carbon)'
                                    }}
                                />
                            </div>

                            {/* Exclude Words */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                    Excluir Palabras (separadas por comas)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: comprar, precio, blog" 
                                    value={excludeWords}
                                    onChange={e => setExcludeWords(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(148,74,24,0.15)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        fontWeight: 600,
                                        color: 'var(--text-carbon)'
                                    }}
                                />
                            </div>

                            {/* Site limitation */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                    Buscar en Sitio / Dominio Específico (`site:`)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: wikipedia.org o github.com" 
                                    value={site}
                                    onChange={e => setSite(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(148,74,24,0.15)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        fontWeight: 600,
                                        color: 'var(--text-carbon)'
                                    }}
                                />
                            </div>

                            {/* Location / Country */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                    📍 Ubicación / País (añade como contexto)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Colombia, Lima Peru, Ciudad de Mexico" 
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(148,74,24,0.15)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        fontWeight: 600,
                                        color: 'var(--text-carbon)'
                                    }}
                                />
                            </div>

                            {/* Row of dropdowns */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {/* File Type */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                        Tipo de Archivo (`filetype:`)
                                    </label>
                                    <select 
                                        value={fileType}
                                        onChange={e => setFileType(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(148,74,24,0.15)',
                                            background: 'white',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            color: 'var(--text-carbon)'
                                        }}
                                    >
                                        <option value="">Cualquiera</option>
                                        <option value="pdf">PDF (.pdf)</option>
                                        <option value="epub">EPUB (.epub)</option>
                                        <option value="docx">Word (.docx)</option>
                                        <option value="xls">Excel (.xls/.xlsx)</option>
                                        <option value="zip">Archivo ZIP (.zip)</option>
                                    </select>
                                </div>

                                {/* Antigüedad */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                        Antigüedad (`after:`)
                                    </label>
                                    <select 
                                        value={dateRange}
                                        onChange={e => setDateRange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(148,74,24,0.15)',
                                            background: 'white',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            color: 'var(--text-carbon)'
                                        }}
                                    >
                                        <option value="any">Cualquier fecha</option>
                                        <option value="1y">Último año</option>
                                        <option value="3y">Últimos 3 años</option>
                                        <option value="5y">Últimos 5 años</option>
                                    </select>
                                </div>
                            </div>

                            {/* Position filter */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#877369', marginBottom: '4px' }}>
                                    Buscar palabras en:
                                </label>
                                <div style={{ display: 'flex', gap: '15px', padding: '2px 0' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-carbon)', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="position" 
                                            checked={inTitleOrUrl === 'any'}
                                            onChange={() => setInTitleOrUrl('any')}
                                            style={{ accentColor: '#944a18' }}
                                        />
                                        Cualquier lado
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-carbon)', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="position" 
                                            checked={inTitleOrUrl === 'title'}
                                            onChange={() => setInTitleOrUrl('title')}
                                            style={{ accentColor: '#944a18' }}
                                        />
                                        Título (`intitle:`)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-carbon)', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="position" 
                                            checked={inTitleOrUrl === 'url'}
                                            onChange={() => setInTitleOrUrl('url')}
                                            style={{ accentColor: '#944a18' }}
                                        />
                                        URL (`inurl:`)
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Card B: Smart Presets & Multi-launch Engines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Subcard 1: Intelligent Presets */}
                        <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-carbon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} color="#944a18" />
                                Modos Inteligentes / Filtros Rápidos
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                
                                {/* Preset: Real Opinions */}
                                <button 
                                    onClick={() => setRealOpinions(!realOpinions)}
                                    style={{
                                        background: realOpinions ? 'rgba(148, 74, 24, 0.12)' : 'white',
                                        border: `1px solid ${realOpinions ? '#944a18' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        color: realOpinions ? '#944a18' : '#877369', 
                                        background: realOpinions ? 'rgba(148,74,24,0.15)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <MessageSquare size={14} />
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#54433a' }}>Opiniones Reales</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>Reddit + Quora</div>
                                    </div>
                                </button>

                                {/* Preset: Dev Mode */}
                                <button 
                                    onClick={() => setDevMode(!devMode)}
                                    style={{
                                        background: devMode ? 'rgba(148, 74, 24, 0.12)' : 'white',
                                        border: `1px solid ${devMode ? '#944a18' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        color: devMode ? '#944a18' : '#877369', 
                                        background: devMode ? 'rgba(148, 74, 24, 0.15)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Code size={14} />
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#54433a' }}>Modo Developer</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>StackOverflow+GitHub</div>
                                    </div>
                                </button>

                                {/* Preset: Academic */}
                                <button 
                                    onClick={() => setAcademic(!academic)}
                                    style={{
                                        background: academic ? 'rgba(148, 74, 24, 0.12)' : 'white',
                                        border: `1px solid ${academic ? '#944a18' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        color: academic ? '#944a18' : '#877369', 
                                        background: academic ? 'rgba(148,74,24,0.15)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <BookOpen size={14} />
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#54433a' }}>Académico</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>sitios .edu + Papers</div>
                                    </div>
                                </button>

                                {/* Preset: No Spam E-commerce */}
                                <button 
                                    onClick={() => setNoSpam(!noSpam)}
                                    style={{
                                        background: noSpam ? 'rgba(148, 74, 24, 0.12)' : 'white',
                                        border: `1px solid ${noSpam ? '#944a18' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        color: noSpam ? '#944a18' : '#877369', 
                                        background: noSpam ? 'rgba(148, 74, 24, 0.15)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Shield size={14} />
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#54433a' }}>Sin Spam / Tiendas</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>Elimina e-commerce</div>
                                    </div>
                                </button>

                                {/* Preset: Buscar Persona / Social */}
                                <button 
                                    onClick={() => setSocialSearch(!socialSearch)}
                                    style={{
                                        background: socialSearch ? 'rgba(29,78,216,0.1)' : 'white',
                                        border: `1px solid ${socialSearch ? '#1D4ED8' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        fontSize: '14px',
                                        background: socialSearch ? 'rgba(29,78,216,0.12)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        👤
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: socialSearch ? '#1D4ED8' : '#54433a' }}>Buscar Persona</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>FB+IG+LinkedIn</div>
                                    </div>
                                </button>

                                {/* Preset: Menciones Sociales */}
                                <button 
                                    onClick={() => setMentionMode(!mentionMode)}
                                    style={{
                                        background: mentionMode ? 'rgba(220,38,38,0.1)' : 'white',
                                        border: `1px solid ${mentionMode ? '#DC2626' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        fontSize: '14px',
                                        background: mentionMode ? 'rgba(220,38,38,0.12)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        📣
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: mentionMode ? '#DC2626' : '#54433a' }}>Buscar Menciones</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>Posts donde lo nombran</div>
                                    </div>
                                </button>

                                {/* Preset: Telegram Groups */}
                                <button 
                                    onClick={() => setTelegramSearch(!telegramSearch)}
                                    style={{
                                        background: telegramSearch ? 'rgba(0,136,204,0.1)' : 'white',
                                        border: `1px solid ${telegramSearch ? '#0088CC' : 'rgba(148,74,24,0.15)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textAlign: 'left',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <span style={{ 
                                        fontSize: '14px',
                                        background: telegramSearch ? 'rgba(0,136,204,0.12)' : '#F7F4F2',
                                        borderRadius: '6px',
                                        width: '24px', height: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        ✈️
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: telegramSearch ? '#0088CC' : '#54433a' }}>Grupos Telegram</div>
                                        <div style={{ fontSize: '0.62rem', color: '#888' }}>Canales y grupos t.me</div>
                                    </div>
                                </button>

                            </div>
                        </div>

                        {/* Subcard 2: Target Engines Grid */}
                        <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-carbon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Globe size={16} color="#944a18" />
                                    Lanzar Búsqueda en Motores
                                </h3>
                                {/* View Mode Toggle */}
                                <div style={{ display: 'flex', gap: '4px', background: '#F7F4F2', borderRadius: '10px', padding: '3px' }}>
                                    <button
                                        onClick={() => setViewMode('panel')}
                                        title="Ver resultados aquí (panel embebido)"
                                        style={{
                                            background: viewMode === 'panel' ? '#944a18' : 'transparent',
                                            color: viewMode === 'panel' ? 'white' : '#877369',
                                            border: 'none',
                                            borderRadius: '7px',
                                            padding: '5px 10px',
                                            cursor: 'pointer',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <Monitor size={12} /> Panel
                                    </button>
                                    <button
                                        onClick={() => setViewMode('tab')}
                                        title="Abrir en nueva pestaña"
                                        style={{
                                            background: viewMode === 'tab' ? '#944a18' : 'transparent',
                                            color: viewMode === 'tab' ? 'white' : '#877369',
                                            border: 'none',
                                            borderRadius: '7px',
                                            padding: '5px 10px',
                                            cursor: 'pointer',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <ExternalLink size={12} /> Nueva Pestaña
                                    </button>
                                </div>
                            </div>
                            {viewMode === 'panel' && (
                                <div style={{ fontSize: '0.72rem', color: '#877369', background: 'rgba(148,74,24,0.05)', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Monitor size={11} />
                                    <span>Modo Panel: Bing, Brave y SearXNG cargan aquí. Facebook/Google/Instagram abren en nueva pestaña (lo bloquean).</span>
                                </div>
                            )}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                
                                <button 
                                    onClick={() => handleSearchWithMode('bing')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #008373 0%, #005E54 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(0,131,115,0.2)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🔷</span>
                                    <span>Bing {viewMode === 'panel' ? '🖥️' : ''}</span>
                                </button>

                                {/* Engine 1: Brave Search */}
                                <button 
                                    onClick={() => handleSearchWithMode('brave')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #FF7F50 0%, #FF5F1F 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(255,95,31,0.2)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🦁</span>
                                    <span>Brave Search</span>
                                </button>

                                {/* Engine 2: DuckDuckGo */}
                                <button 
                                    onClick={() => handleSearchLaunch('ddg')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #DE5833 0%, #C43D1A 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(222,88,51,0.2)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🦆</span>
                                    <span>DuckDuckGo</span>
                                </button>

                                {/* Engine 3: Google Clean */}
                                <button 
                                    onClick={() => handleSearchLaunch('google')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(66,133,244,0.2)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🔍</span>
                                    <span>Google Limpio</span>
                                </button>

                                {/* Engine 4: SearXNG */}
                                <button 
                                    onClick={() => handleSearchWithMode('searx')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
                                        color: '#1e293b',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(78,101,255,0.15)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🔮</span>
                                    <span>SearXNG Libre</span>
                                </button>

                                {/* Engine 5: Reddit Search */}
                                <button 
                                    onClick={() => handleSearchWithMode('reddit')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #FF4500 0%, #FF5700 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(255,69,0,0.2)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>👽</span>
                                    <span>Foro Reddit</span>
                                </button>

                                {/* Engine: Facebook */}
                                <button 
                                    onClick={() => handleSearchWithMode('facebook')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #1877F2 0%, #0A5DC2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(24,119,242,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>📘</span>
                                    <span>Facebook</span>
                                </button>

                                {/* Engine: Instagram */}
                                <button 
                                    onClick={() => handleSearchWithMode('instagram')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #E1306C 0%, #833AB4 50%, #F77737 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(225,48,108,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>📸</span>
                                    <span>Instagram</span>
                                </button>

                                {/* Engine: LinkedIn */}
                                <button 
                                    onClick={() => handleSearchWithMode('linkedin')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(10,102,194,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>💼</span>
                                    <span>LinkedIn</span>
                                </button>

                                {/* Engine: Menciones (Google Search social posts) */}
                                <button 
                                    onClick={() => handleSearchWithMode('menciones_google')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(220,38,38,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                    title="Busca posts/páginas donde aparece este nombre en redes sociales"
                                >
                                    <span style={{ fontSize: '1.1rem' }}>📣</span>
                                    <span>Menciones</span>
                                </button>

                                {/* Engine: Telegram via Google (site:t.me) */}
                                <button 
                                    onClick={() => handleSearchWithMode('telegram_google')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #0088CC 0%, #006699 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(0,136,204,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                    title="Busca grupos/canales de Telegram indexados por Google"
                                >
                                    <span style={{ fontSize: '1.1rem' }}>✈️</span>
                                    <span>Telegram Grupos</span>
                                </button>

                                {/* Engine: tgstat.com (directorio avanzado de Telegram) */}
                                <button 
                                    onClick={() => handleSearchWithMode('tgstat')}
                                    disabled={!query.trim() && !exactPhrase.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #5B6CFF 0%, #3D4ED8 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: (query.trim() || exactPhrase.trim()) ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(91,108,255,0.25)',
                                        opacity: (query.trim() || exactPhrase.trim()) ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (query.trim() || exactPhrase.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                    title="Directorio de grupos/canales Telegram con estadísticas y filtros"
                                >
                                    <span style={{ fontSize: '1.1rem' }}>📊</span>
                                    <span>TGStat</span>
                                </button>

                                {/* Engine 6: Scholar (Ciencia) */}
                                <button 
                                    onClick={() => handleSearchWithMode('scholar')}
                                    disabled={!generatedQuery.trim()}
                                    style={{
                                        background: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        cursor: generatedQuery.trim() ? 'pointer' : 'default',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 10px rgba(17,24,39,0.2)',
                                        opacity: generatedQuery.trim() ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (generatedQuery.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🎓</span>
                                    <span>Google Scholar</span>
                                </button>

                            </div>
                        </div>

                    </div>
                </div>

                {/* ROW 3: Keyword Assistant & Tips Cheatsheet */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '1.5rem' 
                }}>
                    
                    {/* Panel C: Local NLP Keyword Assistant */}
                    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-carbon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={18} color="#944a18" />
                            Asistente de Palabras Clave
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#877369', lineHeight: 1.4 }}>
                            ¿No sabes cómo buscar? Escribe tu duda o problema tal como lo piensas, y extraeremos los términos de búsqueda ideales.
                        </p>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text"
                                placeholder="Ej: cómo solucionar el error CORS origin no permitido en react y node express"
                                value={assistantInput}
                                onChange={e => setAssistantInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') runKeywordAssistant(); }}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(148,74,24,0.15)',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={runKeywordAssistant}
                                style={{
                                    background: '#944a18',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Analizar
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {assistantSuggestions && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    style={{ 
                                        background: '#FFF8F5', 
                                        border: '1px solid rgba(148,74,24,0.15)', 
                                        borderRadius: '12px', 
                                        padding: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#944a18', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={14} />
                                        Filtro Sugerido Generado:
                                    </div>

                                    {/* Suggestion tags */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {assistantSuggestions.tags.map((tag, idx) => (
                                            <span key={idx} style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 800, 
                                                color: '#773401', 
                                                background: '#FFEBDC', 
                                                padding: '2px 8px', 
                                                borderRadius: '6px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Extracted Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CornerDownRight size={12} color="#877369" />
                                            <span><strong>Palabras clave:</strong> {assistantSuggestions.query}</span>
                                        </div>
                                        {assistantSuggestions.exact && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CornerDownRight size={12} color="#877369" />
                                                <span><strong>Frase exacta:</strong> "{assistantSuggestions.exact}"</span>
                                            </div>
                                        )}
                                        {assistantSuggestions.site && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CornerDownRight size={12} color="#877369" />
                                                <span><strong>Sitio sugerido:</strong> {assistantSuggestions.site}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button */}
                                    <button
                                        onClick={applyAssistantSuggestions}
                                        style={{
                                            width: '100%',
                                            background: '#773401',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            marginTop: '4px'
                                        }}
                                    >
                                        Aplicar Sugerencia al Buscador
                                        <ChevronRight size={14} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Panel D: Search Engine Tips Cheatsheet */}
                    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-carbon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={18} color="#944a18" />
                            Trucos Rápidos de Búsqueda
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem', color: '#54433a' }}>
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExactPhrase('error 404')}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.06)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    "palabra"
                                </span>
                                <span>Busca la frase exacta. Útil para mensajes de error específicos.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExcludeWords('comprar, precio')}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.06)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    -palabra
                                </span>
                                <span>Excluye páginas que contengan esa palabra. Quita tiendas o blogs irrelevantes.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setSite('github.com')}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.06)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    site:web.com
                                </span>
                                <span>Busca únicamente dentro de la web indicada.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setFileType('pdf')}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.06)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    filetype:pdf
                                </span>
                                <span>Filtra solo por tipos de archivo (libros, manuales, planillas).</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => { setInTitleOrUrl('title'); setQuery('react router'); }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#944a18', background: 'rgba(148,74,24,0.06)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    intitle:término
                                </span>
                                <span>Fuerza a que el título de la página contenga la palabra.</span>
                            </div>

                        </div>
                    </div>

                </div>

            </div>

            {/* ============================================================ */}
            {/* EMBEDDED PANEL - Resultados dentro de AlDía                  */}
            {/* ============================================================ */}
            <AnimatePresence>
            {showPanel && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="glass-card"
                    style={{
                        marginTop: '1.5rem',
                        padding: 0,
                        overflow: 'hidden',
                        border: '1px solid rgba(148,74,24,0.15)',
                        borderRadius: '18px'
                    }}
                >
                    {/* Panel Toolbar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'rgba(148,74,24,0.05)',
                        borderBottom: '1px solid rgba(148,74,24,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Monitor size={15} color="#944a18" />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#54433a' }}>
                                Panel de Resultados
                            </span>
                            {embeddedUrl && (
                                <span style={{ fontSize: '0.68rem', color: '#877369', fontFamily: 'monospace', background: '#F7F4F2', padding: '2px 8px', borderRadius: '6px', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {embeddedUrl}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {embeddedUrl && (
                                <>
                                    <button
                                        onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
                                        title="Recargar"
                                        style={{ background: 'white', border: '1px solid rgba(148,74,24,0.15)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#877369' }}
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                    <button
                                        onClick={() => window.open(embeddedUrl, '_blank', 'noopener,noreferrer')}
                                        title="Abrir en nueva pestaña"
                                        style={{ background: 'white', border: '1px solid rgba(148,74,24,0.15)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#877369' }}
                                    >
                                        <ExternalLink size={13} />
                                    </button>
                                    <button
                                        onClick={() => setPanelExpanded(!panelExpanded)}
                                        title={panelExpanded ? 'Reducir' : 'Expandir'}
                                        style={{ background: 'white', border: '1px solid rgba(148,74,24,0.15)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#877369' }}
                                    >
                                        <Maximize2 size={13} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { setShowPanel(false); setEmbeddedUrl(''); setEmbedBlockedMsg(''); }}
                                title="Cerrar panel"
                                style={{ background: 'rgba(148,74,24,0.08)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#944a18' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Blocked message */}
                    {embedBlockedMsg && (
                        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,193,7,0.06)', borderBottom: '1px solid rgba(255,193,7,0.15)' }}>
                            <AlertTriangle size={18} color="#D97706" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E' }}>No se puede previsualizar aquí</div>
                                <div style={{ fontSize: '0.78rem', color: '#877369', marginTop: '2px' }}>{embedBlockedMsg} El resultado ya se abrió en una nueva pestaña.</div>
                            </div>
                        </div>
                    )}

                    {/* Iframe */}
                    {embeddedUrl && (
                        <iframe
                            ref={iframeRef}
                            src={embeddedUrl}
                            title="Resultados de búsqueda"
                            style={{
                                width: '100%',
                                height: panelExpanded ? '85vh' : '580px',
                                border: 'none',
                                display: 'block',
                                transition: 'height 0.3s ease'
                            }}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                            loading="lazy"
                        />
                    )}

                    {/* Scraping Loader */}
                    {scrapingLoading && (
                        <div style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                border: '3px solid rgba(148,74,24,0.1)',
                                borderTopColor: '#944a18',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#944a18' }}>🚀 Cosechando resultados desde la Selva Digital...</div>
                                <div style={{ fontSize: '0.78rem', color: '#877369', marginTop: '4px' }}>Extrayendo información limpia, sin anuncios ni rastreadores para: "{scrapingQuery}"</div>
                            </div>
                        </div>
                    )}

                    {/* Scraping Error */}
                    {scrapingError && (
                        <div style={{ padding: '30px 24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)', margin: '16px', borderRadius: '12px' }}>
                            <AlertTriangle size={18} color="#EF4444" />
                            <div style={{ fontSize: '0.82rem', color: '#B91C1C', fontWeight: 600 }}>{scrapingError}</div>
                        </div>
                    )}

                    {/* Scraped Results Render List */}
                    {scrapedResults.length > 0 && (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#FAF9F8', maxHeight: '600px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#877369', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span>SE ENCONTRARON {scrapedResults.length} COSECHAS LIMPIAS:</span>
                                <span style={{ background: 'rgba(148,74,24,0.08)', color: '#944a18', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Sin Anuncios / Sin Filtro</span>
                            </div>
                            
                            {scrapedResults.map((item, index) => {
                                const isTelegram = item.url.includes('t.me');
                                const isFacebook = item.url.includes('facebook.com');
                                const isInstagram = item.url.includes('instagram.com');
                                const isLinkedIn = item.url.includes('linkedin.com');
                                const isTwitter = item.url.includes('twitter.com') || item.url.includes('x.com');

                                // Social brand icons / colors
                                let badgeColor = 'rgba(148,74,24,0.06)';
                                let badgeTextColor = '#877369';
                                let badgeLabel = 'Sitio Web';
                                let badgeIcon = '🌐';

                                if (isTelegram) {
                                    badgeColor = 'rgba(0,136,204,0.1)';
                                    badgeTextColor = '#0088CC';
                                    badgeLabel = 'Telegram Grupo/Canal';
                                    badgeIcon = '✈️';
                                } else if (isFacebook) {
                                    badgeColor = 'rgba(24,119,242,0.1)';
                                    badgeTextColor = '#1877F2';
                                    badgeLabel = 'Facebook Post/Perfil';
                                    badgeIcon = '📘';
                                } else if (isInstagram) {
                                    badgeColor = 'rgba(225,48,108,0.1)';
                                    badgeTextColor = '#E1306C';
                                    badgeLabel = 'Instagram Post';
                                    badgeIcon = '📸';
                                } else if (isLinkedIn) {
                                    badgeColor = 'rgba(10,102,194,0.1)';
                                    badgeTextColor = '#0A66C2';
                                    badgeLabel = 'LinkedIn';
                                    badgeIcon = '💼';
                                } else if (isTwitter) {
                                    badgeColor = 'rgba(0,0,0,0.06)';
                                    badgeTextColor = '#111';
                                    badgeLabel = 'Twitter/X Post';
                                    badgeIcon = '🐦';
                                }

                                // Match level badges
                                let matchBadgeColor = 'rgba(148,74,24,0.05)';
                                let matchBadgeTextColor = '#877369';
                                let matchBadgeText = 'Coincidencia baja';

                                if (item.matchType === 'exact') {
                                    matchBadgeColor = 'rgba(16, 185, 129, 0.12)';
                                    matchBadgeTextColor = '#059669';
                                    matchBadgeText = '🟢 Exacta';
                                } else if (item.matchType === 'partial') {
                                    matchBadgeColor = 'rgba(245, 158, 11, 0.12)';
                                    matchBadgeTextColor = '#D97706';
                                    matchBadgeText = '🟡 Parcial (palabras)';
                                } else if (item.matchType === 'similar') {
                                    matchBadgeColor = 'rgba(249, 115, 22, 0.1)';
                                    matchBadgeTextColor = '#EA580C';
                                    matchBadgeText = '🟠 Parecido (letras)';
                                }

                                return (
                                    <div 
                                        key={index} 
                                        style={{ 
                                            background: 'white', 
                                            border: '1px solid rgba(148,74,24,0.12)', 
                                            borderRadius: '12px', 
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '0.68rem', 
                                                    fontWeight: 800, 
                                                    color: badgeTextColor, 
                                                    background: badgeColor, 
                                                    padding: '2px 8px', 
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <span>{badgeIcon}</span>
                                                    <span>{badgeLabel}</span>
                                                </span>

                                                <span style={{ 
                                                    fontSize: '0.68rem', 
                                                    fontWeight: 800, 
                                                    color: matchBadgeTextColor, 
                                                    background: matchBadgeColor, 
                                                    padding: '2px 8px', 
                                                    borderRadius: '6px'
                                                }}>
                                                    {matchBadgeText}
                                                </span>
                                            </div>
                                            
                                            {/* Link domain summary */}
                                            <span style={{ fontSize: '0.7rem', color: '#aaa', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {new URL(item.url).hostname}
                                            </span>
                                        </div>

                                        <a 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                                fontSize: '0.92rem', 
                                                fontWeight: 700, 
                                                color: '#773401', 
                                                textDecoration: 'none',
                                                lineHeight: 1.3
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                        >
                                            {highlightText(item.title, scrapingQuery)}
                                        </a>

                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#54433a', lineHeight: 1.4 }}>
                                            {highlightText(item.snippet, scrapingQuery)}
                                        </p>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                            <a 
                                                href={item.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    color: '#944a18',
                                                    background: 'rgba(148,74,24,0.06)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '4px 10px',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <span>Abrir enlace</span>
                                                <ExternalLink size={11} />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Pagination Load More Button */}
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                <button
                                    onClick={() => runWebScraper(scrapingQuery, true, scrapingOffset + 30)}
                                    disabled={scrapingLoading}
                                    style={{
                                        background: 'linear-gradient(135deg, #944a18 0%, #773401 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 24px',
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                        cursor: scrapingLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 8px rgba(148, 74, 24, 0.15)',
                                        opacity: scrapingLoading ? 0.7 : 1
                                    }}
                                >
                                    {scrapingLoading ? '⏳ Cosechando más...' : '🌾 Cargar más cosechas'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* URL Analyzer Panel */}
                    <div style={{ margin: '16px', borderRadius: '14px', border: '1.5px solid rgba(148,74,24,0.13)', background: '#FDFDFD', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(148,74,24,0.07) 0%, rgba(148,74,24,0.03) 100%)', borderBottom: '1px solid rgba(148,74,24,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>🔎</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#944a18' }}>LEER PÁGINA</span>
                            <span style={{ fontSize: '0.75rem', color: '#877369', marginLeft: '4px' }}>Pega una URL y extrae su contenido</span>
                        </div>
                        <div style={{ padding: '14px 18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="https://t.me/canal, https://reddit.com/r/..., cualquier URL pública"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') analyzeUrl(); }}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                                    border: '1.5px solid rgba(148,74,24,0.2)', background: '#FFF',
                                    fontSize: '0.85rem', fontWeight: 600, color: '#54433a', outline: 'none'
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#944a18')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148,74,24,0.2)')}
                            />
                            <button
                                onClick={() => analyzeUrl()}
                                disabled={urlAnalyzing || !urlInput.trim()}
                                style={{
                                    background: urlInput.trim() ? 'linear-gradient(135deg, #944a18 0%, #773401 100%)' : '#e2d5cc',
                                    color: 'white', border: 'none', borderRadius: '10px',
                                    padding: '10px 18px', fontWeight: 700, fontSize: '0.82rem',
                                    cursor: urlInput.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {urlAnalyzing ? '⏳ Leyendo...' : '📖 Leer Página'}
                            </button>
                        </div>

                        {/* URL Analyze Error */}
                        {urlAnalyzeError && (
                            <div style={{ margin: '0 18px 14px', padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600 }}>
                                ⚠️ {urlAnalyzeError}
                            </div>
                        )}

                        {/* URL Result Card */}
                        {urlResult && (
                            <div style={{ margin: '0 18px 18px', borderRadius: '12px', border: '1px solid rgba(148,74,24,0.12)', background: '#FFF', overflow: 'hidden' }}>
                                {urlResult.image && (
                                    <img
                                        src={urlResult.image}
                                        alt={urlResult.title}
                                        style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                )}
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <img
                                            src={`https://www.google.com/s2/favicons?sz=16&domain=${urlResult.domain}`}
                                            alt=""
                                            style={{ width: '16px', height: '16px', borderRadius: '3px' }}
                                            onError={e => (e.currentTarget.style.display = 'none')}
                                        />
                                        <span style={{ fontSize: '0.72rem', color: '#877369', fontWeight: 700, background: 'rgba(148,74,24,0.08)', padding: '2px 8px', borderRadius: '20px' }}>
                                            {urlResult.siteName || urlResult.domain}
                                        </span>
                                    </div>
                                    {urlResult.title && (
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2D1B11', marginBottom: '6px', lineHeight: 1.3 }}>
                                            {urlResult.title}
                                        </div>
                                    )}
                                    {urlResult.description && (
                                        <div style={{ fontSize: '0.83rem', color: '#54433a', lineHeight: 1.5, marginBottom: '10px' }}>
                                            {urlResult.description}
                                        </div>
                                    )}
                                    {urlResult.bodyText && (
                                        <details style={{ marginBottom: '10px' }}>
                                            <summary style={{ fontSize: '0.76rem', fontWeight: 700, color: '#944a18', cursor: 'pointer', marginBottom: '6px' }}>
                                                Ver texto de la página ({urlResult.bodyText.length} chars)
                                            </summary>
                                            <div style={{ fontSize: '0.78rem', color: '#877369', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', padding: '8px', background: '#FAF9F8', borderRadius: '8px', border: '1px solid rgba(148,74,24,0.08)' }}>
                                                {urlResult.bodyText}
                                            </div>
                                        </details>
                                    )}
                                    <a
                                        href={urlResult.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#944a18', fontWeight: 700, textDecoration: 'none', padding: '6px 12px', background: 'rgba(148,74,24,0.08)', borderRadius: '8px', transition: 'all 0.2s' }}
                                    >
                                        🔗 Abrir página en pestaña
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Empty state if only blocked msg shown */}
                    {!embeddedUrl && !embedBlockedMsg && scrapedResults.length === 0 && !scrapingLoading && !urlResult && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#877369', fontSize: '0.85rem' }}>
                            Haz clic en un motor en modo “Panel” para ver los resultados aquí, o haz clic en <strong>Cosechar en AlDía</strong> para extraer resultados directamente sin anuncios.
                        </div>
                    )}

                </motion.div>
            )}
            </AnimatePresence>

        </div>
    );
};
