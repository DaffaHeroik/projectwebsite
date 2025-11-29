// zenitsu-payment.js
const axios = require('axios');
// Hapus: const fs = require('fs'); // Dihapus karena Vercel Read-Only FS
// Hapus: const path = require('path'); // Dihapus

// Mengambil kredensial dari Environment Variables Vercel
// PASTIKAN Anda setting ZENITSU_USERNAME & ZENITSU_TOKEN di Vercel Dashboard!
const ZENITSU_CONFIG = {
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
 * Output: { success: boolean, data: { qrCodeUrl: string } }
 */
async function generateQRCode(amount, idTransaksi) {
  try {
    // Memastikan kredensial sudah diambil dari Environment Variables
    if (!ZENITSU_CONFIG.username || !ZENITSU_CONFIG.token) {
        return { 
            success: false, 
            message: "Kredensial API Zenitsu (ZENITSU_USERNAME atau ZENITSU_TOKEN) tidak ditemukan di Environment Variables Vercel." 
        };
    }
    
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
      // Langsung mengembalikan URL QR, tidak perlu menyimpan file lokal
      return {
        success: true,
        data: {
          qrCodeUrl: r.qr, // Mengambil langsung URL QR Code
          amount: amount,
          idTransaksi: idTransaksi,
          expired: r.expired,
        }
      };
    } else {
      console.error("Zenitsu API Error:", response.data);
      return { 
          success: false, 
          message: response.data?.message || "Gagal membuat QR Code dari Zenitsu API." 
      };
    }

  } catch (error) {
    console.error('Error in generateQRCode:', error.message);
    return { success: false, message: `Error koneksi ke Zenitsu: ${error.message}` };
  }
}

/**
 * Cek Status Pembayaran
 */
async function checkPaymentStatus(expectedAmount) {
  try {
    const response = await axios.post(
      'https://api.zenitsu.web.id/api/orkut/checkpay',
      {
        username: ZENITSU_CONFIG.username,
        token: ZENITSU_CONFIG.token,
        count: 5 // Cek 5 transaksi terakhir
      },
      { timeout: 10000 }
    );

    if (response.data.statusCode !== 200 || !response.data.results) {
        console.error("Zenitsu Checkpay Error:", response.data);
        return { status: 'error', message: "Gagal cek status pembayaran dari Zenitsu." };
    }

    const payments = response.data.results.histories;
    const payment = payments.find(t => {
      try {
        // Cek apakah transaksi terbaru, incoming, dan jumlahnya cocok
        const isRecent = (new Date() - new Date(t.date)) < (5 * 60 * 1000); // 5 menit terakhir
        const isIncoming = t.type === 'IN';
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
 * Format number: 1000 → 1.000
 */
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi terkait file cleanupQRFile dan downloadQRImage dihapus karena tidak kompatibel dengan Vercel

/**
 * Generate Unique Amount
 */
function generateUniqueAmount(amount) {
  const uniq = Math.floor(Math.random() * 11); // 0–10
  const finalAmount = amount + uniq;
  return { uniqAmount: uniq, finalAmount: finalAmount };
}

module.exports = {
  generateRandomString,
  generateQRCode,
  checkPaymentStatus,
  generateUniqueAmount,
  formatNumber,
};
