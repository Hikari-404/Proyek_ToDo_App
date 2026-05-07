/**
 * ToDo App — Refactored Frontend
 * Teknik: Extract Method, Rename Variable, Polymorphism (Renderer Strategy)
 */

// =============================================================================
// RENAME VARIABLE — Konstanta DOM dengan nama deskriptif
// Ganti nama generik: 'el', 'btn', 'inp' → nama yang menjelaskan peran elemen
// =============================================================================

const todoSubmitForm       = document.getElementById('todoForm');
const todoTitleInput       = document.getElementById('title');
const todoDescriptionInput = document.getElementById('description');
const todoDueDateInput     = document.getElementById('dueDate');
const todoListContainer    = document.getElementById('todosList');
const todoEmptyState       = document.getElementById('emptyState');

const editModalOverlay    = document.getElementById('editModal');
const editSubmitForm      = document.getElementById('editForm');
const editTitleInput      = document.getElementById('editTitle');
const editDescriptionInput = document.getElementById('editDescription');
const editDueDateInput    = document.getElementById('editDueDate');
const modalCloseButton    = document.querySelector('.modal-close');
const modalCancelButton   = document.querySelector('.modal-cancel');

const filterButtonGroup   = document.querySelectorAll('.filter-btn');
const sortOrderSelect     = document.getElementById('sortSelect');

const trashToggleButton   = document.getElementById('trashBtn');
const trashPanelSection   = document.getElementById('trashSection');
const trashCloseButton    = document.getElementById('closeTrashBtn');
const trashListContainer  = document.getElementById('trashList');
const trashEmptyState     = document.getElementById('emptyTrashState');
const trashItemCountLabel = document.getElementById('trashCount');
const trashEmptyAllButton = document.getElementById('emptyTrashBtn');

const todoItemTemplate    = document.getElementById('todoTemplate');
const trashItemTemplate   = document.getElementById('trashTemplate');

// State aplikasi — nama menggambarkan isi dengan jelas
let activeTodoList    = [];
let trashedItemList   = [];
let activeFilter      = 'all';
let activeSortOrder   = 'newest';
let currentEditingId  = null;


// =============================================================================
// EXTRACT METHOD — API Client Layer
// Semua komunikasi HTTP dipusatkan di sini. Dulu header fetch diulang 5x.
// =============================================================================

/**
 * [Extract Method] Satu fungsi untuk semua request HTTP ke API.
 * Menggantikan fetch() manual dengan header yang berulang di setiap fungsi.
 * Rename: 'method' tetap, tapi 'payload' menggantikan 'body'/'data' yang ambigu.
 */
async function sendApiRequest(endpoint, httpMethod = 'GET', payload = null) {
    const requestOptions = {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
    };
    if (payload !== null) {
        requestOptions.body = JSON.stringify(payload);
    }
    return fetch(endpoint, requestOptions);
}

/**
 * [Extract Method] Wrapper untuk request API dengan error handling standar.
 * Rename: 'error' → 'networkError' — jelas ini error dari jaringan, bukan logic.
 */
async function executeApiCall(endpoint, httpMethod, payload, successCallback, errorMessage) {
    try {
        const apiResponse = await sendApiRequest(endpoint, httpMethod, payload);
        if (apiResponse.ok) {
            const responseData = await apiResponse.json();
            await successCallback(responseData);
        }
    } catch (networkError) {
        console.error(`[API Error] ${errorMessage}:`, networkError);
        showNotification(errorMessage, 'error');
    }
}


// =============================================================================
// POLYMORPHISM — List Renderer Strategy
// Menggantikan dua fungsi render (renderTodos / renderTrash) yang strukturnya
// identik tapi bekerja di elemen DOM berbeda. Sekarang satu fungsi render
// menerima "strategi" renderer yang tahu cara membuat elemennya sendiri.
// =============================================================================

/**
 * Base renderer — mendefinisikan kontrak yang harus dipenuhi setiap renderer.
 * Subkelas override createElement() untuk membuat elemen yang sesuai jenisnya.
 */
class ListRenderer {
    constructor(listContainer, emptyStateElement) {
        this.listContainer    = listContainer;     // Rename: lebih deskriptif dari 'container'
        this.emptyStateElement = emptyStateElement; // Rename: jelas ini elemen "kosong"
    }

    render(itemCollection) {
        this.listContainer.innerHTML = '';
        if (itemCollection.length === 0) {
            this.emptyStateElement.classList.remove('hidden');
            return;
        }
        this.emptyStateElement.classList.add('hidden');
        itemCollection.forEach(item => {
            const renderedElement = this.createElement(item);
            this.listContainer.appendChild(renderedElement);
        });
    }

    // Subkelas wajib override ini — ini adalah "method yang di-polymorphism-kan"
    createElement(item) {
        throw new Error('createElement() harus diimplementasikan oleh subkelas');
    }
}


/**
 * [Polymorphism] Renderer untuk todo aktif — tahu cara buat elemen todo.
 * Override createElement() dengan logika spesifik todo.
 */
class TodoItemRenderer extends ListRenderer {
    constructor() {
        super(todoListContainer, todoEmptyState);
    }

    createElement(todoItem) {
        const templateClone = todoItemTemplate.content.cloneNode(true);
        const todoElement   = templateClone.querySelector('.todo-item');

        todoElement.setAttribute('data-id', todoItem.id);
        if (todoItem.completed) {
            todoElement.classList.add('completed');
        }

        templateClone.querySelector('.todo-check').checked      = todoItem.completed;
        templateClone.querySelector('.todo-title').textContent   = todoItem.title;
        templateClone.querySelector('.todo-description').textContent = todoItem.description;

        const createdDate = new Date(todoItem.created_at);
        templateClone.querySelector('.todo-date').textContent = `📅 ${formatDateToLocale(createdDate)}`;

        if (todoItem.due_date) {
            const dueDate = new Date(todoItem.due_date);
            templateClone.querySelector('.todo-due').textContent = `⏰ Tenggat: ${formatDateToLocale(dueDate)}`;
        }

        templateClone.querySelector('.todo-check').addEventListener('change', () => {
            handleToggleTodo(todoItem.id);
        });

        return templateClone;
    }
}


/**
 * [Polymorphism] Renderer untuk trash items — override createElement() dengan
 * logika spesifik trash (tampilan berbeda, tidak ada checkbox, ada deleted_at).
 */
class TrashItemRenderer extends ListRenderer {
    constructor() {
        super(trashListContainer, trashEmptyState);
    }

    createElement(trashItem) {
        const templateClone  = trashItemTemplate.content.cloneNode(true);
        const trashElement   = templateClone.querySelector('.trash-item');

        trashElement.setAttribute('data-id', trashItem.id);
        templateClone.querySelector('.trash-title').textContent       = trashItem.title;
        templateClone.querySelector('.trash-description').textContent  = trashItem.description;

        if (trashItem.deleted_at) {
            const deletedDate = new Date(trashItem.deleted_at);
            templateClone.querySelector('.trash-deleted').textContent =
                `🗑️ Dihapus: ${formatDateToLocale(deletedDate)}`;
        }

        return templateClone;
    }
}

// Instansiasi renderer — satu kali, dipakai berulang
const todoRenderer  = new TodoItemRenderer();
const trashRenderer = new TrashItemRenderer();


// =============================================================================
// EXTRACT METHOD — Filter & Sort Pipeline
// Dipisah agar bisa ditest dan diganti secara independen.
// =============================================================================

/**
 * [Extract Method] Filter todos berdasarkan status aktif.
 * Rename: 'todoArray' → 'todoCollection' — array adalah implementasi, collection adalah konsep.
 */
function applyStatusFilter(todoCollection) {
    const filterMap = {
        'completed': item => item.completed,
        'pending':   item => !item.completed,
        'all':       ()   => true,
    };
    const filterFn = filterMap[activeFilter] || filterMap['all'];
    return todoCollection.filter(filterFn);
}

/**
 * [Extract Method] Sort todos berdasarkan urutan yang dipilih user.
 * Rename: 'sorted' → 'sortedCollection', 'a'/'b' tetap (konvensi sort).
 */
function applySortOrder(todoCollection) {
    const sortedCollection = [...todoCollection];
    const sortStrategies = {
        'oldest':  (a, b) => new Date(a.created_at) - new Date(b.created_at),
        'duedate': (a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        },
        'newest':  (a, b) => new Date(b.created_at) - new Date(a.created_at),
    };
    const compareFn = sortStrategies[activeSortOrder] || sortStrategies['newest'];
    return sortedCollection.sort(compareFn);
}

/**
 * [Extract Method] Pipeline lengkap: filter → sort → render.
 * Nama 'renderFilteredTodos' menggantikan 'renderTodos' yang kurang deskriptif.
 */
function renderFilteredTodos() {
    const filteredCollection = applyStatusFilter(activeTodoList);
    const sortedCollection   = applySortOrder(filteredCollection);
    todoRenderer.render(sortedCollection);
}


// =============================================================================
// EXTRACT METHOD — Stats & Trash Counter
// =============================================================================

/**
 * [Extract Method] Ambil statistik dari server dan update DOM.
 * Rename: 'stats' → 'statsData' — menghindari nama yang sama dengan variabel lain.
 */
async function refreshStatsDisplay() {
    try {
        const apiResponse = await sendApiRequest('/api/stats');
        const statsData   = await apiResponse.json();
        document.getElementById('totalTodos').textContent     = statsData.total;
        document.getElementById('completedTodos').textContent = statsData.completed;
        document.getElementById('pendingTodos').textContent   = statsData.pending;
    } catch (networkError) {
        console.error('Gagal mengambil statistik:', networkError);
    }
}

/**
 * [Extract Method] Update counter dan state tombol "Kosongkan Trash".
 * Rename: 'trashCount' (elemen DOM) → 'trashItemCountLabel' di atas.
 */
function refreshTrashCounter() {
    trashItemCountLabel.textContent = trashedItemList.length;
    trashEmptyAllButton.disabled    = trashedItemList.length === 0;
}


// =============================================================================
// EXTRACT METHOD — State Mutators
// Operasi mutasi state lokal dikelompokkan agar mudah dilacak.
// =============================================================================

/** [Extract Method] Tambah item baru ke local state dan re-render. */
function appendToActiveTodos(newTodoItem) {
    activeTodoList.push(newTodoItem);
}

/** [Extract Method] Update item di local state by ID. */
function updateActiveTodoById(todoId, updatedItem) {
    const itemIndex = activeTodoList.findIndex(item => item.id === todoId);
    if (itemIndex !== -1) activeTodoList[itemIndex] = updatedItem;
}

/** [Extract Method] Hapus item dari active list by ID. */
function removeFromActiveTodos(todoId) {
    activeTodoList = activeTodoList.filter(item => item.id !== todoId);
}

/** [Extract Method] Pindahkan item dari trash ke active list (restore). */
function moveFromTrashToActive(todoId, restoredItem) {
    trashedItemList = trashedItemList.filter(item => item.id !== todoId);
    const existingIndex = activeTodoList.findIndex(item => item.id === todoId);
    if (existingIndex !== -1) {
        activeTodoList[existingIndex] = restoredItem;
    } else {
        activeTodoList.push(restoredItem);
    }
}

/** [Extract Method] Hapus item dari trash list secara lokal. */
function removeFromTrashedItems(todoId) {
    trashedItemList = trashedItemList.filter(item => item.id !== todoId);
}


// =============================================================================
// EXTRACT METHOD — Form & Modal Helpers
// =============================================================================

/** [Extract Method] Validasi field judul — diekstrak dari handleAddTodo dan handleEditTodo. */
function validateTitleInput(titleValue) {
    if (!titleValue.trim()) {
        showNotification('Judul tugas tidak boleh kosong', 'error');
        return false;
    }
    return true;
}

/** [Extract Method] Kumpulkan data dari form tambah todo. */
function collectAddFormData() {
    return {
        title:       todoTitleInput.value,
        description: todoDescriptionInput.value,
        due_date:    todoDueDateInput.value,
    };
}

/** [Extract Method] Kumpulkan data dari form edit todo. */
function collectEditFormData() {
    return {
        title:       editTitleInput.value,
        description: editDescriptionInput.value,
        due_date:    editDueDateInput.value,
    };
}

/** [Extract Method] Reset form tambah dan fokus ke input judul. */
function resetAndFocusAddForm() {
    todoSubmitForm.reset();
    todoTitleInput.focus();
}

/** [Extract Method] Buka modal edit dan isi field dengan data todo yang dipilih. */
function openEditModal(todoId) {
    const targetTodo = activeTodoList.find(item => item.id === todoId);
    if (!targetTodo) return;

    currentEditingId           = todoId;
    editTitleInput.value       = targetTodo.title;
    editDescriptionInput.value = targetTodo.description;
    editDueDateInput.value     = targetTodo.due_date;
    editModalOverlay.classList.add('show');
}

/** [Extract Method] Tutup modal dan reset state edit. */
function closeEditModal() {
    editModalOverlay.classList.remove('show');
    currentEditingId = null;
    editSubmitForm.reset();
}


// =============================================================================
// EVENT HANDLERS — Tipis, mendelegasikan ke helper
// =============================================================================

async function handleAddTodo(submitEvent) {
    submitEvent.preventDefault();
    const formData = collectAddFormData();
    if (!validateTitleInput(formData.title)) return;

    await executeApiCall(
        '/api/todos', 'POST', formData,
        async (createdTodo) => {
            appendToActiveTodos(createdTodo);
            renderFilteredTodos();
            await refreshStatsDisplay();
            resetAndFocusAddForm();
            showNotification('Tugas berhasil ditambahkan!', 'success');
        },
        'Gagal menambah tugas'
    );
}

async function handleEditTodo(submitEvent) {
    submitEvent.preventDefault();
    const formData = collectEditFormData();
    if (!validateTitleInput(formData.title)) return;

    await executeApiCall(
        `/api/todos/${currentEditingId}`, 'PUT', formData,
        async (updatedTodo) => {
            updateActiveTodoById(currentEditingId, updatedTodo);
            renderFilteredTodos();
            await refreshStatsDisplay();
            closeEditModal();
            showNotification('Tugas berhasil diperbarui!', 'success');
        },
        'Gagal memperbarui tugas'
    );
}

async function handleToggleTodo(todoId) {
    await executeApiCall(
        `/api/todos/${todoId}/toggle`, 'PATCH', null,
        async (updatedTodo) => {
            updateActiveTodoById(todoId, updatedTodo);
            renderFilteredTodos();
            await refreshStatsDisplay();
        },
        'Gagal mengubah status tugas'
    );
}

async function handleDeleteTodo(todoId) {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;

    await executeApiCall(
        `/api/todos/${todoId}`, 'DELETE', null,
        async () => {
            removeFromActiveTodos(todoId);
            renderFilteredTodos();
            await refreshStatsDisplay();
            showNotification('Tugas berhasil dihapus!', 'success');
        },
        'Gagal menghapus tugas'
    );
}

async function handleRestoreTodo(itemId) {
    await executeApiCall(
        `/api/todos/${itemId}/restore`, 'PATCH', null,
        async (restoredTodo) => {
            moveFromTrashToActive(itemId, restoredTodo);
            refreshTrashCounter();
            renderFilteredTodos();
            trashRenderer.render(trashedItemList);
            await refreshStatsDisplay();
            showNotification('Tugas berhasil direstore! ↩️', 'success');
        },
        'Gagal merestore tugas'
    );
}

async function handlePermanentDelete(itemId) {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini secara permanen?')) return;

    await executeApiCall(
        `/api/trash/${itemId}`, 'DELETE', null,
        async () => {
            removeFromTrashedItems(itemId);
            refreshTrashCounter();
            trashRenderer.render(trashedItemList);
            showNotification('Item berhasil dihapus permanen', 'success');
        },
        'Gagal menghapus item'
    );
}

async function handleEmptyTrash() {
    if (!confirm('Apakah Anda yakin ingin mengosongkan trash? Semua item akan dihapus permanen!')) return;

    await executeApiCall(
        '/api/trash/empty/all', 'DELETE', null,
        async () => {
            trashedItemList = [];
            refreshTrashCounter();
            trashRenderer.render(trashedItemList);
            showNotification('Trash berhasil dikosongkan', 'success');
        },
        'Gagal mengosongkan trash'
    );
}


// =============================================================================
// EXTRACT METHOD — Event Delegation (gabung jadi satu, bukan dua listener)
// =============================================================================

/**
 * [Extract Method] Satu handler untuk semua klik di halaman.
 * Dulu: dua document.addEventListener terpisah yang keduanya jalan setiap klik.
 * Rename: 'e' → 'clickEvent' — lebih eksplisit bahwa ini adalah event object.
 */
function handleGlobalClick(clickEvent) {
    const clickedElement = clickEvent.target;

    // Klik di dalam todo item aktif
    if (clickedElement.closest('.todo-item')) {
        const todoElement = clickedElement.closest('.todo-item');
        const todoId      = parseInt(todoElement.getAttribute('data-id'));
        if (clickedElement.closest('.btn-edit'))   openEditModal(todoId);
        if (clickedElement.closest('.btn-delete')) handleDeleteTodo(todoId);
        return;
    }

    // Klik di dalam trash item
    if (clickedElement.closest('.trash-item')) {
        const trashElement = clickedElement.closest('.trash-item');
        const itemId       = parseInt(trashElement.getAttribute('data-id'));
        if (clickedElement.closest('.btn-restore'))          handleRestoreTodo(itemId);
        if (clickedElement.closest('.btn-permanent-delete')) handlePermanentDelete(itemId);
        return;
    }

    // Klik di overlay modal (di luar konten modal)
    if (clickedElement === editModalOverlay) closeEditModal();
}

/**
 * [Extract Method] Tangani perubahan filter — diekstrak dari inline handler.
 * Rename: 'e' → 'clickEvent', 'btn' → 'clickedButton'.
 */
function handleFilterChange(clickEvent) {
    filterButtonGroup.forEach(btn => btn.classList.remove('active'));
    clickEvent.target.classList.add('active');
    activeFilter = clickEvent.target.getAttribute('data-filter');
    renderFilteredTodos();
}

/** [Extract Method] Toggle visibilitas panel trash. */
function toggleTrashPanel() {
    trashPanelSection.classList.toggle('hidden');
    if (!trashPanelSection.classList.contains('hidden')) {
        trashRenderer.render(trashedItemList);
    }
}


// =============================================================================
// EXTRACT METHOD — Setup Event Listeners (dipecah per domain)
// =============================================================================

function setupFormListeners() {
    todoSubmitForm.addEventListener('submit', handleAddTodo);
    editSubmitForm.addEventListener('submit', handleEditTodo);
}

function setupFilterListeners() {
    filterButtonGroup.forEach(btn => btn.addEventListener('click', handleFilterChange));
    sortOrderSelect.addEventListener('change', (changeEvent) => {
        activeSortOrder = changeEvent.target.value;
        renderFilteredTodos();
    });
}

function setupModalListeners() {
    modalCloseButton.addEventListener('click', closeEditModal);
    modalCancelButton.addEventListener('click', closeEditModal);
}

function setupTrashListeners() {
    trashToggleButton.addEventListener('click', toggleTrashPanel);
    trashCloseButton.addEventListener('click', toggleTrashPanel);
    trashEmptyAllButton.addEventListener('click', handleEmptyTrash);
}

function setupGlobalListeners() {
    document.addEventListener('click', handleGlobalClick);
}

/** [Extract Method] Koordinator setup — dipanggil sekali saat init. */
function setupAllEventListeners() {
    setupFormListeners();
    setupFilterListeners();
    setupModalListeners();
    setupTrashListeners();
    setupGlobalListeners();
}


// =============================================================================
// EXTRACT METHOD — Utility Helpers
// =============================================================================

/**
 * [Extract Method + Rename] Format tanggal ke locale Indonesia.
 * Rename: 'formatDate' → 'formatDateToLocale' — menjelaskan *bagaimana* format dilakukan.
 */
function formatDateToLocale(dateObject) {
    return dateObject.toLocaleDateString('id-ID', {
        year:   'numeric',
        month:  'short',
        day:    'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    });
}

/**
 * [Extract Method] Tampilkan notifikasi toast.
 * Rename: 'alert' → 'notificationElement' — 'alert' adalah reserved word yang membingungkan.
 */
function showNotification(notificationMessage, notificationType = 'info') {
    const notificationElement     = document.createElement('div');
    notificationElement.className = `alert alert-${notificationType}`;
    notificationElement.textContent = notificationMessage;
    document.body.insertBefore(notificationElement, document.body.firstChild);
    setTimeout(() => notificationElement.remove(), 3000);
}


// =============================================================================
// EXTRACT METHOD — Data Loader
// =============================================================================

async function loadActiveTodos() {
    try {
        const apiResponse  = await sendApiRequest('/api/todos');
        activeTodoList = await apiResponse.json();
        renderFilteredTodos();
    } catch (networkError) {
        console.error('Gagal memuat todos:', networkError);
        showNotification('Gagal memuat data tugas', 'error');
    }
}

async function loadTrashedItems() {
    try {
        const apiResponse = await sendApiRequest('/api/trash');
        trashedItemList   = await apiResponse.json();
        refreshTrashCounter();
    } catch (networkError) {
        console.error('Gagal memuat trash:', networkError);
    }
}


// =============================================================================
// INISIALISASI APLIKASI
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    setupAllEventListeners();
    await Promise.all([
        loadActiveTodos(),
        loadTrashedItems(),
        refreshStatsDisplay(),
    ]);
});
