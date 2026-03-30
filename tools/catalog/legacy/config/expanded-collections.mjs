import { SITE_ORIGIN } from '../shared/collection-import-support.mjs';

const CATEGORY_FOREIGN_LITERATURE = 'S\u00e1ch V\u0103n H\u1ecdc N\u01b0\u1edbc Ngo\u00e0i';
const CATEGORY_CHILDREN = 'S\u00e1ch Thi\u1ebfu Nhi';
const CATEGORY_SELF_DEVELOPMENT = 'S\u00e1ch Ph\u00e1t Tri\u1ec3n B\u1ea3n Th\u00e2n';
const CATEGORY_TEXTBOOKS = 'S\u00e1ch Gi\u00e1o Khoa - Gi\u00e1o Tr\u00ecnh';

export const EXPANDED_COLLECTION_CONFIGS = [
  {
    categoryLabel: CATEGORY_FOREIGN_LITERATURE,
    subcategorySlug: 'tieu-thuyet',
    pageUrls: [
      `${SITE_ORIGIN}/collections/tieu-thuyet?page=1`,
      `${SITE_ORIGIN}/collections/tieu-thuyet?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', 'tieu-thuyet'],
    filesListName: '__van_hoc_nuoc_ngoai_tieu_thuyet_files.txt'
  },
  {
    categoryLabel: CATEGORY_FOREIGN_LITERATURE,
    subcategorySlug: 'truyen-ngan',
    pageUrls: [
      `${SITE_ORIGIN}/collections/truyen-ngan?page=1`,
      `${SITE_ORIGIN}/collections/truyen-ngan?page=4`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', 'truyen-ngan'],
    filesListName: '__van_hoc_nuoc_ngoai_truyen_ngan_files.txt'
  },
  {
    categoryLabel: CATEGORY_FOREIGN_LITERATURE,
    subcategorySlug: 'vien-tuong',
    pageUrls: [
      `${SITE_ORIGIN}/collections/truyen-vien-tuong-kinh-d`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', 'vien-tuong'],
    filesListName: '__van_hoc_nuoc_ngoai_vien_tuong_files.txt'
  },
  {
    categoryLabel: CATEGORY_FOREIGN_LITERATURE,
    subcategorySlug: 'hoi-ky-tu-truyen',
    pageUrls: [
      `${SITE_ORIGIN}/collections/tu-truyen-hoi-ky?page=1`,
      `${SITE_ORIGIN}/collections/tu-truyen-hoi-ky?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', 'hoi-ky-tu-truyen'],
    filesListName: '__van_hoc_nuoc_ngoai_hoi_ky_tu_truyen_files.txt'
  },
  {
    categoryLabel: CATEGORY_CHILDREN,
    subcategorySlug: 'truyen-thieu-nhi',
    pageUrls: [
      `${SITE_ORIGIN}/collections/truyen-tranh?page=1`,
      `${SITE_ORIGIN}/collections/truyen-tranh?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-thieu-nhi', 'truyen-thieu-nhi'],
    filesListName: '__thieu_nhi_truyen_thieu_nhi_files.txt'
  },
  {
    categoryLabel: CATEGORY_CHILDREN,
    subcategorySlug: 'sach-ngoai-ngu',
    pageUrls: [
      `${SITE_ORIGIN}/collections/sach-ngoai-ngu?page=1`,
      `${SITE_ORIGIN}/collections/sach-ngoai-ngu?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-thieu-nhi', 'sach-ngoai-ngu'],
    filesListName: '__thieu_nhi_sach_ngoai_ngu_files.txt'
  },
  {
    categoryLabel: CATEGORY_CHILDREN,
    subcategorySlug: 'khoa-hoc-cho-be',
    pageUrls: [
      `${SITE_ORIGIN}/collections/khoa-hoc-tu-nhien?page=1`,
      `${SITE_ORIGIN}/collections/khoa-hoc-tu-nhien?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-thieu-nhi', 'khoa-hoc-cho-be'],
    filesListName: '__thieu_nhi_khoa_hoc_cho_be_files.txt'
  },
  {
    categoryLabel: CATEGORY_SELF_DEVELOPMENT,
    subcategorySlug: 'tam-ly-ky-nang-song',
    pageUrls: [
      `${SITE_ORIGIN}/collections/tam-ly-ky-nang-song?page=1`,
      `${SITE_ORIGIN}/collections/tam-ly-ky-nang-song?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-phat-trien-ban-than', 'tam-ly-ky-nang-song'],
    filesListName: '__phat_trien_tam_ly_ky_nang_song_files.txt'
  },
  {
    categoryLabel: CATEGORY_SELF_DEVELOPMENT,
    subcategorySlug: 'sach-hoc-lam-nguoi',
    pageUrls: [
      `${SITE_ORIGIN}/collections/sach-hoc-lam-nguoi?page=1`,
      `${SITE_ORIGIN}/collections/sach-hoc-lam-nguoi?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-phat-trien-ban-than', 'sach-hoc-lam-nguoi'],
    filesListName: '__phat_trien_sach_hoc_lam_nguoi_files.txt'
  },
  {
    categoryLabel: CATEGORY_SELF_DEVELOPMENT,
    subcategorySlug: 'danh-nhan',
    pageUrls: [
      `${SITE_ORIGIN}/collections/danh-nhan?page=1`,
      `${SITE_ORIGIN}/collections/danh-nhan?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-phat-trien-ban-than', 'danh-nhan'],
    filesListName: '__phat_trien_danh_nhan_files.txt'
  },
  {
    categoryLabel: CATEGORY_TEXTBOOKS,
    subcategorySlug: 'bo-sach-giao-khoa',
    pageUrls: [
      `${SITE_ORIGIN}/collections/bo-sach-giao-khoa`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', 'bo-sach-giao-khoa'],
    filesListName: '__giao_khoa_bo_sach_giao_khoa_files.txt'
  },
  {
    categoryLabel: CATEGORY_TEXTBOOKS,
    subcategorySlug: 'tu-dien',
    pageUrls: [
      `${SITE_ORIGIN}/collections/tu-dien?page=1`,
      `${SITE_ORIGIN}/collections/tu-dien?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', 'tu-dien'],
    filesListName: '__giao_khoa_tu_dien_files.txt'
  },
  {
    categoryLabel: CATEGORY_TEXTBOOKS,
    subcategorySlug: 'tin-hoc',
    pageUrls: [
      `${SITE_ORIGIN}/collections/tin-hoc?page=1`,
      `${SITE_ORIGIN}/collections/tin-hoc?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', 'tin-hoc'],
    filesListName: '__giao_khoa_tin_hoc_files.txt'
  },
  {
    categoryLabel: CATEGORY_TEXTBOOKS,
    subcategorySlug: 'sach-tham-khao',
    pageUrls: [
      `${SITE_ORIGIN}/collections/sach-tham-khao?page=1`,
      `${SITE_ORIGIN}/collections/sach-tham-khao?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', 'sach-tham-khao'],
    filesListName: '__giao_khoa_sach_tham_khao_files.txt'
  }
];
