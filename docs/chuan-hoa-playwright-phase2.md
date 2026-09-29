# Phase 2 — THIẾT KẾ chuẩn hoá Playwright theo phân hệ

Trạng thái: **đề xuất, chờ duyệt**. Chưa sửa code.
Đầu vào: kết quả Phase 1 + chốt của user ngày 30/09/2026.

## 0. Hai chốt của user

1. **Số bản án không đặt số trần.** `1, 2, 3, 4` là sai (→ quy tắc R1b, `e2e/CLAUDE.md`).
2. **`StepData_KinhDoanhThuongMai_VuAn.txt` chạy xong mới sinh ra NGÀY BẢN ÁN / SỐ BẢN ÁN**, rồi
   mới đưa sang `docs/Playwright nhập data GDT-TT.txt` để chạy tiếp.

Chốt thứ hai quyết định toàn bộ kiến trúc: **số/ngày/tòa bản án là OUTPUT của giai đoạn trước, là
INPUT của giai đoạn sau** — không phải hằng số khai trong dataset.

## 1. Vấn đề cốt lõi cần sửa: mắt xích ST → GĐT đang là thao tác tay

Hiện tại:

```
vu-an-hinh-su-so-tham.spec.ts  →  [người đọc kết quả, dán bảng vào .ts]  →  data/ban-an-*.ts  →  luồng GĐT
```

Chỗ dán tay đó là nguồn lỗi. `data/ban-an-hinh-su-26-09-2026.ts` đã tự ghi nhận: *"bảng giao ghi
'Tòa án TP Hà Nội' cho 8 vụ đầu, nhưng hệ thống ghi D01.131.09"*. Đợt KDTM 28/09 thì dán số bản án
`1`–`10` và hỏng toàn bộ.

Thiết kế mới:

```
A. Đơn khởi kiện → B. Sơ thẩm → C. Phúc thẩm → D. GĐT/TT → E. Báo cáo thống kê
        └──────────── một CaseState duy nhất, nối bằng rootCaseKey ────────────┘
```

Không có bước dán tay. Không có `data/ban-an-*.ts` viết tay cho các giai đoạn sau.

## 2. Cấu trúc thư mục đích

Giữ `pages/`, `common/`, `tools/`, `config/` dùng chung (đúng quy tắc #29 — chúng thật sự dùng
chung: `gdt.page.ts` phục vụ mọi phân hệ). Chỉ tách theo phân hệ phần **có nghiệp vụ riêng**:

```
e2e/
├── pages/            (giữ nguyên — dùng chung)
├── common/           (giữ nguyên — dùng chung)
├── tools/            (giữ nguyên)
├── config/           (giữ nguyên)
├── khung/                              ← MỚI: khung case/step dùng chung
│   ├── case-state.ts                   CaseState + CaseContext + resume + chống trùng
│   ├── registry.ts                     registry tổng
│   └── buoc.ts                         khai báo step: input/action/verify/output/checkpoint
└── tests/
    ├── kinh-doanh-thuong-mai/          ← phân hệ đầu tiên
    │   ├── data/
    │   │   ├── case-001.ts             hằng số gieo của case (tất định)
    │   │   └── nguon/                  StepData_KinhDoanhThuongMai_VuAn.txt
    │   ├── flows/                       hàm nghiệp vụ dùng lại giữa các case
    │   ├── specs/case-001/             01-…spec.ts … n-…spec.ts
    │   └── README.md
    ├── dan-su/  hinh-su/  hanh-chinh/  hon-nhan-gia-dinh/  lao-dong/  pha-san/
    └── backup/                          ← test cũ chuyển vào, không xoá
        ├── hinh-su/ dan-su/ hanh-chinh/ kinh-doanh-thuong-mai/ chung/
```

`state/` **không** đặt trong từng phân hệ: giữ ở `seed-output/` như hiện nay (đã gitignore, đã có
tool gộp/đồng bộ), đổi tên file theo phân hệ + case thay vì theo ngày đợt chạy.

## 3. Canonical flow KDTM_CASE_001 — 5 giai đoạn, ~40 step

Đề bài phác 15 step; đếm theo nghiệp vụ thật thì là **khoảng 40**. Nguồn của từng giai đoạn:

| Giai đoạn | Step | Nguồn đặc tả | Code tham chiếu |
|---|---|---|---|
| **A. Đơn khởi kiện** | A01 tạo đơn · A02 phân công TP xử lý đơn · A03 kết quả xử lý (26-DS, án phí 29-DS, biên lai) · A04 thụ lý vụ (30-DS) | StepData b1–b10 + "Xử lý Chi tiết đơn" | `don-khoi-kien-dan-su-26-09-2026.spec.ts` |
| **B. Sơ thẩm** | B01 thụ lý · B02 phân công NTHTT (PC-001/002/004) · B03 chuẩn bị xét xử (31/35/34/47-DS) · B04 xét xử (48/51-DS) · **B05 bản án ST (52-DS)** · B06 kháng cáo (55/62-DS) · B07 chuyển hồ sơ PT | StepData Step3–Step8 | `don-hanh-chinh-so-tham.spec.ts` S2–S12 |
| **C. Phúc thẩm** | C01 tiếp nhận · C02 thụ lý (65-DS) · C03 phân công HĐXX (84-DS) · C04 chuẩn bị xét xử (83/66-DS) · C05 xét xử · **C06 bản án PT** | StepData PT b1–b5, Step1–3 (**dừng ở đây**) + suy từ code hành chính | `don-hanh-chinh-so-tham.spec.ts` PT1–PT6 |
| **D. GĐT/TT** | D01–D23 | `docs/Playwright nhập data GDT-TT.txt` | `common/luong-gdt-tt.ts` (đã có) |
| **E. Báo cáo thống kê** | E01 | **chưa có nguồn** | — |

**Hai khoảng trống phải khai báo rõ:**

- `StepData` dừng ở Phúc thẩm Step 3 "Chuẩn bị xét xử". C05–C06 hiện suy từ luồng hành chính
  (`PT5`, `PT6`) và phải được nghiệp vụ xác nhận lại cho KDTM.
- Giai đoạn E chưa có đặc tả nào. Trước mắt E01 chỉ **verify**: số liệu vụ án của case xuất hiện
  đúng trong báo cáo thống kê, không nhập liệu.

**Điểm bàn giao (handoff) giữa các giai đoạn** — đây là chỗ phải chặt nhất:

```
B05  → OUTPUT: soBanAnST, ngayBanAnST, maToaST   (đọc từ form ngay sau "Lấy số")
C06  → OUTPUT: soBanAnPT, ngayBanAnPT, maToaPT
D01  → INPUT : soBanAnPT/ngayBanAnPT/maToaPT  (không có PT thì lấy ST)
```

## 4. Định danh: rootCaseKey do test gieo, business key là đối chiếu

Số bản án **không dùng làm khoá khởi tạo** được: lúc STEP A01 nó chưa tồn tại, hệ thống mới cấp ở
B05 qua nút "Lấy số". Tách làm hai lớp:

**Lớp 1 — `rootCaseKey`: do test gieo, biết trước, bất biến.**

```
KINH_DOANH_THUONG_MAI|CASE_001
```

Mọi dữ liệu mô tả của case sinh **tất định** từ khoá này (không `Math.random`):

```ts
// tests/kinh-doanh-thuong-mai/data/case-001.ts
export const CASE_001 = {
  rootCaseKey: 'KINH_DOANH_THUONG_MAI|CASE_001',
  nguyenDon: 'Công ty TNHH Thương mại KDTM CASE 001',   // ← dấu vân tay của case
  biDon:     'Công ty CP Dịch vụ KDTM CASE 001',
  quanHePhapLuat: 'Tranh chấp hợp đồng mua bán hàng hoá',
  giaTriYeuCau: 150_000_000,
  ngayLamDon: '01/09/2026',           // tất định, không random
};
```

Tên đương sự mang luôn mã case → nhìn dữ liệu trên hệ thống là biết của case nào, và tra trùng
được bằng một lần tìm kiếm.

**Lớp 2 — business key: OUTPUT, dùng để đối chiếu và để bàn giao.**

```
KINH_DOANH_THUONG_MAI|ST|2026-09-01|D01.131.01|377/2026/KDTM-ST
KINH_DOANH_THUONG_MAI|PT|2026-10-15|D01.001.01|56/2026/KDTM-PT
```

Ghi vào state ngay khi sinh ra, giai đoạn sau đọc từ state. Bắt buộc dạng
`<số>/<năm>/<ký hiệu>` — kiểm bằng regex, sai dạng thì FAIL step (quy tắc R1b).

## 5. CaseState — mở rộng `common/so-cai-tkm.ts`, không viết mới

Sổ cái hiện tại **đã đúng mô hình** (khoá nghiệp vụ, `daXong[]`, lưu id output, resume bằng bỏ qua
bước đã xong). Chỉ bổ sung lớp phân hệ/case và các khoá bàn giao:

```ts
interface CaseState {
  module: 'KINH_DOANH_THUONG_MAI' | 'DAN_SU' | 'HINH_SU' | …;
  caseId: 'CASE_001';
  rootCaseKey: string;
  status: 'NEW' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';

  // khoá bàn giao giữa các giai đoạn — đều là OUTPUT, không khai tay
  idDon?: string;  maDon?: string;  soTiepNhan?: string;
  idVuAnST?: string;  maVuAnST?: string;  soThuLyST?: string;
  soBanAnST?: string;  ngayBanAnST?: string;  maToaST?: string;
  idVuAnPT?: string;  soBanAnPT?: string;  ngayBanAnPT?: string;  maToaPT?: string;
  idDonGdt?: string;  idVuGiaiQuyet?: string;  idVuXetXuGdt?: string;

  lastPassedStep?: string;
  buoc: Record<string, {
    status: 'NOT_RUN' | 'PASSED' | 'FAILED';
    luc?: string;
    verify?: { ui?: boolean; api?: boolean; db?: boolean | 'N/A' };
    loi?: string;
  }>;
}
```

File: `seed-output/<module>.<caseId>.<env>.state.json` — thay cho cách đặt tên theo ngày đợt chạy.

`idVuXetXuGdt` là khoá đã thiếu ở đợt 28/09 và gây 96% số lỗi (quy tắc R1).

## 6. Registry

`seed-output/registry.<env>.json`, ghi bằng đọc-sửa-ghi có khoá file (xem mục 8):

```json
{
  "KINH_DOANH_THUONG_MAI": { "CASE_001": { "status": "IN_PROGRESS", "lastPassedStep": "B05-ban-an-so-tham" } },
  "DAN_SU":  { "CASE_001": { "status": "NOT_RUN" } }
}
```

## 7. Chống trùng — ba lớp

1. **Trước khi tạo (Bước 0).** Tra `/qla/quan-ly-don/danh-sach-don` theo tên nguyên đơn tất định
   của case. Có rồi → reuse id, không tạo mới.
2. **Trước khi tạo đơn GĐT (D01).** Tra theo (Số BA/QĐ + Ngày BA/QĐ + Tòa ra BA/QĐ). Đã có đơn
   chính → dùng lại, **không tạo đơn phụ**. Đây là lỗi đã giết 4 vụ KDTM đợt 28/09.
3. **Phát hiện bất thường thì FAIL, không tạo thêm.** Thấy ≥2 bản ghi active cùng business key →
   dừng, in ra như mẫu ở mục 13 đề bài.

Tuyệt đối không dùng `Math.random` / `Date.now()` để né trùng. Xoá
`common/du-lieu.ts:46 soBanAn()` (đang random số bản án) sau khi không còn chỗ gọi.

## 8. Resume và chạy song song

- Resume: `lastPassedStep` + `buoc[].status`. Step N+1 chỉ chạy khi step N `PASSED`; chưa thì dừng
  và in đúng format mục 22 của đề bài.
- `SAFE_TO_RESUME`: mặc định `YES`; các step **tạo bản ghi không sửa được** (thụ lý, lấy số, ký
  logic) đánh dấu `NO` và phải kiểm tra lại trên DB trước khi chạy lại.
- **CASE_001 chạy serial** — `test.describe.configure({ mode: 'serial' })`, `workers: 1`
  (config hiện tại đã vậy).
- Song song: chỉ song song **giữa các case khác nhau**, không trong một case. State mỗi case một
  file nên không tranh nhau; registry ghi qua khoá file.

## 9. Định nghĩa một STEP

Mỗi step khai đủ 6 phần (mục 16 đề bài) và **PASS phải dựa trên kết quả nghiệp vụ**, không phải
"Playwright không throw" (quy tắc R5):

```ts
buoc({
  ma: 'B05-ban-an-so-tham',
  can: ['B04-xet-xu'],                 // step trước phải PASSED
  input:  s => ({ idVuAnST: s.idVuAnST }),
  action: async (page, s) => { /* soạn 52-DS → Thêm mới bản án → Lấy số → Ký logic */ },
  verify: {
    ui:  async page => expect(page.getByText('Kết quả xét xử')).toBeVisible(),
    api: async page => /* response lưu bản án 2xx */,
    db:  async s   => /* SELECT BAN_AN theo idVuAnST — checkpoint quan trọng thì bắt buộc */,
  },
  output: async page => {
    const soBanAn = /* đọc SO_QUYET_DINH trên form ngay sau "Lấy số" */;
    if (!/^\d+\/\d{4}\/KDTM-ST$/.test(soBanAn)) throw new Error(`Số bản án sai dạng: ${soBanAn}`);
    return { soBanAnST: soBanAn, ngayBanAnST, maToaST };
  },
});
```

## 10. Thứ tự thi công đề xuất

| Bước | Việc | Ghi chú |
|---|---|---|
| 1 | Dựng `khung/` (case-state, registry, buoc) | dựa trên `common/so-cai-tkm.ts` |
| 2 | Backup test cũ vào `tests/backup/<phân hệ>/` bằng `git mv` | giữ history, không xoá |
| 3 | Tạo `tests/kinh-doanh-thuong-mai/` + `data/case-001.ts` | |
| 4 | **A01** → chạy → verify → PASS → commit | rồi mới A02 |
| 5 | Lần lượt A02 … B05 | B05 là mốc quan trọng: sinh business key |
| 6 | B06 … C06 | C05–C06 cần nghiệp vụ xác nhận |
| 7 | D01–D23: **nối vào `common/luong-gdt-tt.ts` đã có**, input đọc từ state | không viết lại |
| 8 | E01 báo cáo thống kê | chờ đặc tả |
| 9 | Chạy lại toàn flow → kiểm idempotent | không sinh đơn trùng |

Không implement nhiều step cùng lúc (mục 35/49 đề bài).

## 11. Việc chưa chốt được, cần user quyết

1. **C05–C06 (xét xử + bản án phúc thẩm KDTM)** — `StepData` không có. Dùng tạm khuôn của luồng
   hành chính `PT5`/`PT6` hay chờ bổ sung đặc tả?
2. **E01 báo cáo thống kê** — chưa có nguồn nào. Verify cái gì là đủ?
3. **Dữ liệu KDTM 28/09 đã tạo trên STG** (đơn phụ, số bản án `1`–`10`, hội đồng 24 thành viên của
   VA26-004810) — bỏ mặc, hay đánh dấu để loại khỏi báo cáo?
