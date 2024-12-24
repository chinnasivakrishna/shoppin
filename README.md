


# E-commerce Product URL Crawler

A sophisticated web crawler designed to discover and extract product URLs from multiple e-commerce websites. Built with Node.js and Puppeteer, this crawler efficiently handles modern web applications, including those with infinite scrolling, dynamic content loading, and anti-bot measures.

## 🚀 Features

### Core Functionality
- Automated discovery of product URLs across multiple e-commerce domains
- Intelligent product page detection using common patterns
- Handles dynamic content and infinite scrolling
- Bypasses common anti-bot measures
- Manages cookie consent and popup overlays

### Technical Features
- **Parallel Processing**: Sequential domain processing to avoid detection
- **Smart Detection**: Multiple patterns for product URL identification
- **Error Handling**: Comprehensive error management and recovery
- **Resource Optimization**: Selective resource loading
- **Anti-Detection**: Human-like behavior simulation
- **Output Management**: Structured JSON output for successful and failed URLs

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Internet connection
- Sufficient storage for results

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ecommerce-crawler.git
cd ecommerce-crawler
```

2. Install dependencies:
```bash
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

## 📄 Output Files

### result.json
Contains successfully identified product URLs:
```json
[
    {
        "domain": "example.com",
        "productUrls": [
            "https://www.example.com/product/123",
            "https://www.example.com/product/456"
        ]
    }
]
```

### failed.json
Contains URLs that failed validation or encountered errors:
```json
[
    {
        "domain": "example.com",
        "failedUrls": [
            "https://www.example.com/product/failed1",
            "https://www.example.com/product/failed2"
        ]
    }
]
```

## 🔍 Technical Details

### Product URL Detection Patterns
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
    '/listing/',
    '/itm/',
    '/ip/',
    '/pl/',
    '/gp/',
    '/buy/'
];
```

### Anti-Bot Measures
- Random delays between requests
- Human-like scrolling behavior
- Realistic HTTP headers
- Cookie handling
- Popup management
- Resource filtering

### Performance Optimizations
- Selective resource loading
- Memory management
- Concurrent processing limits
- Request throttling
- Error recovery

## ⚙️ Configuration Options

Key configurable parameters:
```javascript
{
    headless: "new",              // Browser mode
    maxLinksPerPage: 5,          // Links to process per page
    scrollAttempts: 3,           // Infinite scroll attempts
    requestDelay: 3000-8000ms,   // Random delay between requests
    timeout: 30000,              // Page load timeout
}
```

## 🔐 Security Features

- HTTPS support
- Request filtering
- Error handling
- Resource limitation
- Domain validation

## 🚨 Error Handling

The crawler handles various error scenarios:
- Network failures
- Timeout issues
- Invalid URLs
- Access denied
- Rate limiting
- Malformed responses

## ⚠️ Important Notes

1. **Rate Limiting**: Implement appropriate delays between requests
2. **Terms of Service**: Respect website ToS and robots.txt
3. **Resource Usage**: Monitor system resources during crawling
4. **Data Privacy**: Handle collected data according to regulations
5. **Anti-Bot Systems**: Be aware of website protection systems

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Puppeteer](https://pptr.dev/)
- Uses [Cheerio](https://cheerio.js.org/) for HTML parsing
- Inspired by modern e-commerce platforms

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## 🔄 Updates

Check the repository regularly for updates and improvements.
```

This README provides:
1. Clear project overview
2. Detailed installation instructions
3. Usage examples
4. Technical documentation
5. Configuration options
6. Security considerations
7. Error handling information
8. Contributing guidelines
9. Support information

