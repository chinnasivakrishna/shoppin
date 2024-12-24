
# E-commerce Product URL Crawler

A robust, scalable web crawler designed to discover product URLs across multiple e-commerce websites. Built with Node.js and Puppeteer, this crawler efficiently handles modern web applications including those with infinite scrolling and dynamic content loading.

## 🚀 Features

- **Parallel Processing**: Efficiently crawls multiple domains simultaneously
- **Smart URL Detection**: Identifies product URLs using common e-commerce patterns
- **Robust Handling**:
  - Manages infinite scrolling pages
  - Handles cookie consent popups
  - Processes dynamically loaded content
  - Respects rate limiting
- **Performance Optimized**:
  - Blocks unnecessary resources (images, fonts)
  - Maintains unique URL sets
  - Implements intelligent delays
- **Error Resilient**:
  - Comprehensive error handling
  - Request timeout management
  - Domain validation
  - Console error logging

## 🛠️ Technical Implementation

### Core Components

1. **EcommerceCrawler Class**
   - Main crawler implementation
   - Manages crawling lifecycle
   - Handles domain processing
   - Implements URL discovery

2. **URL Processing**
   ```javascript
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
   ```

3. **Performance Features**
   - Request interception for resource optimization
   - Parallel processing using Promise.all
   - Efficient URL storage using Sets
   - Customizable delay mechanisms

### Key Methods

- `crawl()`: Main entry point for crawling process
- `crawlDomain()`: Handles individual domain processing
- `processUrl()`: Processes individual URLs
- `handleInfiniteScroll()`: Manages infinite scrolling pages
- `handleCookieConsent()`: Handles cookie popups
- `isValidProductPage()`: Validates product pages
- `saveResults()`: Saves discovered URLs to JSON

## 📋 Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ecommerce-crawler.git
```

2. Install dependencies:
```bash
cd ecommerce-crawler
npm install
```

3. Configure domains in `server.js`:
```javascript
const domains = [
    'example1.com',
    'example2.com',
    'example3.com'
];
```

## 💻 Usage

Run the crawler:
```bash
node server.js
```

The crawler will generate a `crawler_results.json` file containing all discovered product URLs organized by domain.

## 📤 Output Format

```json
{
  "example1.com": [
    "https://www.example1.com/product/123",
    "https://www.example1.com/product/456"
  ],
  "example2.com": [
    "https://www.example2.com/items/789",
    "https://www.example2.com/items/012"
  ]
}
```

## ⚙️ Configuration

The crawler includes several configurable parameters:
- Request delays
- Scroll attempts
- Timeout values
- URL patterns
- HTTP headers

## 🔍 Best Practices

1. **Rate Limiting**
   - Implement appropriate delays between requests
   - Use random intervals to avoid detection

2. **Resource Management**
   - Block unnecessary resources
   - Clean up browser instances
   - Handle memory efficiently

3. **Error Handling**
   - Implement retry mechanisms
   - Log errors appropriately
   - Validate URLs and domains

## ⚠️ Important Notes

- Respect robots.txt files
- Consider website terms of service
- Implement appropriate rate limiting
- Use responsibly and ethically


## 🙏 Acknowledgments

- Built with [Puppeteer](https://pptr.dev/)
- Inspired by modern e-commerce platforms
```

This README provides:
1. Clear project overview
2. Detailed technical implementation
3. Installation and usage instructions
4. Configuration options
5. Best practices
6. Important considerations
7. Contribution guidelines

Feel free to modify this README to better match your specific implementation or add additional sections as needed!
