# Flow GĐT/TT — đặc tả theo GIAO DIỆN THẬT (đo trên STG)

Nguồn: `Playwright nhập data GDT-TT (1).txt` (23 bước) + đo thực tế trên `https://qla-stg.toaan.gov.vn`
ngày 30/09/2026 bằng test chỉ đọc.

Quy ước: mỗi mục là **một action**, ghi đúng nhãn hiển thị trên giao diện. Bước nào đã chạy thành
công end-to-end mới được chốt là "ĐÃ XÁC NHẬN".

## 0. Chốt nghiệp vụ 30/09/2026

**Án Kinh doanh thương mại → "Đơn vị chuyển đến" (BƯỚC 2, tab Xử lý đơn) = Vụ giám đốc kiểm tra về DÂN SỰ.**
Đặc tả gốc chỉ liệt kê Hình sự / Dân sự / Hành chính / Lao động, thiếu KDTM. Chọn sai đơn vị ở bước
này thì tới BƯỚC 15 không tài khoản nào thấy vụ — màn "Quản lý xét xử GĐT" lọc theo đơn vị đã nhận
hồ sơ kháng nghị. Vì vậy các bước từ B10 trở đi của án KDTM dùng bộ tài khoản của Vụ dân sự (D01.107).

**Hai điều kiện ĐỘC LẬP quyết định vụ có hiện trên màn "Quản lý xét xử GĐT" hay không:**
1. Ô lọc **"Loại án"** phải đúng loại án của vụ (mặc định là Hình sự / hoặc theo đơn vị của tài khoản).
2. Tài khoản phải thuộc **đơn vị đã nhận hồ sơ kháng nghị** ở BƯỚC 14.
Đo STG 30/09/2026: thiếu (1) → 0 dòng; đủ (1) mà sai (2) → vẫn 0 dòng.

## 0b. Ghi chú cũ

**KDTM là một loại án riêng, không thuộc "Vụ dân sự".** Lên GĐT/TT chỉ khác nhau ở dropdown
**"Loại án"**. Nhánh tài khoản "Vụ dân sự" (`vuTruongDanSu`, `thamTraVienDanSu`,
`lanhDaoPhuTrachDanSu`) là bổ sung sai của lượt trước — không có trong đặc tả, phải bỏ.
Toàn bộ 23 bước dùng **một** bộ tài khoản:

| Vai | Họ tên | CCCD |
|---|---|---|
| canBo | Nguyễn Thị Thu Hường (Trưởng phòng) | 011172000008 |
| chanhVanPhong | Nguyễn Tường Linh (Chánh văn phòng) | 026067000466 |
| phoChanhAn | Nguyễn Hải Trâm (Phó Chánh án) | 001175010767 |
| thuKyVu | Trương Minh Trang (Thư ký viên Vụ hình sự) | 001303027120 |
| vuTruong | Nguyễn Thị Bình (Vụ trưởng Vụ GĐKT hình sự) | 022182001303 |
| — | TTV Bùi Thị Thanh Loan · Lãnh đạo Lê Thị Thu Hiền | (chọn trong danh mục) |

## 1. Nhãn menu THẬT — đặc tả ghi khác

Đo 30/09/2026, menu bên trái của `vuTruong` (21 mục) và `thuKyVu` (11 mục):

| Đặc tả ghi | Giao diện thật | Ghi chú |
|---|---|---|
| `Danh sách phân công TTV` | **`Phân công TTV`** | BƯỚC 11 và 18. Nhãn cũ không tồn tại → menu không mở được |
| `Nhận đơn và Thụ lý vụ án` | **`Nhận đơn và TL vụ án`** › `Danh sách` | BƯỚC 10 |
| `Phân công hội đồng xét xử` | **`Phân công Hội đồng xét xử`** | BƯỚC 21, chữ H hoa |
| `Quản lý vụ án` | `Quản lý vụ án` › `Danh sách` | BƯỚC 12 |
| — | `Vụ án phân công TPTC` | Mục menu không có trong đặc tả |
| — | `Quản lý khiếu nại`, `Án quốc hội`, `Án thời hiệu`, `Công văn trao đổi`, `Cấu hình TTV báo cáo`, `Cấu hình phân công Thẩm phán` | Ngoài phạm vi luồng |

**Menu theo vai** — `thuKyVu` KHÔNG có `Phân công thẩm phán`, `Phân công TTV`,
`Phân công Hội đồng xét xử`. Khớp đặc tả: các bước đó do `vuTruong` làm.

## 2. Bước đang CHẶN — BƯỚC 15

Đặc tả BƯỚC 15: *"Click menu: Quản lý án GĐT/TT → Quản lý xét xử GĐT. Tìm bản ghi vụ án vừa nhận từ
hồ sơ kháng nghị đến → Click thao tác 'Xem chi tiết' → tab 'Thụ lý' → button 'Thụ lý'."*

Đo thực tế màn `/qla/vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach` với **cả bốn** tài khoản
(`vuTruong`, `vuTruongDanSu`, `thuKyVu`, `thuKyVuDanSu`):

```
Tất cả (0)   |   Chưa có DS xét xử (0)   |   Đã có DS xét xử (0)      →  0 dòng
```

Không phải lỗi phân quyền của một tài khoản: **màn rỗng với mọi tài khoản đã thử.**

Trong khi đó màn `Hồ sơ kháng nghị` CÓ dữ liệu, mặc định mở tab **`Hồ sơ kháng nghị đi`**, và thấy
đúng các bản án của đợt KDTM:

```
Số KN:277/KN-HS  Ngày KN:28/09/2026  Số BAST:5   Ngày:23/09/2026  Tòa ra: TAND TP Hải Phòng  Đã chuyển
Số KN:279/KN-HS  Ngày KN:28/09/2026  Số BAST:7   Ngày:26/09/2026  Tòa ra: TAND TP Hải Phòng  Đã chuyển
Số KN:275/KN-HS  Ngày KN:28/09/2026  Số BAST:3   Ngày:24/09/2026  Tòa ra: TAND TP Hải Phòng  Chưa chuyển
```

DB: 6 vụ giai đoạn 2 loại án `004` (KDTM) tồn tại, `HOSO_KHANGNGHI_DEN.TRANG_THAI = DA_NHAN`,
`MA_DONVI_NHAN = D01.107`, mỗi vụ có 1 dòng `VUAN_TINHTRANG` nhóm `GIAI_QUYET` và 1 đơn chính
`IS_DON_CHINH = 1` mang đúng số/ngày/tòa bản án. Tức dữ liệu đủ điều kiện của câu truy vấn danh sách
(`VuAnRepository.findVuXetXuBySpec`) nhưng màn vẫn không hiện.

**Chưa xác định được**: KDTM là loại án `004`, và trên toàn STG chỉ có **6 vụ giai đoạn 2 loại 004**
— toàn bộ là của đợt này. Chưa có vụ KDTM nào từng đi qua màn Quản lý xét xử GĐT trước đây, nên
không loại trừ được khả năng màn chưa hỗ trợ loại án này.

## 3. Các bước đã đặc tả action-level (chờ chạy xác nhận)

Phần dưới ghi theo `Playwright nhập data GDT-TT (1).txt`, đã đổi nhãn menu theo giao diện thật.
Trạng thái: **ĐÃ XÁC NHẬN** = đã chạy thành công end-to-end trên STG; **CHỜ** = chưa chạy lại sau khi
bỏ nhánh Vụ dân sự.

### BƯỚC 10 — Kiểm tra thụ lý vụ án · `thuKyVu` Trương Minh Trang · CHỜ
1. Click menu `Quản lý án GĐT/TT` → `Nhận đơn và TL vụ án` → `Danh sách`.
2. Click tab `Đã có vụ án`.
3. Nhập `Số bản án/quyết định` → click button `Tìm kiếm`.
4. Kiểm tra dòng của đơn đã hiển thị.

### BƯỚC 11 — Phân công Thẩm tra viên · `vuTruong` Nguyễn Thị Bình · CHỜ
1. Click menu `Quản lý án GĐT/TT` → **`Phân công TTV`**.
2. Click tab `Chưa phân công TTV`.
3. Click radio `Phân công chỉ định`.
4. Tích checkbox dòng của đơn.
5. Cột `Thẩm tra viên`: chọn `Bùi Thị Thanh Loan`.
6. Cột `Lãnh đạo`: chọn `Lê Thị Thu Hiền`.
7. Click button `Phân công` → popup → click button `Đồng ý`.

### BƯỚC 15 — Thụ lý vụ án xét xử GĐT · `vuTruong` Nguyễn Thị Bình · **ĐANG CHẶN**
1. Click menu `Quản lý án GĐT/TT` → `Quản lý xét xử GĐT`.
2. Tìm dòng vụ án vừa nhận từ hồ sơ kháng nghị đến. ← **dừng ở đây: 0 dòng**
3. Click thao tác `Xem chi tiết`.
4. Click tab `Thụ lý`.
5. Tại khu vực `Thông tin thụ lý vụ án GĐT,TT`, click button `Thụ lý`.

### BƯỚC 19 — Tạo danh sách vụ xét xử · `vuTruong` · CHỜ
1. Click menu `Danh sách vụ xét xử`.
2. Tích checkbox vụ án đã thụ lý + phân công Thẩm phán + phân công TTV.
3. Click button `Tạo danh sách vụ xét xử`.
4. Popup `Danh sách vụ xét xử đã chọn`: chọn loại `Hội đồng toàn thể`.
5. Click button `Chọn lịch xét xử` → click ô lịch màu đỏ đã tạo sẵn → click button `Lưu`.
6. Click button `Danh sách tham mưu`.
7. Click `Xem chi tiết` vụ đã tham mưu.
8. Click button `Lấy số` → click button `Trình ký`.
9. Popup `Nhập thông tin trình duyệt ký` → click button `Gửi`.

## 4. Lệch giữa mã và đặc tả, còn phải sửa

| # | Đặc tả | Mã đang làm |
|---|---|---|
| 1 | BƯỚC 12 do **Nguyễn Thị Bình** tạo dự thảo kháng nghị | `B12a` dùng `thamTraVien` |
| 2 | BƯỚC 20 do **Nguyễn Hải Trâm** phê duyệt Chương trình làm việc | `B20` dùng `chanhAn` (Nguyễn Văn Quảng) |
| 3 | BƯỚC 23 chỉ *click vào chức năng `Quản lý vụ xét xử`* | `B23` nhập cả form Kết quả xét xử |
| 4 | Không có bước "Giao tiểu hồ sơ" | `B10b` — nhưng **thực tế bắt buộc**: bỏ thì BƯỚC 11 không thấy đơn |
| 5 | BƯỚC 13 kết thúc ở `Duyệt` | `B13b` ký QĐ kháng nghị — **thực tế bắt buộc**: bỏ thì BƯỚC 14 không thấy hồ sơ ở tab `Hồ sơ kháng nghị đi` |
| 6 | BƯỚC 2 `Đơn vị chuyển đến` chỉ liệt kê Hình sự / Dân sự / Hành chính / Lao động | KDTM không có trong danh sách → mã tự chọn Vụ dân sự |

#4 và #5 nên **bổ sung vào tài liệu**, không bỏ khỏi mã.
