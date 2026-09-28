# Đối chiếu luồng GĐT/TT: tài liệu ↔ code e2e

Nguồn nghiệp vụ: `Playwright nhập data GDT-TT.docx` (bản 27/09/2026 17:00, đánh số liền 1→22: đã có
Bước 11 Giao tiểu hồ sơ, Bước 15 Người ký ban hành QĐ kháng nghị, Bước 17+18 phân công Thẩm phán TANDTC,
và ghi chú lịch xét xử sau Bước 19) — bản gốc ở `C:\Users\GTEL ICT\Downloads`, bản văn bản thuần đồng nội dung ở
`docs/Playwright nhập data GDT-TT.txt`.
Code: `common/luong-gdt-tt.ts` (đăng ký các bước) + `pages/gdt.page.ts`, `pages/phe-duyet.page.ts`,
`pages/them-moi-don.page.ts`, `common/buoc-nhap-don.ts`. Tài khoản: `config/luong-gdt.json`.

Cập nhật: 27/09/2026 — kiểm chứng trên STG (22 vụ hình sự đợt 26-09 + 10 bản án biểu 1C1).

## 1. Bảng đối chiếu từng bước

| Tài liệu | Test trong code | Tài khoản (config) | Tình trạng |
|---|---|---|---|
| B1–B2 Nhập đơn theo bản án | `B1–B2 · Nhập đơn theo bản án` | canBo (Nguyễn Thị Thu Hường) | ✅ Đã bổ sung tick **"Thời hiệu giải quyết"** (bắt buộc từ qla-webapp 88ea29d) — `TrangThemMoiDon.chonThoiHieuGiaiQuyetNeuTrong` |
| B3 Phân công thẩm phán ngẫu nhiên | `B3 · Phân công thẩm phán` | canBo | ✅ |
| B4 Tờ trình phân công TP → Trình ký | `B4 · Tờ trình phân công thẩm phán → Trình ký` | canBo | ✅ |
| B5 Thông báo phân công TP → Trình ký | `B5 · Thông báo phân công TP → Trình ký` | canBo | ✅ |
| B6–B7 CVP cho ý kiến, trình PCA, ký logic | `B6–B7` + `B7b` | CVP (Nguyễn Tường Linh) | ✅ |
| B8–B9 PCA phê duyệt tờ trình | `B8–B9 · Phó Chánh án phê duyệt Tờ trình` | PCA (Nguyễn Hải Trâm) | ✅ |
| B10 Thư ký: tab "Đã có vụ án" | `B10 · …tab Đã có vụ án` | thuKyVu (Trương Minh Trang) | ⚠ Chỉ kiểm tra hiển thị; hay báo "không thấy vụ" dù dữ liệu đúng |
| B11 Giao tiểu hồ sơ cho TTV | `B11 · Giao tiểu hồ sơ` | thuKyVu | ✅ Đã bổ sung vào tài liệu 27/09. ⚠ Màn "Giao tiểu hồ sơ" liệt kê mọi đơn, phân trang — code chỉ nhìn trang 1 → đơn cũ không thấy |
| B12 Vụ trưởng phân công TTV | `B12 · phân công Thẩm tra viên` | vuTruong (Nguyễn Thị Bình) | ⚠ Tìm dòng theo **chuỗi con** số bản án |
| B13 TTV tạo dự thảo KN → Trình (PCA Nguyễn Hải Trâm) | `B13a` + `B13b` | thamTraVien = **Bùi Thị Thanh Loan** (<CCCD:thamTraVien>, đúng tài liệu) | ⚠ `moVuAn` tìm theo chuỗi con (số "26" mở nhầm vụ khác); B13b lọc `/Kháng nghị\|Dự thảo/` → có thể trình nhầm dự thảo khác loại (vd 055 Trả lời đơn) |
| B14 PCA duyệt dự thảo KN + B15 Người ký ký QĐ | `B14` + `B15` | PCA | ⚠ Ghi sổ cái "xong" kể cả khi không tìm thấy gì. Duyệt ở B14 đã ban hành QĐ; `B15` lấy BẤT KỲ đề xuất KN đang chờ |
| B16 Thư ký chuyển + nhận Hồ sơ kháng nghị | `B16 · chuyển và nhận Hồ sơ kháng nghị` | thuKyVuHoSoKhangNghi = **Trương Minh Trang** (<CCCD:thuKyVu>, đúng tài liệu) | ⚠ Lọc chuỗi con; cùng bản án có nhiều hồ sơ KN (cũ/mới) thì khớp nhầm. Nhận hồ sơ → **sinh vụ xét xử GĐT (VUAN.GIAI_DOAN = 2)** |
| B17 + B18 Phân công Thẩm phán TANDTC cho vụ xét xử | `B17` (Vụ trưởng) + `B18` (PCA ký logic) | vuTruong → phoChanhAn | ✅ Đã bổ sung vào tài liệu 27/09; chạy **22/22 lượt đạt** cho 22 vụ. Xem mục 2 |
| B19 Vụ trưởng: thụ lý GĐT → tạo DS vụ xét xử → lấy số, trình ký | `B19` | vuTruong | ⚠ Thụ lý + tạo DS + lấy số đạt cho cả 22 vụ, nhưng **chỉ trình ký được 1 vụ**: mọi vụ dùng chung một lịch xét xử nên ghi đè nhau. Xem mục 5 |
| B20 Chánh án phê duyệt Chương trình làm việc | `B20` | chanhAn (Nguyễn Văn Quảng) | ✅ Đạt VA017 |
| B21 Thư ký thêm QĐ thành lập HĐXX + TB VKS → Trình ký | `B21` | thuKyVu | ✅ Đạt VA017 sau khi sửa (mục 3). Trình ký **trong từng popup**, không phải một nút chung |
| B22 Chánh án ký logic 2 biểu mẫu | `B22` | chanhAn | ✅ Đạt VA017: `TLHDXXGDT` + `BM_TBVKSTGPT` TRANG_THAI = 1 (đã ký). Tab "Kết quả xét xử" chỉ kiểm `TLHDXXGDT` đã ký (Tab_KetQuaXetXu/index.tsx:386) |

## 2. Bước bắt buộc trước B19: phân công Thẩm phán TANDTC (nay là B17 + B18)

Popup "Danh sách vụ xét xử đã chọn" (ModalTaoDSVuXetXu) chặn Lưu:
*"Vụ án chưa xác định thẩm phán chủ tọa, không thể trình ký"* khi vụ chưa có thẩm phán.

Nguồn dữ liệu của popup (đã kiểm chứng):
- `QuanLyVuXetXu/index.tsx:152` → `thamPhanChuToaHoTen: record.tenTP`; `record` từ `GET /xetxu-gdt`.
- `XetXuGdtController.getDanhSach` → `XetXuGdtServiceImpl.getDanhSach` → `tenTP` =
  `PhanCongRepository.findLatestThamPhanGiamDocThamByIdVuAnIn(idVuAn, resolveVaiTroTptc())`:
  `PHAN_CONG.VAI_TRO = 'TA.TP.001'` (Thẩm phán TAND tối cao), `GIAI_DOAN_VU_AN` = GĐT, `TRANG_THAI` = đã duyệt.

(Ghi chú kiểm thử trong bản `.txt` 12:03 quy cho `DanhSachXetXuServiceImpl.phanCongVuXetXu` /
`findByPhanCongXetXuByIdVuAn` — đó là API của màn Phân công HĐXX, không phải nguồn của popup này.)

Bằng chứng STG: mọi vụ xét xử GĐT có `TA.TP.001` **đã duyệt (TRANG_THAI = 2)** đều đã lập được danh sách vụ xét xử
(VA26-003255, 003268, 003270, 003343, 003348, 003349); vụ chỉ mới lập (TRANG_THAI = 1) thì chưa.

Cách làm thật (theo vụ mẫu VA26-003270, 23/09/2026):
1. **Vụ trưởng Nguyễn Thị Bình** — menu Quản lý án GĐT/TT › **Phân công thẩm phán**
   (qla-webapp `pages/VuAn/GdtTt/PhanCongThamPhanVu`): chọn vụ xét xử, phân công Thẩm phán TANDTC
   → lập **"Tờ trình phân công thẩm phán tối cao" (MS_02_TC)**, người ký Nguyễn Hải Trâm → trình Phó Chánh án.
2. **Phó Chánh án Nguyễn Hải Trâm** — Công tác lãnh đạo › Phê duyệt đề xuất › Chờ duyệt → phê duyệt tờ trình.
   → `PHAN_CONG (TA.TP.001).TRANG_THAI = 2` → B19 lưu được danh sách vụ xét xử.

Đã bổ sung vào tài liệu (Bước 17 + 18, bản .docx và .txt 27/09/2026 16:40) và vào code (`B17`, `B18`
trong `common/luong-gdt-tt.ts`). Thẩm phán dùng trong cấu hình: **Lê Hưng Dũng**
(`nghiepVu.thamPhanTANDTC`) — vụ mẫu còn dùng Nguyễn Văn Dũng, Lương Ngọc Trâm, đổi được qua config.

## 3. Chỗ giao diện đã khác tài liệu / code (đã sửa trong `pages/gdt.page.ts`, 27/09/2026)

| Chỗ | Tài liệu / code cũ | Giao diện hiện tại | Đã sửa |
|---|---|---|---|
| Danh sách "Quản lý xét xử GĐT" | code lấy dòng đầu trang 1 | ~200 vụ, phân trang | Lọc "Nhập số BA/QĐ" + số bản án đứng riêng (`locDanhSachXetXu`) |
| Nút thụ lý vụ GĐT | "Thụ lý" | **"Thụ Lý"** | Không phân biệt hoa thường |
| Loại hội đồng | Select | antd **Segmented**: "Hội đồng 5 thẩm phán" \| "Hội đồng toàn thể" | `.ant-segmented-item` + kiểm `ant-segmented-item-selected` |
| Chọn lịch xét xử | bấm vào lịch đỏ | bấm lịch không chọn; phải rê chuột → **"Chọn lịch này"** (tooltip) | Hover + nút tooltip, chờ khung lịch đóng |
| Sau khi Lưu DS | chờ toast | màn cảnh báo bằng message và giữ popup | Ném lỗi với đúng nội dung cảnh báo |
| B21 Cấu hình nơi nhận | nút "Thêm mới nhận" | nút **"Thêm nơi nhận"**; dòng sửa có 2 Select "Chọn phân loại" / "Chọn nơi nhận" (ô sau khoá tới khi chọn phân loại) + link "Lưu"; thiếu thì FE báo *"Vui lòng cấu hình ít nhất một nơi nhận"* | Chọn mục đầu mỗi ô, ghim dòng theo `data-row-key`, kiểm dòng đã lưu |
| B21 Tên biểu mẫu | "…phiên toà" | "…phiên **tòa**" (khác mã Unicode) | Đổi cấu hình; so khớp chấp nhận cả "oà/òa" (`boDauLinhHoat`) |
| B21 TB VKS | — | "Ngày thông báo" bắt buộc (id `…_ngayQuyetDinh`) | Tìm ô theo nhãn bắt buộc, điền ngày hôm nay |
| B21 Trình ký | một nút "Trình ký" ở màn chi tiết sau khi thêm cả 2 | Lưu xong popup **vẫn mở**, footer có Lấy số / Trình ký / In biểu mẫu; toast "Đã cấp số thành công", "Đã trình ký văn bản" | Trong từng popup: Lấy số → Trình ký → Gửi → Đóng; ghi `idVanBan` (từ request trình ký) vào sổ cái `khoaBieuMauHoiDong` |
| B22 Chờ duyệt | tìm theo tên trên trang 1 | Chánh án có ~65 đề xuất chờ duyệt, 10 dòng/trang, nhiều vụ cùng tên biểu mẫu | Mở theo id văn bản của B21 (`moChiTietTheoId`) |
| `PheDuyetPage.mo()` gọi lần 2 | — | bấm lại "Công tác lãnh đạo" đang mở làm menu **đóng** | Mở lại menu cha nếu mục con bị ẩn |

## 4. Rủi ro còn lại trong code (chưa sửa — code luồng đã chốt)

- Tìm dòng theo **chuỗi con số bản án**: `moVuAn`, `phanCongTTV`, `chuyenVaNhanHoSoKhangNghi`,
  `laySoVaTrinhKyThamMuu`. Số ngắn (16, 23–29) hoặc trùng số (515) → mở/thao tác nhầm vụ.
- `giaoTieuHoSo`: màn Giao tiểu hồ sơ phân trang, chỉ nhìn trang 1.
- `B14`/`B15`/`B16` ghi sổ cái "xong" dù không tìm thấy bản ghi để xử lý.
- `B13b` (`trinhToTrinhThamTra`) lọc `/Kháng nghị|Dự thảo/` → trình cả dự thảo khác loại.
- Vụ cũ thiếu trường mới bắt buộc (vd "Thông tin khiếu nại") → màn chi tiết vụ chặn thao tác.

## 5. Chặn thật ở B19: mỗi vụ cần một lịch xét xử riêng (27/09/2026)

Chạy 20 vụ trên STG: **B17 + B18 đạt 22/22 lượt**, thụ lý và tạo danh sách vụ xét xử đều chạy, văn bản
Chương trình làm việc HĐXX (`CTLVHDXX`) được cấp số **33 → 53**. Nhưng **0/21 văn bản đó có
`YEUCAU_PHEDUYET`** — tức chưa trình ký được; chỉ số 32 (VA017, 14:51) có.

Nguyên nhân: `LICH_XET_XU` với `LOAI_NGHIEP_VU = 'HOIDONG_XETXU'` trên STG chỉ có **2 dòng**, mọi lượt đều
chọn cùng lịch **26/09/2026 11:00 – Phòng xét xử 102**. Lưu danh sách lên lịch đã có danh sách thì hệ
thống **THAY** danh sách cũ bằng vụ mới, nên 20 vụ ghi đè nhau. Vụ bị thay ra: popup chi tiết ở Danh sách
tham mưu chỉ còn **Đóng / Xem biểu mẫu / Hủy cấp số**, không có Trình ký.

Đã xử lý trong code (`pages/gdt.page.ts`):

- `taoDanhSachVuXetXu` — chốt chặn trước khi Lưu nêu rõ "MỖI VỤ CẦN MỘT LỊCH XÉT XỬ RIÊNG" và trỏ về tài liệu.
- `laySoVaTrinhKyThamMuu` — không thấy nút Trình ký thì **báo lỗi ngay trong 15s** kèm nguyên nhân (trước
  đây chờ hết 30s rồi chỉ báo timeout selector).
- Thông báo lỗi "chưa xác định thẩm phán chủ tọa" đã sửa: chỉ đúng vào **thiếu B17/B18**, không còn quy
  cho lỗi truy vấn backend (kết luận cũ sai).

**Không suy luận từ source `qla/` trong máy nữa**: `DANH_SACH_XETXU`, `DANH_SACH_XETXU_VUAN`,
`HOIDONG_XETXU` trên STG đều **0 dòng** trong khi màn Danh sách tham mưu vẫn liệt kê 43 bản ghi → bản build
chạy trên STG khác source đang có.

**Việc cần nghiệp vụ:** tạo sẵn một lịch xét xử GĐT cho mỗi vụ trước B15 (hoặc xác nhận cách thêm vụ vào
danh sách đã có mà không ghi đè). Chưa có thì B15 chỉ chạy trọn cho đúng 1 vụ mỗi lịch.

## 6. Đánh số lại 1→22 và trả tài khoản về đúng tài liệu (27/09/2026)

Trước đây các bước bổ sung mang số phụ nên dãy chỉ tới B18. Nay dồn thành **22 bước liền mạch**, khớp
tài liệu `.docx`:

| Số cũ | Số mới | Bước |
|---|---|---|
| B10b | **B11** | Giao tiểu hồ sơ cho Thẩm tra viên |
| B11 | **B12** | Vụ trưởng phân công Thẩm tra viên |
| B12a / B12b | **B13a / B13b** | TTV tạo dự thảo kháng nghị / trình xin ý kiến |
| B13 | **B14** | Phó Chánh án duyệt dự thảo |
| B13b | **B15** | Người ký ban hành Quyết định kháng nghị *(mới thêm vào tài liệu)* |
| B14 | **B16** | Chuyển và nhận Hồ sơ kháng nghị |
| B14b / B14c | **B17 / B18** | Phân công Thẩm phán TANDTC / PCA ký logic tờ trình |
| B15 | **B19** | Thụ lý GĐT → danh sách vụ xét xử → lấy số, trình ký |
| B16 / B17 / B18 | **B20 / B21 / B22** | Duyệt chương trình làm việc / biểu mẫu HĐXX / ký biểu mẫu |

Khoá sổ cái (`xongBuoc`: `nhapDon`, `phanCong`, `giaoTieuHoSo`, `phanCongTTV`, `duThaoKetQua`, …) **không
đổi**, nên sổ cái của các lượt chạy trước vẫn dùng lại được, không vụ nào phải chạy lại từ đầu.

**Tài khoản đã trả về đúng tài liệu** (`config/luong-gdt.json`):

| Vai | Trước | Nay (theo tài liệu) |
|---|---|---|
| `thamTraVien` | Nguyễn Thị Bình <CCCD:vuTruong> (tạm) | **Bùi Thị Thanh Loan <CCCD:thamTraVien>** |
| `thuKyVuHoSoKhangNghi` | Nguyễn Thị Bình <CCCD:vuTruong> (tạm) | **Trương Minh Trang <CCCD:thuKyVu>** |

Hai tài khoản này trước đó bị thay vì thiếu quyền — lý do đã đo được giữ nguyên trong trường `_canhBao`
của từng mục. Nếu B13a không thấy vụ ở màn Quản lý vụ án, hoặc B16 thấy tab "Hồ sơ kháng nghị đi" trống,
thì **cấp quyền cho đúng tài khoản đó**, không đổi sang tài khoản khác.
