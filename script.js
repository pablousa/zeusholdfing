let cash = 10000;
let selected = "ZEUS3";
let mode = "BUY";
let trades = [];
let portfolio = {};
let priceHistory = {};
let animationTimer = null;

const stocks = {
  ZEUS3: { name: "Zeus Holding ON", price: 84.72, open: 84.72, volatility: 1.85 },
  ATLN4: { name: "Atlas Energia PN", price: 31.46, open: 31.46, volatility: 0.55 },
  NEXA3: { name: "Nexa Tecnologia ON", price: 52.19, open: 52.19, volatility: 0.75 },
  BRAV4: { name: "Bravus Bank PN", price: 18.93, open: 18.93, volatility: 0.42 },
  KOCH3: { name: "Kochi Entertainment ON", price: 11.82, open: 11.82, volatility: 0.38 }
};

Object.keys(stocks).forEach(symbol => {
  priceHistory[symbol] = Array.from({ length: 42 }, (_, i) => {
    const stock = stocks[symbol];
    return stock.price + Math.sin(i / 3) * stock.volatility * 2 + (Math.random() - 0.5) * stock.volatility;
  });
});

function brl(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function stockChange(symbol) {
  const s = stocks[symbol];
  return ((s.price - s.open) / s.open) * 100;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  updateUI();
}

function renderStocks() {
  const box = document.getElementById("stocks");
  box.innerHTML = "";

  Object.entries(stocks).forEach(([symbol, stock]) => {
    const change = stockChange(symbol);
    const item = document.createElement("div");
    item.className = "stock-item" + (symbol === selected ? " selected" : "");
    item.onclick = () => selectStock(symbol);

    item.innerHTML = `
      <strong>${symbol}</strong>
      <small>${stock.name}</small>
      <div class="stock-row">
        <span>${brl(stock.price)}</span>
        <span class="${change >= 0 ? "positive" : "negative"}">
          ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
        </span>
      </div>
    `;

    box.appendChild(item);
  });
}

function selectStock(symbol) {
  selected = symbol;
  renderStocks();
  updateSelectedAsset();
  drawChart();
  updateEstimatedQty();
}

function setMode(newMode) {
  mode = newMode;
  document.getElementById("buyBtn").classList.toggle("active-mode", mode === "BUY");
  document.getElementById("sellBtn").classList.toggle("active-mode", mode === "SELL");
}

function updateSelectedAsset() {
  const stock = stocks[selected];
  const changeValue = stockChange(selected);

  document.getElementById("selectedSymbol").textContent = selected;
  document.getElementById("selectedName").textContent = stock.name;
  document.getElementById("selectedPrice").textContent = brl(stock.price);

  const change = document.getElementById("selectedChange");
  change.textContent = `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`;
  change.className = changeValue >= 0 ? "positive" : "negative";

  document.getElementById("priceBadge").textContent = brl(stock.price);
}

function updateEstimatedQty() {
  const capital = Number(document.getElementById("capitalInput").value || 0);
  const price = stocks[selected].price;
  const qty = Math.floor(capital / price);
  document.getElementById("estimatedQty").textContent = `${qty} ações`;
}

function executeTrade() {
  const capital = Number(document.getElementById("capitalInput").value || 0);
  const stock = stocks[selected];
  const qty = Math.floor(capital / stock.price);

  if (capital <= 0 || qty <= 0) {
    toast("Coloque capital suficiente para pelo menos 1 ação.");
    return;
  }

  if (mode === "BUY") {
    const total = qty * stock.price;

    if (total > cash) {
      toast("Saldo insuficiente para executar essa compra.");
      return;
    }

    cash -= total;

    if (!portfolio[selected]) portfolio[selected] = { qty: 0, avg: 0 };

    const current = portfolio[selected];
    const oldTotal = current.qty * current.avg;
    current.qty += qty;
    current.avg = (oldTotal + total) / current.qty;

    trades.unshift({ type: "BUY", symbol: selected, qty, price: stock.price, total });
    toast(`BUY executado: ${qty} ações de ${selected}.`);
  }

  if (mode === "SELL") {
    const current = portfolio[selected];

    if (!current || current.qty < qty) {
      toast("Você não possui ações suficientes para vender.");
      return;
    }

    const total = qty * stock.price;
    current.qty -= qty;
    cash += total;

    if (current.qty === 0) delete portfolio[selected];

    trades.unshift({ type: "SELL", symbol: selected, qty, price: stock.price, total });
    toast(`SELL executado: ${qty} ações de ${selected}.`);
  }

  updateUI();
}

function investedValue() {
  return Object.entries(portfolio).reduce((sum, [symbol, pos]) => {
    return sum + pos.qty * stocks[symbol].price;
  }, 0);
}

function updateUI() {
  const invested = investedValue();
  const equity = cash + invested;

  document.getElementById("cashDisplay").textContent = brl(cash);
  document.getElementById("homeCash").textContent = brl(cash);
  document.getElementById("homeInvested").textContent = brl(invested);
  document.getElementById("homeEquity").textContent = brl(equity);
  document.getElementById("homeTrades").textContent = trades.length;

  document.getElementById("pCash").textContent = brl(cash);
  document.getElementById("pInvested").textContent = brl(invested);
  document.getElementById("pEquity").textContent = brl(equity);

  renderPositions();
  renderHistory();
  updateEstimatedQty();
  renderStocks();
  updateSelectedAsset();
}

function renderPositions() {
  const box = document.getElementById("positions");
  const entries = Object.entries(portfolio);

  if (entries.length === 0) {
    box.className = "positions-empty";
    box.innerHTML = "Nenhum ativo comprado ainda.";
    return;
  }

  box.className = "";
  box.innerHTML = entries.map(([symbol, pos]) => {
    const price = stocks[symbol].price;
    const value = pos.qty * price;
    return `
      <div class="position-item">
        <div class="position-name">
          <strong>${symbol}</strong>
          <small>${pos.qty} ações · PM ${brl(pos.avg)}</small>
        </div>
        <div class="position-value">${brl(value)}</div>
      </div>
    `;
  }).join("");
}

function renderHistory() {
  const box = document.getElementById("historyList");

  if (trades.length === 0) {
    box.className = "positions-empty";
    box.innerHTML = "Nenhuma operação executada.";
    return;
  }

  box.className = "";
  box.innerHTML = trades.map(t => `
    <div class="history-item">
      <div class="history-name">
        <strong>${t.type} — ${t.symbol}</strong>
        <small>${t.qty} ações · Preço ${brl(t.price)}</small>
      </div>
      <div class="history-value ${t.type === "BUY" ? "positive" : "negative"}">${brl(t.total)}</div>
    </div>
  `).join("");
}

function drawChart() {
  const values = priceHistory[selected];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 900;
    const y = 300 - ((v - min) / range) * 260;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L900 330 L0 330 Z`;

  const isPositive = stockChange(selected) >= 0;
  const line = document.getElementById("chartLine");
  const chartArea = document.getElementById("chartArea");

  line.setAttribute("d", path);
  chartArea.setAttribute("d", area);

  line.setAttribute("stroke", isPositive ? "#19c37d" : "#ff4d4d");
  chartArea.setAttribute("fill", isPositive ? "rgba(25,195,125,.10)" : "rgba(255,77,77,.10)");

  const lastY = points[points.length - 1][1];
  const topPercent = (lastY / 330) * 100;
  document.getElementById("priceLine").style.top = `${topPercent}%`;
  document.getElementById("priceBadge").style.top = `${topPercent}%`;
}

function tickMarket() {
  Object.entries(stocks).forEach(([symbol, stock]) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const movement = direction * (Math.random() * stock.volatility);
    const drift = Math.sin(Date.now() / 3000 + stock.price) * stock.volatility * 0.12;

    stock.price = Math.max(1, stock.price + movement + drift);
    stock.price = Number(stock.price.toFixed(2));

    priceHistory[symbol].push(stock.price);
    if (priceHistory[symbol].length > 42) priceHistory[symbol].shift();
  });

  drawChart();
  updateUI();
}

function startLiveMarket() {
  if (animationTimer) clearInterval(animationTimer);
  animationTimer = setInterval(tickMarket, 900);
}

function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

document.getElementById("capitalInput").addEventListener("input", updateEstimatedQty);

renderStocks();
updateSelectedAsset();
drawChart();
updateUI();
startLiveMarket();
