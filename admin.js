const loadBtn = document.getElementById('loadBtn');
const tokenInput = document.getElementById('adminToken');
const messageEl = document.getElementById('adminMessage');
const listEl = document.getElementById('adminRecords');

function setMessage(text, error = false) {
  messageEl.textContent = text;
  messageEl.style.color = error ? '#c63c2f' : '#178b4d';
}

function render(items) {
  listEl.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = '暂无记录';
    listEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    const imageUrl = item.filePath;
    li.innerHTML = `
      <strong>${item.name}</strong>（${item.contact}）<br>
      类型：${item.checkinType === 'revive' ? '补卡复活' : '正常打卡'}，周期：${item.cycleDays}天，第${item.day}天<br>
      时间：${new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}<br>
      备注：${item.note || '无'}<br>
      存储：本地落盘（服务器）<br>
      图片：<a href="${imageUrl}" target="_blank" rel="noopener noreferrer">查看图片</a>
    `;
    listEl.appendChild(li);
  });
}

loadBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    setMessage('请输入管理员令牌', true);
    return;
  }

  try {
    const response = await fetch('/api/checkins', {
      headers: {
        'x-admin-token': token,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '加载失败', true);
      return;
    }

    render(data.items || []);
    setMessage(`加载成功，共 ${data.count} 条记录。`);
  } catch {
    setMessage('网络异常，加载失败。', true);
  }
});
