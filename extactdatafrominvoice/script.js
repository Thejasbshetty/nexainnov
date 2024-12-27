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
        'eng',
        { logger: (m) => console.log(m) }
    )
        .then(({ data: { text } }) => {
            const extractedData = parseInvoiceText(text);
            renderTable(extractedData);
        })
        .catch(error => {
            console.error("Error processing image:", error);
            output.innerHTML = '<p class="error">Error processing image. Please try again.</p>';
        });
}

function parseInvoiceText(rawText) {
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);

    const data = {
        billedTo: extractField(lines, /Billed\s*To:\s*(.+)/i),
        payTo: extractField(lines, /Pay\s*To:\s*(.+)/i),
        bank: extractField(lines, /Bank:\s*(.+)/i),
        accountName: extractField(lines, /Account\s*Name:\s*(.+)/i),
        accountNumber: extractField(lines, /Account\s*Number:\s*(.+)/i),
        bsb: extractField(lines, /BSB:\s*(.+)/i),
        products: extractProductDetails(lines)
    };

    return data;
}

function extractField(lines, regex) {
    for (const line of lines) {
        const match = line.match(regex);
        if (match) return match[1];
    }
    return null;
}

function extractProductDetails(lines) {
    const products = [];
    const productRegex = /^(.+)\s+\$([\d.,]+)\/hr\s+(\d+)\s+\$([\d.,]+)/;

    lines.forEach(line => {
        const match = line.match(productRegex);
        if (match) {
            products.push({
                description: match[1].trim(),
                rate: match[2],
                hours: match[3],
                amount: match[4]
            });
        }
    });

    return products;
}

function renderTable(data) {
    const output = document.getElementById('output');

    const table = `
        <h2>Extracted Invoice Details</h2>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Billed To</th><td>${data.billedTo || 'N/A'}</td></tr>
            <tr><th>Pay To</th><td>${data.payTo || 'N/A'}</td></tr>
            <tr><th>Bank</th><td>${data.bank || 'N/A'}</td></tr>
            <tr><th>Account Name</th><td>${data.accountName || 'N/A'}</td></tr>
            <tr><th>BSB</th><td>${data.bsb || 'N/A'}</td></tr>
            <tr><th>Account Number</th><td>${data.accountNumber || 'N/A'}</td></tr>
        </table>

        <h3>Product Details</h3>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>Description</th>
                <th>Rate</th>
                <th>Hours</th>
                <th>Amount</th>
            </tr>
            ${data.products.map(product => `
                <tr>
                    <td>${product.description}</td>
                    <td>$${product.rate}/hr</td>
                    <td>${product.hours}</td>
                    <td>$${product.amount}</td>
                </tr>
            `).join('')}
        </table>
    `;

    output.innerHTML = table;
}
