# lao-dong · flow-001-vu-an-st-pt

**CHƯA LÀM.** Thư mục này đang trống để giữ chỗ và địa chỉ; chưa có mã nào.

| | |
|---|---|
| Đặc tả nguồn | `docs/stepdata/StepData_LaoDong_VuAn.txt` |
| Khuôn bước | `vu-an` |
| Sao từ | `flows/dan-su/flow-001-st-pt (đang dùng lại nguyên bộ bước 01→23 của luồng KDTM)` |
| Nuôi biểu mẫu BCTK | **5A** Thống kê thụ lý và giải quyết các vụ, việc lao động sơ thẩm<br>**5B** Thống kê thụ lý và giải quyết các vụ, việc lao động phúc thẩm |

## Chốt phải đạt

Luồng này chỉ được tính là **xong** khi có case chạy xanh tới bước làm vụ lên **"Kết quả giải
quyết"**. Chạy xanh hết bước mà vụ chưa lên kết quả thì báo cáo thống kê **không đếm được**: vụ chỉ
nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm "Kết quả xét
xử".

Khi đạt, cập nhật `bctk/ban-do-luong.ts`: `trangThai: 'xong'` + `chotKetQua: '<mã bước>'`.
Công cụ `npm run bctk:do-phu -- --cong` **thoát mã 1** nếu khai `xong` mà thiếu `chotKetQua`.

## Cần tạo thêm

- `data/lao-dong/flow-001-vu-an-st-pt/cases.ts` + `case-001/input.ts`
- `tests/lao-dong/flows/flow-001-vu-an-st-pt.spec.ts` (một spec cho cả luồng, case là dữ liệu)

## Ghi chú

Trùng khuôn vụ án với dân sự. Bộ 111 bản án thật đã có 13 bản ghi Lao động.
