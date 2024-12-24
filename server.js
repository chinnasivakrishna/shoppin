const puppeteer = require('puppeteer');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
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
    '/listing/'
];

class EcommerceCrawler {
    constructor(domains) {
        this.domains = domains.map(domain => domain.replace(/^(https?:\/\/)?(www\.)?/, ''));
        this.results = new Map();
        this.visitedUrls = new Set();
    }

    // Add utility method for delays
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async crawl() {
        const browser = await puppeteer.launch({ headless: "new" });
        
        try {
            // Process domains in parallel using worker threads
            const promises = this.domains.map(domain => 
                this.crawlDomain(browser, domain)
            );
            
            await Promise.all(promises);
            await this.saveResults();
            
        } finally {
            await browser.close();
        }
    }

    async crawlDomain(browser, domain) {
        console.log(`Starting crawl for domain: ${domain}`);
        const page = await browser.newPage();
        
        try {
            // Set reasonable timeout and configure page
            await page.setDefaultTimeout(30000);
            await page.setRequestInterception(true);
            
            // Optimize performance by blocking unnecessary resources
            page.on('request', request => {
                if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            // Add error event listener
            page.on('error', err => {
                console.error(`Page error for ${domain}:`, err);
            });

            // Add console event listener
            page.on('console', msg => {
                if (msg.type() === 'error' || msg.type() === 'warning') {
                    console.log(`Console ${msg.type()} from ${domain}:`, msg.text());
                }
            });

            const baseUrl = `https://www.${domain}`;
            this.results.set(domain, new Set());
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
            // Add custom headers to avoid being blocked
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            await this.delay(1000 + Math.random() * 2000);

            console.log(`Crawling URL: ${url}`);
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 60000 
            });

            // Try to handle cookie consent if present
            await this.handleCookieConsent(page);
            
            // Handle infinite scroll
            await this.handleInfiniteScroll(page);

            // Extract all links from the page
            const links = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && href.startsWith('http'));
            });

            // Process discovered links
            for (const link of links) {
                if (this.isProductUrl(link) && this.isSameDomain(link, domain)) {
                    this.results.get(domain).add(link);
                } else if (this.isSameDomain(link, domain) && !this.visitedUrls.has(link)) {
                    await this.processUrl(page, link, domain);
                }
            }

        } catch (error) {
            console.error(`Error processing ${url}:`, error);
        }
    }

    async handleInfiniteScroll(page) {
        try {
            let lastHeight = await page.evaluate('document.body.scrollHeight');
            let scrollAttempts = 0;
            const maxScrolls = 3; // Limit scrolling to prevent infinite loops

            while (scrollAttempts < maxScrolls) {
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                // Replace waitForTimeout with delay
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
        const output = {};
        for (const [domain, urls] of this.results) {
            output[domain] = Array.from(urls);
        }

        await fs.writeFile(
            path.join(__dirname, 'crawler_results.json'),
            JSON.stringify(output, null, 2)
        );
    }

    // Add method to detect and handle cookie consent popups
    async handleCookieConsent(page) {
        const commonSelectors = [
            '#cookie-accept',
            '.cookie-consent-accept',
            '[data-testid="cookie-consent-accept"]',
            'button[contains(text(), "Accept")]',
            '.accept-cookies'
        ];

        for (const selector of commonSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                await page.click(selector);
                // Replace waitForTimeout with delay
                await this.delay(1000);
                break;
            } catch (e) {
                continue;
            }
        }
    }

    // Add method to validate product pages more accurately
    async isValidProductPage(page) {
        const indicators = await page.evaluate(() => {
            const hasPrice = !!document.querySelector('[data-price], .price, .product-price');
            const hasAddToCart = !!document.querySelector('[data-add-to-cart], .add-to-cart, #add-to-cart');
            const hasProductTitle = !!document.querySelector('[data-product-title], .product-title, .product-name');
            return { hasPrice, hasAddToCart, hasProductTitle };
        });

        return indicators.hasPrice && (indicators.hasAddToCart || indicators.hasProductTitle);
    }
}

// Example usage with real e-commerce sites
const domains = [
    'flipkart.com',
    'myntra.com',
    'etsy.com'
];

const crawler = new EcommerceCrawler(domains);
crawler.crawl().catch(console.error);
