# 📝 Aplikasi ToDo - Web Application

Aplikasi web sederhana untuk mengelola daftar tugas Anda dengan antarmuka yang modern dan responsif.

## 🎯 Fitur Utama

- ✅ **Tambah Tugas Baru** - Buat tugas dengan judul, deskripsi, dan tenggat waktu
- 📋 **Kelola Tugas** - Edit atau hapus tugas yang sudah dibuat
- ✓ **Tandai Selesai** - Tandai tugas yang sudah dikerjakan
- 🎨 **Desain Modern** - Interface yang cantik dan mudah digunakan
- 📊 **Statistik Real-time** - Lihat jumlah total, selesai, dan pending tugas
- 🔍 **Filter & Sort** - Filter berdasarkan status (semua, belum selesai, selesai)
- 💾 **Penyimpanan Data** - Data disimpan dalam file JSON
- 📱 **Responsive Design** - Bekerja baik di desktop dan mobile

## 🛠️ Teknologi yang Digunakan

- **Backend**: Python (Flask)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: JSON File Storage
- **Server**: Flask Development Server

## 📋 Struktur Proyek

```
ToDo App/
├── app.py                 # Backend Flask aplikasi
├── requirements.txt       # Python dependencies
├── todos.json            # File penyimpanan data (auto-generated)
├── templates/
│   └── index.html        # Frontend HTML
└── static/
    ├── style.css         # Styling CSS
    └── script.js         # JavaScript untuk interaksi
```

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Python 3.7+ sudah terinstall
- pip (Python Package Manager)

### 2. Setup

**Langkah 1: Buka Terminal/Command Prompt**

Navigasi ke folder proyek:
```bash
cd "c:\Users\hakim\Documents\Tugas ISTN\Semester 4\Desain Dan aritektur Sistem Agile\Bab 5 Continuous Integration Dan Continuous Delivery (CICD)\ToDo App"
```

**Langkah 2: Buat Virtual Environment (Opsional tapi Recommended)**

Untuk Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

Untuk Linux/Mac:
```bash
python3 -m venv venv
source venv/bin/activate
```

**Langkah 3: Install Dependencies**

```bash
pip install -r requirements.txt
```

**Langkah 4: Jalankan Aplikasi**

```bash
python app.py
```

### 3. Akses Aplikasi

Buka browser Anda dan kunjungi:
```
http://localhost:5000
```

Aplikasi akan berjalan dan siap digunakan!

## 📖 Cara Menggunakan

### Menambah Tugas Baru
1. Masukkan judul tugas pada kolom "Judul Tugas"
2. (Opsional) Masukkan deskripsi detail
3. (Opsional) Pilih tenggat waktu
4. Klik tombol "➕ Tambah Tugas"

### Menandai Tugas Selesai
- Centang checkbox di sebelah tugas untuk menandainya sebagai selesai
- Checkbox yang tertandai akan mengubah tampilan tugas (tercoret)

### Mengedit Tugas
1. Klik tombol "✏️ Edit" pada tugas yang ingin diubah
2. Ubah judul, deskripsi, atau tenggat waktu sesuai kebutuhan
3. Klik "Simpan Perubahan"

### Menghapus Tugas
1. Klik tombol "🗑️ Hapus" pada tugas yang ingin dihapus
2. Konfirmasi penghapusan

### Filter & Sort
- **Filter**: Gunakan tombol "Semua", "Belum Selesai", "Selesai" untuk memfilter tugas
- **Sort**: Pilih urutan tampilan dari dropdown (Terbaru, Terlama, Tenggat Waktu)

## 📊 Statistik

Bagian statistik menampilkan:
- **Total Tugas**: Jumlah semua tugas yang ada
- **Selesai**: Jumlah tugas yang sudah diselesaikan
- **Pending**: Jumlah tugas yang masih pending

## 🔧 API Endpoints

Aplikasi menyediakan REST API berikut:

### GET /api/todos
Mendapatkan semua tugas
```bash
curl http://localhost:5000/api/todos
```

### POST /api/todos
Menambah tugas baru
```bash
curl -X POST http://localhost:5000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Judul","description":"Deskripsi","due_date":"2024-12-31"}'
```

### PUT /api/todos/<id>
Mengubah tugas
```bash
curl -X PUT http://localhost:5000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Judul Baru","completed":true}'
```

### DELETE /api/todos/<id>
Menghapus tugas
```bash
curl -X DELETE http://localhost:5000/api/todos/1
```

### PATCH /api/todos/<id>/toggle
Toggle status tugas (selesai/belum)
```bash
curl -X PATCH http://localhost:5000/api/todos/1/toggle
```

### GET /api/stats
Mendapatkan statistik
```bash
curl http://localhost:5000/api/stats
```

## 💾 Penyimpanan Data

- Data disimpan dalam file `todos.json` di direktori proyek
- File JSON dibuat otomatis saat Anda menambah tugas pertama
- Data persisten - akan tetap ada meskipun aplikasi dimatikan

Contoh struktur `todos.json`:
```json
[
  {
    "id": 1,
    "title": "Belajar Python",
    "description": "Belajar dasar-dasar Python dan Flask",
    "completed": false,
    "created_at": "2024-01-15 10:30:45",
    "due_date": "2024-01-20"
  }
]
```

## 🎨 Customization

### Mengubah Warna Tema
Edit file `static/style.css` dan ubah nilai di `:root`:
```css
:root {
    --primary-color: #5e72e4;      /* Warna utama */
    --secondary-color: #825ee4;    /* Warna sekunder */
    --success-color: #2dce89;      /* Warna sukses */
    --danger-color: #f5365c;       /* Warna danger */
}
```

### Menambah Fitur Baru
Edit `app.py` untuk menambah API endpoints baru, atau edit `static/script.js` untuk menambah interaksi frontend.

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'flask'"
**Solusi**: Pastikan Flask sudah terinstall
```bash
pip install Flask
```

### Port 5000 sudah digunakan
**Solusi**: Edit `app.py` baris terakhir, ubah port:
```python
if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5001)  # Ubah ke port lain
```

### Halaman tidak muncul styling
**Solusi**: Refresh browser dengan Ctrl+Shift+R (hard refresh) untuk clear cache

### Data hilang setelah tutup aplikasi
**Solusi**: Pastikan file `todos.json` masih ada di direktori proyek

## 📝 License

Proyek ini dibuat untuk tujuan pembelajaran dan dapat digunakan/dimodifikasi sesuai kebutuhan.

## 👨‍💻 Pengembang

Dikembangkan sebagai bagian dari mata kuliah **Desain dan Arsitektur Sistem Agile** - Bab 5: Continuous Integration dan Continuous Delivery (CI/CD)

---

**Selamat menggunakan Aplikasi ToDo! 🎉**

Jika ada pertanyaan atau saran, silakan hubungi pengembang atau buat issue di repository ini.
