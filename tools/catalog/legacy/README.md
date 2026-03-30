# Legacy Catalog Tooling

Thu muc nay giu cac entry script cho pipeline import cu.

- `shared/`: helper va runner dung chung.
- `config/`: nhom config collection, danh sach source URL va du lieu override duoc tai su dung giua nhieu script.
- `import-*.mjs`, `backfill-*.mjs`: entrypoint mong, giu tham so va goi shared runner.

Muc tieu cua cau truc nay la:

- khong de logic fetch/merge/download bi copy-paste giua nhieu script
- giu duong dan data/state theo repo hien tai
- cho phep tiep tuc chay tooling legacy ma khong lam ban runtime frontend
