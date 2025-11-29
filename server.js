const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path');

const {
  generateRandomString,
  generateQRCode,
  checkPaymentStatus,
  generateUniqueAmount
} = require("./depo.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- TAMBAHKAN INI UNTUK MELAYANI FILE HTML, CSS, DSB. ---
app.use(express.static(path.join(__dirname, '..', 'WEBSITE TOPUP PROJECT')));
// Atau jika Anda menjalankan node server.js dari dalam folder WEBSITE TOPUP PROJECT:
// app.use(express.static(__dirname));
// === Generate QR ===
app.post("/api/createqr", async (req, res) => {
  const amount = req.body.amount;

  const uniq = generateUniqueAmount(amount);
  const finalAmount = uniq.finalAmount;

  const idTransaksi = generateRandomString();

  const qr = await generateQRCode(finalAmount, idTransaksi);
  return res.json(qr);
});

// === Cek pembayaran ===
app.post("/api/checkpay", async (req, res) => {
  const amount = req.body.amount;
  const check = await checkPaymentStatus(amount);
  return res.json(check);
});

// === Endpoint pembelian barang/jasa setelah lunas ===
app.post("/api/purchase", async (req, res) => {
  const { idTransaksi, amount } = req.body;

  // ==== KIRIM REQUEST KE API PEMBELIAN KAMU ====
  // contoh:
  /*
  await axios.post("https://domainmu.com/api/order", {
      trx: idTransaksi,
      amount: amount,
      item: "produkXYZ"
  });
  */

  console.log("PEMBELIAN DIJALANKAN:", idTransaksi, amount);

  return res.json({ success: true, message: "Pembelian diproses" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
