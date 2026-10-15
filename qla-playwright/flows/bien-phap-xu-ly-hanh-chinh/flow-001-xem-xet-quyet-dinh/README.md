# bien-phap-xu-ly-hanh-chinh · flow-001-xem-xet-quyet-dinh

**CHƯA LÀM.** Thư mục này đang trống để giữ chỗ và địa chỉ; chưa có mã nào.

| | |
|---|---|
| Đặc tả nguồn | `docs/stepdata/StepData_BPXLHC.txt` |
| Khuôn bước | `bpxlhc` |
| Sao từ | **khuôn riêng — phải viết mới**, không sao được từ luồng nào đang có |
| Nuôi biểu mẫu BCTK | **7A** Thống kê thụ lý và giải quyết việc áp dụng các biện pháp xử lý hành chính tại Tòa án nhân dân<br>**7B** Thống kê thụ lý và giải quyết việc áp dụng các BPXLHC đưa vào trường giáo dưỡng và cai nghiện bắt buộc (12-18 tuổi)<br>**7C** Thống kê giải quyết đơn đề nghị hoãn, miễn, giảm, tạm đình chỉ việc áp dụng BPXLHC và cai nghiện bắt buộc<br>**7D** Thống kê giải quyết khiếu nại, kiến nghị, kháng nghị quyết định Tòa án trong việc áp dụng BPXLHC và cai nghiện |

## Chốt phải đạt

Luồng này chỉ được tính là **xong** khi có case chạy xanh tới bước làm vụ lên **"Kết quả giải
quyết"**. Chạy xanh hết bước mà vụ chưa lên kết quả thì báo cáo thống kê **không đếm được**: vụ chỉ
nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm "Kết quả xét
xử".

Khi đạt, cập nhật `bctk/ban-do-luong.ts`: `trangThai: 'xong'` + `chotKetQua: '<mã bước>'`.
Công cụ `npm run bctk:do-phu -- --cong` **thoát mã 1** nếu khai `xong` mà thiếu `chotKetQua`.

## Cần tạo thêm

- `data/bien-phap-xu-ly-hanh-chinh/flow-001-xem-xet-quyet-dinh/cases.ts` + `case-001/input.ts`
- `tests/bien-phap-xu-ly-hanh-chinh/flows/flow-001-xem-xet-quyet-dinh.spec.ts` (một spec cho cả luồng, case là dữ liệu)

## Ghi chú

Khuôn riêng: đặc tả có hẳn tab "Kết quả giải quyết" với khối "Chấp hành quyết định (Điều 27-29)". Có nhánh TRẢ LẠI hồ sơ — nhánh đó nuôi cột 4 của mẫu 7A/7B.
