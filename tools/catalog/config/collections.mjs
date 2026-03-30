import path from 'node:path';

export const catalogSourceFiles = {
  books: path.resolve('tools', 'catalog', 'source', 'books-data.legacy.js'),
  categories: path.resolve('tools', 'catalog', 'source', 'category-tree.legacy.js')
};

export const publicRuntimePaths = {
  root: path.resolve('public'),
  assets: path.resolve('public', 'assets')
};

export const catalogOutputPaths = {
  root: path.resolve('public', 'assets', 'data', 'catalog'),
  books: path.resolve('public', 'assets', 'data', 'catalog', 'books'),
  categories: path.resolve('public', 'assets', 'data', 'catalog', 'categories.json'),
  index: path.resolve('public', 'assets', 'data', 'catalog', 'catalog-index.json'),
  lookup: path.resolve('public', 'assets', 'data', 'catalog', 'lookup.json')
};

export const collectionStateFiles = [
  '__giao_khoa_bo_sach_giao_khoa_files.txt',
  '__giao_khoa_sach_tham_khao_files.txt',
  '__giao_khoa_tin_hoc_files.txt',
  '__giao_khoa_tu_dien_files.txt',
  '__khoi_nghiep_files.txt',
  '__marketing_files.txt',
  '__phat_trien_danh_nhan_files.txt',
  '__phat_trien_sach_hoc_lam_nguoi_files.txt',
  '__phat_trien_tam_ly_ky_nang_song_files.txt',
  '__quan_tri_lanh_dao_files.txt',
  '__tai_chinh_ke_toan_files.txt',
  '__thieu_nhi_khoa_hoc_cho_be_files.txt',
  '__thieu_nhi_sach_ngoai_ngu_files.txt',
  '__thieu_nhi_truyen_thieu_nhi_files.txt',
  '__van_hoc_nuoc_ngoai_hoi_ky_tu_truyen_files.txt',
  '__van_hoc_nuoc_ngoai_tieu_thuyet_files.txt',
  '__van_hoc_nuoc_ngoai_truyen_ngan_files.txt',
  '__van_hoc_nuoc_ngoai_vien_tuong_files.txt',
  '__van_hoc_tho_ca_files.txt',
  '__van_hoc_tieu_thuyet_files.txt',
  '__van_hoc_trinh_tham_files.txt',
  '__van_hoc_truyen_ngan_tan_van_files.txt'
];
