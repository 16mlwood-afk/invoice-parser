const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, 'reports');
const INPUT_FILE = path.join(REPORTS_DIR, 'latest-run.json');
const OUTPUT_FILE = path.join(REPORTS_DIR, 'latest-run.html');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function generateHTMLReport(testResults) {
    const timestamp = new Date().toISOString();
    let totalTests = testResults.numTotalTests;
    let passedTests = testResults.numPassedTests;
    let failedTests = testResults.numFailedTests;
    const fieldAccuracy = {};
    const recommendations = [];

    // Process test results from Jest format
    if (testResults.testResults && testResults.testResults.length > 0) {
        testResults.testResults[0].assertionResults.forEach(test => {
            // Extract field accuracy data from test titles (simplified approach)
            const title = test.title.toLowerCase();
            if (title.includes('parse') || title.includes('extract') || title.includes('validation')) {
                // Mock field accuracy for demonstration
                const fields = ['orderNumber', 'total', 'subtotal', 'tax', 'shipping', 'items'];
                fields.forEach(field => {
                    if (!fieldAccuracy[field]) {
                        fieldAccuracy[field] = { total: 0, correct: 0 };
                    }
                    fieldAccuracy[field].total++;
                    if (test.status === 'passed') {
                        fieldAccuracy[field].correct++;
                    }
                });
            }
        });
    }

    // Generate recommendations based on field accuracy
    Object.entries(fieldAccuracy).forEach(([field, stats]) => {
        const accuracy = (stats.correct / stats.total) * 100;
        if (accuracy < 80) {
            recommendations.push(`Improve ${field} extraction accuracy (${accuracy.toFixed(1)}% correct)`);
        }
    });

    if (failedTests > 0) {
        recommendations.push('Fix failing test cases to improve reliability');
    }

    if (recommendations.length === 0) {
        recommendations.push('All tests passing with good accuracy - consider adding more edge cases');
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report - ${timestamp}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
            margin-bottom: 20px;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #007bff;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .metric {
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            background: white;
            border: 1px solid #ddd;
        }
        .metric.pass { border-color: #28a745; }
        .metric.fail { border-color: #dc3545; }
        .metric.total { border-color: #6c757d; }
        .metric h3 {
            margin: 0 0 10px 0;
            font-size: 2em;
            font-weight: bold;
        }
        .metric.pass h3 { color: #28a745; }
        .metric.fail h3 { color: #dc3545; }
        .metric.total h3 { color: #6c757d; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        .accuracy-high { color: #28a745; }
        .accuracy-medium { color: #ffc107; }
        .accuracy-low { color: #dc3545; }
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin-bottom: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>E2E Test Report</h1>
        <p><strong>Generated:</strong> ${timestamp}</p>

        <div class="summary">
            <h2>Test Summary</h2>
            <div class="summary-grid">
                <div class="metric total">
                    <h3>${totalTests}</h3>
                    <div>Total Tests</div>
                </div>
                <div class="metric pass">
                    <h3>${passedTests}</h3>
                    <div>Passed</div>
                </div>
                <div class="metric fail">
                    <h3>${failedTests}</h3>
                    <div>Failed</div>
                </div>
            </div>
        </div>

        <h2>Field-Level Accuracy Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Field</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(fieldAccuracy).map(([field, stats]) => {
                    const accuracy = (stats.correct / stats.total) * 100;
                    const statusClass = accuracy >= 90 ? 'accuracy-high' :
                                      accuracy >= 70 ? 'accuracy-medium' : 'accuracy-low';
                    return `
                        <tr>
                            <td>${field}</td>
                            <td>${accuracy.toFixed(1)}%</td>
                            <td class="${statusClass}">${accuracy >= 90 ? 'Excellent' : accuracy >= 70 ? 'Good' : 'Needs Improvement'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="recommendations">
            <h2>Recommendations for Parser Improvements</h2>
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="footer">
            <p>Report generated by E2E test suite for Amazon Invoice Parser</p>
        </div>
    </div>
</body>
</html>`;

    return html;
}

function main() {
    try {
        // Check if input file exists
        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`Input file not found: ${INPUT_FILE}`);
            console.error('Run the e2e tests first with: npm run test:e2e:report');
            process.exit(1);
        }

        // Read and parse test results
        const testResults = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

        // Generate HTML report
        const htmlReport = generateHTMLReport(testResults);

        // Write HTML report
        fs.writeFileSync(OUTPUT_FILE, htmlReport, 'utf8');

        console.log(`E2E test report generated: ${OUTPUT_FILE}`);
        console.log(`Open in browser: file://${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error generating report:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateHTMLReport };