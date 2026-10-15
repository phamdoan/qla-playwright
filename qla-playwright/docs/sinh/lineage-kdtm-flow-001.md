# Lineage — KDTM: đơn khởi kiện → bản án sơ thẩm 52-DS → kháng cáo → bản án phúc thẩm 75-DS → GĐT/TT → vụ xét xử → báo cáo thống kê

| # | Bước | Màn hình | Vai | Đọc từ state | Sinh ra | Xác minh | Cài đặt |
|---|---|---|---|---|---|---|---|
| 01 | tao-don-khoi-kien | Thêm mới đơn khởi kiện và yêu cầu | chanhAn | — | `idDon`, `soTiepNhan` | FE | có |
| 02 | phan-cong-tham-phan-xu-ly-don | Chi tiết đơn · tab Phân công | chanhAn | `idDon` | `soQuyetDinhPhanCongDon` | FE | — |
| 03 | thong-bao-sua-doi-bo-sung-26-ds | Chi tiết đơn · tab Kết quả xử lý | chanhAn | `idDon` | `soThongBao26DS` | FE | — |
| 04 | tam-ung-an-phi-29-ds | Chi tiết đơn · tab Kết quả xử lý | chanhAn | `idDon` | `soThongBao29DS` | FE | — |
| 05 | xac-minh-bien-lai | Chi tiết đơn · tab Kết quả xử lý · popup Xác minh biên lai | chanhAn | `idDon`, `soThongBao29DS` | `soBienLai` | FE | — |
| 06 | thu-ly-vu-an-30-ds | Chi tiết đơn · tab Kết quả xử lý · popup "Thụ lý vụ việc" | chanhAn | `idDon` | `maVuAnSoTham`, `idVuAnSoTham`, `soThongBao30DS` | FE | — |
| 07 | so-tham-thu-ly | Chi tiết vụ án sơ thẩm · tab Thụ lý | chanhAn | `idVuAnSoTham` | `soThuLySoTham`, `ngayThuLySoTham` | FE | — |
| 08 | so-tham-phan-cong | Chi tiết vụ án sơ thẩm · tab Phân công | chanhAn | `idVuAnSoTham` | `soQdPhanCongThamPhanSoTham`, `soQdPhanCongThuKySoTham`, `soQdPhanCongHoiTham` | FE | — |
| 09 | so-tham-phien-hop-hoa-giai | Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử | chanhAn | `idVuAnSoTham` | `soThongBao31DS`, `soBienBan35DS`, `soBienBan34DS` | FE | — |
| 10 | so-tham-dua-ra-xet-xu-47-ds | Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử | chanhAn | `idVuAnSoTham` | `soQuyetDinh47DS`, `ngayMoPhienToaSoTham` | FE | — |
| 11 | so-tham-bien-ban-phien-toa | Chi tiết vụ án sơ thẩm · tab Xét xử | chanhAn | `idVuAnSoTham`, `soQuyetDinh47DS` | `soBienBan48DS`, `soBienBan51DS` | FE | — |
| 12 | so-tham-ban-an-52-ds | Chi tiết vụ án sơ thẩm · tab Xét xử · popup Bản án sơ thẩm | chanhAn | `idVuAnSoTham`, `soBienBan48DS`, `soBienBan51DS` | `soBanAnSoTham`, `ngayBanAnSoTham`, `toaRaBanAnSoTham` | FE | — |
| 13 | so-tham-khang-cao-55-ds | Chi tiết vụ án sơ thẩm · tab Quản lý án | chanhAn | `idVuAnSoTham`, `soBanAnSoTham` | `idDonKhangCao`, `soGiayXacNhan55DS` | FE | — |
| 14 | so-tham-thong-bao-khang-cao-62-ds | Chi tiết vụ án sơ thẩm · tab Quản lý án | chanhAn | `idVuAnSoTham`, `idDonKhangCao` | `soThongBao62DS` | FE | — |
| 15 | chuyen-ho-so-len-phuc-tham | Hồ sơ chuyển đi phúc thẩm (danh sách) | chanhAn | `maVuAnSoTham` | `ngayChuyenHoSoPhucTham` | TAI-LIEU | — |
| 16 | phuc-tham-tiep-nhan-ho-so | Hồ sơ sơ thẩm chuyển đến để xét xử phúc thẩm (danh sách) | chanhAnPhucThamHanhChinh | `maVuAnSoTham`, `ngayChuyenHoSoPhucTham` | `idVuAnPhucTham`, `soTiepNhanPhucTham` | TAI-LIEU | — |
| 17 | phuc-tham-thu-ly-65-ds | Chi tiết vụ án phúc thẩm · tab Thụ lý | chanhAnPhucThamHanhChinh | `idVuAnPhucTham` | `soThuLyPhucTham`, `ngayThuLyPhucTham`, `soThongBao65DS` | FE | — |
| 18 | phuc-tham-phan-cong-84-ds | Chi tiết vụ án phúc thẩm · tab Phân công | chanhAnPhucThamHanhChinh | `idVuAnPhucTham` | `soQuyetDinh84DS` | FE | — |
| 19 | phuc-tham-tam-ung-an-phi-83-ds | Chi tiết vụ án phúc thẩm · tab Chuẩn bị xét xử | chanhAnPhucThamHanhChinh | `idVuAnPhucTham` | `soThongBao83DS` | FE | — |
| 20 | phuc-tham-dua-ra-xet-xu-66-ds | Chi tiết vụ án phúc thẩm · tab Chuẩn bị xét xử | chanhAnPhucThamHanhChinh | `idVuAnPhucTham` | `soQuyetDinh66DS`, `ngayMoPhienToaPhucTham` | FE | — |
| 21 | phuc-tham-bien-ban-phien-toa | Chi tiết vụ án phúc thẩm · tab Xét xử | chanhAnPhucThamHanhChinh | `idVuAnPhucTham`, `soQuyetDinh66DS` | `soBienBan73DS`, `soBienBanNghiAnPhucTham` | FE | — |
| 22 | phuc-tham-ban-an-75-ds | Chi tiết vụ án phúc thẩm · tab Xét xử · popup Bản án phúc thẩm | chanhAnPhucThamHanhChinh | `idVuAnPhucTham`, `soBienBan73DS`, `soBienBanNghiAnPhucTham` | `soBanAnPhucTham`, `ngayBanAnPhucTham`, `toaRaBanAnPhucTham` | FE | — |
| 23 | phuc-tham-kiem-ket-qua | Chi tiết vụ án phúc thẩm · tab Kết quả phúc thẩm | chanhAnPhucThamHanhChinh | `idVuAnPhucTham`, `soBanAnPhucTham` | `ketQuaPhucTham` | FE | — |
| 24 | gdt-tao-don-de-nghi | Danh sách đơn (GĐT) → Thêm mới đơn · tab "Thông tin bản án đề nghị" | canBo | `soBanAnPhucTham`, `ngayBanAnPhucTham`, `toaRaBanAnPhucTham` | `gdtIdDon`, `gdtMaDon`, `gdtSoThuLyDon` | FE | — |
| 25 | gdt-phan-cong-tham-phan-ngau-nhien | Quản lý đơn · Phân công thẩm phán | canBo | `gdtSoThuLyDon` | `gdtThamPhanXuLyDon` | RUNTIME | — |
| 26 | gdt-to-trinh-phan-cong | Chi tiết đơn GĐT · Danh sách văn bản | canBo | `gdtMaDon` | `gdtKhoaToTrinh` | RUNTIME | — |
| 27 | gdt-thong-bao-phan-cong | Chi tiết đơn GĐT · Danh sách văn bản | canBo | `gdtMaDon` | `gdtKhoaThongBao` | RUNTIME | — |
| 28 | gdt-cvp-duyet-to-trinh | Xem xét quyết định / Phê duyệt văn bản | chanhVanPhong | `gdtKhoaToTrinh`, `gdtKhoaThongBao` | `gdtToTrinhDaTrinhPca`, `gdtThongBaoDaKy` | RUNTIME | — |
| 29 | gdt-pca-phe-duyet-to-trinh | Xem xét quyết định / Phê duyệt văn bản | phoChanhAn | `gdtToTrinhDaTrinhPca` | `gdtToTrinhDaPheDuyet` | RUNTIME | — |
| 30 | gdt-kiem-thu-ly-don | Nhận đơn và thụ lý vụ án (Vụ GĐKT) | thuKyVuDanSu | `gdtMaDon`, `gdtSoThuLyDon` | `gdtVuAnDaThuLy` | RUNTIME | — |
| 31 | gdt-giao-tieu-ho-so-ttv | Nhận đơn và thụ lý vụ án (Vụ GĐKT) | thuKyVuDanSu | `gdtVuAnDaThuLy` | `gdtThamTraVienDuocGiao` | RUNTIME | — |
| 32 | gdt-du-thao-khang-nghi | Hồ sơ vụ án GĐT · Dự thảo quyết định kháng nghị | thamTraVienDanSu | `gdtThamTraVienDuocGiao` | `gdtKhoaDuThao` | RUNTIME | — |
| 33 | gdt-phe-duyet-khang-nghi | Xem xét quyết định / Phê duyệt văn bản | phoChanhAn | `gdtKhoaDuThao` | `gdtSoQuyetDinhKhangNghi` | RUNTIME | — |
| 34 | gdt-chuyen-nhan-ho-so-khang-nghi | Hồ sơ kháng nghị đi / đến | thuKyVuDanSu | `gdtSoQuyetDinhKhangNghi` | `gdtMaHoSoKhangNghi` | RUNTIME | — |
| 35 | gdt-thu-ly-vu-xet-xu | Quản lý vụ xét xử · Thụ lý | thamTraVienDanSu | `gdtMaHoSoKhangNghi` | `gdtSoThuLyVuXetXu` | RUNTIME | — |
| 36 | gdt-phan-cong-tham-phan-toi-cao | Quản lý vụ xét xử · Phân công | thamTraVienDanSu | `gdtSoThuLyVuXetXu` | `gdtKhoaToTrinhTPTC` | RUNTIME | — |
| 37 | gdt-ky-so-to-trinh-toi-cao | Xem xét quyết định / Phê duyệt văn bản | phoChanhAn | `gdtKhoaToTrinhTPTC` | `gdtToTrinhTPTCDaKy` | RUNTIME | — |
| 38 | gdt-phan-cong-ttv-hskn | Quản lý vụ xét xử · Phân công Thẩm tra viên | thamTraVienDanSu | `gdtSoThuLyVuXetXu` | `gdtThamTraVienHskn` | RUNTIME | — |
| 39 | gdt-danh-sach-vu-xet-xu | Quản lý vụ xét xử · Danh sách vụ xét xử | thamTraVienDanSu | `gdtSoThuLyVuXetXu` | `gdtMaVuXetXu`, `gdtKhoaChuongTrinh` | RUNTIME | — |
| 40 | gdt-phe-duyet-chuong-trinh | Công tác lãnh đạo · Chương trình làm việc | phoChanhAn | `gdtKhoaChuongTrinh` | `gdtChuongTrinhDaDuyet` | RUNTIME | — |
| 41 | gdt-quyet-dinh-hdxx | Quản lý vụ xét xử · Biểu mẫu Hội đồng | thamTraVienDanSu | `gdtMaVuXetXu` | `gdtKhoaBieuMauHoiDong` | RUNTIME | — |
| 42 | gdt-ky-logic-hdxx | Xem xét quyết định / Phê duyệt văn bản | phoChanhAn | `gdtKhoaBieuMauHoiDong` | `gdtHoiDongDaKy` | RUNTIME | — |
| 43 | gdt-man-quan-ly-vu-xet-xu | Quản lý vụ xét xử (danh sách) | thamTraVienDanSu | `gdtMaVuXetXu`, `gdtHoiDongDaKy` | `gdtTrangThaiVuXetXu` | FE | — |
| 44 | bao-cao-thong-ke | Lập báo cáo thống kê (BCTK) | chanhAn | `maVuAnSoTham`, `soBanAnSoTham`, `soBanAnPhucTham`, `gdtMaVuXetXu` | `soLieuBaoCaoThongKe` | UNKNOWN | — |
