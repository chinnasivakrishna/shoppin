// Import required modules
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Helper function to fetch HTML content from a URL
async function fetchHTML(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EcomCrawler/1.0)'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        return null;
    }
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

// Example usage
(async () => {
    const domains = ["https://www.flipkart.com/", "https://www.amazon.in/"];
    const results = await crawlDomains(domains);
    console.log(JSON.stringify(results, null, 2));
})();
