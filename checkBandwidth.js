const https = require('https');
const fetch = require('node-fetch');

const api_url = "https://xxxx.net/members/xxxxx"; // API URL分解到下面定义请求参数
const dingTalkWebhook = process.env.DINGTALK_WEBHOOK; // 从环境变量中获取钉钉Webhook URL
const dingTalkWebhook = process.env.WECHAT_WEBHOOK; // 从环境变量中获取微信Webhook URL

// 定义请求参数
const myRequest = {
    hostname: 'justmysocks6.net',
    path: '/members/getbwcounter.php?service=262606&id=1c0473a0-400f-4d54-b98c-3255120b6d2b',
    method: 'GET',
    timeout: 4000 // 设置超时时间为4000毫秒
};

// 计算下一个重置日期
function getNextResetDate(dayOfMonth) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 创建洛杉矶时区的重置日期
    let resetDate = new Date(Date.UTC(currentYear, currentMonth, dayOfMonth, 7, 0, 0)); // UTC时间比洛杉矶时间早8小时

    // 如果重置日期已经过去，设置为下个月
    if (resetDate < now) {
        resetDate = new Date(Date.UTC(currentYear, currentMonth + 1, dayOfMonth, 7, 0, 0));
    }

    return resetDate;
}

// 处理单独运行的逻辑
function handleStandaloneRun(monthly_bw_limit_gb, bw_used_gb, nextResetDate) {
    const percentage = (bw_used_gb / monthly_bw_limit_gb) * 100;
    const bar_length = 37;
    const filled_length = Math.round(bar_length * percentage / 100);
    const bar = '▓'.repeat(filled_length) + '░'.repeat(bar_length - filled_length);

    // 格式化重置时间为洛杉矶时区
    const optionsLA = { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const resetDateLA = new Intl.DateTimeFormat('zh-CN', optionsLA).format(nextResetDate);

    // 格式化重置时间为本地时区
    const optionsLocal = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const resetDateLocal = new Intl.DateTimeFormat('zh-CN', optionsLocal).format(nextResetDate);

    let message = `流量使用情况\n\n`;
    message += `流量限额: ${monthly_bw_limit_gb.toFixed(3)} GB\n\n`;
    message += `已用流量: ${bw_used_gb.toFixed(3)} GB\n\n`;
    message += `剩余流量: ${(monthly_bw_limit_gb - bw_used_gb).toFixed(3)} GB\n\n`;
    message += `使用比例: ${percentage.toFixed(2)}%\n\n`;
    message += `重置时间 (洛杉矶时间): ${resetDateLA}\n\n`;
    message += `重置时间 (本地时间): ${resetDateLocal}\n\n`;

    console.log(message);
    sendDingTalkMessage(message);
    sendWeChatMessage(message);
}

// 发送钉钉消息
function sendDingTalkMessage(message) {
    const url = dingTalkWebhook;
    const params = {
        msgtype: 'text',
        text: {
            content: message
        }
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(data => {
        if (data.errcode === 0) {
            console.log('消息发送成功');
        } else {
            console.error('消息发送失败', data);
        }
    })
    .catch(error => {
        console.error('请求失败', error);
    });
}

// 发送微信消息
function sendWeChatMessage(message) {
    const url = wechatWebhook;
    const params = {
        msgtype: 'text',
        text: {
            content: message
        }
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(data => {
        if (data.errcode === 0) {
            console.log('微信消息发送成功');
        } else {
            console.error('微信消息发送失败', data);
        }
    })
    .catch(error => {
        console.error('请求失败', error);
    });
}

// 执行请求
const req = https.request(myRequest, (res) => {
    let data = '';

    // 接收数据
    res.on('data', (chunk) => {
        data += chunk;
    });

    // 数据接收完毕
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(data);
            const monthly_bw_limit = parsedData['monthly_bw_limit_b'];
            const bw_used = parsedData['bw_counter_b'];
            const bw_reset_day_of_month = parsedData['bw_reset_day_of_month'];

            // 强制使用十进制单位制进行计算
            const monthly_bw_limit_gb = monthly_bw_limit / 1000000000;
            const bw_used_gb = bw_used / 1000000000;

            // 计算下一个重置日期
            const nextResetDate = getNextResetDate(bw_reset_day_of_month);

            // 处理单独运行的逻辑
            handleStandaloneRun(monthly_bw_limit_gb, bw_used_gb, nextResetDate);
        } catch (e) {
            console.error("解析响应数据失败", e);
        }
    });
});

// 处理请求错误
req.on('error', (e) => {
    console.error("获取数据失败", e);
});

// 设置请求超时
req.setTimeout(4000, () => {
    req.abort();
    console.error("请求超时");
});

// 发送请求
req.end();
