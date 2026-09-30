# Quy tắc làm việc với bộ e2e Playwright (QLA — Tòa án)

Áp dụng cho mọi thay đổi trong `e2e/`. Rút ra từ đợt seed GĐT/Tái thẩm 27–29/09/2026:
**141 lỗi, 96% là "không tìm được dòng trên lưới", chỉ 3% là lỗi nghiệp vụ thật.**

Chi tiết nguyên nhân: `docs/nut-that-playwright-va-cach-go.md`. Bản đồ dữ liệu: `docs/mo-hinh-du-lieu-gdt.md`.
(Workspace `toa-an` còn có skill `qla-playwright-seed` trỏ về hai file này.)

## R0 — Code mới đi theo khung PHÂN HỆ → FLOW → CASE → STEP

Quy ước cấu trúc: **`docs/cau-truc-flow-case-step.md`**. Flow KDTM→GĐT/TT đã xác minh bằng code FE:
**`docs/flow-kdtm-gdt-tt.md`** (44 bước, mỗi bước một màn hình) — đọc trước khi thêm spec mới.

* **MỘT LUỒNG = MỘT FILE SPEC** (`tests/<phan-he>/flows/<flow>.spec.ts`). Bước mới → khai vào
  `flows/<phan-he>/<flow>/flow.ts` rồi thêm một dòng vào `cai-dat.ts`. Case mới → thêm vào `cases.ts`.
  **Không tạo file spec cho từng bước hay từng case** — dự án có hàng nghìn case.
* Thân nghiệp vụ ở `flows/**.flow.ts`, dữ liệu gieo ở `data/**/input.ts`, thao tác UI ở `common/`+`pages/`.
* State ở `state/<phan-he>/<flow>/<case>.<env>.state.json` (không phải `seed-output/`).
* Chưa cài đặt thì thiếu mã bước trong `cai-dat.ts` → khung đánh `fixme`. **Không viết thân đoán mò
  để có màu xanh.**
* **Không hard-code lại dữ liệu bước trước đã sinh**: lấy bằng `can('<khoá>')`. Khai `vao`/`ra`
  cho mỗi bước trong `flow.ts`, rồi `npm run flow:lineage` — sai lineage là thoát mã 1.
* **Tài liệu .txt của Tester chỉ là tham khảo nghiệp vụ, không phải nguồn chân lý.** Lệch thì theo
  hệ thống thật: ưu tiên 1 là code FE `qla-webapp/src` (route, tab, field, API), ưu tiên 2 là chạy
  thật. Ghi mức `xacMinh` (FE/RUNTIME/TAI-LIEU/UNKNOWN) + bằng chứng vào chính bước đó.

Đặc tả gốc của Tester nằm ở `docs/stepdata/` (đã che CCCD — repo này public); `docs/README.md` nói rõ
cái gì được vào `docs/`.

`tests/` chỉ còn khung mới + 2 file setup: **mọi spec cũ đã chuyển ra**
`D:/gtel/backup-e2e-20260930/cu-20260930/tests` (30/09/2026) để không nhầm với flow mới, và đã bỏ
khỏi `testDir` nên `npx playwright test` không nạp nữa. Cần lại thì xem `README-cu.md` trong đó.

## R1 — Điều hướng bằng KHÓA, không bằng bộ lọc

Đây là quy tắc quan trọng nhất; vi phạm nó sinh ra 96% số lỗi.

Mỗi bước tạo ra thực thể mới **phải bắt khóa ngay và ghi vào sổ cái**: id từ URL chi tiết
(`new URL(page.url()).searchParams.get('id')`), mã đơn, số thụ lý, mã vụ án, id yêu cầu phê duyệt.

Bước sau **đi thẳng** `page.goto('.../chi-tiet?id=' + khoa)`. Không mở danh sách rồi lọc lại.

```ts
// SAI — bước sau phải đoán lại vụ nào là vụ của mình
const dong = await this.locTheoBanAn(soBanAn, ngayBanAn, toaAn, duongSu);

// ĐÚNG — khóa đã bắt ở bước trước, ghi sổ cái, dùng lại
await page.goto(`vu-an/gdt-tt/quan-ly-vu-xet-xu/chi-tiet?id=${soCai.idVuXetXu}`);
```

## R1b — Số bản án phải ở dạng đầy đủ, KHÔNG dùng số trần

Số bản án dùng để seed **bắt buộc** theo dạng `<số>/<năm>/<ký hiệu>`:

```
ĐÚNG   377/2026/KDTM-ST   ·   56/2026/KDTM-PT   ·   122/2025/DS-ST
SAI    1   2   3   4   5   …
```

Đợt KDTM 28/09/2026 đặt số bản án là `1`–`10` và hỏng toàn bộ (đo trên STG 30/09/2026):

- Mỗi (số + ngày + tòa) có **3–5 đơn** trùng nhau → đơn Playwright nhập thành **đơn phụ**
  (`IS_DON_CHINH = 0`), mà mọi màn của luồng đều join `isDonChinh = true` → không bao giờ hiện.
- Server lọc `LIKE %x%`: gõ `3` trả về **551 đơn**; `1` khớp chính xác 29 đơn, `2` khớp 39 đơn.
- Trên STG hiện có **1.763/2.041 bản án là số trần** — rác tích tụ từ các đợt seed trước.

Cách làm đúng: chạy end-to-end từ sơ thẩm thì số bản án do hệ thống cấp lúc "Lấy số" — tự nhiên
đã đủ dạng và duy nhất; **bắt lại làm output, ghi sổ cái** (R1), các giai đoạn sau dùng lại.
Không bịa số bản án rời rạc rồi nhập vào luồng GĐT/TT.

## R2 — Khi buộc phải lọc, chỉ lọc theo trường ĐỘC NHẤT

Ưu tiên: `số thụ lý` > `mã đơn` > `mã vụ án` > `số bản án + ngày + tòa`.

Cấm dùng làm điều kiện chính:
- **Số bản án** — server lọc `LIKE %x%`, "3" trúng cả 34/377/23; dữ liệu thật có số 1–3 chữ số trùng hàng chục vụ.
- **Tên đương sự** trên các màn giai đoạn 2 — vụ xét xử GĐT không có đương sự (xem skill).

Luôn `moRongCoTrang(page)` (cỡ trang 100) trước khi khớp dòng: mặc định 10 dòng/trang làm trượt âm thầm.

## R3 — Đọc backend trước khi sửa selector

Trước khi đổi cách lọc/khớp dòng của một màn, mở mã nguồn API của màn đó trong `qla/` và
`qla-webapp/` để biết nó join bảng nào, cột nào, điều kiện phạm vi đơn vị ra sao.
Ghi `file:line` vào comment ngay tại chỗ sửa.

Sửa selector theo cảm tính = vá vòng quanh; đã mất nhiều giờ vì việc này.

## R4 — Mọi kết luận nguyên nhân phải có bằng chứng

Không suy ra nguyên nhân từ triệu chứng UI. Bằng chứng hợp lệ chỉ gồm:
câu `SELECT` + kết quả thật, hoặc `file:line` trong `qla/` / `qla-webapp/`.

Comment sai trong code còn hại hơn không có comment: ghi chú "vụ GĐ2 không có BAN_AN nên không lọc
được số bản án" từng làm cả nhánh `khongLocSoBanAn` đi sai hướng — thực tế số bản án lấy từ đơn.

## R5 — "Xong" phải có bằng chứng ghi được

Chỉ đánh dấu bước xong khi có id trả về / dòng DB / thông báo thành công của server.
"Không văng lỗi" không phải là xong: sổ cái từng ghi B11 xong mà `DON_PHANCONG` không có dòng TTV,
B19 xong mà chưa có vụ giai đoạn 2.

Báo cáo tiến độ **đối chiếu DB**, không đọc sổ cái (`tools/ket-xuat-db-gdt.js` → `tools/bao-cao-gdt-tt.js`).

## R6 — Phân loại lỗi trước khi vá

Mỗi bước fail phải xếp vào một trong ba nhóm, ghi rõ khi báo cáo:

1. **Lỗi code test** → sửa trong `e2e/`.
2. **Lỗi dữ liệu seed** → sửa dataset / chạy lại bước.
3. **Lỗi hệ thống** → báo cho user kèm bằng chứng, **không vá vòng trong test**.

Đã gặp ở nhóm 3: `ORA-12899` cột `HOSO_KHANGNGHI_DEN.LOAI_AN VARCHAR2(20)` nhỏ hơn enum
`KINH_DOANH_THUONG_MAI`; bộ lọc "Nguyên đơn/Người khiếu nại" màn Quản lý xét xử GĐT luôn trả 0 dòng.

## R7 — Chạy song song: một vụ đúng một luồng

Chạy ở bản sao `toa-an-chay-rieng-a|b|c|…/e2e`, **không** chạy ở `e2e` gốc (user chạy song song).

- Mỗi vụ chỉ được nằm trong đúng một luồng; hai luồng cùng vụ sẽ tranh trạng thái.
- Đồng bộ sổ cái **trước và sau** mỗi đợt: `node tools/dong-bo-so-cai-cac-luong.js <bộ> <env>`.
- Sửa file trong `e2e` gốc thì **sync sang mọi thư mục chạy riêng trước khi chạy** — nếu không,
  bản sao cũ của tool sẽ ghi đè kết quả (báo cáo từng bị globalTeardown của luồng cũ ghi đè).
- **Không sync khi đang có tiến trình chạy** (`Get-Process node`).

## R8 — Không tự mở Playwright, không nắn DB

- Không mở e2e/MCP browser lên STG/UAT khi user không yêu cầu. Điều tra bằng `SELECT` + mã nguồn.
- Dữ liệu luồng chỉ thay đổi qua Playwright. Không `UPDATE`/`INSERT` nắn trạng thái. `SELECT` kiểm chứng thì được.
- Mật khẩu DB lấy từ biến môi trường `ORA_URL`/`ORA_PASS`; repo này public, không hardcode.

## R9 — Bẫy antd phải xử lý một lần, dùng lại

- `chonSelect` **throw ngay kèm danh sách lựa chọn đang có**, không chờ hết 30 s rồi báo timeout.
- Không bật "Tìm kiếm nâng cao" trừ khi đã biết form đổi gì — bật xong ô "Số BA/QĐ" biến mất.
- Trường phụ thuộc: chọn trường cha trước (vd **Kết quả GĐT,TT trước Nguyên nhân** — chọn ngược thì bị reset).
- Hộp xác nhận: khớp nhãn bằng regex nhiều biến thể (`Đồng ý|Xác nhận|OK|Chuyển hồ sơ`), không hardcode một nhãn.
- Lưới ảo / RangePicker hai ô / `.ant-select-clear`: xem helper sẵn có trong `common/antd.ts` trước khi tự viết.

## R10 — Chạy từng bước, giữ log đầy đủ

`tools/chay-tung-buoc.js` chạy mỗi bước một lệnh Playwright: một bước hỏng chỉ mất bước đó.
Log đầy đủ ở `seed-output/<file>.<socai>.<Bxx>.out` — khi điều tra thì **đọc log cũ trước**,
đừng chạy lại để "xem lỗi gì".

## R11 — Thời gian chạy: hỏng nhanh, đừng chờ thứ không bao giờ đến

Đo trên `seed-output/*.tung-buoc.log`, đợt 27–28/09/2026: **526 lần chạy bước = 31,5 giờ**.

| Loại lần chạy | Số lần | Thời gian |
|---|---|---|
| có vụ ĐẠT | 224 (43%) | 13,9 giờ |
| **có vụ HỎNG** | **324** | **24,1 giờ (77%)** |
| bỏ qua hết (đã xong ở lần trước) | 67 | 0,1 giờ |

Bỏ qua thì rẻ — vì `test.skip(daXongBuoc(...))` đứng TRƯỚC khi mở trình duyệt. **Giữ nguyên thứ tự đó.**

Tiền mất nằm ở các lần hỏng: trung bình 118 s/vụ, 27 vụ chạm trần `timeout: 300_000`. Gần hết là
ngồi chờ `toBeVisible({ timeout: 60_000 })` một dòng không bao giờ xuất hiện.

- Trước khi kết luận "không thấy dòng", gọi `luoiDaTai(page)` rồi `count() === 0` → **throw ngay**,
  kèm các dòng đang hiện. Dùng `GdtPage.phaiThayDong()`; đừng viết lại `expect(...).toBeVisible(60s)`.
- Thông báo lỗi phải nói **vì sao trượt** (liệt kê dòng/lựa chọn đang có), không chỉ "Timeout".
- Sửa nguyên nhân (R1: điều hướng bằng khoá) mới là chỗ tiết kiệm lớn nhất — 24 giờ kia là của lỗi.

## R12 — Ô chọn (antd Select): điền một lần, chờ danh sách ổn định

`ProFormSelectCustom` (`qla-webapp/src/components/ProFormSelectCustom/index.tsx:236-239`) đặt:

```ts
filterOption: showSearch ? false : …            // KHÔNG lọc phía trình duyệt
onSearch: debounce(v => setTuKhoaTimKiem(v), 400)  // gọi LẠI API danh mục
```

110 màn dùng wrapper này. Mỗi lần từ khoá đổi là một vòng **chờ 400 ms → gọi API → vẽ lại danh
sách**. Gõ từng ký tự (`pressSequentially`, 20 ký tự × 40 ms) tạo ra nhiều vòng như vậy → danh sách
"giật", click trúng mục cũ, rồi chạy lại cả vòng thử lại.

- Dùng `input.fill(tuKhoa)` — **một** sự kiện input, **một** vòng gọi API. Không `pressSequentially`.
- Sau khi điền, chờ hết debounce (450 ms) rồi `choDanhSachOnDinh(dd)` mới đọc options.
- Cuộn danh sách ảo tối đa 60 vòng: danh mục gọi API với `size=100` nên cuộn quá đó là vô ích.
