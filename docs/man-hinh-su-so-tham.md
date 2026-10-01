# Màn hình vụ án HÌNH SỰ sơ thẩm — bản đồ đo thật trên STG

Đo ngày 01/10/2026, tài khoản `chanhAnDanSu` (Tòa án nhân dân khu vực 9 - Hà Nội).
Mục đích: lần sau viết bước mới thì tra ở đây, không phải chạy một lượt 10 phút chỉ để dò tên ô.

Spec gốc do người viết: `docs/stepdata/ST_PT_Hinh_su.txt`.

## 1. Wizard "Thêm mới vụ án" (`/vu-an/so-tham/them-moi-vu-an`)

Sáu màn, thanh bước ở đầu: `Cáo trạng | Bị can | Vụ án | Tham gia tố tụng | Vật chứng | Hoàn thành`.

Nút chuyển màn tên trợ năng là **"Tiếp theo arrow-right"** — icon nằm SAU chữ, nên neo hai đầu
(`^Tiếp theo$`) là trượt. Dùng `nutTheoChu(khung, /Tiếp theo/)`.

### Bước 1 · Thông tin cáo trạng
`Trường hợp thụ lý` · `Số cáo trạng` · `Ngày bản cáo trạng` · `Số bút lục` · `Viện kiểm sát`.

### Bước 2 · Danh sách bị can
Nút `Tạo mới` mở drawer **Thêm mới bị can** (~150 ô). Nút của drawer:

```
1. Thông tin bị can | Kiểm tra | 2. Danh sách giấy tờ | Tạo mới | 3. Quan hệ gia đình Tạo mới
| 4. Thông tin tố tụng | Lấy từ OCR | 5. Điều luật áp dụng cho bị can | + Chọn tội danh
| Lưu | Lưu và thêm mới | Đóng
```

Ô đã dùng: `Tên bị can`, `Ngày tháng năm sinh`, `Số định danh cá nhân`, `Giới tính`, `Quốc tịch`,
`Dân tộc`, `Nghề nghiệp`, `Trình độ văn hóa`, `Thời điểm phạm tội`, `Ngày bị khởi tố`,
`Địa bàn phạm tội`, `Tiền án`, `Tiền sự`.

**Năm nhóm địa chỉ, tất cả bắt buộc**, theo thứ tự trên màn:

| # | Nhóm | Ô trong nhóm |
|---|---|---|
| 0 | Nơi sinh | (chi tiết) · Phường/Xã · Tỉnh/Thành phố · Quốc gia |
| 1 | Quê quán | như trên |
| 2 | Nơi đăng kí HKTT | như trên |
| 3 | Nơi tạm trú | như trên |
| 4 | Nơi ở hiện tại | như trên |

Để trống thì "Lưu" báo **"Vui lòng chọn thông tin địa chỉ"** mà KHÔNG nói nhóm nào thiếu.
Nhãn `Phường/Xã` và `Tỉnh/Thành phố` lặp 5 lần ⇒ tìm theo nhãn luôn trúng nhóm đầu/cuối; phải lấy
`.ant-form-item` theo `.nth(i)` rồi gọi `dienTrongO` (`common/antd.ts`).

`+ Chọn tội danh` mở modal cây điều luật, nút `Hủy | Thêm vào danh sách`; chọn `Điều 173` rồi
`Khoản 1` → toast `Thêm thành công` + `Đã thêm 1 tội danh`.

### Bước 3 · Thông tin vụ án
`Tên vụ án` và `Phân loại tội phạm` do **hệ thống tự điền** từ bị can + tội danh
(vd. `Vụ án Thái Công Phúc - Trộm cắp tài sản` / `Ít nghiêm trọng`). Chỉ còn
`Nội dung vụ án(Tùy chọn)` và nút `+ Thêm địa điểm xảy ra`.

### Bước 4 · Tham gia tố tụng
Nút `Tạo mới` → drawer với `Phân loại người tham gia tố tụng` (radio) rồi
**`Tư cách tham gia tố tụng`** (select). ⚠ Regex rộng kiểu `/Loại người tham gia/` trúng ô radio ở
trên và ghi `= 0` — điền sai ô mà vẫn báo thành công. Drawer này cũng có **đủ 5 nhóm địa chỉ**.
Nút: `Thông tin con người | + Thêm giấy tờ | Lưu | Lưu & thêm mới | Đóng`.

## 2. Danh mục có nhiều mục → PHẢI GÕ ĐỂ LỌC

antd ảo hoá danh sách: `allInnerTexts()` chỉ trả về phần đang render. Ô `Dân tộc` khai "Kinh" từng
báo *"không có mục khớp"* trong khi danh sách in ra mới tới `Ba-na | Bố Y | Brâu | Bru-Vân Kiều |
Chăm | Cơ-ho`. `dienOTheoNhan` nay gõ giá trị vào ô tìm của Select trước khi đọc, lọc ra rỗng thì
bỏ lọc để quay về lối cũ.

## 3. Hạn giờ

Bước 01 đặt **30 phút** (`phut` trong spec file). Mặc định 10 phút không đủ: lượt 01/10/2026 hết hạn
giữa màn "Tham gia tố tụng", Playwright đóng context, và lỗi in ra lại là *"không thấy nút Tiếp
theo"* — sai hẳn chỗ so với nguyên nhân.

`soiMan` chỉ chụp danh sách Ô khi `QLA_SOI=1` hoặc màn còn lạ: `moTaForm` trên drawer 150 ô là thứ
đã làm lượt chạy hết hạn.
