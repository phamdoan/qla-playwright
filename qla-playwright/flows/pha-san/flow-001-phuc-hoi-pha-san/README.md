# pha-san · flow-001-phuc-hoi-pha-san

**CHƯA LÀM.** Thư mục này đang trống để giữ chỗ và địa chỉ; chưa có mã nào.

| | |
|---|---|
| Đặc tả nguồn | `docs/stepdata/StepData_PhaSan.txt` |
| Khuôn bước | `pha-san` |
| Sao từ | **khuôn riêng — phải viết mới**, không sao được từ luồng nào đang có |
| Nuôi biểu mẫu BCTK | **4E** Thống kê thụ lý và giải quyết yêu cầu áp dụng thủ tục phục hồi<br>**4F** Thống kê thụ lý và giải quyết yêu cầu áp dụng thủ tục phá sản<br>**4G** Thống kê thụ lý và giải quyết yêu cầu công nhận và cho thi hành bản án, quyết định về phục hồi, phá sản của tòa án, cơ quan có thẩm quyền của nước ngoài<br>**4H** Thống kê thụ lý và giải quyết đề nghị, kháng nghị quyết định tuyên bố phá sản và quyết định của tòa án công nhận và cho thi hành bản án, quyết định của tòa án, cơ quan có thẩm quyền của nước ngoài về phục hồi, phá sản; xem xét lại quyết định giải quyết đề nghị, kháng nghị đối với quyết định tuyên bố phá sản |

## Chốt phải đạt

Luồng này chỉ được tính là **xong** khi có case chạy xanh tới bước làm vụ lên **"Kết quả giải
quyết"**. Chạy xanh hết bước mà vụ chưa lên kết quả thì báo cáo thống kê **không đếm được**: vụ chỉ
nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm "Kết quả xét
xử".

Khi đạt, cập nhật `bctk/ban-do-luong.ts`: `trangThai: 'xong'` + `chotKetQua: '<mã bước>'`.
Công cụ `npm run bctk:do-phu -- --cong` **thoát mã 1** nếu khai `xong` mà thiếu `chotKetQua`.

## Cần tạo thêm

- `data/pha-san/flow-001-phuc-hoi-pha-san/cases.ts` + `case-001/input.ts`
- `tests/pha-san/flows/flow-001-phuc-hoi-pha-san.spec.ts` (một spec cho cả luồng, case là dữ liệu)

## Ghi chú

Khuôn riêng (phục hồi / tuyên bố phá sản), không sao được từ khuôn vụ án hay vụ việc.
