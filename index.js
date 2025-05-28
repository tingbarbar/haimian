const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
//微信支付
const tenpay = require('tenpay');

const logger = morgan("tiny");
const app = express();

// 配置微信支付（从环境变量获取）
const config = {
  appid: 'wxe6200b69f71cc8e1',      // 微信应用ID
  mchid: '1707366406',           // 您的商户号
  // partnerKey: process.env.API_KEY, // 商户API密钥
  partnerKey: 'liangting12312312312345liangting', // 商户API密钥
  notify_url: process.env.NOTIFY_URL || 'https://express-jhvv-131747-9-1333113371.sh.run.tcloudbase.com/api/pay/callback'
};

const api = new tenpay(config);



app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});



// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});


// 新增支付路由
app.post('/api/pay/create', async (req, res) => {
  try {
    const { total } = req.body;
    const out_trade_no = Date.now().toString();
    
    const result = await api.getPayParams({
      out_trade_no,
      body: '测试支付',
      total_fee: total, // 金额（分）
      openid: req.headers['x-wx-openid'] // 从小程序获取openid
    });
    
    res.json({ code: 0, data: result });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 支付回调
app.post('/api/pay/callback', async (req, res) => {
  try {
    const info = await api.handleNotify(req, res);
    if (info) {
      // 处理支付成功逻辑
      console.log('支付成功:', info);
      return res.send(api.success());
    }
    return res.send(api.fail());
  } catch (error) {
    console.error('回调处理失败:', error);
    res.status(500).send('fail');
  }
});


// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
