# Codeva Admin Dashboard

Aplikasi Admin Dashboard untuk manajemen poin dan POS, dibangun dengan React, Vite, Tailwind CSS, dan Supabase.

## Fitur
- **Manajemen Anggota:** Daftar anggota, pencarian, dan status poin.
- **Point of Sale (POS):** Transaksi layanan dan penjualan produk.
- **Otentikasi:** Login admin menggunakan Supabase Auth.
- **Desain Modern:** Antarmuka responsif dengan Dark Mode support.

## Cara Menjalankan

1.  **Instalasi Dependensi**
    ```bash
    npm install
    ```

2.  **Setup Environment Variables**
    Buat file `.env` di root folder dan isi dengan kredensial Supabase Anda:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Jalankan Aplikasi**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:5173` di browser.

## Struktur Proyek
- `src/components/Layout`: Komponen layout utama (Sidebar, Header, MobileNav).
- `src/pages`: Halaman aplikasi (Members, POS, Login, dll).
- `src/lib`: Konfigurasi Supabase client.
