# Hướng dẫn cài đặt và sử dụng bctk-playwright

Bộ kịch bản Playwright **tự tạo vụ án** trên Hệ thống quản lý án (môi trường STG) để có dữ liệu cho các biểu mẫu Báo cáo – thống kê (1A1, 1B, 2A, 2C, 3A, 5A–5D, 6A–6D, 10A/C/E/G/I…).

Mỗi biểu mẫu là một **luồng** gồm nhiều **bước** (thêm đơn → phân công → thụ lý → … → bản án). Một luồng đăng nhập bằng nhiều tài khoản (thẩm phán, thư ký, lãnh đạo…) và chạy đúng thứ tự nghiệp vụ. Mã vụ án và số bản án tạo ra được ghi vào file Excel ở thư mục `output/`.

> ⚠️ Kịch bản tạo **dữ liệu thật**. Cấu hình đã chặn cứng host production (`e-qlta.toaan.gov.vn`, `qla.toaan.gov.vn`). Chỉ chạy trên STG / dev / UAT.

---

## 1. Cài đặt (build) lần đầu

### 1.1. Yêu cầu

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | ≥ 20 (đang dùng 24.x) | https://nodejs.org (bản LTS) |
| Git | bất kỳ | để lấy mã nguồn |
| VS Code | khuyến nghị | thêm extension *Playwright Test for VSCode* nếu muốn chạy ngay trong editor |
| Mạng | vào được `qla-stg.toaan.gov.vn` | |

### 1.2. Các bước

Mở PowerShell hoặc terminal của VS Code tại thư mục `bctk-playwright`:

```powershell
# 1. Cài thư viện (Playwright, exceljs, dotenv, TypeScript)
npm install

# 2. Tải trình duyệt Chromium cho Playwright
npx playwright install chromium

# 3. Kiểm tra mã TypeScript biên dịch được (không sinh file, chỉ báo lỗi)
npm run typecheck

# 4. Xem danh sách test nhận được (không chạy) — kiểm tra cấu hình đã ổn
npx playwright test --list --project=luong src/tests/6-hanh-chinh/form-6A
```

Không có bước "build" ra file chạy. Playwright đọc thẳng file `.ts`, nên sau `npm install` là chạy được ngay. Bước `typecheck` chỉ để phát hiện lỗi sau khi sửa code.

### 1.3. Cấu hình môi trường

| File | Vai trò | Có commit lên git? |
|---|---|---|
| `.env.staging` | **Hồ sơ môi trường mặc định**: `URL` trang đăng nhập và số đơn/vụ tạo mỗi lần chạy. Giá trị trong file này **ghi đè** `.env`. | Có |
| `.env` | Tài khoản riêng của từng máy (chỉ cần cho các form một tài khoản 1A, 1C, 1D). Tạo bằng cách sao chép `.env.example`. | Không |
| `.env.dev`, `.env.uat`… | Hồ sơ môi trường khác (tự tạo nếu cần, ít nhất có dòng `URL=`). | Không |
| `src/data/Tai-khoan/Taikhoan.xlsx` | Danh sách tài khoản dùng trong các luồng (cột **Tòa án – Tài khoản – Tên – Chức vụ**). Mật khẩu mặc định `123456`. | Có |

Ví dụ `.env.staging`:

```ini
URL = https://qla-stg.toaan.gov.vn/sso/login

# Số đơn/vụ tạo mỗi lần chạy — riêng từng form. Để trống → dùng BCTK_SO_DON chung.
BCTK_SO_DON_6A=5
BCTK_SO_DON_10A=10
# Mặc định chung
BCTK_SO_DON=5
```

**Chọn môi trường:**
- Mặc định dùng `staging`.
- Script npm có tiền tố `dev`, `staging`, `uat` hoặc `preprod` sẽ tự chọn hồ sơ tương ứng.
- Có thể chọn tay bằng biến `BCTK_HO_SO`:

```powershell
$env:BCTK_HO_SO = 'uat'; npm run form:6A
```

---

## 2. Cấu trúc thư mục

```
bctk-playwright/
├─ playwright.config.ts        # cấu hình chung: timeout 10 phút/test, 1 worker, chặn production
├─ .env.staging / .env         # cấu hình môi trường, tài khoản
├─ src/
│  ├─ tests/<lĩnh vực>/form-X/*.spec.ts   # file test (chỉ gọi luồng)
│  ├─ pages/<lĩnh vực>/form-X/
│  │   ├─ cau-hinh-X.ts                   # hằng số của form: tòa án, tài khoản, file đầu vào
│  │   ├─ create-case-X.page.ts           # khai báo luồng (danh sách bước, danh sách đơn)
│  │   └─ buoc/01-…ts, 02-…ts, …          # từng bước nghiệp vụ
│  ├─ pages/common/buoc.ts                # khung chạy luồng (chayBuoc)
│  ├─ pages/common/login.page.ts          # đăng nhập SSO, tự thử lại, tự quay về Dashboard
│  ├─ pages/base.page.ts                  # thao tác dùng chung: chọn ô, chờ thông báo, ký…
│  ├─ data/<lĩnh vực>/data-form-X.xlsx    # dữ liệu đầu vào / cấu hình của form
│  ├─ data/Tai-khoan/Taikhoan.xlsx        # tài khoản
│  └─ step/<lĩnh vực>/form-X/HD X.docx    # tài liệu hướng dẫn nghiệp vụ từng form
├─ state/<lĩnh vực>/form-X/Đơn NN.json    # trạng thái từng đơn/vụ giữa các bước (tự sinh)
├─ output/<lĩnh vực>/<X>/output-ma-vu-an-form-X_<ngày>_<giờ>.xlsx   # kết quả (tự sinh)
├─ playwright-report/form-X/              # báo cáo HTML của lần chạy gần nhất
└─ test-results/form-X/                   # trace, ảnh chụp, video khi lỗi
```

---

## 3. Chạy kịch bản

### 3.1. Ba cách chạy một form

Mỗi form có ba lệnh, ví dụ với 6A:

| Lệnh | Khi nào dùng |
|---|---|
| `npm run form:6A` | Chạy nền, không mở trình duyệt. Nhanh nhất, dùng khi tạo dữ liệu hàng loạt. |
| `npm run form:6A:headed` | Mở trình duyệt để xem từng thao tác. |
| `npm run form:6A:ui` | Mở **Playwright UI**: chọn chạy từng bước / từng đơn, xem lại trace khi lỗi. Dùng để kiểm tra và gỡ lỗi. |

Danh sách đầy đủ nằm trong `package.json`, mục `scripts`. Các form đang có: `1A1, 1B, 1D1, 2A, 2C, 2D, 3A, 5A, 5B, 5C, 5D, 6A, 6B, 6C, 6D, 10A, 10C, 10E, 10G, 10I` (cùng 1A, 1C, 1D kiểu cũ một tài khoản).

### 3.2. Trên Playwright UI

- Mỗi **bước** là một nhóm, tên dạng `Buoc 05 · Ghi nhận nộp phí (HD …)`.
- Trong mỗi nhóm có các test **Đơn 01, Đơn 02…** (hoặc Vụ 01…, hoặc theo dòng của file đầu vào).
- Bấm ▶ ở **cấp file** để chạy toàn bộ luồng. Các bước chạy lần lượt cho mọi đơn.
- Bấm ▶ ở **một nhóm bước** hoặc **một đơn** để chạy riêng phần đó. Các bước trước phải xong rồi.
- Khi lỗi, xem tab **Errors** và **Trace** (từng thao tác, ảnh màn hình, request mạng).

### 3.3. Lọc theo bước từ dòng lệnh

Chữ "Buoc" trong tên nhóm cố ý viết không dấu để lọc được bằng `--grep` mà PowerShell không làm hỏng ký tự:

```powershell
# Chỉ chạy bước 1 → 5 của 6A
npm run form:6A -- --grep "Buoc 0[1-5] "

# Chỉ chạy bước 14
npm run form:6A -- --grep "Buoc 14 "
```

### 3.4. Số đơn tạo mỗi lần chạy

Số đơn được lấy theo thứ tự ưu tiên sau:
1. `BCTK_SO_DON_<form>` trong `.env.staging` (vd. `BCTK_SO_DON_6A=10`).
2. `BCTK_SO_DON` chung.
3. Dòng *"Số đơn tạo mỗi lần chạy"* trong sheet **Cấu hình** của `data-form-X.xlsx`.

Mỗi đơn là một "ô": `Đơn 01`, `Đơn 02`… Tăng số đơn từ 5 lên 10 sẽ thêm Đơn 06–10, các đơn cũ giữ nguyên.

---

## 4. Cơ chế trạng thái: chạy tiếp, chạy lại

Mỗi đơn có một file `state/<lĩnh vực>/form-X/Đơn NN.json`. File này lưu:
- những gì các bước đã tạo ra (link đơn, mã vụ án, số quyết định, số bản án…);
- `buocXong`: bước cuối cùng đã hoàn tất.

Các quy tắc chạy:
- **Bước đã xong được bỏ qua** (`skipped`): bước có số ≤ `buocXong` không chạy lại.
- **Bước trước chưa xong thì bước sau bỏ qua**, kèm lý do "Bước N chưa xong — chạy bước đó trước".
- **Lỗi giữa chừng:** chỉ cần chạy lại cả form. Kịch bản tự tiếp tục từ bước hỏng, không tạo trùng hồ sơ.
- **Đơn đã đi hết các bước:** lần chạy sau, Bước 01 tự xóa state và **tạo đơn/vụ án mới** trong cùng ô.
- **Muốn làm lại từ một bước:** mở file JSON, sửa `"buocXong"` về số bước *trước* bước đó (vd. muốn làm lại bước 12 thì đặt `11`), rồi chạy lại.
- **Muốn bỏ hẳn một đơn đang dở và tạo mới:** xóa file `Đơn NN.json`.

Form có **file đầu vào** (1D1, 2C, 2D, 5B, 5C, 5D, 6B, 6C, 6D):
- Mỗi dòng trong sheet **Vụ án** của `data-form-X.xlsx` là một test, đặt tên theo số bản án hoặc mã vụ án.
- State được lưu theo tên đó.

---

## 5. Dữ liệu đầu vào và chuỗi form

| Loại | Form | Đầu vào |
|---|---|---|
| Tạo mới từ đầu | 1A1, 2A, 3A, 5A, 6A, 10A/C/E/G/I | Sheet **Cấu hình** (tòa án, số đơn…). Dữ liệu đương sự sinh ngẫu nhiên. |
| Phúc thẩm từ vụ sơ thẩm | 1B, 2B, 5B, 6B | Sheet **Vụ án**: *Mã vụ án, Tòa án sơ thẩm, Tòa án phúc thẩm, Link vụ án, Luồng*. |
| Giám đốc thẩm / tái thẩm từ bản án | 1D1, 2C, 2D, 5C, 5D, 6C, 6D | Sheet **Vụ án**: *Số bản án, Ngày bản án, Tòa ra quyết định, Cấp xét xử, Người kháng nghị*. |

Thứ tự thường dùng, ví dụ với hành chính:

```
6A (sơ thẩm) ──output: Mã vụ án, Số bản án──┬──► 6B (phúc thẩm)       ← chép Mã vụ án vào data-form-6B.xlsx
                                             └──► 6C / 6D (GĐT / TT)   ← chép Số bản án vào data-form-6C/6D.xlsx
```

Có thể chỉ sang file đầu vào khác mà không sửa file mặc định:

```powershell
$env:BCTK_FILE_6C = 'C:\du-lieu\6C-dot-2.xlsx'; npm run form:6C
```

Các biến ghi đè khác (đặt trong `.env.staging` hoặc `$env:`):

| Biến | Ý nghĩa |
|---|---|
| `BCTK_TK_VU_TRUONG_<form>`, `BCTK_TK_LANH_DAO_<form>` | Đổi tài khoản Vụ trưởng / Lãnh đạo TANDTC cho các form GĐT, TT (2C, 2D, 5C, 5D, 6C, 6D, 1D1). |
| `BCTK_SO_PHAP_NHAN` | Số bị can pháp nhân mỗi vụ 1A1. |
| `BCTK_LUONG` | Luồng 1B khi file không có cột "Luồng": `khang-cao` hoặc `khang-nghi`. |

---

## 6. Kết quả

- **File Excel:** `output/<lĩnh vực>/<mã form>/output-ma-vu-an-form-X_<ngày>_<giờ>.xlsx`.
  - Mỗi lần bấm chạy sinh một file mới. Mỗi vụ án xong là một dòng: thời gian, Mã vụ án, link, các số quyết định, Số bản án…
  - Đóng file Excel trước khi chạy. File đang mở có thể làm việc ghi kết quả bị lỗi.
- **Báo cáo HTML:** `npx playwright show-report playwright-report/form-6A`.
- **Khi lỗi:** trace, ảnh và video nằm ở `test-results/form-X/`. Mở trace bằng:

  ```powershell
  npx playwright show-trace test-results/form-6A/<thư-mục-test>/trace.zip
  ```

---

## 7. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `Thiếu file .env.staging` hoặc `Thiếu biến URL` | Tạo lại `.env.staging` có dòng `URL=https://qla-stg.toaan.gov.vn/sso/login`. |
| `CHẶN: … là PRODUCTION` | `URL` đang trỏ vào production. Đổi sang STG. |
| Đăng nhập báo lỗi / trang trắng / 404 | Một tài khoản đăng nhập được ở nhiều nơi cùng lúc. Kịch bản tự bấm Đăng nhập lại và tự mở lại `…/qla/dashboard`. Nếu vẫn lỗi thì chạy lại, các bước đã xong được giữ nguyên. |
| `Test timeout of 600000ms exceeded` | STG chậm. Chạy lại; bước sẽ tiếp tục từ chỗ dừng. |
| `Thiếu "xxx" — chạy lại Bước NN trước` | State thiếu dữ liệu bước trước. Sửa `buocXong` trong JSON về `NN − 1` rồi chạy lại. |
| Cả loạt test báo *skipped* | Các bước đó đã xong (xem `buocXong`), hoặc bước trước chưa xong. Đọc lý do bỏ qua trên UI hoặc trong log. |
| Không tìm thấy tài khoản của tòa / người ký | Thêm dòng vào `Taikhoan.xlsx` (đúng tên tòa và họ tên như trên hệ thống). |
| Chạy song song nhiều form | Được, vì mỗi form có thư mục `test-results/` và `playwright-report/` riêng. Không chạy cùng **một** form ở hai cửa sổ cùng lúc, vì hai lần chạy sẽ ghi đè state của nhau. |

---

## 8. Thêm một form mới (tóm tắt)

1. Ghi lại thao tác thật bằng `npx playwright codegen https://qla-stg.toaan.gov.vn/sso/login --viewport-size=1600,860`.
2. Viết tài liệu nghiệp vụ `src/step/<lĩnh vực>/form-X/HD X.docx`.
3. Tạo `src/pages/<lĩnh vực>/form-X/`. Có thể nhân bản form gần giống nhất, vd. 5C nhân bản từ 2C:
   - `cau-hinh-X.ts`
   - `create-case-X.page.ts`
   - `buoc/NN-*.ts`: mỗi bước là một object `Buoc` có `so`, `ten`, `chay`.
4. Tạo `src/tests/<lĩnh vực>/form-X/report-X.spec.ts`, theo mẫu của form 6A.
5. Thêm mã form vào biểu thức `SPEC_LUONG` trong `playwright.config.ts`.
6. Thêm `data-form-X.xlsx` và các script `form:X`, `form:X:headed`, `form:X:ui` vào `package.json`.
7. Chạy `npm run typecheck`, sau đó `npm run form:X:ui` để thử từng bước.
