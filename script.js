let videoStream;
let currentRowId = 1;
let tableLocked = false;
const notes = {}; // Menyimpan catatan per baris
let currentImageToReplace = null; // Menyimpan referensi gambar yang akan diganti
let currentEditNoteIndex = null; // Menyimpan indeks catatan yang sedang diedit

// Format angka ke Rupiah
function formatRupiah(angka) {
    let formatted = Math.abs(angka).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&.');
    return (angka < 0 ? '-Rp. ' : 'Rp. ') + formatted;
}

// Membuka popup kamera
function openCameraPopup(rowId) {
    if (tableLocked) return; // Cegah akses jika tabel terkunci
    currentRowId = rowId;
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('cameraPopup').style.display = 'block';
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            videoStream = stream;
            document.getElementById('video').srcObject = stream;
        })
        .catch(err => console.log("Error accessing camera: " + err));
}

// Menutup popup kamera
function closeCameraPopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('cameraPopup').style.display = 'none';
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}

// Mengambil gambar dari kamera
function takePicture() {
    let video = document.getElementById('video');
    let canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    let imgSrc = canvas.toDataURL('image/png');

    if (currentImageToReplace) {
        // Ganti gambar yang direferensikan
        currentImageToReplace.src = imgSrc;
        currentImageToReplace = null; // Reset referensi setelah mengganti
    } else {
        // Tambahkan gambar baru jika belum ada referensi penggantian
        let previewContainer = document.getElementById('previewContainer' + currentRowId);
        let previews = previewContainer.getElementsByTagName('img');

        if (previews.length < 10) {
            let newImg = document.createElement('img');
            newImg.src = imgSrc;
            newImg.alt = "Preview";
            newImg.onclick = () => openImagePreview(currentRowId, newImg);
            previewContainer.appendChild(newImg);
        } else {
            alert("Maksimum 10 foto sudah diambil.");
        }
    }

    closeCameraPopup();
}

// Membuka popup preview gambar
function openImagePreview(rowId, imgElement) {
    currentImageToReplace = imgElement; // Simpan referensi gambar yang akan diganti
    document.getElementById('popupImage').src = imgElement.src;
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('imagePreviewPopup').style.display = 'block';
}

// Menutup popup preview gambar
function closeImagePreview() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('imagePreviewPopup').style.display = 'none';
}

// Mengganti gambar yang sedang dilihat di popup preview
function replaceImage() {
    if (currentImageToReplace) {
        closeImagePreview();
        openCameraPopup(currentRowId);
    }
}

// Menghapus gambar yang sedang dilihat di popup preview
function deleteImage() {
    if (currentImageToReplace) {
        const previewContainer = currentImageToReplace.parentElement;
        previewContainer.removeChild(currentImageToReplace);
        currentImageToReplace = null;
        closeImagePreview();
    }
}

// Memperbarui selisih harga
function updateSelisih(rowId) {
    let hargaAwal = parseFloat(document.getElementById('hargaAwal' + rowId).value) || 0;
    let hargaAkhir = parseFloat(document.getElementById('hargaAkhir' + rowId).value) || 0;
    let selisih = hargaAwal - hargaAkhir;

    const selisihInput = document.getElementById('selisihHarga' + rowId);
    selisihInput.value = formatRupiah(selisih);

    if (selisih < 0) {
        selisihInput.style.color = 'red';
    } else {
        selisihInput.style.color = 'black';
    }

    calculateTotals();
}

// Menghitung total harga
function calculateTotals() {
    let totalHargaAwal = 0;
    let totalHargaAkhir = 0;
    let totalSelisih = 0;

    const rows = document.querySelectorAll('#itemTable tr');
    rows.forEach(row => {
        const hargaAwalInput = row.querySelector('input[id^="hargaAwal"]');
        const hargaAkhirInput = row.querySelector('input[id^="hargaAkhir"]');
        const selisihInput = row.querySelector('input[id^="selisihHarga"]');

        const hargaAwal = parseFloat(hargaAwalInput.value) || 0;
        const hargaAkhir = parseFloat(hargaAkhirInput.value) || 0;
        const selisih = hargaAwal - hargaAkhir; // Hitung selisih sebagai angka

        totalHargaAwal += hargaAwal;
        totalHargaAkhir += hargaAkhir;
        totalSelisih += selisih; // Tambahkan selisih yang dihitung
    });

    document.getElementById('totalHargaAwal').textContent = formatRupiah(totalHargaAwal);
    document.getElementById('totalHargaAkhir').textContent = formatRupiah(totalHargaAkhir);
    document.getElementById('totalSelisihHarga').textContent = formatRupiah(totalSelisih);
}

// Menambahkan item baru ke tabel
document.getElementById('addItem').addEventListener('click', function () {
    if (tableLocked) return;

    let item = document.getElementById('item').value.trim();
    if (!item) {
        alert("Masukkan nama barang.");
        return;
    }

    const table = document.getElementById('itemTable');
    const rowId = table.rows.length + 1;
    const row = table.insertRow();

    row.innerHTML = `
        <td>${rowId}</td>
        <td>${item}</td>
        <td>
            <button class="camera-button" onclick="openCameraPopup(${rowId})">
                📸 Ambil Foto
            </button>
        </td>
        <td><input type="number" id="real${rowId}" value="0" min="0" ${tableLocked ? 'disabled' : ''}></td>
        <td>
            <div id="previewContainer${rowId}" style="display: flex; flex-wrap: wrap; justify-content: center;">
                <!-- Preview images akan ditambahkan di sini -->
            </div>
        </td>
        <td><input type="number" id="jumlahAwal${rowId}" value="0" readonly></td>
        <td><input type="number" id="hargaAwal${rowId}" value="0" readonly></td>
        <td><input type="number" id="hargaAkhir${rowId}" value="0" onchange="updateSelisih(${rowId})" ${tableLocked ? 'disabled' : ''}></td>
        <td><input type="text" id="selisihHarga${rowId}" value="Rp. 0,00" readonly></td>
        <td>
            <button class="note-button" onclick="openNotePopup(${rowId})">
                <i class="fas fa-book"></i>
            </button>
        </td>
        <td>
            <button class="button" onclick="deleteItem(this)" ${tableLocked ? 'disabled' : ''}>Hapus</button>
        </td>
    `;

    // Inisialisasi catatan untuk baris ini
    notes[rowId] = [];

    document.getElementById('item').value = '';
    calculateTotals();
});

// Menghapus item dari tabel
function deleteItem(button) {
    if (tableLocked) return;

    let row = button.parentElement.parentElement;
    const rowId = row.cells[0].textContent;
    row.remove();
    delete notes[rowId];
    updateRowNumbers();
    calculateTotals();
}

// Memperbarui nomor baris setelah penghapusan
function updateRowNumbers() {
    const rows = document.querySelectorAll('#itemTable tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Mengunggah data dari file Excel
document.getElementById('uploadExcel').addEventListener('click', function () {
    if (tableLocked) return;

    const fileInput = document.getElementById('uploadExcelFile');
    const file = fileInput.files[0];
    if (!file) {
        alert("Silakan pilih file Excel terlebih dahulu.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Pastikan sheet yang ingin dibaca adalah sheet pertama atau spesifik
        const sheetName = workbook.SheetNames[0]; // Mengambil sheet pertama
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        json.forEach((row, index) => {
            if (index > 0 && row.length >= 3) { // Mengabaikan header
                const table = document.getElementById('itemTable');
                const rowId = table.rows.length + 1;
                const newRow = table.insertRow();

                newRow.innerHTML = `
                    <td>${rowId}</td>
                    <td>${row[0]}</td>
                    <td>
                        <button class="camera-button" onclick="openCameraPopup(${rowId})">
                            📸 Ambil Foto
                        </button>
                    </td>
                    <td><input type="number" id="real${rowId}" value="0" min="0" ${tableLocked ? 'disabled' : ''}></td>
                    <td>
                        <div id="previewContainer${rowId}" style="display: flex; flex-wrap: wrap; justify-content: center;">
                            <!-- Preview images akan ditambahkan di sini -->
                        </div>
                    </td>
                    <td><input type="number" id="jumlahAwal${rowId}" value="${row[1]}" readonly></td>
                    <td><input type="number" id="hargaAwal${rowId}" value="${row[2]}" readonly></td>
                    <td><input type="number" id="hargaAkhir${rowId}" value="0" onchange="updateSelisih(${rowId})" ${tableLocked ? 'disabled' : ''}></td>
                    <td><input type="text" id="selisihHarga${rowId}" value="Rp. 0,00" readonly></td>
                    <td>
                        <button class="note-button" onclick="openNotePopup(${rowId})">
                            <i class="fas fa-book"></i>
                        </button>
                    </td>
                    <td>
                        <button class="button" onclick="deleteItem(this)" ${tableLocked ? 'disabled' : ''}>Hapus</button>
                    </td>
                `;

                // Inisialisasi catatan untuk baris ini
                notes[rowId] = [];
            }
        });

        calculateTotals();
    };

    reader.readAsArrayBuffer(file);
});

// Membagikan link ke peserta
document.getElementById('bagikanPeserta').addEventListener('click', function () {
    if (tableLocked) return;

    document.getElementById('popupBagikanLink').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
});

// Menutup popup bagikan link
function closePopupLink() {
    document.getElementById('popupBagikanLink').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// Membuka popup catatan
function openNotePopup(rowId) {
    currentRowId = rowId;
    document.getElementById('currentRowForNote').value = rowId;
    document.getElementById('noteName').value = '';
    document.getElementById('noteComment').value = '';
    document.getElementById('noteList').innerHTML = '';

    // Tampilkan riwayat catatan
    const noteList = document.getElementById('noteList');
    if (notes[rowId].length > 0) {
        notes[rowId].forEach((note, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${note.name}:</strong> ${note.comment}
                <button class="edit-note-button" onclick="editNote(${rowId}, ${index})">Edit</button>
            `;
            noteList.appendChild(li);
        });
    } else {
        noteList.innerHTML = '<li>Tidak ada catatan.</li>';
    }

    // Tampilkan popup catatan
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('notePopup').style.display = 'block';

    // Atur tombol: Tampilkan "Kirim", sembunyikan "Simpan" dan "Batal"
    document.getElementById('kirimButton').style.display = 'inline-block';
    document.getElementById('simpanButton').style.display = 'none';
    document.getElementById('batalButton').style.display = 'none';
}

// Menutup popup catatan
function closeNotePopup() {
    currentImageToReplace = null; // Pastikan tidak ada gambar yang direferensikan
    currentEditNoteIndex = null; // Reset indeks catatan yang sedang diedit
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('notePopup').style.display = 'none';

    // Reset form
    document.getElementById('noteName').value = '';
    document.getElementById('noteComment').value = '';

    // Reset tombol: Tampilkan "Kirim", sembunyikan "Simpan" dan "Batal"
    document.getElementById('kirimButton').style.display = 'inline-block';
    document.getElementById('simpanButton').style.display = 'none';
    document.getElementById('batalButton').style.display = 'none';
}

// Menyimpan catatan baru
function saveNote() {
    const rowId = document.getElementById('currentRowForNote').value;
    const name = document.getElementById('noteName').value.trim();
    const comment = document.getElementById('noteComment').value.trim();

    if (!name || !comment) {
        alert("Nama dan komentar tidak boleh kosong.");
        return;
    }

    // Simpan catatan
    notes[rowId].push({ name, comment });

    // Update riwayat catatan di popup
    const noteList = document.getElementById('noteList');
    noteList.innerHTML = '';
    notes[rowId].forEach((note, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${note.name}:</strong> ${note.comment}
            <button class="edit-note-button" onclick="editNote(${rowId}, ${index})">Edit</button>
        `;
        noteList.appendChild(li);
    });

    // Tampilkan pesan sukses
    alert("Catatan berhasil disimpan.");

    // Reset form
    document.getElementById('noteName').value = '';
    document.getElementById('noteComment').value = '';
}

// Mengedit catatan
function editNote(rowId, noteIndex) {
    currentEditNoteIndex = noteIndex;
    const note = notes[rowId][noteIndex];

    // Isi form dengan data catatan yang akan diedit
    document.getElementById('noteName').value = note.name;
    document.getElementById('noteComment').value = note.comment;

    // Sembunyikan tombol "Kirim" dan tampilkan tombol "Simpan" dan "Batal"
    document.getElementById('kirimButton').style.display = 'none';
    document.getElementById('simpanButton').style.display = 'inline-block';
    document.getElementById('batalButton').style.display = 'inline-block';
}

// Menyimpan catatan yang telah diedit
function saveEditedNote() {
    const rowId = document.getElementById('currentRowForNote').value;
    const noteIndex = currentEditNoteIndex;
    const name = document.getElementById('noteName').value.trim();
    const comment = document.getElementById('noteComment').value.trim();

    if (!name || !comment) {
        alert("Nama dan komentar tidak boleh kosong.");
        return;
    }

    // Perbarui catatan
    notes[rowId][noteIndex] = { name, comment };

    // Update riwayat catatan di popup
    const noteList = document.getElementById('noteList');
    noteList.innerHTML = '';
    notes[rowId].forEach((note, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${note.name}:</strong> ${note.comment}
            <button class="edit-note-button" onclick="editNote(${rowId}, ${index})">Edit</button>
        `;
        noteList.appendChild(li);
    });

    // Tampilkan pesan sukses
    alert("Catatan berhasil diperbarui.");

    // Reset form
    document.getElementById('noteName').value = '';
    document.getElementById('noteComment').value = '';

    // Tampilkan kembali tombol "Kirim" dan sembunyikan tombol "Simpan" dan "Batal"
    document.getElementById('kirimButton').style.display = 'inline-block';
    document.getElementById('simpanButton').style.display = 'none';
    document.getElementById('batalButton').style.display = 'none';

    // Reset indeks edit
    currentEditNoteIndex = null;
}

// Membatalkan proses edit catatan
function cancelEditNote() {
    // Reset form
    document.getElementById('noteName').value = '';
    document.getElementById('noteComment').value = '';

    // Tampilkan kembali tombol "Kirim" dan sembunyikan tombol "Simpan" dan "Batal"
    document.getElementById('kirimButton').style.display = 'inline-block';
    document.getElementById('simpanButton').style.display = 'none';
    document.getElementById('batalButton').style.display = 'none';

    // Reset indeks edit
    currentEditNoteIndex = null;
}

// Fitur Kunci Tabel
document.getElementById('lockTable').addEventListener('click', function () {
    if (!tableLocked) {
        // Kunci tabel
        lockTable();
    } else {
        // Buka popup untuk membuka kunci
        document.getElementById('lockPopup').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    }
});

// Mengunci tabel
function lockTable() {
    tableLocked = true;
    const inputs = document.querySelectorAll('#itemTable input, #itemTable button');
    inputs.forEach(input => {
        if (input.type !== 'hidden') {
            input.disabled = true;
        }
    });
    const lockButton = document.getElementById('lockTable');
    lockButton.innerHTML = '<i class="fas fa-lock-open"></i>'; // Mengubah ikon ke unlock
    lockButton.title = "Buka Kunci Tabel";
}

// Membuka kunci tabel
function unlockTable() {
    const password = document.getElementById('unlockPassword').value;
    if (password === "FHCIBUMN") {
        tableLocked = false;
        const inputs = document.querySelectorAll('#itemTable input, #itemTable button');
        inputs.forEach(input => {
            input.disabled = false;
        });
        const lockButton = document.getElementById('lockTable');
        lockButton.innerHTML = '<i class="fas fa-lock"></i>'; // Mengubah ikon ke lock
        lockButton.title = "Kunci Tabel";
        document.getElementById('lockPopup').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('unlockPassword').value = '';
        document.getElementById('lockError').textContent = '';

        // Reset tombol Simpan dan Batal di popup catatan jika sedang dalam proses edit
        const existingButtons = document.querySelector('#notePopup .popup-buttons');
        existingButtons.innerHTML = ''; // Pastikan ada div dengan class 'popup-buttons' di HTML

        const kirimButton = document.createElement('button');
        kirimButton.className = 'button';
        kirimButton.textContent = 'Kirim';
        kirimButton.onclick = function () {
            saveNote();
        };
        existingButtons.appendChild(kirimButton);

        const tutupButton = document.createElement('button');
        tutupButton.className = 'button';
        tutupButton.textContent = 'Tutup';
        tutupButton.onclick = function () {
            closeNotePopup();
        };
        existingButtons.appendChild(tutupButton);
    } else {
        document.getElementById('lockError').textContent = "Password salah. Silakan coba lagi.";
    }
}

// Menutup popup kunci tabel
function closeLockPopup() {
    document.getElementById('lockPopup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('unlockPassword').value = '';
    document.getElementById('lockError').textContent = '';
}
