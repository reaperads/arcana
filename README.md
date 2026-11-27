# Arcana

Sistem tarot di peramban: 78 kartu, empat penyebaran, perpustakaan makna setiap
kartu, dan jurnal yang tersimpan di perangkat kamu.

Tanpa proses pembangunan, tanpa dependensi, tanpa panggilan jaringan selain gambar
kartu. Buka `index.html` dan langsung jalan.

## Fitur

- **Bacaan**: pilih penyebaran (satu kartu, tiga kartu masa lalu/sekarang/masa depan,
  tapal kuda, atau salib Celtic), tulis pertanyaan jika mau, lalu kocok dan undi.
  Kartu awalnya menghadap ke bawah; ketuk untuk membaliknya. Kartu terbalik
  ditandai dan dibaca dengan makna terbalik.
- **Perpustakaan**: semua 78 kartu, bisa disaring menurut Arkana Mayor atau jenis
  (Wands, Cups, Swords, Pentacles) dan dicari menurut nama. Ketuk kartu untuk makna
  tegak dan terbalik.
- **Jurnal**: simpan bacaan yang sudah selesai, buka lagi, hapus, atau ekspor
  seluruh jurnal sebagai JSON. Disimpan di `localStorage` dengan kunci
  `arcana.journal.v1`; tidak ada yang keluar dari peramban.

Pengundian memakai `crypto.getRandomValues`, baik untuk kocokan maupun untuk
menentukan kartu terbalik.

## Berkas

| Berkas | Isi |
| --- | --- |
| `index.html` | Markah untuk ketiga bagian, formulir penyebaran, dan lembar kartu |
| `styles.css` | Seluruh gaya: dek, animasi balik, tata letak, aturan responsif |
| `cards-major.js` | 22 Arkana Mayor dengan makna tegak dan terbalik |
| `cards-minor.js` | 56 Arkana Minor, empat jenis |
| `app.js` | Pengundian, pembalikan, tafsir, perpustakaan, jurnal |
| `assets/img/` | Gambar 78 kartu (Rider-Waite-Smith 1910, domain publik) |

Nama gambar mengikuti pola: `m00.png` sampai `m21.png` untuk Arkana Mayor, dan
`wands-01.png`, `cups-14.png`, dan seterusnya untuk Arkana Minor (01 = Ace, 11 =
Page, 12 = Knight, 13 = Queen, 14 = King).

Nama kartu memakai bahasa Inggris (The Fool, Four of Pentacles, Page of Cups)
karena itu nama baku dek tarot; penjelasan, kata kunci, dan seluruh antarmuka
memakai bahasa Indonesia. Nama baris penyaring jenis di perpustakaan juga bahasa
Inggris (Wands, Cups, Swords, Pentacles) agar cocok dengan nama kartunya.

Data kartu berbentuk objek biasa: `name`, `arcana`, `number` atau `suit` + `rank`,
`keywords` / `meaning`, dan `reverseKeywords` / `reverseMeaning`. Kartu baru cukup
ditambahkan sebagai objek; perpustakaan dan penyebaran akan memungutnya.

## Menambah penyebaran

Tambahkan entri ke `SPREADS` di `app.js` dengan `label` dan urutan `positions`,
lalu tambahkan tombol radio yang sesuai di `.spread-options` pada `index.html`.
Jika jumlah kartunya baru, tambahkan juga aturan kolom untuk `data-count` di
`styles.css`.

## Catatan

Bacaan disimpan di `localStorage`, jadi per peramban dan per perangkat. Menghapus
data situs akan ikut menghapusnya. Gunakan Ekspor jika ingin salinan.


## Hosting

Situs ini berkas statis, jadi cukup dihidangkan apa adanya.

- **GitHub Pages**: `https://reaperads.github.io/arcana/`. Workflow
  `.github/workflows/pages.yml` menerbitkan situs pada setiap push ke `main`,
  atau manual dari tab Actions.
- **FreeMilk**: tombol Run menerbitkan preview privat di
  `arcana-9smm--preview.freemilk.app`.

GitHub Pages membutuhkan repo **publik** di GitHub Free. Kalau repo kembali
privat, workflow tetap hijau tetapi melewati deploy dan menulis catatan di
ringkasan run.
