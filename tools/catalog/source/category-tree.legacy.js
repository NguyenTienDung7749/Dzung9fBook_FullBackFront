const categoryTree = [
  {
    label: "Sách Kinh Tế",
    slug: "sach-kinh-te",
    order: 1,
    featured: true,
    description: "Những đầu sách về kinh doanh, quản trị và tư duy tài chính.",
    children: [
      { label: "Marketing - Bán Hàng", slug: "marketing-ban-hang", order: 1 },
      { label: "Quản Trị - Lãnh Đạo", slug: "quan-tri-lanh-dao", order: 2 },
      { label: "Tài Chính - Kế Toán", slug: "tai-chinh-ke-toan", order: 3 },
      { label: "Khởi Nghiệp", slug: "khoi-nghiep", order: 4 }
    ]
  },
  {
    label: "Sách Văn Học Trong Nước",
    slug: "sach-van-hoc-trong-nuoc",
    order: 2,
    featured: true,
    description: "Tiểu thuyết, truyện ngắn và tác phẩm văn học Việt Nam nổi bật.",
    children: [
      { label: "Tiểu Thuyết", slug: "tieu-thuyet", order: 1 },
      { label: "Truyện Ngắn - Tản Văn", slug: "truyen-ngan-tan-van", order: 2 },
      { label: "Thơ Ca", slug: "tho-ca", order: 3 },
      { label: "Trinh Thám", slug: "trinh-tham", order: 4 }
    ]
  },
  {
    label: "Sách Văn Học Nước Ngoài",
    slug: "sach-van-hoc-nuoc-ngoai",
    order: 3,
    children: [
      { label: "Tiểu Thuyết", slug: "tieu-thuyet", order: 1 },
      { label: "Truyện Ngắn", slug: "truyen-ngan", order: 2 },
      { label: "Viễn Tưởng", slug: "vien-tuong", order: 3 },
      { label: "Hồi Ký - Tự Truyện", slug: "hoi-ky-tu-truyen", order: 4 }
    ]
  },
  {
    label: "Sách Thiếu Nhi",
    slug: "sach-thieu-nhi",
    order: 4,
    featured: true,
    description: "Thế giới sách dành cho bé: truyện thiếu nhi, sách ngoại ngữ và sách khoa học vui.",
    children: [
      { label: "Truyện Thiếu Nhi", slug: "truyen-thieu-nhi", order: 1 },
      { label: "Sách Ngoại Ngữ", slug: "sach-ngoai-ngu", order: 2 },
      { label: "Khoa Học Cho Bé", slug: "khoa-hoc-cho-be", order: 3 }
    ]
  },
  {
    label: "Sách Phát Triển Bản Thân",
    slug: "sach-phat-trien-ban-than",
    order: 5,
    description: "Kỹ năng sống, tư duy tích cực và cảm hứng phát triển bản thân mỗi ngày.",
    children: [
      { label: "Tâm Lý - Kỹ Năng Sống", slug: "tam-ly-ky-nang-song", order: 1 },
      { label: "Sách Học Làm Người", slug: "sach-hoc-lam-nguoi", order: 2 },
      { label: "Danh Nhân", slug: "danh-nhan", order: 3 }
    ]
  },
  {
    label: "Sách Giáo Khoa - Giáo Trình",
    slug: "sach-giao-khoa-giao-trinh",
    order: 6,
    description: "Danh mục dành cho việc học bền vững, từ bộ sách giáo khoa đến từ điển, tin học và sách tham khảo.",
    children: [
      { label: "Bộ Sách Giáo Khoa", slug: "bo-sach-giao-khoa", order: 1 },
      { label: "Từ Điển", slug: "tu-dien", order: 2 },
      { label: "Tin Học", slug: "tin-hoc", order: 3 },
      { label: "Sách Tham Khảo", slug: "sach-tham-khao", order: 4 }
    ]
  }
];
