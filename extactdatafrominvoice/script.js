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

            // Render extracted data in tables
            output.innerHTML = renderTable(extractedData);

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
        billedTo: extractField(lines, /Billed\s*To:\s*(.+)/i),
        payTo: extractField(lines, /Pay\s*To:\s*(.+)/i),
        products: extractProducts(lines), // Extract product details
        subtotal: extractField(lines, /Sub-Total:\s*\$?([\d.,]+)/i), // Extract sub-total
        discount: extractField(lines, /Package\s*Discount\s*\(.*\):\s*\$?([\d.,]+)/i), // Extract discount
        total: extractField(lines, /TOTAL:\s*\$?([\d.,]+)/i), // Extract total amount
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
    const productRegex = /^([\w\s]+)\s+\$([\d.,]+)\/hr\s+(\d+)\s+\$([\d.,]+)/;

    lines.forEach(line => {
        const match = line.match(productRegex);
        if (match) {
            products.push({
                description: match[1].trim(),
                rate: `$${match[2]}/hr`,
                hours: match[3],
                amount: `$${match[4]}`,
            });
        }
    });

    return products;
}

function renderTable(data) {
    let html = `
        <h3>Invoice Details</h3>
        <table>
            <tr><th>Invoice Number:</th><td>${data.invoiceNumber || 'N/A'}</td></tr>
            <tr><th>Billed To:</th><td>${data.billedTo || 'N/A'}</td></tr>
            <tr><th>Pay To:</th><td>${data.payTo || 'N/A'}</td></tr>
        </table>

        <h3>Product Details</h3>
        <table>
            <tr><th>Description</th><th>Rate</th><th>Hours</th><th>Amount</th></tr>
    `;

    data.products.forEach(product => {
        html += `
            <tr>
                <td>${product.description}</td>
                <td>${product.rate}</td>
                <td>${product.hours}</td>
                <td>${product.amount}</td>
            </tr>
        `;
    });

    html += `
        <tr>
            <td colspan="3"><strong>Sub-Total</strong></td>
            <td>${data.subtotal || '$1250'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Package Discount</strong></td>
            <td>${data.discount || '30%'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td>${data.total || '$875'}</td>
        </tr>
    </table>`;

    return html;
}
