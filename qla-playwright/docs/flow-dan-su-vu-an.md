# Luồng vụ án DÂN SỰ (đơn khởi kiện → sơ thẩm → phúc thẩm)

Đặc tả: `docs/stepdata/StepData_DanSu_VuAn.txt` (229 dòng).
Mã: `flows/dan-su/flow-001-st-pt/` · dữ liệu `data/dan-su/flow-001-st-pt/` · spec
`tests/dan-su/flows/flow-001-st-pt.spec.ts`.

## Quyết định thiết kế: tái dùng nguyên thân bước của luồng KDTM

Đối chiếu hai đặc tả từng mục thì luồng dân sự và luồng KDTM **đi cùng màn, cùng biểu mẫu, cùng thứ
tự** — kể cả route: luồng KDTM vốn chạy trên `vu-an/dan-su/so-tham/chi-tiet` (màn dân sự dùng chung cho
các loại án). Vì vậy:

- `flow.ts` của dân sự **lọc lại 23 bước đầu của `FLOW_001` (KDTM)** thay vì chép khai báo, chỉ đổi
  trường `nguon` cho đúng tài liệu.
- `cai-dat.ts` **dùng thẳng `CAI_DAT` của KDTM** — chép thân bước là tạo hai bản sao rồi lệch dần.
- Khác biệt thật nằm ở **dữ liệu gieo**, khai trong `data/dan-su/.../case-001/input.ts` bằng cách trải
  bộ gieo KDTM rồi ghi đè vài ô.

Phạm vi: đặc tả dân sự **dừng ở phúc thẩm** (Step4.7), không có GĐT/TT → luồng chỉ có bước 01→23.

## Dữ liệu khác KDTM

| Ô | KDTM | Dân sự |
|---|---|---|
| Loại đơn | Kinh doanh, thương mại | **Dân sự** |
| QHPL thống kê (mã) | `QHPL_TC_KDTM.001` | **`QHPL_TC_DS.003.005`** |
| QHPL thống kê (tên lá) | `Mua bán hàng hoá` | **`Tranh chấp hợp đồng vay tài sản`** |
| Người kháng cáo | bị đơn | bị đơn (đặc tả 7.2: "Người bị kiện") |

Mã và tên lá **hỏi thẳng máy chủ**, không đoán: `GET /danh-muc?maDanhMucCha=QHPL_TC_DS.003&size=999`
trả 22 mục lá (03/10/2026). Đây là chỗ dễ sai nhất vì `chonQhplThongKe` khớp tên lá CHÍNH XÁC (`^tên$`)
mà quy luật đặt tên hai nhóm KHÁC NHAU: lá KDTM là tên ngắn ("Mua bán hàng hoá"), lá dân sự mang trọn
chữ ("Tranh chấp hợp đồng vay tài sản"). Dò lại khi cần: `node tools/chay-ui.js stg --cli
--file=do-danh-muc-qhpl` (đặt `QLA_NHOM=`, `QLA_TIM=` để lọc).

## Mâu thuẫn trong chính đặc tả (không phải lỗi kịch bản)

b4.10 bắt chọn **"Không tiến hành hòa giải tại Tòa án"** + lý do, nhưng Step5.5–5.7 lại lập **Biên bản
hòa giải 34-DS** và kiểm "Phiên họp lần 1". Vụ đã đánh dấu không hòa giải thì màn không mở 34-DS/35-DS.
Bước 09 xử lý đúng như vậy: lập 31-DS, còn 34/35 ghi "(không áp dụng — vụ không hòa giải)". Muốn chạy
nhánh CÓ hòa giải thì gieo `khongHoaGiai: false`.

## Lỗi khung đã sửa khi dựng luồng này (03/10/2026)

Thân bước GĐT và phúc thẩm **nhập cứng tên đương sự của case-001 KDTM**
(`import { TEN_NGUYEN_DON } from '…/case-001/input'`), nghĩa là mọi case đều tra lưới bằng tên của
case-001. Chưa lộ ở KDTM vì còn khớp theo số bản án, nhưng luồng dân sự thì sai hẳn. Nay lấy từ
`input.nguyenDon.hoTen` / `input.biDon.hoTen` của chính case đang chạy.

## Chạy

```
set QLA_CASE=case-ds-001 && npm run kdtm:flow-001:stg -- --file=dan-su/flows/flow-001-st-pt --so-cai=a
```

⚠ KHÔNG chạy song song với luồng KDTM nếu hai luồng dùng **cùng tài khoản** (`chanhAnDanSu`…): WSO2 chỉ
cho một phiên cho mỗi tài khoản, phiên sau đá phiên trước về `/sso/login` và cả hai lượt cùng hỏng.
