# 歌尔生活 · 新年不躺平计划（前后端可部署版）

本版本已改为 **前端上传 + 后端本地落盘 + 管理端查看**，不使用云存储。

## 功能

- 活动主题：**歌尔生活 · 新年不躺平计划**
- 参与前先登录：姓名 + 手机号
- 7/14/21 天打卡周期，每周期 1 次补卡复活
- 每日上传 1 张凭证图（运动照片 / 运动APP截图）
- 上传图片由后端接收并保存到服务器本地 `uploads/`
- 管理端页面：`/admin.html`（管理员令牌鉴权）

## 快速启动

```bash
python3 server.py
```

默认端口：`8080`

- 用户端：`http://localhost:8080`
- 管理端：`http://localhost:8080/admin.html`

## 环境变量

默认管理员令牌：`rockygoerlife`。

可新建 `.env`（或在启动前导出环境变量）：

```env
PORT=8080
ADMIN_TOKEN=rockygoerlife
```

## 目录说明

- `server.py`：Python 后端，提供上传与管理接口
- `uploads/`：图片本地落盘目录
- `data/checkins.json`：打卡元数据
- `index.html`：用户打卡页
- `admin.html`：管理查看页
