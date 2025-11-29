// zenitsu-payment.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ZENITSU_CONFIG = {
  // Ambil dari Vercel Environment Variables
  username: process.env.ZENITSU_USERNAME, 
  token: process.env.ZENITSU_TOKEN 
};
/**
 * Generate random transaction ID
 */
function generateRandomString(prefix = 'DEPO-') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 10;
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate QR Code
 */
async function generateQRCode(amount, idTransaksi) {
  try {
    const response = await axios.post(
      'https://api.zenitsu.web.id/api/orkut/createqr',
      {
        username: ZENITSU_CONFIG.username,
        token: ZENITSU_CONFIG.token,
        idtrx: idTransaksi,
        amount: amount.toString()
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    if (response.data?.statusCode === 200 && response.data.results) {
      const r = response.data.results;
      return {
        success: true,
        data: {
          idTransaksi: r.idtrx,
          amount: r.amount,
          expired: new Date(r.expired),
          qrUrl: r.url
        }
      };
    } else {
      return { success: false, error: 'Failed to generate QR' };
        
    }
  } catch (error) {
    console.error('Error generate QR:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check payment from mutasi
 */
async function checkPaymentStatus(expectedAmount, idTransaksi) {
  try {
    const response = await axios.post(
      'https://api.zenitsu.web.id/api/orkut/mutasi',
      {
        username: ZENITSU_CONFIG.username,
        token: ZENITSU_CONFIG.token
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    if (response.data?.statusCode !== 200 || !response.data.results) {
      return { status: 'error', message: 'Failed to fetch mutasi' };
    }

    const mutasi = response.data.results;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const payment = mutasi.find(t => {
      try {
        const [datePart, timePart] = t.tanggal.split(' ');
        const [day, month, year] = datePart.split('/');
        const transactionDate = new Date(`${year}-${month}-${day}T${timePart}:00`);

        const isRecent = transactionDate >= fiveMinutesAgo;
        const isIncoming = t.status === 'IN';
        const amountClean = parseInt(t.kredit.replace(/\./g, ''));
        const amountMatch = amountClean === expectedAmount;

        return isRecent && isIncoming && amountMatch;
      } catch {
        return false;
      }
    });

    return payment ? { status: 'paid', data: payment } : { status: 'pending' };

  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Download QR Image
 */
async function downloadQRImage(qrUrl, filename) {
  try {
    const response = await axios.get(qrUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, response.data);
    return filePath;
  } catch (err) {
    console.error('Error download QR:', err.message);
    return null;
  }
}

/**
 * Format number: 1000 → 1.000
 */
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Cleanup QR file
 */
function cleanupQRFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('QR file deleted:', filePath);
  }
}

function generateUniqueAmount(amount) {
  const uniq = Math.floor(Math.random() * 11); // 0–10
  return { finalAmount: amount + uniq, uniq };
}


// Export semua fungsi
module.exports = {
  generateRandomString,
  generateQRCode,
  checkPaymentStatus,
  downloadQRImage,
  formatNumber,
  cleanupQRFile,
    generateUniqueAmount,
  ZENITSU_CONFIG
};