# Luồng hành chính: sơ thẩm → kháng cáo → phúc thẩm

Ghi chú thực chiến của đợt seed 26–27/09/2026 trên STG. Nguồn nghiệp vụ:
`StepData_HC.txt` (bên nghiệp vụ gửi) + `data/data-test-hanh-chinh.xlsx`, sheet "Hành chính sơ thẩm".
Spec: `tests/don-hanh-chinh-so-tham.spec.ts`. Sổ cái: `seed-output/hanh-chinh-so-tham.<env>.json`,
khoá `dong-<số dòng Excel>`.

## Kết quả đợt 26–27/09/2026

46 vụ hành chính trên STG: **38 vụ đi trọn sơ thẩm → phúc thẩm** (có bản án phúc thẩm đã ký),
8 vụ không ra bản án sơ thẩm nên không vào phúc thẩm. Không vụ nào tắc vì nghiệp vụ.

## 17 bước và mã test

| Mã | Việc |
|---|---|
| B4–B9 | Nhập đơn khởi kiện hành chính |
| S2 | Phân công Thẩm phán xử lý đơn |
| S3 | Thụ lý vụ án |
| S6 | Phân công Thẩm phán chủ tọa (131-HC) |
| S7 | QĐ đưa vụ án ra xét xử sơ thẩm (16-HC) + lịch xét xử |
| S8 / S9 | Biên bản phiên tòa (20-HC) / Biên bản nghị án (21-HC) |
| S10 | Bản án hành chính sơ thẩm (22-HC) |
| **S11** | Đơn kháng cáo (24-HC) + Giấy xác nhận đã nhận đơn (25-HC) |
| **S11b** | Thông báo về việc kháng cáo (32-HC) |
| **S12** | Hồ sơ vụ án chuyển đi → "Chuyển vụ án" |
| **PT1** | Hồ sơ vụ án chuyển đến → "Tiếp nhận" (sinh vụ phúc thẩm mới) |
| **PT2** | Thụ lý phúc thẩm |
| **PT3** | Phân công Thẩm phán chủ tọa phúc thẩm (186-HC) |
| **PT4** | QĐ đưa vụ án ra xét xử phúc thẩm (36-HC) + lịch xét xử |
| **PT5** | Biên bản phúc thẩm — **không áp dụng**, xem dưới |
| **PT6** | Bản án hành chính phúc thẩm |

Tài khoản: sơ thẩm dùng `chanhAnDanSu` (<CCCD:chanhAnDanSu> – Nguyễn Mậu Trường); phúc thẩm dùng
`chanhAnPhucThamHanhChinh` (<CCCD:chanhAnPhucThamHanhChinh> – Nguyễn Xuân Kỳ, TAND TP Hà Nội), khai ở
`config/luong-gdt.json`.

## Ba chỗ StepData_HC.txt lệch thực tế

1. **Phần phúc thẩm Step 4** ghi "Quyết định đưa vụ án ra xét xử **sơ thẩm**" — là lỗi sao chép từ
   phần sơ thẩm. Phúc thẩm phải dùng **36-HC** "đưa vụ án ra xét xử phúc thẩm"
   (`DANH_SACH_BIEU_MAU_HC_PT_CBXX`).
2. **Phần phúc thẩm Step 5** yêu cầu Biên bản phiên tòa + Biên bản nghị án, nhưng tab Xét xử phúc thẩm
   chỉ render khối lập biên bản KHI loại kết quả là "Quyết định"; đi hướng "Bản án" thì không có khối
   đó, và nút "Tạo bản án" bật sẵn không cần biên bản (`PhucTham/HanhChinhNew/.../XetXuTab.tsx`:
   `loaiKetQua === BAN_AN ? banAnSection : quyetDinhSection`). PT5 vì vậy tự nhận biết và ghi
   "không áp dụng".
3. **Thiếu hẳn bước 32-HC** "Thông báo về việc kháng cáo". Đây là bước BẮT BUỘC:
   `VuChuyenRepository#dsHoSoSoThamChuyenDiHanhChinh` chỉ đưa hồ sơ còn `CHUA_CHUYEN` vào danh sách
   chuyển đi khi đơn kháng cáo có `ID_VAN_BAN_THONG_BAO` trỏ tới văn bản đã ký, mà cột đó chỉ do
   `BieuMau32HCServiceImpl#xuLySauKySo` ghi. Thiếu 32-HC thì hồ sơ **không bao giờ** vào màn chuyển đi.
   Chính màn hình cũng ghi: *"Hồ sơ chỉ chuyển sang màn Hồ sơ chuyển đi (chuyển phúc thẩm) sau khi
   32-HC được ký số."* Lưu ý kèm: đơn phải đóng án phí thì phải ký 31-HC + ghi nhận biên lai trước
   mới lập được 32-HC; đơn miễn án phí thì lập 32-HC bình thường.

Ngoài ra menu "Hồ sơ vụ án chuyển đi/đến" nằm dưới **Hành chính › Quản lý sơ thẩm** (đúng như tài liệu),
không phải "Quản lý phúc thẩm".

## Danh mục phải nạp thêm trên STG

186HC/187HC (QĐ phân công người tiến hành tố tụng phúc thẩm) **không có** bản ghi `BIEU_MAU` lẫn
`BIEU_MAU_CAP_SO` trên STG, trong khi FE đã ẩn 143HC để thay bằng chúng ("DEMO thí điểm 1/10 ID HC34").
Hậu quả: lập được quyết định nhưng "Lấy số" thất bại im lặng (`CAU_HINH_CAP_SO_KHONG_TON_TAI`), không ký
được, không sinh `PHAN_CONG` → PT3 tắc. Người dùng thật cũng tắc y như vậy.

Đã nạp 27/09/2026 qua API (không INSERT SQL, vì `BIEU_MAU.URL` là khoá file của riêng từng môi trường):
upload file .docx lấy từ DEV → `POST /files/upload` → `POST /bieu-mau` → `POST /bieu-mau-cap-so`
trỏ vào sổ `TTC9817 – "Số test tòa tối cao"` (`D01`) mà 143HC đang dùng. Chi tiết quy trình xem memory
`nap-bieu-mau-sang-moi-truong-bang-api`.

## Công cụ

| Lệnh | Việc |
|---|---|
| `node tools/bao-cao-hanh-chinh-csv.js` | Sinh `seed-output/bao-cao-hanh-chinh-<env>.csv`: mỗi vụ một dòng kèm số/ngày bản án ST và PT, bước hiện tại, bước tiếp theo, link vụ án |
| `node tools/doi-soat-phuc-tham-hanh-chinh.js sql` → chạy trên STG → `… ap <tệp>` | Lấy trạng thái THẬT của nhánh kháng cáo/phúc thẩm từ DB rồi bù vào sổ cái |
| `node tools/doi-soat-so-cai-hanh-chinh.js sql` / `ap` | Đối soát nhánh sơ thẩm (16/20/21/22-HC) |

**Log Playwright không đủ tin ở luồng này.** Rất nhiều bước ghi dữ liệu thành công rồi test mới fail ở
câu kiểm chứng ngay sau đó, nên sổ cái thiếu bước dù DB đã có. Có lúc log báo 37 vụ fail PT1 mà DB cho
thấy 36 vụ đã tiếp nhận và đã sinh vụ phúc thẩm. **Luôn đối soát DB trước khi kết luận vụ nào tắc.**

## Bẫy UI đã gặp (đều đã xử lý trong spec)

- **antd ghép tên icon vào accessible name**: nút là `check-circle Chuyển`, `plus Thêm mới quyết định down`
  → dùng `/^(\S+ )?Tên$/`, đừng dùng `/^Tên$/`. Có lần `/^Chuyển$/` không khớp làm code rơi vào nhánh
  "đã chuyển" và ghi sổ cái sai (pass giả).
- **Đầu khối gập cũng là `<button>`** và tên nó CHỨA tên nút thật ("plus-square Quyết định plus Thêm mới
  quyết định down 0") → neo regex có mốc đầu/cuối, không thì bấm nhầm vào đầu khối.
- **Mục menu trùng tên ở hai nhánh** Quản lý sơ thẩm / phúc thẩm → mở nhánh cha rồi chỉ bấm
  `li.ant-menu-item:visible`, đừng `.first()` trên toàn menu (mục nhánh đang đóng vẫn khớp, click treo 30s).
- **Danh sách chuyển đi/đến phân trang 10 dòng** giữa hàng chục bản ghi → lọc bằng tab
  "Chưa chuyển" / "Chưa tiếp nhận". Ô tìm nhanh **không khớp mã vụ án sơ thẩm**, và sau khi tiếp nhận thì
  cột "Thông tin vụ án" đổi sang mã vụ **phúc thẩm** → khớp dòng theo **số bản án**.
- **Sau khi Tiếp nhận có hộp "Kết quả tiếp nhận (n vụ)"** che cả trang, phải đóng trước khi bấm gì khác;
  hộp này cũng cho biết luôn mã vụ phúc thẩm mới.
- **Không đi lại menu để kiểm chứng sau khi đã ghi dữ liệu** — menu là chỗ hay treo nhất, fail ở đó chỉ
  làm mất `idVuAnPt` vào sổ cái. Chuyển tab ngay trên màn đang mở.
- **Placeholder của antd Select là `<span class="ant-select-selection-placeholder">`**, không phải thuộc
  tính `placeholder` → `getByPlaceholder` không khớp.
- **Có component trùng tên ở cả hai nhánh sơ thẩm / phúc thẩm**: màn tiếp nhận hồ sơ kháng cáo mà PT1 dùng
  là `SoTham/HanhChinhNew/HoSoChuyenDen` (đúng theo menu "Quản lý sơ thẩm"), không phải
  `PhucTham/HanhChinhNew/HoSoChuyenDen`; hai nơi đều có `TiepNhanModal` nhưng khác trường nhập. Tra nguồn
  phải đi từ menu/route, đừng đoán theo tên thư mục — đọc lẫn sẽ tưởng là "source khác bản đang chạy".
- **"Loại người kháng cáo"** liệt kê đủ tư cách tố tụng nhưng vụ chỉ có người ở vài tư cách; chọn theo chỉ
  số dễ trúng tư cách rỗng (vd. "Người làm chứng") làm ô "Tên người kháng cáo" trắng. Ưu tiên
  "Người khởi kiện" → "Người bị kiện", rỗng thì tự đổi tư cách.
- **Thẻ chọn loại kết quả**: sơ thẩm là `.kqxx-pick-card`, phúc thẩm là `<button>` → nhận cả hai.
- **Toast hay tắt trước khi đọc được** (đóng popup rồi nạp lại lưới) → kiểm chứng bằng trạng thái thật
  trên dòng/nút, không chờ toast.
- **Không lấy ngày từ ô "Số thụ lý"** ở các tab không có chuỗi `TLST… ngày` (Kết quả sơ thẩm, Xét xử) —
  treo 30s. Dùng ngày trong sổ cái.
- **Trình chạy SQL in null thành chuỗi `"NULL"`**, và `nvl(x,'')` trong Oracle vẫn ra NULL vì `''` là NULL
  → công cụ đối soát phải coi `"NULL"` là rỗng, không thì ghi chữ "NULL" vào sổ cái.
- **Trợ lý ảo nổi góc phải dưới che nút ở cuối màn** → `common/luong-tkm.ts` ẩn sẵn
  `#botplatform_iframe, #chat-box-container, #qla-tro-ly-ao-lop-keo` cho mọi phiên.

## Vụ không ra bản án sơ thẩm (8 vụ)

7 vụ có cột `Đã xét xử = 0` trong Excel → spec chủ động bỏ S7–S10, đúng nghiệp vụ.
Riêng **dòng 26 / VA26-003520**: Excel ghi `Đã xét xử = 1` nhưng hệ thống đã **tạm đình chỉ bằng 15-HC**
(số 5254588, ký 25/09) từ trước đợt chạy nên không đi tiếp được. Đây là **lệch giữa Excel và dữ liệu thật**,
cần bên nghiệp vụ chốt lấy cái nào làm chuẩn.

## Ghi chú vụ hình sự VA024 (VA26-003617)

Mã đúng là **VA26-003617**. Vụ này **đã trọn sơ thẩm** (bản án 027 số 65500626 ngày 12/04/2026 đã ký);
mấy quyết định phân công dư chỉ là rác nằm lại chứ không chặn ký. Nguyên nhân chạy lại bị chết là
**B12 trong `tests/vu-an-hinh-su-so-tham.spec.ts` thiếu chốt "đã có bản án"** (B13 có, B12 không): mục
"Kết quả xét xử" khi đã lập bản án thì hiện bản án đó chứ không còn thẻ chọn "Bản án". Đã thêm
`test.skip(daXong('banAn'), …)`.
