const express = require('express');
const axios = require('axios');
const app = express();

// 全局价格
let prices = {
  lighter: { mid: 0, bid: 0, ask: 0, timestamp: 0 },
  paradex: { mid: 0, bid: 0, ask: 0, timestamp: 0 }
};

// Lighter 主网 API
const LIGHTER_API = 'https://mainnet.zklighter.elliot.ai';

// 每 5 秒拉取 Lighter 订单簿
setInterval(async () => {
  try {
    const response = await axios.post(
      `${LIGHTER_API}/order_book_details`,
      { market: 'BTC-USD' },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const data = response.data;
    if (data.bids?.[0] && data.asks?.[0]) {
      const bid = parseFloat(data.bids[0][0]);
      const ask = parseFloat(data.asks[0][0]);
      prices.lighter = {
        bid, ask,
        mid: (bid + ask) / 2,
        timestamp: Date.now()
      };
      console.log('Lighter 实时价格:', prices.lighter.mid);
    }
  } catch (e) {
    console.error('Lighter API 错误:', e.message);
  }
}, 5000);

// 每 10 秒拉取 Paradex（DeFiLlama 聚合）
setInterval(async () => {
  try {
    const res = await axios.get('https://api.llama.fi/protocol/paradex');
    const tvl = res.data.tvl?.[0]?.totalLiquidityUSD || 0;
    // 简化：用 BTC 现货价格近似（实际可用 perp API）
    const btc = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcPrice = btc.data.bitcoin.usd;
    prices.paradex = {
      mid: btcPrice + (Math.random() - 0.5) * 100, // 模拟波动
      bid: 0, ask: 0,
      timestamp: Date.now()
    };
  } catch (e) {}
}, 10000);

// API 路由
app.get('/api/data', (req, res) => {
  const diff = prices.lighter.mid - prices.paradex.mid;
  res.json({
    l: { mid: prices.lighter.mid.toFixed(2), spread: ((prices.lighter.ask - prices.lighter.bid) / prices.lighter.mid * 100).toFixed(4) },
    p: { mid: prices.paradex.mid.toFixed(2), spread: '0.00' },
    diff: diff.toFixed(2),
    signal: Math.abs(diff) > 50 ? (diff > 0 ? '高空低多' : '低空高多') : '无机会'
  });
});

app.use(express.static('.'));
app.get('*', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`运行中: ${PORT}`));
