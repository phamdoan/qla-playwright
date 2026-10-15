# docs/ — chỉ chứa tài liệu ĐANG ĐÚNG

Quy tắc chốt 30/09/2026: **tài liệu vào được `docs/` chỉ khi đã xác minh với hệ thống thật.**
Tài liệu cũ, bản nháp, bản `.bak`, bảng đối chiếu của luồng đã thay → chuyển ra backup, không để
lẫn ở đây. Nhầm tài liệu tốn nhiều thời gian hơn thiếu tài liệu.

## Đang có

| File | Là gì | Mức tin |
|---|---|---|
| [flow-kdtm-gdt-tt.md](flow-kdtm-gdt-tt.md) | **Flow hiện hành**: KDTM → sơ thẩm → phúc thẩm → GĐT/TT → vụ xét xử → báo cáo. 44 bước, mỗi bước một màn hình | đối chiếu code FE `qla-webapp` 30/09/2026; mỗi bước ghi rõ `FE`/`RUNTIME`/`TAI-LIEU`/`UNKNOWN` |
| [cau-truc-flow-case-step.md](cau-truc-flow-case-step.md) | Quy ước cấu trúc PHÂN HỆ → FLOW → CASE → STEP | quy ước của repo |
| [mo-hinh-du-lieu-gdt.md](mo-hinh-du-lieu-gdt.md) | Bản đồ dữ liệu GĐT/Tái thẩm: ba thực thể dễ nhầm | kiểm chứng trên STG 29/09/2026 bằng `SELECT` + mã nguồn |
| [nut-that-playwright-va-cach-go.md](nut-that-playwright-va-cach-go.md) | Sáu nhóm nút thắt + cách gỡ | đo 141 lỗi đợt seed 28/09/2026 |
| [sinh/](sinh/) | Sinh tự động, **không sửa tay** — `npm run flow:lineage:md`. Bảng 44 bước kèm cột "Cài đặt" | sinh từ `flow.ts` + `cai-dat.ts` |
| [stepdata/](stepdata/) | Đặc tả gốc của Tester, đã che CCCD | **tham khảo nghiệp vụ, KHÔNG phải nguồn chân lý** |

## `stepdata/` khác với tài liệu flow ở đâu

`stepdata/` là bản gốc của Tester, copy nguyên văn (chỉ thay CCCD bằng tên vai vì repo này public).
Nó **có thể** thiếu, sai tên màn hình, sai thứ tự, hoặc dùng selector đã lỗi. Lệch thì theo hệ thống
thật: ưu tiên 1 là code FE `qla-webapp/src`, ưu tiên 2 là chạy thật. Kết quả xác minh ghi vào
`flows/**/flow.ts` (mức `xacMinh` + bằng chứng) và tóm ở `flow-kdtm-gdt-tt.md`.

Nguồn gốc: `Báo cáo thống kê/Tester/Scrip auto/` (10 file StepData) và tài liệu GĐT/TT bản 29/09/2026.

## Đã chuyển ra backup 30/09/2026

`D:\gtel\backup-e2e-20260930\cu-20260930\` — xem `README-cu.md` trong đó. Gồm 21 spec cũ ở
`tests/` root, các tài liệu GĐT/TT bản cũ + `.bak`, bảng đối chiếu bước, ghi chú luồng cũ.
Git vẫn giữ lịch sử nên phục hồi được bằng `git log --diff-filter=D --name-only`.
