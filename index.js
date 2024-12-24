const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { URL } = require('url');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Helper function to fetch HTML content from a URL using Puppeteer
async function fetchHTML(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const browser = await puppeteer.launch({
                headless: 'new', // Use 'new' for Puppeteer v20+, or set false if debugging
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 60000, // Adjust browser launch timeout
            });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Increased timeout
            const html = await page.content();
            await browser.close();
            return html;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
        }
    }
    console.error(`Failed to fetch ${url} after ${retries} retries`);
    return null;
}

// Function to extract product URLs from a page
function extractProductURLs(html, baseDomain) {
    const $ = cheerio.load(html);
    const links = new Set();
    
    $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && isValidProductURL(href, baseDomain)) {
            const absoluteURL = new URL(href, baseDomain).toString();
            links.add(absoluteURL);
        }
    });

    return Array.from(links);
}

// Validate if a URL is likely a product page
function isValidProductURL(href, baseDomain) {
    const productPatterns = [/\/product\//i, /\/item\//i, /\/p\//i];
    return productPatterns.some((pattern) => pattern.test(href)) && href.includes(baseDomain);
}

// Main crawler function
async function crawlDomain(domain, maxDepth = 3) {
    const visited = new Set();
    const queue = [{ url: domain, depth: 0 }];
    const productURLs = new Set();

    while (queue.length > 0) {
        const { url, depth } = queue.shift();

        if (visited.has(url) || depth > maxDepth) continue;

        visited.add(url);
        const html = await fetchHTML(url);
        if (!html) continue;

        const foundProductURLs = extractProductURLs(html, domain);
        foundProductURLs.forEach((productURL) => productURLs.add(productURL));

        const $ = cheerio.load(html);
        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            const absoluteURL = new URL(href, domain).toString();
            if (!visited.has(absoluteURL) && absoluteURL.includes(domain)) {
                queue.push({ url: absoluteURL, depth: depth + 1 });
            }
        });

        // Introduce delay to avoid being flagged as a bot
        await sleep(2000); // 2 seconds
    }

    return Array.from(productURLs);
}

// Worker thread function
if (!isMainThread) {
    (async () => {
        const { domain } = workerData;
        const results = await crawlDomain(domain);
        parentPort.postMessage({ domain, results });
    })();
}

// Main function to handle multiple domains
async function crawlDomains(domains) {
    return new Promise((resolve) => {
        const results = [];
        let completed = 0;

        domains.forEach((domain) => {
            const worker = new Worker(__filename, { workerData: { domain } });
            worker.on('message', (message) => {
                results.push(message);
                completed++;
                if (completed === domains.length) resolve(results);
            });
            worker.on('error', (err) => {
                console.error(`Worker error for domain ${domain}:`, err);
                completed++;
                if (completed === domains.length) resolve(results);
            });
        });
    });
}

// Helper function to introduce delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Example usage
(async () => {
    const domains = ["https://www.flipkart.com", "https://www.myntra.com"];
    const results = await crawlDomains(domains);
    console.log(JSON.stringify(results, null, 2));
})();
