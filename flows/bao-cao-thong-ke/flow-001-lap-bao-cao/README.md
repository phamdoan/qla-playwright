# bao-cao-thong-ke · flow-001-lap-bao-cao

**KHUNG, CHƯA CÀI ĐẶT.** 8 bước đã khai trong `flow.ts`, `cai-dat.ts` trống nên tất cả là `fixme`.

## Luồng này khác các luồng khác ở đâu

| | Luồng vụ án/vụ việc (`flows/<phân hệ>/…`) | Luồng này |
|---|---|---|
| Việc | **gieo** vụ tới "Kết quả giải quyết" | **kiểm** số đó lên biểu mẫu đúng không |
| Một case là | một vụ | một biểu mẫu (`mau-2a`, `mau-4a`…) |
| Ghi dữ liệu | có | không (trừ bước 05 lưu báo cáo) |
| Bản đồ | `bctk/ban-do-luong.ts` | `flow.ts` ở đây |

Chạy biểu mẫu nào thì luồng gieo tương ứng phải `xong` trước — xem `npm run bctk:do-phu`.

## Bước ↔ hạng mục QC

Theo sheet "CheckList STG" của `[QC] Tiến độ test BCTK.xlsx`:

| Hạng mục QC | Bước |
|---|---|
| Giao diện báo cáo | 01, 02 |
| Bộ lọc báo cáo | 01, 05, 06 |
| Tính chính xác của số liệu | 03 |
| Mapping dữ liệu | 04 (popup minh chứng) |
| Phân quyền | 08 |
| Kết xuất | 07 |

## Tài liệu nguồn (KHÔNG chép vào repo)

Thư mục `Báo cáo thống kê/` trên Drive. Không chép xlsx/docx vào repo vì repo public: nhiều tệp
có CCCD, và `Tester/Thông tin chung.xlsx` có mật khẩu DB.

| Cần cho | Tệp |
|---|---|
| Testcase UI + kịch bản số liệu từng biểu mẫu | `Tester/Testcase_BCTK_<1..10>_<nhóm>.xlsx` (sheet "TestCase UI", "<mã>", "Kịch bản <mã>") |
| Giao diện | `SRS/Tài liệu đặc tả giao diện BCTK v1.0.docx` · `Mockup/Prototype_LapBaoCao_ThongKe_v2_1_*.html` |
| Bộ lọc | `SRS/Của BA/Bộ lọc/` (SRS + `Test_case_bo_loc_bao_cao_thong_ke.xlsx`) |
| Popup minh chứng | `SRS/Của BA/Popup minh chứng số liệu/` |
| Kết xuất | `SRS/Của BA/Quy_tac_dat_ten_file_ket_xuat.xlsm` |
| Phân quyền | `Tester/Phân quyền BCTK.docx` |
| Mapping cột → bảng | `SRS/Mapping Data/<nhóm>/Mapping_<mã>.xlsx` |

## Còn phải chốt trước khi cài đặt

1. **Route màn BCTK thật.** `qla-webapp` chỉ có mục menu `/bctk/*`
   (`src/layouts/MenuV3/du-lieu/quyTacAnhXa.ts:354-360`), không có trang lập báo cáo → nằm ở ứng
   dụng khác. Tìm ra thì điền `route` + nâng `xacMinh` trong `flow.ts`.
2. **Tài khoản** cho `vaiLapBaoCao` / `vaiKhongQuyen` trong `mau-2a/input.ts` (khoá ở
   `config/luong-gdt.json`; chưa có tài khoản thống kê nào).
3. **Số mong đợi** trong `mau-2a/expected.ts` — chốt với Tester, không lấy số trên màn.

## Kiểm khung

```bash
node --experimental-strip-types tools/lineage.js bao-cao-thong-ke/flow-001-lap-bao-cao
npx playwright test tests/bao-cao-thong-ke --list
```
