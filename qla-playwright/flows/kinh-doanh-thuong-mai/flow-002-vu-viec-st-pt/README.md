# kinh-doanh-thuong-mai · flow-002-vu-viec-st-pt

**CHƯA LÀM.** Thư mục này đang trống để giữ chỗ và địa chỉ; chưa có mã nào.

| | |
|---|---|
| Đặc tả nguồn | `docs/stepdata/StepData_KinhDoanhThuongMai_VuViec.txt` |
| Khuôn bước | `vu-viec` |
| Sao từ | **khuôn riêng — phải viết mới**, không sao được từ luồng nào đang có |
| Nuôi biểu mẫu BCTK | **4A** Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại sơ thẩm<br>**4B** Thống kê thụ lý và giải quyết các vụ, việc kinh doanh thương mại phúc thẩm |

## Chốt phải đạt

Luồng này chỉ được tính là **xong** khi có case chạy xanh tới bước làm vụ lên **"Kết quả giải
quyết"**. Chạy xanh hết bước mà vụ chưa lên kết quả thì báo cáo thống kê **không đếm được**: vụ chỉ
nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm "Kết quả xét
xử".

Khi đạt, cập nhật `bctk/ban-do-luong.ts`: `trangThai: 'xong'` + `chotKetQua: '<mã bước>'`.
Công cụ `npm run bctk:do-phu -- --cong` **thoát mã 1** nếu khai `xong` mà thiếu `chotKetQua`.

## Cần tạo thêm

- `data/kinh-doanh-thuong-mai/flow-002-vu-viec-st-pt/cases.ts` + `case-001/input.ts`
- `tests/kinh-doanh-thuong-mai/flows/flow-002-vu-viec-st-pt.spec.ts` (một spec cho cả luồng, case là dữ liệu)
