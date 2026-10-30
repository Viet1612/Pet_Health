# Sơ đồ use case draw.io (UML 2)

Ví dụ hoàn chỉnh trong project này: `docs/design/usecase_diagram.drawio`.

## Bố cục

- Tiêu đề góc trên trái: tên hệ thống, chuẩn UML 2, nguồn tài liệu + ngày.
- Khung hệ thống (`BOUNDARY`) là hình chữ nhật lớn; mỗi module là một band nét đứt bên trong.
- Actor chính bên trái, actor phụ / hệ thống ngoài (email, lưu trữ, cron) bên phải.
- Use case là ellipse, nhãn `UC-01 Đăng ký tài khoản` + dòng nhỏ FR liên quan.
- Cạnh: association (đường thẳng không mũi tên), `<<include>>` / `<<extend>>` (nét đứt, mũi tên mở).

## Skeleton

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" type="device">
  <diagram id="usecase" name="Use Case — <Tên>">
    <mxGraphModel grid="1" gridSize="10" guides="1" connect="1" arrows="1" page="1" pageWidth="2000" pageHeight="2000">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="TITLE" value="Sơ đồ Use Case — &lt;Tên&gt;" style="text;html=1;align=left;fontSize=20;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="200" y="20" width="700" height="40" as="geometry"/></mxCell>
        <mxCell id="BOUNDARY" value="Hệ thống &lt;Tên&gt;" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeWidth=2;verticalAlign=top;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="200" y="100" width="1000" height="800" as="geometry"/></mxCell>
        <mxCell id="BAND1" value="1. Tài khoản (AUTH)" style="rounded=1;arcSize=2;dashed=1;whiteSpace=wrap;html=1;fillColor=#FAFAFA;strokeColor=#B3B3B3;verticalAlign=top;align=left;spacingLeft=8;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="215" y="130" width="970" height="300" as="geometry"/></mxCell>
        <mxCell id="ACT_USER" value="Người dùng" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1">
          <mxGeometry x="60" y="250" width="40" height="80" as="geometry"/></mxCell>
        <mxCell id="UC01" value="UC-01 Đăng ký&lt;br&gt;&lt;font style=&quot;font-size:10px&quot;&gt;FR-AUTH-001&lt;/font&gt;" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="260" y="170" width="180" height="60" as="geometry"/></mxCell>
        <mxCell id="UC02" value="UC-02 Xác minh email" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="520" y="170" width="180" height="60" as="geometry"/></mxCell>
        <mxCell id="E1" style="endArrow=none;html=1;" edge="1" parent="1" source="ACT_USER" target="UC01">
          <mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="E2" value="&lt;&lt;include&gt;&gt;" style="endArrow=open;dashed=1;html=1;endFill=0;" edge="1" parent="1" source="UC01" target="UC02">
          <mxGeometry relative="1" as="geometry"/></mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## Lưu ý

- `value` có HTML phải escape (`&lt;`, `&gt;`, `&quot;`); id duy nhất.
- Tính tọa độ để ellipse không đè nhau (lưới 2–4 cột mỗi band, cách 40px), band cao theo số dòng.
- Nhiều use case: sinh XML bằng script Python nhỏ thay vì viết tay, rồi parse lại để kiểm tra.
- Kèm bảng UC ↔ FR ↔ actor trong User_Stories.md hoặc SAD nếu cần.
