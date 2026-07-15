# 📊 BOSNAS 2026 - Sistem Manajemen Keuangan

Sistem manajemen keuangan untuk BOSNAS (Bantuan Operasional Sekolah Nasional) tahun 2026.

## 🚀 Fitur
- Dashboard ringkasan keuangan (SPJ & Taktis)
- Grafik pemasukan & pengeluaran
- CRUD transaksi (Tambah, Edit, Hapus)
- Filter berdasarkan bulan, kategori, dan tipe
- Export data ke CSV
- Responsive mobile

## 📁 Struktur Data
- **MASTER_DATA**: Semua transaksi
- **REKAP_BULANAN**: Rekap per bulan (auto-calculate)
- **DASHBOARD**: Metrik dashboard

## 🔧 Setup

### 1. Spreadsheet
Buat 3 sheet di Google Sheets:
- `MASTER_DATA` (transaksi)
- `REKAP_BULANAN` (rekap bulanan)
- `DASHBOARD` (metrik)

### 2. Google Apps Script
1. Buka Spreadsheet → Extensions → Apps Script
2. Paste kode dari `Code.gs`
3. Deploy sebagai Web App
4. Copy URL Web App

### 3. Aplikasi
1. Update `config.js` dengan URL Web App
2. Upload ke GitHub
3. Deploy ke Vercel

## 📞 Kontak
[Your Name/Email]
