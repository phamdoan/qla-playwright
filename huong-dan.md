npx playwright test login --ui

## Chọn môi trường
Mỗi môi trường một file (không commit): .env.dev (qla-dev), .env.staging (qla-stg). Tham số thêm đặt sau `--`.

    npm run dev:ui                                   # UI mode trên DEV
    npm run staging:ui                               # UI mode trên STAGING
    npm run dev -- login --project=chromium          # chạy CLI trên DEV
    npm run staging -- tao-don-khong-ocr --project=chromium

`npx playwright test` (không qua npm run) vẫn dùng file .env như cũ.

## ⚠️ SEED DATA: tạo đơn không qua OCR (tạo dữ liệu THẬT, không phải regression)
File tests/tao-don-khong-ocr.seed.ts đang TẮT (đuôi .seed.ts không được Playwright quét).
Muốn chạy: đổi tên thành tao-don-khong-ocr.spec.ts, chạy xong đổi lại .seed.ts.

    # số hồ sơ: sửa hằng SO_LUONG trong file (mặc định 300, chạy thử để 5)
    npm run dev -- tao-don-khong-ocr --project=chromium       # hoặc npm run staging -- …

Kết quả: seed-output/don-no-ocr-20260922.<host>.run-<ngày>.summary.txt; sổ cái chống tạo trùng: seed-output/don-no-ocr-20260922.<host>.ledger.json

## Thêm mới đơn theo bản án sơ thẩm (tài khoản riêng)

Luồng Bước 1–2 của `Luông nhập data.txt`: đăng nhập → Danh sách đơn → "Thêm mới" → tải tài liệu →
"Quay lại" ở popup OCR (nhập tay) → nhập 3 ô bản án lấy từ Excel → tra cứu → "[Gợi ý]" nội dung →
xử lý đơn → "Lưu thông tin" → mở lại đơn so từng trường.

- Test: `tests/them-moi-don-tai-khoan-moi.spec.ts` (project `tai-khoan-moi`, session riêng, **không** đụng test cũ)
- Dữ liệu: `data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx` (3 cột nhập) đối chiếu `data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx`
  (đọc bằng `common/ban-an-so-tham.ts`, không hard-code trong test)
- Tài khoản/cấu hình: các biến `QLA_TKM_*` trong `.env.dev` / `.env.staging` (xem `.env.example`)

```bash
npm run dev -- --project=tai-khoan-moi            # DEV: chạy đủ, có tạo đơn thật
npm run staging -- --project=tai-khoan-moi        # STG: chỉ đăng nhập + đối chiếu quyền (không ghi dữ liệu)
QLA_TKM_DONG=2,5,25 npm run dev -- --project=tai-khoan-moi   # chạy đúng các dòng Excel
```

Môi trường chỉ được tạo đơn khi `QLA_TKM_CHO_PHEP_GHI=1`; STG để trống nên test nhập đơn tự bỏ qua.

Test chia 2 phần để **không tạo dữ liệu rác** trên môi trường dùng chung:

| Test | Ghi dữ liệu? | DEV | STG |
|---|---|---|---|
| dữ liệu test – 3 cột đầu vào khớp file đối chiếu | không (đọc Excel) | chạy | chạy |
| tài khoản – đăng nhập và có quyền vào màn Thêm mới | không | chạy | chạy |
| tra cứu bản án theo Excel (chỉ đọc) | không (chỉ HTTP GET) | bỏ qua – chưa có dữ liệu | chạy, đối chiếu mã vụ án + bị cáo |
| nhập đơn theo bản án (có "Lưu thông tin") | **có** | chạy | bỏ qua |

Chỉ mở màn "Thêm mới đơn" cũng đã phải tải tài liệu lên (tức là ghi dữ liệu), nên phần kiểm chứng
dữ liệu bản án làm hoàn toàn bằng API GET (`common/api-don.ts`), không đụng giao diện.

### Tự tra một bản án (chỉ đọc, không tạo dữ liệu)

Màn "Thêm mới đơn" bắt buộc tải tài liệu lên mới vào được form, nên muốn kiểm tra "bản án này có
trong hệ thống không" mà không sinh dữ liệu thì dùng lệnh sau — nó gọi đúng API mà nút kính lúp gọi:

```bash
npm run staging -- --project=setup-tai-khoan-moi      # đăng nhập, lưu phiên (chỉ khi phiên hết hạn)
node tools/tra-cuu-ban-an.js stg 23243 14/11/2024 "Tòa án nhân dân khu vực 9 - Hà Nội"
```

Kết quả in ra mã vụ án, tên vụ án, trạng thái bản án và danh sách người trong vụ án (đúng những gì
ô "Chọn người từ bản án cũ" sẽ đổ ra). Đổi `stg` thành `dev` để tra trên DEV.

Lưu ý: màn **Quản lý đơn › Danh sách đơn** liệt kê *đơn*, không phải *bản án* — bản án chưa có đơn
nào tham chiếu thì tìm ở đó không ra. Ô "Số BA/QĐ" trong bộ lọc Nâng cao cũng chỉ lọc trong danh sách đơn.

### Bước 3 → 9: phân công thẩm phán, tờ trình, thông báo, ký/duyệt

Test: `tests/luong-phan-cong-tai-khoan-moi.spec.ts` (cùng project `tai-khoan-moi`), chạy tiếp trên
đơn do Bước 1–2 tạo. Mỗi bước là một test riêng, chạy tuần tự; bước trước hỏng thì dừng.

**Thứ tự chạy khác tài liệu**: "Thông báo phân công TP" chỉ lập được SAU KHI tờ trình đã được duyệt
ở cấp Chánh án/Phó Chánh án (backend: `existsToTrinhPhanCongDaButPhe`, `DonServiceImpl` case
`THONG_BAO_PHAN_CONG_TP`). Trình tự thực tế:

```
B3 (phân công ngẫu nhiên) → B4 (Tờ trình) → B6–B7a (CVP ký logic, trình PCA)
→ B8–B9 (PCA phê duyệt) → B5 (Thông báo) → B7b (CVP ký logic Thông báo)
```

```bash
# chạy từng bước, xác nhận xong mới sang bước sau
QLA_TKM_CHO_PHEP_GHI=1 QLA_TKM_MA_DON=<mã đơn> QLA_TKM_SO_THU_LY=<số TL> \
  npm run staging -- --project=tai-khoan-moi --no-deps -g "B3"
```

Tài khoản: `QLA_TKM_USER` (cán bộ), `QLA_TKM_CVP_USER` (Nguyễn Tường Linh), `QLA_TKM_PCA_USER`
(Nguyễn Hải Trâm). Trạng thái nối giữa các bước lưu ở `.run-state-tkm.<env>.json`.

**Chốt an toàn ở B3**: nút "Phân công ngẫu nhiên" gọi API phân công MỌI đơn khớp bộ lọc đang áp
dụng (không theo dòng tick). Hàm `phanCongThamPhanNgauNhien` chỉ bấm khi đã lọc theo số thụ lý và
danh sách còn đúng 1 đơn — nếu còn đơn khác thì dừng, không bấm.

### Chạy bằng giao diện Playwright UI (xem từng bước, tự chọn vụ để chạy)

```bash
cd e2e
npm run ui:stg            # STAGING, chỉ đọc — test tạo đơn tự bỏ qua, an toàn để xem trước
npm run ui:stg:ghi        # STAGING, cho phép tạo đơn thật
npm run ui:dev:ghi        # DEV, cho phép tạo đơn thật
```

Chọn vụ (dòng Excel) muốn chạy — không cần sửa file .env:

```bash
npm run ui:stg:ghi -- --dong=3,4,5      # đúng các dòng Excel đó
npm run ui:stg:ghi -- --so-dong=5       # 5 dòng đầu
```

Chạy tiếp Bước 3–9 trên một đơn đã tạo:

```bash
npm run ui:stg:ghi -- --ma-don=8654 --so-thu-ly=1212121436
```

Trong cửa sổ UI: chọn test ở cây bên trái rồi bấm ▶ để chạy từng bước một; xem lại từng thao tác
ở khung timeline. Các bước Bước 3–9 phải chạy theo thứ tự B3 → B4 → B6–B7a → B8–B9 → B5 → B7b.

Kiểm tra cấu hình mà không mở giao diện: thêm `--kiem-tra` (chỉ liệt kê test).

### Chạy TRỌN luồng cho toàn bộ 24 bản án (tạo data demo)

File test: `tests/luong-day-du-tai-khoan-moi.spec.ts` — mỗi bản án trong
`data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx` (24 bản án sơ thẩm) là một nhóm 7 bước chạy tuần tự:

| Bước | Nội dung | Vai |
|---|---|---|
| B1–B2 | Nhập đơn theo bản án (không OCR) → tra cứu → chọn người từ bản án cũ → Lưu | Cán bộ |
| B3 | Phân công thẩm phán (ngẫu nhiên, đã lọc đúng 1 đơn) | Cán bộ |
| B4 | Tờ trình phân công → Trình ký | Cán bộ |
| B6–B7a | Cho ý kiến, trình Phó Chánh án, Ký logic | Chánh văn phòng |
| B8–B9 | Phê duyệt Tờ trình | Phó Chánh án |
| B5 | Thông báo phân công TP → Trình ký | Cán bộ |
| B7b | Ký logic Thông báo | Chánh văn phòng |

Trong một vụ, bước trước hỏng thì các bước sau tự bỏ qua; vụ khác vẫn chạy.

```bash
cd e2e
npm run staging:ui          # mở UI cho STAGING → chọn project "tai-khoan-moi" ở góc trái
npm run ui:stg:ghi          # cách gọn hơn: đã ép sẵn project và bật ghi dữ liệu
```

⚠ `.env.staging` đang đặt `QLA_TKM_CHO_PHEP_GHI=1` nên **các bước này tạo đơn thật trên STG**.
Muốn STG trở lại chỉ đọc thì sửa thành `QLA_TKM_CHO_PHEP_GHI=0`.

⚠ Khi mở `npm run staging:ui`, nếu chọn "All projects" thì cả các test cũ cũng hiện, trong đó
`tao-don-khong-ocr.spec.ts` là script seed tạo hàng nghìn đơn — đừng chạy nhầm. Chọn đúng project
`tai-khoan-moi` (hoặc dùng `npm run ui:stg:ghi`).

Thời gian: mỗi vụ khoảng 8–10 phút (chủ yếu ở B4 và B5 do lưu số văn bản), 24 vụ khoảng 3–4 giờ.
Chạy chọn lọc: `npm run ui:stg:ghi -- --dong=2,3,4`.

### Đợt nhập dữ liệu ngày 24-09-2026 (6 bản án do người dùng cung cấp)

- Dữ liệu: [data/ban-an-24-09-2026.ts](data/ban-an-24-09-2026.ts) — 6 bản án sơ thẩm của
  "Tòa án nhân dân khu vực 9 - Hà Nội" (515, 25, 26, 27, 28, 29). Không nằm trong file Excel 22A.
- Test: `tests/luong-gdt-tt-24-09-2026.spec.ts` (gộp Bước 1–9 và nhánh Vụ GĐKT Bước 10+; đợt sau đặt tên
  `luong-gdt-tt-<dd-mm-yyyy>.spec.ts`) — mỗi bản án một nhóm bước (B1–B2 → B3 → B4
  → B6–B7a → B8–B9 → B5 → B7b → B10 → B10b → B11 → B12a), chạy tuần tự, bước trước hỏng thì dừng nhóm đó.
- Sổ cái riêng: `seed-output/luong-24-09-2026.<env>.ledger.json` → chạy lại thì bản án đã xong sẽ
  bị bỏ qua (khoá theo Số bản án | Ngày bản án | Tòa).

```bash
cd e2e
npm run ui:uat:ghi                    # UAT, cho phép tạo đơn thật
npm run ui:uat:ghi -- --dong=1,2      # chỉ 2 bản án đầu
npm run ui:stg:ghi                    # hoặc chạy trên STAGING
```

**Trước khi chạy UAT phải điền tài khoản trong `.env.uat`** (`QLA_TKM_USER`, `QLA_TKM_CVP_USER`,
`QLA_TKM_PCA_USER`); tài khoản UAT thường khác dev/staging. Mật khẩu mặc định `Ta@<CCCD>`.

⚠ Nghi vấn dữ liệu: bản án **28 ghi ngày 11/1/2024**, trong khi 25→29 cách nhau đúng 7 ngày
(21/10 → 28/10 → 4/11 → ? → 18/11) nên nhiều khả năng là **11/11/2024**. Hiện giữ nguyên văn
11/01/2024; sửa một dòng trong `data/ban-an-24-09-2026.ts` nếu cần.

### Luồng GĐT/TT ngày 26-09-2026 (22 bản án hình sự sơ thẩm đã ký trên STG)

- Các bước dùng chung: [common/luong-gdt-tt.ts](common/luong-gdt-tt.ts) (B1 → B12a). File theo ngày
  `tests/luong-gdt-tt-<dd-mm-yyyy>.spec.ts` chỉ khai bộ dữ liệu.
- Dữ liệu: [data/ban-an-hinh-su-26-09-2026.ts](data/ban-an-hinh-su-26-09-2026.ts) — sinh từ luồng
  `vu-an-hinh-su-so-tham`. Mỗi vụ một nhóm, tên `VA017 · <Tên vụ án Excel>-<số BA>-<ngày BA>-<tòa>`;
  vụ lỗi chỉ dừng vụ đó.
- Tra cứu không ra bản án thì dừng trước khi Lưu (không nhập tay đơn sai).
- Sổ cái: `seed-output/luong-gdt-tt-26-09-2026.<env>.ledger.json`.

```bash
npm run gdt-tt:26-09:stg:ui                          # UI, bấm ▶ ở vụ muốn chạy
QLA_GDT_MA=VA017,VA020 npm run gdt-tt:26-09:stg      # chỉ vài vụ, dòng lệnh
```

## Hành chính: sơ thẩm → kháng cáo → phúc thẩm

Spec `tests/don-hanh-chinh-so-tham.spec.ts` (B4–B9 → S2 → S3 → S6 → S7 → S8 → S9 → S10 → S11 → S11b →
S12 → PT1 → PT2 → PT3 → PT4 → PT5 → PT6). Chạy một vụ mỗi lượt theo dòng Excel:

    QLA_HO_SO_ENV=staging QLA_TKM_CHO_PHEP_GHI=1 QLA_HC_DONG=21 \
      npx playwright test --project=tai-khoan-moi --no-deps tests/don-hanh-chinh-so-tham.spec.ts \
      --grep "S11 ·|S11b ·|S12 ·|PT1 ·|PT2 ·|PT3 ·|PT4 ·|PT5 ·|PT6 ·" --reporter=list

Báo cáo tiến độ: `node tools/bao-cao-hanh-chinh-csv.js` → `seed-output/bao-cao-hanh-chinh-<env>.csv`.
Đối soát trạng thái thật từ DB (log Playwright KHÔNG đủ tin, xem ghi chú):
`node tools/doi-soat-phuc-tham-hanh-chinh.js sql` → chạy trên STG → `… ap <tệp kết quả>`.

Chỗ tài liệu nghiệp vụ lệch thực tế, danh mục phải nạp thêm trên STG (186HC/187HC) và toàn bộ bẫy UI
đã gặp: xem **[ghi-chu-hanh-chinh-so-tham-phuc-tham.md](ghi-chu-hanh-chinh-so-tham-phuc-tham.md)**.
