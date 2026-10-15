# FLOW_KDTM_GDT_TT — 44 bước, mỗi bước một màn hình

Chốt 30/09/2026. Một hành trình thẳng, reproducible, state xuyên suốt:

```
Đơn khởi kiện KDTM → sơ thẩm (bản án 52-DS) → kháng cáo → phúc thẩm (bản án 75-DS)
  → GĐT/TT (đơn đề nghị theo bản án phúc thẩm) → vụ xét xử GĐT → báo cáo thống kê
```

Khai báo máy đọc được: [`flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow.ts`](../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow.ts).
Bản đồ lineage sinh tự động: [`docs/sinh/lineage-kdtm-flow-001.md`](sinh/lineage-kdtm-flow-001.md) (`npm run flow:lineage:md`).

## Nguồn và mức tin

| Nguồn | Vai trò |
|---|---|
| `Tester/Scrip auto/StepData_KinhDoanhThuongMai_VuAn.txt (bản gốc ngoài repo)` | tham khảo nghiệp vụ giai đoạn A–C |
| `docs/stepdata/GDT-TT-bao-cao-thong-ke.txt` | tham khảo nghiệp vụ giai đoạn D (BƯỚC 1–23) |
| Code FE `qla-webapp/src` | **nguồn chân lý** cho route, tab, field, API |
| `common/luong-gdt-tt.ts` + `common/so-cai-tkm.ts` | đã chạy thật trên STG 27–29/09/2026 → khoá bàn giao giai đoạn D |

Mỗi bước mang một mức `xacMinh`:

| Mức | Nghĩa | Số bước |
|---|---|---|
| `FE` | đã đối chiếu route/tab/field/API trong code FE | 23 |
| `RUNTIME` | đã chạy thật, khoá bàn giao lấy từ sổ cái đã ghi | 18 |
| `TAI-LIEU` | chỉ có file .txt, chưa đối chiếu được | 2 |
| `UNKNOWN` | chưa biết màn hình thật ở đâu | 1 |

## Ba chỗ tài liệu lệch hệ thống thật

**1. Màn chi tiết vụ án sơ thẩm có HAI bản trong FE.** `VuAn/SoTham/DanSu/ChiTietVuAn` (không có
"New") là bản CŨ, tab là *Quyết định vụ án / Kết quả sơ thẩm / Kháng nghị-Kháng cáo*. Bản đang chạy
là `VuAn/SoTham/DanSuNew/ChiTietVuAn` tại route `/quan-ly-so-tham/dan-su/chi-tiet`, tab là
*Chuẩn bị xét xử / Xét xử / Quản lý án* — **đúng như StepData**. Lấy nhầm màn cũ là selector nào
cũng trượt.

**2. Vụ KDTM không có màn riêng.** `VuAn/SoTham/KinhDoanhThuongMai/ChiTietVuAn` chỉ re-export màn
CŨ và **không có route nào trỏ tới**. Vụ KDTM mở bằng route dân sự `/quan-ly-so-tham/dan-su/chi-tiet`.

**3. Màn "Báo cáo thống kê" không tồn tại trong `qla-webapp`.** Quét toàn `src` cho
`bao-cao-thong-ke|baoCaoThongKe|lap-bao-cao` → không có trang nào (chỉ có `src/pages/ThongBao`).
Tài liệu BCTK là bộ mockup HTML riêng (`Prototype_LapBaoCao_ThongKe_*.html`, dashboard 3 cấp) → BCTK
là **ứng dụng khác**. Bước 44 giữ `UNKNOWN` tới khi có URL/môi trường thật — không đoán.

Thêm một lệch nhỏ theo chiều ngược lại: FE **có** tab `ket-qua-phuc-tham` mà StepData không nhắc.
Đó là chỗ đối chiếu "Giữ nguyên bản án sơ thẩm" tốt nhất → thành bước 23.

## State xuyên suốt

Một file cho mỗi case, đọc gộp liên thư mục (`toa-an`, `toa-an-chay-rieng-*`):

```
state/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001.<env>.state.json
```

Trường của state **không khai bằng tay**: mỗi bước khai `vao` (đọc) và `ra` (sinh ra) trong
`flow.ts`, `duLieu` của CaseState là hợp của mọi `ra`. Các khoá hiện có:

```ts
interface FlowStateKdtm {
  // A · đơn khởi kiện
  idDon: string;                     // 01 — URL chi-tiet?id=
  soTiepNhan: string;                // 01 — hệ thống cấp, ô khoá
  soQuyetDinhPhanCongDon: string;    // 02
  soThongBao26DS: string;            // 03
  soThongBao29DS: string;            // 04
  soBienLai: string;                 // 05
  maVuAnSoTham: string;              // 06 — API thụ lý trả data.maVuAn
  idVuAnSoTham: string;              // 06 — thongTinThuLyTomTat.idVuAn
  soThongBao30DS: string;            // 06

  // B · sơ thẩm
  soThuLySoTham: string;             // 07
  ngayThuLySoTham: string;           // 07
  soQdPhanCongThamPhanSoTham: string;// 08
  soQdPhanCongThuKySoTham: string;   // 08
  soQdPhanCongHoiTham: string;       // 08
  soThongBao31DS: string;            // 09
  soBienBan35DS: string;             // 09
  soBienBan34DS: string;             // 09
  soQuyetDinh47DS: string;           // 10
  ngayMoPhienToaSoTham: string;      // 10
  soBienBan48DS: string;             // 11
  soBienBan51DS: string;             // 11
  soBanAnSoTham: string;             // 12 ★ đầu vào GĐT nếu đề nghị theo bản án ST
  ngayBanAnSoTham: string;           // 12 ★
  toaRaBanAnSoTham: string;          // 12 ★
  idDonKhangCao: string;             // 13
  soGiayXacNhan55DS: string;         // 13
  soThongBao62DS: string;            // 14
  ngayChuyenHoSoPhucTham: string;    // 15

  // C · phúc thẩm
  idVuAnPhucTham: string;            // 16
  soTiepNhanPhucTham: string;        // 16
  soThuLyPhucTham: string;           // 17
  ngayThuLyPhucTham: string;         // 17
  soThongBao65DS: string;            // 17
  soQuyetDinh84DS: string;           // 18
  soThongBao83DS: string;            // 19
  soQuyetDinh66DS: string;           // 20
  ngayMoPhienToaPhucTham: string;    // 20
  soBienBan73DS: string;             // 21
  soBienBanNghiAnPhucTham: string;   // 21
  soBanAnPhucTham: string;           // 22 ★ đầu vào GĐT (luồng chuẩn)
  ngayBanAnPhucTham: string;         // 22 ★
  toaRaBanAnPhucTham: string;        // 22 ★
  ketQuaPhucTham: string;            // 23 — mong đợi "Giữ nguyên bản án sơ thẩm"

  // D · GĐT/TT (tên khoá lấy đúng theo sổ cái đã chạy: common/so-cai-tkm.ts · DongSoCaiTKM)
  gdtIdDon: string;  gdtMaDon: string;  gdtSoThuLyDon: string;        // 24
  gdtThamPhanXuLyDon: string;                                        // 25
  gdtKhoaToTrinh: string;                                            // 26
  gdtKhoaThongBao: string;                                           // 27
  gdtToTrinhDaTrinhPca: string; gdtThongBaoDaKy: string;             // 28
  gdtToTrinhDaPheDuyet: string;                                      // 29
  gdtVuAnDaThuLy: string;                                            // 30
  gdtThamTraVienDuocGiao: string;                                    // 31
  gdtKhoaDuThao: string;                                             // 32
  gdtSoQuyetDinhKhangNghi: string;                                   // 33
  gdtMaHoSoKhangNghi: string;                                        // 34
  gdtSoThuLyVuXetXu: string;                                         // 35
  gdtKhoaToTrinhTPTC: string;                                        // 36
  gdtToTrinhTPTCDaKy: string;                                        // 37
  gdtThamTraVienHskn: string;                                        // 38
  gdtMaVuXetXu: string; gdtKhoaChuongTrinh: string;                  // 39
  gdtChuongTrinhDaDuyet: string;                                     // 40
  gdtKhoaBieuMauHoiDong: string;                                     // 41
  gdtHoiDongDaKy: string;                                            // 42
  gdtTrangThaiVuXetXu: string;                                       // 43

  // E · báo cáo
  soLieuBaoCaoThongKe: string;                                       // 44
}
```

`npm run flow:lineage` kiểm: **mọi khoá một bước đọc phải do một bước trước nó sinh ra**. Sai thì
thoát mã 1 — bắt được lỗi "hard-code lại dữ liệu bước trước đã tạo" ngay lúc khai báo, không cần chạy.

## Không hard-code giữa các bước

Sai:

```ts
await page.getByLabel('Số bản án').fill('377/2026/KDTM-PT');
```

Đúng:

```ts
than: async ({ page, can }) => {
  await page.getByLabel('Số bản án').fill(can('soBanAnPhucTham'));
  ...
}
```

`can(khoa)` thiếu khoá thì ném lỗi **chỉ rõ bước phải chạy lại**, không rơi về giá trị mặc định.

Giai đoạn D hôm nay lấy bản án từ Excel (`common/ban-an-so-tham.ts` · `FILE_INPUT`). Cầu nối đã
viết: [`gdt-tt.flow.ts`](../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/gdt-tt.flow.ts) ·
`banAnTuState(DD)` dựng `BanAnSoTham` từ CaseState, thiếu khoá thì ném lỗi — **không** thay bằng số
trong Excel, vì đơn GĐT phải trỏ đúng bản án của case này.

Đối chiếu FE cho biết ba ô đó đi vào đâu
(`qla-webapp/src/pages/QuanLyDon/ThemMoiDon/type.ts` · `FIELD_NAMES.THONG_TIN_BAN_AN`):

| Ô trên màn | Field FE | Lấy từ state |
|---|---|---|
| Số bản án | `thongTinBanAn.soBanAnQd` | `soBanAnPhucTham` |
| Ngày bản án | `thongTinBanAn.ngayBanAnQd` | `ngayBanAnPhucTham` |
| Cấp xét xử | `thongTinBanAn.capXetXu` | hằng `'Phúc thẩm'` theo cấp đề nghị |
| Tòa ra bản án | `thongTinBanAn.maToaXetXu` / `tenToaXetXu` | `toaRaBanAnPhucTham` |
| Loại án | `thongTinBanAn.loaiAn` | **hệ thống tự điền** sau khi bấm kính lúp |
| Thủ tục giải quyết | `thongTinBanAn.thuTucGiaiQuyet` | `input.ts` (Giám đốc thẩm / Tái thẩm) |

Bấm icon kính lúp là hệ thống **tra bản án thật**, nên bản án do bước 22 tạo phải tồn tại và tìm
được — đó là điểm nối thật sự giữa Step 1 và Step 2, không phải việc điền lại con số.

## Format của từng bước

Không viết hai nơi. Format bắt buộc (Màn hình · Route · Vai · Đọc từ state · Sinh ra · Nguồn đặc tả ·
Xác minh) là **các trường của một bước trong `flow.ts`**, và khung ghi chúng vào annotation của test
lúc chạy. Bảng đầy đủ 44 bước kèm cột "Cài đặt":
[`docs/sinh/lineage-kdtm-flow-001.md`](sinh/lineage-kdtm-flow-001.md) (`npm run flow:lineage:md`).

Cả luồng nằm trong **một file spec**:

```
tests/kinh-doanh-thuong-mai/flows/flow-001-st-pt-gdt-bao-cao.spec.ts   ← gọi khaiLuong(...)
flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/
├── flow.ts        ← 44 bước (bản đồ)
├── cai-dat.ts     ← mã bước → thân; hiện 1/44
└── *.flow.ts      ← thân nghiệp vụ
data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/
├── cases.ts       ← danh sách case; hàng nghìn case thì sinh từ bảng (dsCaseTuBang)
└── case-001/input.ts, expected.ts
```

Chạy một phần: `--buoc=01..06`, `--buoc=12,22`, `--case=case-001`, `--so-case=5`.

### Bốn bước xương sống (chi tiết đã xác minh)

**STEP 01 — Tạo đơn khởi kiện KDTM**

* Màn hình: `quan-ly-don/don-khoi-kien-va-yeu-cau/them-moi` (wizard 5 bước)
* Điều kiện đầu vào: tài khoản Tòa sơ thẩm, `QLA_TKM_CHO_PHEP_GHI=1`
* Input: toàn bộ từ `input.ts` (tất định; tên đương sự mang NHÃN CHỮ của case, vd. "Trần Kinh Doanh Aab" — FE chặn chữ số trong họ tên, xem `khung/nhan-case.ts`)
* Action: Thông tin đơn → Đương sự → Yêu cầu → Tài liệu → Hoàn thành → **Xử lý đơn**
* Expected: điều hướng sang `chi-tiet?id=<idDon>&tab=thong-tin-chung`
* Output: `idDon`, `soTiepNhan`
* Nguồn xác minh: FE `ThemMoiWizardBody.tsx:145-176, 200-252`
* **Ghi chú kỹ thuật:** đơn được TẠO ngay khi bấm "Tiếp theo" ở bước Thông tin đơn
  (`validate` của `STEP_KEYS.THONG_TIN_DON` gọi `dongBoNeuCan` → `postDonKhoiKien` → trả `idDon`);
  bước Yêu cầu gọi `putDonKhoiKien`; "Xử lý đơn" gọi `putHoanTatTaoDon(idDon)`. State của wizard nằm
  trong React chứ không trong URL, nên 5 bước wizard **không tách** được thành 5 file spec — tách là
  phải quay vào màn "Chỉnh sửa đơn", thêm rủi ro mà không thêm giá trị.
* Status: **PASS** (đã chạy được trước khi chuẩn hóa)

**STEP 06 — Thụ lý vụ (30-DS) → sinh mã vụ án**

* Màn hình: `chi-tiet?id={idDon}&tab=ket-qua-xu-ly` · popup "Thụ lý vụ việc"
* Input: `idDon` từ state
* Action: "Thụ lý vụ" → Lấy số → Xác nhận thụ lý
* Expected: toast `Thụ lý đơn thành công, đã tạo vụ việc <maVuAn>`; nút đổi thành mã vụ án
* Output: `maVuAnSoTham`, `idVuAnSoTham`, `soThongBao30DS`
* Nguồn xác minh: FE `ChiTiet/KetQuaXuLyTab/index.tsx:1084-1131, 1813`
  (API trả `data.maVuAn`; `thongTinThuLyTomTat.idVuAn` có sẵn để lấy id)
* Status: **UNKNOWN** — chưa cài đặt, chờ spec

**STEP 22 — Bản án phúc thẩm (75-DS)**

* Màn hình: `quan-ly-phuc-tham/dan-su/chi-tiet?id={idVuAnPhucTham}&tab=xet-xu`
* Điều kiện đầu vào: đã có 73-DS và 51-DS (nút "Tạo bản án phúc thẩm" mới mở)
* Input: `idVuAnPhucTham`, `soBienBan73DS`, `soBienBanNghiAnPhucTham` — tất cả từ state
* Action: Tạo bản án phúc thẩm → Lưu → **Lấy số** → Ký logic → Đóng
* Expected: có số bản án hệ thống cấp; tab Kết quả phúc thẩm hiện "Giữ nguyên bản án sơ thẩm"
* Output: `soBanAnPhucTham`, `ngayBanAnPhucTham`, `toaRaBanAnPhucTham`
* Nguồn xác minh: FE `VuAn/PhucTham/DanSuNew/ChiTietVuAn/index.tsx:32-41`
* Status: **UNKNOWN** — chưa cài đặt, chờ spec

**STEP 24 — Đơn đề nghị GĐT theo bản án phúc thẩm**

* Màn hình: `quan-ly-don/them-moi` · tab "Thông tin bản án đề nghị"
* Điều kiện đầu vào: bản án phúc thẩm của bước 22 đã ký và tra cứu được
* Input: `soBanAnPhucTham`, `ngayBanAnPhucTham`, `toaRaBanAnPhucTham` — **từ state, không từ Excel**
  (cầu nối `banAnTuState(DD)`)
* Action: nhập 3 ô + Cấp xét xử → bấm kính lúp (hệ thống tự điền Loại án) → Thủ tục giải quyết →
  các tab Thông tin đơn / Nội dung đơn / Xử lý đơn / Thông tin khiếu nại
* Expected: tạo được hồ sơ đơn, có mã đơn và số thụ lý đơn
* Output: `gdtIdDon`, `gdtMaDon`, `gdtSoThuLyDon`
* Nguồn xác minh: FE `QuanLyDon/ThemMoiDon/type.ts` · `FIELD_NAMES.THONG_TIN_BAN_AN`;
  route `routes.ts:606`; cài đặt đã chạy: `common/luong-gdt-tt.ts` B1–B2
* Status: **UNKNOWN** trong khung mới (bản cài đặt cũ đã PASS trên STG nhưng đọc Excel)

## Còn phải chốt

1. **Bước 15, 16** (`TAI-LIEU`): route màn "Hồ sơ chuyển đi phúc thẩm" và "Hồ sơ chuyển đến" do menu
   máy chủ cấp, không có entry trong `routes.ts` → chốt bằng một lượt chạy thật rồi ghi lại.
2. **Bước 44** (`UNKNOWN`): BCTK ngoài `qla-webapp` — cần URL/môi trường, hoặc đổi cách kiểm (API/DB).
3. **Tài khoản Tòa sơ thẩm**: bản StepData mới của Tester dùng một CCCD chưa khai trong
   `config/tai-khoan.local.json`; bản cũ ghi tài khoản ứng với `chanhAnDanSu`, nhưng **đo 30/09/2026**
   tài khoản đó mở màn danh sách đơn ra "Rất tiếc! Không tìm thấy trang!". Case-001 tạm chạy
   `chanhAn` (Chánh án TANDTC). Đổi một chỗ: `input.ts` · `vaiSoTham` / `vaiPhucTham`.
4. **Đương sự pháp nhân**: StepData yêu cầu "Doanh nghiệp / Tổ chức"; `common/form-nguoi.ts` hiện chỉ
   có nhánh cá nhân → case-001 tạm dùng cá nhân.

## Chuyển giai đoạn GĐT/TT vào khung FLOW/CASE/STEP — bảy cái bẫy đo 02/10/2026

Giai đoạn D (bước 24→45) không còn chạy bằng `common/luong-gdt-tt.ts` + sổ cái Excel nữa; thân nghiệp
vụ chuyển sang `flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/gdt-tt.flow.ts`, dữ liệu nối
bước lấy từ CaseState. Các điều sau đo trên STG trong ngày, mỗi điều đã mất ít nhất một lượt chạy:

1. **Thứ tự thật khác tài liệu.** "Thông báo phân công TP" (tài liệu B5) chỉ lập được SAU KHI Phó
   Chánh án phê duyệt tờ trình: bộ lọc loại văn bản chỉ liệt kê đơn CHƯA có văn bản đó. Vì vậy khung
   xếp 26 tờ trình → 27 CVP trình PCA → 28 PCA phê duyệt → 29 thông báo → 30 CVP ký thông báo (thêm
   một bước so với bản khai cũ, các bước sau dồn +1).
2. **MENU V3** (`src/layouts/MenuV3`): trang có HAI thẻ `<aside>`, thẻ ĐỨNG TRƯỚC là thẻ ẩn, nên
   `locator('aside').first()` luôn là cái ẩn; menu thật là `aside[aria-label="Menu chính"]`. Mục menu
   giờ là `<a>` (role `link`), không còn `role=menuitem`. Nhãn đổi: "Quản lý án GĐT/TT" →
   "Giám đốc thẩm, tái thẩm", "Nhận đơn và TL vụ án" → "Nhận đơn và thụ lý vụ án", "Phân công TTV" →
   "Phân công thẩm tra viên". Kiểu "Bàn khởi động" xếp mục dưới `section.bk-card` nên bấm bị
   "intercepts pointer events" → `common/menu.ts` đi theo `href` của chính mục menu.
3. **SỐ BẢN ÁN: hiển thị ≠ lưu.** Lưới và biểu mẫu hiện số GHÉP `<số>/<năm>/<ký hiệu>`
   ("12/2026/KDTM-ST"), còn `BAN_AN.SO_BAN_AN` chỉ là `12`. Mọi màn GĐT và API tra cứu khớp theo cột
   thật → bước 22 lấy bằng chứng từ API `GET /ban-an/dan-su/so-tham/vu-an/{idVuAn}`.
4. **TÊN TÒA: đầu bản án viết HOA.** Template bản án in "TÒA ÁN NHÂN DÂN THÀNH PHỐ HÀ NỘI" trong khi
   danh mục đơn vị lưu "Tòa án nhân dân thành phố Hà Nội"; `GET /don-vi?tenDonVi=<CHỮ HOA>` trả rỗng.
   Bước 22 vì vậy lấy `tenDonViRaBanAn` của bản ghi bản án.
5. **Tra cứu bản án cũ đòi khớp CẢ BỐN**: số + ngày + `maDonVi` + `giaiDoan`
   (`DonServiceImpl.traCuuToanBoBanAnCu` → `findBySoBanAnAndNgayBanAnAndMaDonViAndGiaiDoan…`), với
   `giaiDoan` là TÊN ENUM (`PHUC_THAM`), kèm `quyetDinhBanAn=BAN_AN`, và API đòi Bearer token (cookie
   không đủ → 401). Lệch một cái là màn chỉ nói "Không tìm thấy bản án trong hệ thống".
6. **"Loại án" mặc định theo VỤ của người đăng nhập** (`getMacDinhLoaiAnTheoDonVi`): Vụ 1 → Hình sự,
   Vụ 2 → Dân sự, Vụ 3 → KDTM… Vụ KDTM của luồng này nằm ở Vụ dân sự nên màn "Quản lý vụ án" mặc định
   lọc "Dân sự" và vụ của case biến mất, dù ô trông như TRỐNG. Phải đặt lại ô "Loại án".
7. **Vụ GĐ3 không có bản ghi `BAN_AN` riêng** (thông tin bản án nằm trên ĐƠN) → ở màn "Quản lý vụ án"
   KHÔNG lọc được theo "Số BA/QĐ" (0 dòng dù vụ vẫn ở đó). Khoá lọc đúng là **Số thụ lý đơn**.

Ngoài ra: nhãn loại án mà hệ thống tự điền sau tra cứu là "Kinh doanh thương mại" (KHÔNG dấu phẩy),
khác nhãn danh mục loại đơn "Kinh doanh, thương mại".

### Điểm 8 (người dùng chỉ ra 02/10/2026): các tab của vụ GĐT khoá vì "Thông tin vụ án" chưa đầy đủ

Nghiệp vụ: tab "Thông tin vụ án" của vụ GĐT phải ĐẦY ĐỦ thì các tab khác mới mở. Thông tin đó đến từ
một trong hai đường — (1) nhập trực tiếp ở màn "Quản lý án", (2) đã có sẵn khi tạo hồ sơ vụ án từ bước
tạo đơn (đường hay gặp hơn, cũng là đường của luồng này).

Đo trên vụ của case-001: vụ sinh từ đơn vẫn thiếu **đúng một ô bắt buộc** — "Quan hệ pháp luật thống kê"
(lưu lần đầu báo "Vui lòng chọn Quan hệ pháp luật thống kê"). Điền ô đó rồi Lưu → toast "Cập nhật vụ án
thành công" và tab "Tờ trình" MỞ ĐƯỢC ngay.

Ba cái bẫy của riêng ô này:
- Nó là **TreeSelect** (cây), không phải Select: nút của cây là `.ant-select-tree-node-content-wrapper`,
  nên mọi helper chọn Select đều báo "không có mục khớp" dù danh mục có.
- Cây **ảo hoá** và nhãn lá viết dạng `- Mua bán hàng hoá` kèm mã `QHPL_xxxx` → khớp cả câu
  "Tranh chấp hợp đồng mua bán hàng hoá" là trượt. Giá trị gieo phải là CHUỖI LỌC.
- Lọc quá ngắn thì trúng nhãn sai: `mua bán` chọn ra "- Mua bán cổ phiếu, trái phiếu và giấy tờ có giá
  khác". Dùng `mua bán hàng ho` (đỡ cả hai cách viết *hoá/hóa*).

Khi ô ĐÃ CÓ giá trị, antd ẩn `input.ant-select-selection-search-input` → phải bấm vào
`.ant-select-selector` chứ không bấm ô tìm kiếm, và bỏ qua nếu giá trị hiện tại đã đúng (chạy lại bước
mà mở ra chọn lại là rủi ro chọn trượt).

### Điểm 9 (02/10/2026): CHỦ TOẠ HĐXX = CHÁNH ÁN, không phải người được phân công ở bước 38

Chuỗi này đã làm tôi mò 5 lượt chạy ở case-001 và case-002, nên ghi lại đủ mắt, kèm chỗ đọc được trong
mã FE (`qla-webapp`) thay vì đoán từ màn hình:

1. **Bước 38 (B16) — danh sách thẩm phán của màn "Phân công thẩm phán" chỉ có CHỨC DANH
   `TPTATC_001`** (`PhanCongThamPhanVu/index.tsx` → `getDsChucDanhTheoFilter` + `useDanhSachThamPhan`,
   còn trừ người đã tắt nhận phân công). Trên STG chỉ có 6 người và **không có Nguyễn Hải Trâm**
   (Phó Chánh án) — chỉ định đích danh ông ấy ở bước này là không thể.
2. **Bước 41 (B19) — tài liệu chốt "Chọn loại: Hội đồng toàn thể", và với loại đó FE ÉP chủ toạ =
   người có CHỨC VỤ "Chánh án"** trong danh mục Thẩm phán TANDTC (`ModalTaoDSVuXetXu/index.tsx`:
   `laChucVuChanhAn` + `useEffect(laHoiDongToanThe → setChuToaDaChon(chuToaChanhAn))`). Chọn người khác
   bị ghi lại ngay, nên **đừng truyền chủ toạ cho bước 41**. Đo thật: danh sách của case-002 tạo ra với
   "Chủ toạ: Nguyễn Văn Quảng" dù bước 38 phân công ngẫu nhiên cho người khác.
3. **Người ký văn bản = chủ toạ, và hộp "Trình ký" KHOÁ ô người ký** (`VanBanCapSoActions/index.tsx`:
   `nguoiKyVanBan` có `disabled`) → Chương trình làm việc HĐXX về hàng chờ duyệt của **Chánh án**.
   Payload tạo văn bản cũng ghi thẳng `maNguoiKy = chuToaHienTai.taiKhoan`.
4. **Nên bước 42 (B20) phải chạy bằng vai `chanhAn`** (STG: Nguyễn Văn Quảng). Tài liệu BƯỚC 20 ghi
   NGUYỄN HẢI TRÂM là **dữ liệu môi trường của người viết tài liệu**, không phải quy tắc — tên người
   trong tài liệu không suy ra được vai khi dữ liệu cán bộ mỗi môi trường một khác.

Hệ quả cho bộ kịch bản: bước 38 **giữ nguyên phân công ngẫu nhiên đúng tài liệu B16**. Tham số
`thamPhanChiDinh` của `phanCongThamPhanTANDTC` vẫn còn (dùng khi cần chỉ định tay), và cơ chế đúng của
màn đó là: ô "-- Chọn thẩm phán --" + ô "Lý do phân công (chung)" nằm trên **THANH CÔNG CỤ** của bảng
(không ở trong dòng như màn Phân công TTV, không ở trong hộp thoại nào); thiếu một trong hai thì nút
"Phân công chỉ định (n …)" chỉ bật `message.warning` rồi thoát, **không mở hộp nào** —
`kiemTraTruocKhiPhanCong` → `Modal.confirm 'Xác nhận phân công'`. Đổi thẩm phán sau khi đã phân công thì
vào tab "Quản lý kết quả phân công", cột "Thẩm phán" có nút **"Sửa"** (Select + "Chọn thời điểm" +
"Lý do thay đổi" + Lưu), hiện khi `record.khoaSua = false`.

### Điểm 10 (02/10/2026): TẠO danh sách vụ xét xử LÀ ĐÃ TRÌNH KÝ

`ModalTaoDSVuXetXu.handleLuu` gọi `taoVanBanHoiDongXetXu` với `maNguoiKy` = chủ toạ và báo
**"Đã trình ký danh sách vụ xét xử"** (nhánh cập nhật thì báo "Đã cập nhật"). Vậy ngay sau khi Lưu,
dòng trên "Danh sách tham mưu" đã ở trạng thái **"Chờ duyệt"** và popup chi tiết KHÔNG còn nút
"Lấy số"/"Trình ký" — mục 7 của tài liệu B19 chỉ còn đúng với danh sách tạo từ lượt khác.

Trạng thái của màn này là `TrangThaiHoiDongXetXuConfig`: **Chưa trình / Chờ duyệt / Đã duyệt / Từ chối**.
Kịch bản coi "Chờ duyệt | Đã duyệt | Đã trình ký" là xong, còn **"Từ chối" thì dừng hẳn** (người duyệt
đã trả lại, phải xử lý tay) — tuyệt đối không coi là xong.

### Điểm 11 (02/10/2026): hàm đổi vai của spec ăn luôn vai GĐT

`tests/kinh-doanh-thuong-mai/flows/flow-001-st-pt-gdt-bao-cao.spec.ts` có hàm `vai(buoc, input)` để
case chạy ở tòa khác cấp: `buoc.vai === 'chanhAn' → input.vaiSoTham`. Các bước sơ thẩm dùng `chanhAn`
theo nghĩa "chánh án của TÒA SƠ THẨM" (case-002: `chanhAnDanSu` = Nguyễn Mậu Trường), nên ánh xạ đó
kéo luôn **bước 42** sang tòa dân sự: log ghi "mở phiên mới cho vai chanhAnDanSu", hàng chờ duyệt có 10
dòng của vụ khác và không có Chương trình làm việc nào → báo "không thấy đề xuất", rất dễ kết luận sai
là "văn bản không về hàng Chánh án".

Chặn bằng nguồn đặc tả: chỉ đổi khi bước KHÔNG thuộc `GĐT/TT`
(`buoc.vai === 'chanhAn' && !(buoc.nguon ?? '').includes('GĐT/TT')`). Mọi bước `chanhAn` còn lại đều có
`nguon: 'StepData KDTM · …'` nên không ảnh hưởng. Bài học chung: **vai trong flow là tên vai, không phải
tên người**; mỗi ánh xạ vai phải nói rõ nó áp dụng cho giai đoạn nào.

### Điểm 12 (02/10/2026): chạy lại bước 41 không lưu id → bước 42 không neo được (case-001)

`laySoVaTrinhKyThamMuu` chỉ trả về id văn bản khi CHÍNH lượt đó bấm Lấy số → Trình ký. Lượt chạy lại
thấy dòng đã ở "Chờ duyệt" thì bỏ qua và trả `undefined`, nên sổ cái ghi `gdtKhoaChuongTrinh =
"đã trình · <số bản án>"`. Bước 42 mất id phải đi dò hàng chờ, mà **dòng trong hàng chờ của Chánh án
không hiện số bản án hay tên đương sự** (chỉ "Chương trình làm việc của HĐXX | người tạo | thời điểm"),
nên không chốt được danh tính vụ. Đúng ra phải dừng: đoán rồi bấm Phê duyệt là duyệt lên văn bản của vụ
khác.

Đó là chỗ case-001 đang dừng (41/45): chương trình của nó được trình từ một lượt trước nên không có id
trong sổ cái; hàng chờ Chánh án hôm 02/10 có 3 "Chương trình làm việc của HĐXX" của các vụ khác nhau.
case-002 không gặp vì bước 41 tạo + trình trong cùng lượt nên có id thật (`5b22aa15-…`).

Việc cần làm nếu muốn chạy lại bền: khi bỏ qua trình ký, đọc `idVanBan` từ phản hồi API danh sách tham
mưu (`/phan-cong-hoidong-xetxu/tham-muu`) của chính dòng đó rồi trả về, để bước 42 luôn dùng
`moChiTietTheoId` thay vì dò theo tên loại văn bản.

**Diễn biến tiếp (03/10/2026):** chạy lại bước 41 của case-001 thì màn "Danh sách tham mưu" lọc theo số
bản án **12** + ngày 16/10/2026 ra **0 dòng** — hôm 02/10 vẫn còn dòng đó (bước 41 đọc được trạng thái
nên bỏ qua trình ký). Nghĩa là bản ghi hội đồng/danh sách của case-001 không còn tìm được nữa.

Nghi vấn (CHƯA xác minh, đừng ghi vào kết luận): đúng cái rủi ro ở điểm 10/mục cảnh báo — hai case dùng
chung một lịch xét xử thì `updateVanBanHoiDongXetXu` **thay toàn bộ** `danhSachIdVuAn`
(ModalTaoDSVuXetXu/index.tsx:747,758), nên danh sách của case-001 (bản án 12) có thể đã bị danh sách của
case-002 (bản án 13, cùng ngày 16/10/2026) ghi đè. Muốn xác minh: lọc Danh sách tham mưu theo số 13 và
đếm xem có MẤY hội đồng, hoặc mở hội đồng đó xem danh sách vụ bên trong là 12 hay 13.

Kết luận thực dụng: **không chữa case-001 nữa** — luồng đã được case-002 chứng minh trọn vẹn, và việc
còn lại là dọn dữ liệu mà chính hệ thống ghi đè. Mỗi case phải có LỊCH XÉT XỬ GĐT/TT RIÊNG ngay từ đầu.

### Điểm 13 (03/10/2026): BCTK có trong hệ thống, nhưng luồng KHÔNG đi qua nó

Đính chính ghi chú cũ ("BCTK không nằm trong qla-webapp → là ứng dụng khác" — SAI, vì **menu do máy chủ
cấp** nên quét `qla-webapp/src` không ra). Màn thật:

- `/qla/bctk/ds`, `/qla/bctk/hs`, `/qla/bctk/gdttt` — `ds` và `gdttt` render CÙNG một màn.
- Vai thấy mục "Báo cáo thống kê": `chanhAn`, `phoChanhAn`, `chanhAnDanSu`, `thamTraVienDanSu`.
  `chanhVanPhong` và `vuTruongDanSu` KHÔNG có.
- Nội dung: dashboard — thẻ KPI ("Điểm KPI", "Hôm nay tôi cần ký", "Quá hạn / sắp quá hạn") và một
  bảng số liệu theo tháng, hàng `DS | KDTM | HNGĐ | LĐ | HS | HC`, cột `10…9 + Tổng` (năm công tác).
  KHÔNG có ô lọc, KHÔNG có nút lập báo cáo.

Vì số liệu là tổng hợp TOÀN CƠ QUAN nên không kiểm được "vụ của case đếm đúng ô": người khác tạo vụ
song song thì số nhảy, +1 cũng không chứng minh được là vụ mình. **Người dùng chốt bỏ bước 46**
(03/10/2026) → luồng dừng ở 45 bước. Muốn kiểm tới từng vụ thì phải có biểu mẫu báo cáo CÓ THAM SỐ
(đúng loại mà `Tester/Testcase_BCTK_4_KDTM.xlsx` mô tả) — chưa thấy trên môi trường này.
