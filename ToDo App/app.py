"""
ToDo App - Refactored Backend
Teknik: Extract Method, Rename Variable, Polymorphism (Response Strategy)
"""

from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

DATA_FILE = 'todos.json'
DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'


# =============================================================================
# POLYMORPHISM — Response Strategy
# Menggantikan pola if/else berulang untuk membentuk response JSON.
# Setiap kelas merepresentasikan satu jenis response, bukan satu blok kondisi.
# =============================================================================

class TodoResponse:
    """Base response strategy untuk semua operasi todo."""

    def success(self, data, status_code=200):
        return jsonify(data), status_code

    def not_found(self, entity='Todo'):
        return jsonify({'error': f'{entity} tidak ditemukan'}), 404

    def deleted(self, entity='Todo'):
        return jsonify({'message': f'{entity} berhasil dihapus'}), 200


class TrashResponse(TodoResponse):
    """Response strategy khusus operasi Trash — override pesan yang relevan."""

    def not_found(self, entity='Item'):
        return jsonify({'error': f'{entity} tidak ditemukan di trash'}), 404

    def deleted(self, entity='Item'):
        return jsonify({'message': f'{entity} berhasil dihapus permanen'}), 200

    def emptied(self):
        return jsonify({'message': 'Trash berhasil dikosongkan'}), 200


# Instance response strategy (dipakai oleh endpoint masing-masing)
todo_response = TodoResponse()
trash_response = TrashResponse()


# =============================================================================
# EXTRACT METHOD — Data Access Layer
# Semua logika baca/tulis file diekstrak ke fungsi-fungsi kecil yang fokus.
# =============================================================================

def read_todos_from_file():
    """[Extract Method] Hanya membaca raw data dari file JSON."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as file_handle:
            return json.load(file_handle)
    except json.JSONDecodeError as parse_error:
        app.logger.error(f'File JSON rusak, tidak bisa diparse: {parse_error}')
        return []
    except OSError as io_error:
        app.logger.error(f'Gagal membaca file data: {io_error}')
        return []


def write_todos_to_file(todo_list):
    """[Extract Method] Hanya menulis data ke file JSON."""
    with open(DATA_FILE, 'w', encoding='utf-8') as file_handle:
        json.dump(todo_list, file_handle, ensure_ascii=False, indent=2)


def ensure_todo_has_required_fields(todo_item):
    """[Extract Method] Menjamin setiap todo punya field yang dibutuhkan.
    Diekstrak dari load_todos() dan toggle_todo() yang sama-sama melakukan ini.
    """
    todo_item.setdefault('in_trash', False)
    todo_item.setdefault('deleted_at', None)
    return todo_item


def migrate_legacy_completed_todos(todo_list):
    """[Extract Method] Upgrade data lama: todo completed → masuk trash.
    Logika migrasi dipisah dari logika baca file agar keduanya bisa ditest sendiri.
    """
    needs_save = False
    for todo_item in todo_list:
        ensure_todo_has_required_fields(todo_item)
        is_completed = todo_item.get('completed', False)
        is_not_in_trash = not todo_item.get('in_trash', False)
        if is_completed and is_not_in_trash:
            todo_item['in_trash'] = True
            todo_item['deleted_at'] = todo_item['deleted_at'] or current_timestamp()
            needs_save = True
    return todo_list, needs_save


def load_todos():
    """Memuat, memigrasikan, dan mengembalikan semua todos.
    Setelah Extract Method, fungsi ini hanya mengkoordinasi — tidak melakukan detail.
    """
    todo_list = read_todos_from_file()
    migrated_list, needs_save = migrate_legacy_completed_todos(todo_list)
    if needs_save:
        write_todos_to_file(migrated_list)
    return migrated_list


def save_todos(todo_list):
    """Alias publik untuk write_todos_to_file — menjaga kompatibilitas nama."""
    write_todos_to_file(todo_list)


# =============================================================================
# EXTRACT METHOD — Domain Logic Helpers
# Logika bisnis yang berulang di banyak endpoint diekstrak ke sini.
# =============================================================================

def current_timestamp():
    """[Extract Method] Satu tempat untuk format waktu — tidak hardcode di mana-mana."""
    return datetime.now().strftime(DATETIME_FORMAT)


def find_todo_by_id(todo_list, target_id):
    """[Extract Method] Pencarian todo by ID — dulu diulang 4x di endpoint berbeda.
    Rename: 'todo' → 'target_id' agar jelas ini yang dicari, bukan yang ditemukan.
    """
    return next((item for item in todo_list if item['id'] == target_id), None)


def filter_active_todos(todo_list):
    """[Extract Method] Ambil todos yang tidak di trash.
    Dulu inline di get_todos() dan get_stats() sebagai list comprehension duplikat.
    """
    return [item for item in todo_list if not item.get('in_trash', False)]


def filter_trashed_todos(todo_list):
    """[Extract Method] Ambil todos yang sedang di trash."""
    return [item for item in todo_list if item.get('in_trash', False)]


def remove_todo_by_id(todo_list, target_id):
    """[Extract Method] Hapus todo dari list by ID.
    Dulu identik di delete_todo() dan delete_permanent() — tidak ada bedanya sama sekali.
    """
    return [item for item in todo_list if item['id'] != target_id]


def move_todo_to_trash(todo_item):
    """[Extract Method] Memindahkan todo ke trash — dipisah dari toggle logic.
    Rename: 'deleted_at' tetap, tapi assignment dikelompokkan jadi satu aksi bermakna.
    """
    todo_item['in_trash'] = True
    todo_item['deleted_at'] = current_timestamp()
    return todo_item


def restore_todo_from_trash(todo_item):
    """[Extract Method] Kebalikan dari move_to_trash — konsisten sebagai pasangan."""
    todo_item['in_trash'] = False
    todo_item['deleted_at'] = None
    todo_item['completed'] = False
    return todo_item


def generate_next_todo_id(todo_list):
    """[Extract Method] Generate ID aman — pakai max(id)+1, bukan len()+1.
    Rename: nama fungsi menjelaskan *mengapa* ini ada, bukan hanya *apa* yang dilakukan.
    Bug lama: len(todos)+1 bisa duplikat jika ada item yang dihapus sebelumnya.
    """
    if not todo_list:
        return 1
    return max(item['id'] for item in todo_list) + 1


def build_new_todo(request_data, all_todos):
    """[Extract Method] Konstruksi objek todo baru dari request.
    Rename: 'data' → 'request_data', 'todos' → 'all_todos' — lebih eksplisit konteksnya.
    """
    return {
        'id': generate_next_todo_id(all_todos),
        'title': request_data.get('title', ''),
        'description': request_data.get('description', ''),
        'completed': False,
        'created_at': current_timestamp(),
        'due_date': request_data.get('due_date', ''),
        'in_trash': False,
        'deleted_at': None,
    }


def apply_todo_updates(todo_item, update_data):
    """[Extract Method] Terapkan field update ke todo yang sudah ada.
    Rename: 'todo' → 'todo_item', 'data' → 'update_data' — hindari nama generik.
    """
    todo_item['title'] = update_data.get('title', todo_item['title'])
    todo_item['description'] = update_data.get('description', todo_item['description'])
    todo_item['completed'] = update_data.get('completed', todo_item['completed'])
    todo_item['due_date'] = update_data.get('due_date', todo_item['due_date'])
    return todo_item


def calculate_todo_statistics(active_todo_list):
    """[Extract Method] Hitung statistik dari list todos aktif.
    Rename: 'todos' → 'active_todo_list' — jelas ini hanya todos yang tidak di trash.
    """
    total_count = len(active_todo_list)
    completed_count = sum(1 for item in active_todo_list if item['completed'])
    pending_count = total_count - completed_count
    return {
        'total': total_count,
        'completed': completed_count,
        'pending': pending_count,
    }


# =============================================================================
# ROUTES — Sekarang tipis, mendelegasikan ke helper dan response strategy
# =============================================================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/todos', methods=['GET'])
def get_todos():
    all_todos = load_todos()
    active_todos = filter_active_todos(all_todos)
    return todo_response.success(active_todos)


@app.route('/api/todos', methods=['POST'])
def add_todo():
    request_data = request.json
    all_todos = load_todos()
    new_todo_item = build_new_todo(request_data, all_todos)
    all_todos.append(new_todo_item)
    save_todos(all_todos)
    return todo_response.success(new_todo_item, status_code=201)


@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    update_data = request.json
    all_todos = load_todos()
    target_todo = find_todo_by_id(all_todos, todo_id)
    if not target_todo:
        return todo_response.not_found()
    apply_todo_updates(target_todo, update_data)
    save_todos(all_todos)
    return todo_response.success(target_todo)


@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    all_todos = load_todos()
    updated_list = remove_todo_by_id(all_todos, todo_id)
    save_todos(updated_list)
    return todo_response.deleted()


@app.route('/api/todos/<int:todo_id>/toggle', methods=['PATCH'])
def toggle_todo(todo_id):
    all_todos = load_todos()
    target_todo = find_todo_by_id(all_todos, todo_id)
    if not target_todo:
        return todo_response.not_found()

    target_todo['completed'] = not target_todo['completed']

    # Saat selesai → otomatis masuk trash (logika bisnis tetap sama)
    if target_todo['completed'] and not target_todo.get('in_trash', False):
        move_todo_to_trash(target_todo)

    save_todos(all_todos)
    return todo_response.success(target_todo)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    all_todos = load_todos()
    active_todos = filter_active_todos(all_todos)
    statistics = calculate_todo_statistics(active_todos)
    return todo_response.success(statistics)


@app.route('/api/trash', methods=['GET'])
def get_trash():
    all_todos = load_todos()
    trashed_items = filter_trashed_todos(all_todos)
    return trash_response.success(trashed_items)


@app.route('/api/todos/<int:todo_id>/restore', methods=['PATCH'])
def restore_todo(todo_id):
    all_todos = load_todos()
    target_todo = find_todo_by_id(all_todos, todo_id)
    if not target_todo or not target_todo.get('in_trash', False):
        return trash_response.not_found()
    restore_todo_from_trash(target_todo)
    save_todos(all_todos)
    return trash_response.success(target_todo)


@app.route('/api/trash/<int:todo_id>', methods=['DELETE'])
def delete_permanent(todo_id):
    all_todos = load_todos()
    updated_list = remove_todo_by_id(all_todos, todo_id)
    save_todos(updated_list)
    return trash_response.deleted()


@app.route('/api/trash/empty/all', methods=['DELETE'])
def empty_trash():
    all_todos = load_todos()
    remaining_todos = filter_active_todos(all_todos)
    save_todos(remaining_todos)
    return trash_response.emptied()


if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)
