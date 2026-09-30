# Cấu trúc dự án: PHÂN HỆ → FLOW → CASE → STEP

Chốt 30/09/2026. Trục chính của dự án là **luồng nghiệp vụ end-to-end**, không phải màn hình.
Tổ chức theo màn hình thì một hành trình bị xé ra nhiều chỗ, không ai biết luồng đang đứt ở đâu.

```
PHÂN HỆ → FLOW → CASE → STEP → ACTION → VERIFY → CHECKPOINT
```

| Khái niệm | Nghĩa | Ở đâu |
|---|---|---|
| **FLOW** | 1 hành trình nghiệp vụ hoàn chỉnh | `flows/<phan-he>/<flow>/flow.ts` — bản đồ bước |
| **STEP** | 1 màn hình, hoặc 1 hành động nghiệp vụ chính trên màn hình đó | thân ở `flows/<phan-he>/<flow>/cai-dat.ts` |
| **CASE** | 1 bộ dữ liệu chạy qua FLOW | `data/<phan-he>/<flow>/cases.ts` + `<case>/input.ts` |
| **SPEC** | **1 file cho 1 luồng**, chạy từ đầu đến cuối | `tests/<phan-he>/flows/<flow>.spec.ts` |
| **PAGE** | chỉ là abstraction kỹ thuật để thao tác UI | `pages/`, `common/` |

Một STEP được phép đi qua nhiều màn hình. **Không ép "1 flow = 1 page".**

## Một luồng một file — vì sao không phải một bước một file

Một luồng có ~44 bước và dự án có **hàng nghìn case**. 44 file × nghìn case là không quản được, và
thêm một case lẽ ra chỉ là thêm dữ liệu chứ không phải nhân bản 44 file. Nên:

* **Thêm bước** → sửa `flow.ts` (bản đồ) + thêm một dòng vào `cai-dat.ts` (thân).
* **Thêm case** → thêm một phần tử vào `cases.ts` (+ `input.ts` của case). Không tạo file spec nào.
* File spec không chứa nghiệp vụ và **không cần sửa** khi thêm bước hay thêm case.

## Cây thư mục

```
e2e/
├── tests/<phan-he>/flows/<flow>.spec.ts     ← MỘT file cho MỘT luồng (gọi khaiLuong)
├── flows/<phan-he>/<flow>/
│   ├── flow.ts                              ← 44 bước: màn hình, route, vai, vao/ra, nguồn, xacMinh
│   ├── cai-dat.ts                           ← mã bước → thân nghiệp vụ (thiếu = fixme)
│   └── *.flow.ts                            ← thân từng mốc nghiệp vụ
├── data/<phan-he>/<flow>/
│   ├── cases.ts                             ← danh sách case (hoặc sinh từ bảng dữ liệu)
│   └── <case>/input.ts, expected.ts         ← dữ liệu GIEO (tất định) + kết quả mong đợi
├── state/<phan-he>/<flow>/<case>.<env>.state.json   ← flow đang chạy tới đâu (không commit)
├── khung/                                   ← case-state.ts · flow.ts · luong.ts
├── common/, pages/                          ← lớp kỹ thuật (thao tác antd, form người, menu…)
├── docs/stepdata/                           ← đặc tả gốc của Tester (đã che CCCD)
└── config/, fixtures/
```

## Bốn quy tắc không được phá

**1. Bản đồ bước khai một chỗ.** Thứ tự bước, màn hình, route, vai, khoá vào/ra, trích dẫn tài liệu
và mức xác minh đều ở `flow.ts`. Bảng phụ thuộc (bước N cần bước N−1 xong) *suy ra* từ thứ tự đó.
Khai hai nơi là lệch hai nơi.

**2. Không hard-code lại dữ liệu bước trước đã sinh.** Lấy bằng `can('<khoá>')`; thiếu khoá thì lỗi
chỉ rõ bước nào phải chạy lại. `npm run flow:lineage` kiểm: mọi khoá một bước đọc phải do một bước
TRƯỚC nó sinh ra — sai thì thoát mã 1.

**3. Bước chỉ xanh khi có BẰNG CHỨNG do hệ thống cấp.** Thân bước phải trả về id/số/mã
(`idDon`, `maVuAnSoTham`, `soBanAnSoTham`…). Trả object rỗng → khung ném lỗi. Lý do: đo 30/09/2026
sổ cái cũ ghi 20/23 bước xong cho một vụ thực tế **chưa thụ lý**.

**4. Bước sau bị CHẶN khi bước trước chưa xong.** Chặn trước lúc mở trình duyệt, nên không tốn một
phiên đăng nhập để rồi fail.

## Cách chạy

```bash
npm run kdtm:flow-001:kiem-tra                      # liệt kê bước, không mở trình duyệt
npm run kdtm:flow-001:stg:ui                        # UI mode, CÓ ghi dữ liệu thật
npm run kdtm:flow-001:stg                           # CLI, CÓ ghi dữ liệu thật

node tools/chay-ui.js stg --ghi --buoc=01..06       # chỉ bước 01–06
node tools/chay-ui.js stg --ghi --buoc=12,22        # chỉ bước 12 và 22
node tools/chay-ui.js stg --ghi --case=case-001     # chỉ một case
node tools/chay-ui.js stg --ghi --so-case=5         # 5 case đầu danh sách
node tools/chay-ui.js stg --ghi --so-cai=a          # chạy song song, state riêng cửa sổ này
node tools/chay-ui.js stg --ghi --bo-qua-da-xong    # bước đã xong thì bỏ qua, không làm lại
```

* `--buoc=NN` lọc bằng `-g "buoc (NN|…)-"`. **Tiền tố `buoc ` là bắt buộc**: tên flow/case có chứa
  `01-` nên biểu thức `(01)-` trần sẽ khớp mọi bước. (`--buoc=B15..B23` vẫn là luồng GĐT/TT cũ.)
* Không có `--ghi` thì mọi bước tự bỏ qua (`QLA_TKM_CHO_PHEP_GHI ≠ 1`) — an toàn để xem cấu hình.
* `--so-cai=a|b|c|d|e` cho chạy song song ở `toa-an-chay-rieng-*`; state vẫn **đọc gộp liên thư mục**
  nên không tạo trùng dữ liệu.

Kiểm tra bản đồ và tiến độ:

```bash
npm run flow:lineage      # bản đồ vào/ra, mức xác minh, số bước đã cài đặt; sai lineage → thoát 1
npm run flow:lineage:md   # xuất bảng Markdown (đang lưu ở docs/sinh/)
```

## Trạng thái hiện tại

| Phân hệ | Flow | Case | Bước |
|---|---|---|---|
| `kinh-doanh-thuong-mai` | `flow-001-st-pt-gdt-bao-cao` | `case-001` | **44 bước** theo màn hình; **1/44 đã cài đặt**, còn lại `fixme` chờ spec |

Bản đồ flow + lineage + ba chỗ tài liệu lệch hệ thống thật: **[flow-kdtm-gdt-tt.md](flow-kdtm-gdt-tt.md)**.

Các spec cũ (hành chính, hình sự, dân sự, GĐT/TT) **đã chuyển ra backup** 30/09/2026
(`D:/gtel/backup-e2e-20260930/cu-20260930/tests`, kèm `README-cu.md`) và không còn trong `testDir`.
Giai đoạn GĐT/TT (bước 24–43) hiện đã có cài đặt chạy được ở `common/luong-gdt-tt.ts` (B1–B23) —
chuyển sang khung thì dùng lại phần đó, chỉ đổi nguồn bản án từ Excel sang state
(`gdt-tt.flow.ts` · `banAnTuState`). Riêng `don-hanh-chinh-so-tham.spec.ts` (nay ở backup) có sẵn một
luồng hoàn chỉnh 19 bước (B1 → PT6) — nguồn tốt nhất để lấy phần cài đặt cho bước 02–23.

## Hàng nghìn case thì khai ở đâu

`cases.ts` có sẵn `dsCaseTuBang()`: mỗi DÒNG của bảng dữ liệu Tester là một case, `caseId` lấy từ
**cột khoá của dòng** (không lấy theo số thứ tự — thứ tự đổi là state trỏ sang case khác). Hàm này
đang ném lỗi có chủ ý vì chưa chốt ánh xạ cột của
`Data Test KDTM _ Sơ Thẩm - Phúc Thẩm - GĐT_TT.xlsx` (sheet "Sơ thẩm") sang các trường của
`input.ts`. Chốt xong ánh xạ là bật được, không phải sửa spec.

## Bước chưa cài đặt

Thiếu mã bước trong `cai-dat.ts` → khung đánh `fixme`. Bước vẫn hiện trong `--list` để thấy luồng
còn thiếu gì, và **không bao giờ báo xanh giả**. Khi có spec:

1. Viết thân nghiệp vụ vào `flows/<phan-he>/<flow>/<ten>.flow.ts`, trả về bằng chứng.
2. Thêm một dòng vào `cai-dat.ts`: `'NN-ma-buoc': ({ page, input, can, ghi }) => ...`.
3. `can('maVuAnSoTham')` để lấy khoá bước trước sinh ra.
4. Trả về đúng các khoá khai ở `ra` của bước — khung chỉ ghi PASSED khi có bằng chứng đó.
