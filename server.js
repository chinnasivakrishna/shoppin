const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const urlParser = require('url');

// Common patterns for product URLs
const PRODUCT_URL_PATTERNS = [
    '/product/',
    '/item/',
    '/p/',
    '/products/',
    '/pd/',
    '-p-',
    '/dp/',
    '/catalog/',
    '/shop/',
    '/detail/',
    '/goods/',
    '/listing/',
    '/itm/',
    '/ip/',
    '/pl/',
    '/gp/',
    '/buy/'
];

class EcommerceCrawler {
    constructor(domains) {
        this.domains = domains.map(domain => domain.replace(/^(https?:\/\/)?(www\.)?/, ''));
        this.results = new Map();
        this.visitedUrls = new Set();
        this.failedUrls = new Map();
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async crawl() {
        const browser = await puppeteer.launch({ 
            headless: "new",
            args: [
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ],
            // Add these new configurations for deployment
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            ignoreDefaultArgs: ['--disable-extensions'],
            pipe: true
        });
        
        
        try {
            // Process domains sequentially instead of parallel to avoid detection
            for (const domain of this.domains) {
                await this.crawlDomain(browser, domain);
                // Add delay between domains
                await this.delay(5000);
            }
            
            await this.saveResults();
            await this.saveFailedUrls();
            
        } finally {
            await browser.close();
        }
    }

    async crawlDomain(browser, domain) {
        console.log(`Starting crawl for domain: ${domain}`);
        const page = await browser.newPage();
        
        try {
            // Set a more realistic viewport
            await page.setViewport({
                width: 1920,
                height: 1080
            });

            // Set more realistic headers
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            });

            // Enable JavaScript and cookies
            await page.setJavaScriptEnabled(true);
            
            // Only block images and fonts
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (['image', 'font'].includes(request.resourceType())) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            // Add error handling
            page.on('error', err => {
                console.error(`Page error for ${domain}:`, err);
            });

            // Modify console logging to reduce noise
            page.on('console', msg => {
                if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) {
                    console.log(`Console ${msg.type()} from ${domain}:`, msg.text());
                }
            });

            const baseUrl = `https://www.${domain}`;
            this.results.set(domain, new Set());
            this.failedUrls.set(domain, new Set());

            // Add random delay before first request
            await this.delay(2000 + Math.random() * 3000);
            
            await this.processUrl(page, baseUrl, domain);

        } catch (error) {
            console.error(`Error crawling ${domain}:`, error);
        } finally {
            await page.close();
        }
    }

    async processUrl(page, url, domain) {
        if (this.visitedUrls.has(url)) return;
        this.visitedUrls.add(url);

        try {
            console.log(`Crawling URL: ${url}`);
            
            // Add random delay between requests
            await this.delay(3000 + Math.random() * 5000);

            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Try to bypass initial popups/overlays
            await this.handleCookieConsent(page);
            await this.handlePopups(page);
            
            // Scroll slowly to simulate human behavior
            await this.handleInfiniteScroll(page);

            const html = await page.content();
            const $ = cheerio.load(html);

            const links = $('a')
                .map((_, el) => $(el).attr('href'))
                .get()
                .filter(href => href && href.startsWith('http'));

            // Process only a limited number of links per page
            const maxLinksPerPage = 5;
            const selectedLinks = links.slice(0, maxLinksPerPage);

            for (const link of selectedLinks) {
                if (this.isProductUrl(link) && this.isSameDomain(link, domain)) {
                    if (await this.isValidProductPage(page, link)) {
                        this.results.get(domain).add(link);
                    } else {
                        this.failedUrls.get(domain).add(link);
                    }
                }
            }

        } catch (error) {
            console.error(`Error processing ${url}:`, error);
            this.failedUrls.get(domain).add(url);
        }
    }

    async handleInfiniteScroll(page) {
        try {
            let lastHeight = await page.evaluate('document.body.scrollHeight');
            let scrollAttempts = 0;
            const maxScrolls = 3;

            while (scrollAttempts < maxScrolls) {
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await this.delay(2000);
                
                let newHeight = await page.evaluate('document.body.scrollHeight');
                if (newHeight === lastHeight) break;
                
                lastHeight = newHeight;
                scrollAttempts++;
            }
        } catch (error) {
            console.error('Error during infinite scroll handling:', error);
        }
    }

    async handleCookieConsent(page) {
        const commonSelectors = [
            '#cookie-accept',
            '.cookie-consent-accept',
            '[data-testid="cookie-consent-accept"]',
            'button[contains(text(), "Accept")]',
            '.accept-cookies',
            '#accept-cookies',
            '.cookie-accept-button'
        ];

        for (const selector of commonSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                await page.click(selector);
                await this.delay(1000);
                break;
            } catch (e) {
                continue;
            }
        }
    }

    async isValidProductPage(page, url) {
        try {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const indicators = await page.evaluate(() => {
                const selectors = {
                    price: '[data-price], .price, .product-price, span[class*="price"], div[id*="price"]',
                    addToCart: '[data-add-to-cart], .add-to-cart, #add-to-cart, button[title*="Buy Now"], button[contains="Add to Cart"]',
                    productTitle: '[data-product-title], .product-title, .product-name, span#productTitle, h1[class*="product-title"]',
                    productImage: 'img[id*="product-image"]',
                    buyButton: 'button:contains("Buy Now"), button:contains("Add to Basket"), button:contains("NOTIFY ME")',
                    metadata: 'meta[name="description"], meta[name="keywords"]'
                };

                return Object.entries(selectors).reduce((acc, [key, selector]) => {
                    acc[key] = !!document.querySelector(selector);
                    return acc;
                }, {});
            });

            return (
                indicators.price && 
                (indicators.addToCart || indicators.buyButton) && 
                (indicators.productTitle || indicators.productImage || indicators.metadata)
            );
        } catch (error) {
            console.error(`Error verifying product page ${url}:`, error);
            return false;
        }
    }

    isProductUrl(url) {
        return PRODUCT_URL_PATTERNS.some(pattern => url.includes(pattern));
    }

    isSameDomain(url, domain) {
        try {
            const parsedUrl = urlParser.parse(url);
            const hostname = parsedUrl.hostname.replace(/^www\./, '');
            return hostname === domain || hostname.endsWith(`.${domain}`);
        } catch {
            return false;
        }
    }

    async saveResults() {
        try {
            const output = [];
            
            for (const [domain, urls] of this.results) {
                output.push({
                    domain,
                    productUrls: Array.from(urls)
                });
            }

            await fs.writeFile(
                path.join(__dirname, 'result.json'),
                JSON.stringify(output, null, 2)
            );
            console.log('Successfully saved results to result.json');
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }

    async saveFailedUrls() {
        try {
            const output = [];
            
            for (const [domain, urls] of this.failedUrls) {
                output.push({
                    domain,
                    failedUrls: Array.from(urls)
                });
            }

            // Only create failed.json if there are failed URLs
            if (output.some(item => item.failedUrls.length > 0)) {
                await fs.writeFile(
                    path.join(__dirname, 'failed.json'),
                    JSON.stringify(output, null, 2)
                );
                console.log('Failed URLs saved to failed.json');
            }
        } catch (error) {
            console.error('Error saving failed URLs:', error);
        }
    }

    async handlePopups(page) {
        const popupSelectors = [
            '[class*="popup"] button[class*="close"]',
            '[class*="modal"] button[class*="close"]',
            'button[aria-label="Close"]',
            '.modal-close',
            '.popup-close',
            '[data-dismiss="modal"]'
        ];

        for (const selector of popupSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                await page.click(selector);
                await this.delay(1000);
            } catch (e) {
                continue;
            }
        }
    }
}

// Example usage with real e-commerce sites
const domains = [
    'amazon.com',  // Try with different sites that might be less restrictive
    'target.com',
    'walmart.com'
];

const PORT = process.env.PORT || 3000;
const server = require('http').createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Crawler Service Running');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Start the crawler
    const crawler = new EcommerceCrawler(domains);
    crawler.crawl().catch(console.error);
});