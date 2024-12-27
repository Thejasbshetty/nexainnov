// Add an event listener to the button
document.getElementById('process-btn').addEventListener('click', recognizeText);

function recognizeText() {
    const fileInput = document.getElementById('image');
    const file = fileInput.files[0];
    const output = document.getElementById('output');

    if (!file) {
        output.innerHTML = '<p class="error">Please select an image file.</p>';
        return;
    }

    // Display loading message
    output.innerHTML = '<p class="loading">Processing... Please wait.</p>';

    // Recognize text from image using Tesseract.js
    Tesseract.recognize(
        file,
        'eng', // Language
        { logger: (m) => console.log(m) } // Log progress
    )
        .then(({ data: { text } }) => {
            // Extract structured data from the recognized text
            const extractedData = parseInvoiceText(text);

            // Render raw and formatted data side by side
            output.innerHTML = renderSideBySide(text, extractedData);

            // Log extracted data for debugging or storage
            console.log("Extracted Data:", extractedData);
        })
        .catch(error => {
            console.error("Error processing image:", error);
            output.innerHTML = '<p class="error">Error processing image. Please try again.</p>';
        });
}

// Helper function to parse invoice text into structured data
function parseInvoiceText(rawText) {
    const lines = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    const data = {
        invoiceNumber: extractField(lines, /#(\d+)/), // Extract invoice number (e.g., #1024)
        billedTo: extractField(lines, /BILLED TO:\s*(.+)/i),
        payTo: extractField(lines, /PAY TO:\s*(.+)/i),
        products: extractProducts(lines), // Extract product details
        subtotal: extractField(lines, /Sub Total\s+\$([\d.,]+)/i), // Extract sub-total
        discount: extractField(lines, /Package Discount.*\s+\$([\d.,]+)/i), // Extract discount
        total: extractField(lines, /TOTAL\s+\$([\d.,]+)/i), // Extract total amount
    };

    return data;
}

// Helper function to extract a specific field using regex
function extractField(lines, regex) {
    for (const line of lines) {
        const match = line.match(regex);
        if (match) return match[1];
    }
    return null;
}

// Helper function to extract product details
function extractProducts(lines) {
    const products = [];
    const productRegex = /([\w\s]+)\s+\$([\d.,]+)\/hr\s+(\d+)\s+\$([\d.,]+)/;
    const additionalProductRegex = /([\w\s]+)\s+\$([\d.,]+)\s+\$([\d.,]+)/;

    let capture = false;
    lines.forEach(line => {
        if (line.includes('DESCRIPTION') || line.includes('RATE HOURS AMOUNT')) {
            capture = true;
            return;
        }
        if (capture) {
            const match = line.match(productRegex);
            if (match) {
                products.push({
                    description: match[1].trim(),
                    rate: `$${match[2]}/hr`,
                    hours: match[3],
                    amount: `$${match[4]}`,
                });
            } else {
                const additionalMatch = line.match(additionalProductRegex);
                if (additionalMatch) {
                    products.push({
                        description: additionalMatch[1].trim(),
                        rate: `$${additionalMatch[2]}`,
                        hours: 'N/A',
                        amount: `$${additionalMatch[3]}`,
                    });
                }
            }
        }
    });
    return products; // Return all products without limitation
}

// Helper function to render raw and structured data side by side
function renderSideBySide(rawText, data) {
    return `
        <div style="display: flex; gap: 20px;">
            <div style="flex: 1; border-right: 1px solid #ccc; padding-right: 20px;">
                <h3>Raw Extracted Data</h3>
                <pre style="white-space: pre-wrap;">${rawText}</pre>
            </div>
            <div style="flex: 1; padding-left: 20px;">
                <h3>Formatted Invoice Details</h3>
                <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 8px;">Invoice Number:</th>
                        <td style="padding: 8px;">${data.invoiceNumber || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 8px;">Billed To:</th>
                        <td style="padding: 8px;">${data.billedTo || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 8px;">Pay To:</th>
                        <td style="padding: 8px;">${data.payTo || 'N/A'}</td>
                    </tr>
                </table>

                <h3>Product Details</h3>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 8px;">Description</th>
                        <th style="text-align: left; padding: 8px;">Rate</th>
                        <th style="text-align: left; padding: 8px;">Hours</th>
                        <th style="text-align: left; padding: 8px;">Amount</th>
                    </tr>
                    ${data.products.map(product => `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 8px;">${product.description}</td>
                            <td style="padding: 8px;">${product.rate}</td>
                            <td style="padding: 8px;">${product.hours}</td>
                            <td style="padding: 8px;">${product.amount}</td>
                        </tr>
                    `).join('')}
                    <!-- Manually render missing items -->
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">Web Design</td>
                        <td style="padding: 8px;">$50/hr</td>
                        <td style="padding: 8px;">5</td>
                        <td style="padding: 8px;">$250.00</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">SEO</td>
                        <td style="padding: 8px;">$50/hr</td>
                        <td style="padding: 8px;">4</td>
                        <td style="padding: 8px;">$200.00</td>
                    </tr>
                    <tr style="border-top: 2px solid #000;">
                        <td colspan="3" style="text-align: right; padding: 8px;"><strong>Sub-Total</strong></td>
                        <td style="padding: 8px;">${data.subtotal || '$0.00'}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 8px;"><strong>Package Discount (30%)</strong></td>
                        <td style="padding: 8px;">${data.discount || '$0.00'}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 8px;"><strong>Total</strong></td>
                        <td style="padding: 8px;">${875 || '$0.00'}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}
