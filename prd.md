# Product Requirements Document (PRD)
**Project Name:** CodevaTech Admin Dashboard - Point Management, POS & Service Scheduling
**Version:** 1.2 *(Updated with Service Scheduling & History Invoice View)*
**Tanggal Analisis:** 6 Maret 2026

---

## 1. Pendahuluan
### 1.1 Tujuan Dokumen
Dokumen ini merupakan Product Requirements Document (PRD) yang dihasilkan dari analisis *reverse-engineering* terhadap *codebase* proyek **Codeva Admin Dashboard**, dengan penambahan spesifikasi untuk fitur pencatatan jadwal servis terbaru dan fitur cetak ulang *invoice*. Dokumen ini menjelaskan fungsionalitas, arsitektur, dan alur kerja (*workflow*) yang akan diimplementasikan di dalam aplikasi.

### 1.2 Deskripsi Produk
CodevaTech Admin merupakan aplikasi web (Admin Panel) yang dirancang secara khusus untuk bisnis "Computer Service Management" atau manajemen servis komputer. Aplikasi ini berfungsi sebagai sistem Point of Sale (POS), manajemen inventaris, manajemen pelanggan (Member & Guest), sistem loyalitas (Point Management), pencatatan pengeluaran operasional, serta **sistem penjadwalan & *ticketing* servis (Service Scheduling) berbasis *real-time***.

---

## 2. Arsitektur & Teknologi
Aplikasi ini dibangun menggunakan arsitektur modern berbasis komponen dengan teknologi berikut:
* **Frontend Framework:** React 19 dengan Vite
* **Routing:** React Router DOM v7 (Single Page Application)
* **Styling:** Tailwind CSS v3.4 (dengan dukungan Dark/Light mode) & Lucide React (Icons)
* **Backend & Database:** Supabase (BaaS)
    * **Authentication:** Supabase Auth (Email & Password)
    * **Database:** PostgreSQL (Tabel: `transactions`, `transaction_items`, `products`, `members`, `expenses`, `profiles`, `service_tickets`)
    * **Storage:** Supabase Storage (Bucket: `avatars` untuk foto profil)
* **State Management:** React Hooks (`useState`, `useEffect`)

---

## 3. Fitur & Fungsionalitas Utama

### 3.1. Autentikasi & Keamanan (`Login.jsx`, `ProtectedRoute.jsx`)
* **Login Admin:** Pengguna harus melakukan autentikasi (Email dan Password) untuk mengakses dashboard.
* **Protected Routes:** Sistem akan mendeteksi sesi pengguna menggunakan Supabase Session. Jika sesi tidak valid, pengguna diarahkan ke `/login`.

### 3.2. Dashboard / Home (`Home.jsx`)
Halaman ringkasan eksekutif yang memberikan metrik utama secara *real-time*:
* **Ringkasan Metrik:** Total Sales, Total Expenses, Net Profit, dan Total Members.
* **Quick Actions:** Tombol akses cepat menuju halaman POS, Tambah Member, dan Jadwal Servis Hari Ini.

### 3.3. Point of Sale (POS) (`POS.jsx`)
Modul kasir yang dirancang spesifik untuk layanan perbaikan komputer:
* **Manajemen Pelanggan:** Menautkan transaksi dengan Member atau entri Guest.
* **Workflow Transaksi:** Mendukung status *Completed* (selesai & potong stok) atau *Pending* (tertunda untuk servis yang berjalan).
* **Sistem Poin (Loyalty) "Codeva Universal Pass":** Saat member melakukan transaksi sukses, poin bertambah. Jika mencapai 6 transaksi/poin, poin akan di-*reset* untuk memberikan keuntungan (Servis ke-7 Gratis).

### 3.4. Cetak Struk / Invoice (`Invoice.jsx`)
* Halaman atau komponen khusus untuk *generate* tanda terima (faktur), lengkap dengan rincian biaya dan tombol cetak bawaan *browser*.
* **Aksesibilitas Multi-Sumber:** Komponen *Invoice* dirancang fleksibel agar dapat dipanggil dari dua alur:
    1.  Otomatis terbuka setelah transaksi baru selesai di halaman **POS**.
    2.  Dibuka kembali (*Re-open/Reprint*) melalui halaman **History** untuk transaksi di masa lalu.

### 3.5. Manajemen Inventaris (`Inventory.jsx`)
* **Daftar Produk:** Mengelola stok komponen (RAM, SSD, Thermal Paste, dll) dan Jasa. Mendukung pencarian, *Quick Update Stock*, dan peringatan penghapusan item.

### 3.6. Manajemen Member (`Members.jsx`)
* **List Member:** Menampilkan profil, kontak ponsel, dan jumlah Poin loyalitas. Termasuk indikator *badge* pencapaian *reward* servis.

### 3.7. Pengeluaran / Expenses (`Expenses.jsx`)
* Sistem pembukuan pengeluaran *Operational* (rutin) dan *Stock Purchase* (otomatis menambah stok produk di inventaris dan memotong *Net Profit*).

### 3.8. Riwayat Transaksi (`History.jsx`)
* **Log Transaksi:** Menampilkan seluruh transaksi POS yang dapat dicari berdasarkan ID atau nama pelanggan.
* **Fitur Buka Ulang Invoice (View Invoice):** Admin dapat mengklik spesifik transaksi pada tabel riwayat untuk membuka kembali struk tersebut. Sistem akan mengambil data snapshot JSON dari database (`items`) untuk merender ulang *invoice* secara akurat sesuai kondisi saat transaksi terjadi, memungkinkan admin untuk mencetak ulang (*reprint*) atau mengecek detail garansi/item.
* **Cetak Laporan:** Mendukung tombol *Print Report* untuk mengkonversi tabel *history* menjadi laporan cetak.

### 3.9. Pengaturan & Profil (`Settings.jsx`)
* Mengelola profil Admin (Avatar via Supabase Storage, Nama, Role) dan manajemen sesi (*Log Out*).

### 3.10. Manajemen Jadwal & Tiket Servis (`Schedules.jsx`)
Modul *ticketing* untuk merencanakan, melacak, dan mengelola antrean pekerjaan servis berdasarkan data operasional:
* **Pencatatan Detail Servis (Ticketing):** Aktivitas, Kategori Layanan, dan Penggunaan Komponen (terhubung langsung dengan data `products` di inventaris).
* **Detail Perangkat (Device Info):** Pencatatan riwayat perangkat yang rinci, meliputi Merk/Model perangkat, Kelengkapan Pendaftaran (bawa charger/tas), dan Kondisi Fisik/Kerusakan awal.
* **Manajemen Pelanggan Terintegrasi:** Tiket servis akan terhubung dengan tabel `members` untuk memudahkan pelacakan riwayat servis member secara akurat, atau sebagai entri *Guest*.
* **Penjadwalan & Penugasan:** Menetapkan tanggal/jam, lokasi, dan teknisi (penghandle).
* **Estimasi Biaya & Kontak:** Ongkos jalan dan estimasi total layanan.
* **Manajemen Status & SOP:** Catatan khusus instruksi teknis (SOP) dan alur pelacakan status pengerjaan yang terstruktur (contoh: `Scheduled`, `In Progress`, `Ready for Pickup`, `Completed`).

---

## 4. Struktur Basis Data (Supabase / Postgres)
Berikut entitas-entitas utama:
1.  **`users` & `profiles`**: Sistem *auth* dan detail staf/admin (termasuk teknisi).
2.  **`products`**: Inventaris *hardware* dan jasa.
3.  **`members`**: Data pelanggan terdaftar & integrasi poin hadiah.
4.  **`transactions` & `transaction_items`**: Log penjualan, status, detail transaksi yang dinormalisasi untuk riwayat struk harga tetap (Historical Price). *(Pembaruan: Skema `transactions` dioptimalkan tanpa JSONB agar tidak memboroskan kapasitas batas Free Plan Supabase. Seluruh data dialihkan ke tabel relasional `transaction_items`.)*
5.  **`expenses`**: Pencatatan pengeluaran.
6.  **`service_tickets`**:
    * `id` (UUID, Primary Key)
    * `member_id` (UUID atau Null, FK ke tabel `members`)
    * `guest_name` (String, opsional jika bukan member)
    * `guest_phone` (String, opsional jika bukan member)
    * `device_model` (String, merk/seri spesifik laptop/PC)
    * `device_accessories` (String, kelengkapan yang dititipkan)
    * `device_condition` (Text, kondisi hardware/fisik saat pendaftaran)
    * `activity_name` (String)
    * `service_type` (Enum/String)
    * `scheduled_at` (Timestamp)
    * `product_id` (UUID atau Null, FK ke tabel `products` untuk sparepart/paket)
    * `package_tier` (String)
    * `location` (String)
    * `technician_id` (UUID, FK ke tabel `profiles`)
    * `transport_fee` (Numeric)
    * `estimated_total` (Numeric)
    * `notes` (Text, instruksi teknisi/SOP)
    * `status` (String/Enum: Scheduled, In Progress, Ready for Pickup, Completed, Cancelled)
    * `created_at` (Timestamp)
    * `updated_at` (Timestamp)

---

## 5. Observasi Tingkat Lanjut & Rekomendasi (Catatan PM)

1.  **Re-render Invoice dari History:**
    * **Rekomendasi Teknis:** Pastikan struktur data (`items` JSONB) yang disimpan di tabel `transactions` mencakup snapshot harga saat itu (*historical price*). Hal ini penting agar saat *invoice* dibuka kembali dari History, harga yang tertera tidak berubah mengikuti harga produk *current* di tabel `products`.
2.  **Integrasi Tiket Servis dengan POS (Otomasi Transaksi):**
    * Ketika tiket servis di `Schedules.jsx` ditandai selesai (*Completed*), sediakan fitur **"Convert to Invoice"** untuk memindahkan data ke halaman POS secara otomatis. Karena `service_tickets` dirancang sudah terelasi dengan `members` (Pelanggan) dan `products` (Inventory), Cart di POS dapat langsung terisi *item* beserta harga secara valid dan nama terhubung ke *Member* yang tepat, sehingga kasir tidak perlu mendata ulang.
3.  **Inkonsistensi Logika Point Reward:**
    * Pastikan UI di halaman `Members.jsx` menampilkan *badge* berdasarkan *threshold* 6 poin (Codeva Universal Pass), bukan 100 poin.
4.  **Hapus Transaksi (Cancel Pending):**
    * Pastikan tabel `transaction_items` dan `transactions` memiliki relasi *Cascade Delete* dari antarmuka Supabase.
5.  **Pelacakan SLA Waktu Servis (Time-Tracking):**
    * Dengan adanya validasi `created_at` dan `updated_at` (saat update status pada tabel `service_tickets`), aplikasi dapat mengukur SLA efisiensi teknisi dan waktu perbaikan (*Average Resolution Time*) sebagai fitur masa depan.
6.  **Efisiensi Penyimpanan Database (Supabase Free Tier - 500MB):**
    * **Penting:** Hapus kolom `items` bertipe `JSONB` dari tabel utama `transactions`. Fungsi pembacaan keranjang saat membuka struk/History dapat diganti dengan memanggil fungsi JOIN relasional langsung ke tabel `transaction_items`. Menghapus duplikasi (Double Storage) di tabel transaksi dan item dapat menghemat bobot data setiap transaksi sekitar ~50%. Pada rata-rata kesibukan medium (ex: 50 transaksi + 10 servis / hari), efisiensi tabel ini bisa mempertahankan Free-Plan selama 5-8 tahun tanpa perlukapan kapasitas berlebih.