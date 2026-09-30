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
