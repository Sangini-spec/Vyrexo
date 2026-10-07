/**
 * Preview Templates for dynamically generated applications
 * Ensures strict session isolation and domain-rich applications.
 */

export function generateEmptySessionHtml(sessionId: string): string {
  const cleanId = sessionId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vyrexo Live Sandbox</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 antialiased">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
    <div class="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
    <div class="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

    <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
      <i class="fa-solid fa-layer-group"></i>
    </div>

    <h2 class="text-lg font-bold text-white tracking-tight">Isolated Session Sandbox</h2>
    <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
      Session <code class="text-indigo-300 font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">${cleanId || "active"}</code> is clean and ready.
    </p>

    <div class="my-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left text-xs space-y-2">
      <div class="flex items-center gap-2 text-slate-300 font-medium">
        <i class="fa-solid fa-circle-check text-emerald-400 text-xs"></i>
        <span>Dedicated Sandbox Environment</span>
      </div>
      <p class="text-[11px] text-slate-400 pl-5">
        No previous test projects or foreign sessions leak into this preview.
      </p>
    </div>

    <p class="text-xs text-slate-400 leading-relaxed">
      Tell Rex what to build in the chat or voice (e.g. <em class="text-slate-200">"Build a hyper-personalized investment advisor"</em>), and the software will compile and run here live.
    </p>
  </div>
</body>
</html>`;
}

export function generateInvestmentAdvisorHtml(projectName = "Hyper-Personalized Investment Advisor"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName} — ApexWealth AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .slider-thumb::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #10B981;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  <!-- TOP NAV -->
  <header class="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20">
          <i class="fa-solid fa-chart-line text-white"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-bold tracking-tight text-white">Apex<span class="text-emerald-400">Wealth</span> AI</span>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active Advisor</span>
          </div>
          <p class="text-[11px] text-slate-400 font-medium">${projectName}</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        <button onclick="setTab('overview')" id="tab-overview" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium transition-all">Overview</button>
        <button onclick="setTab('risk')" id="tab-risk" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-medium transition-all">AI Risk Profile</button>
        <button onclick="setTab('allocation')" id="tab-allocation" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-medium transition-all">Allocation</button>
        <button onclick="setTab('simulator')" id="tab-simulator" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-medium transition-all">Goal Simulator</button>
        <button onclick="setTab('recommendations')" id="tab-recommendations" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-medium transition-all">AI Insights</button>
      </div>

      <!-- User & Net Worth Summary -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <div class="text-xs text-slate-400">Portfolio Value</div>
          <div class="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
            <span id="nav-portfolio-value">$164,820.00</span>
            <span class="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1 rounded">+1.4%</span>
          </div>
        </div>
        <button onclick="triggerRebalanceModal()" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5">
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Rebalance</span>
        </button>
      </div>
    </div>
  </header>

  <!-- LIVE MARKET TICKER STRIP -->
  <div class="bg-slate-900 border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-400 overflow-x-auto hide-scrollbar">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-6 whitespace-nowrap">
      <div class="flex items-center gap-6">
        <span class="flex items-center gap-1.5"><strong class="text-slate-200">S&P 500</strong> 5,918.40 <span class="text-emerald-400 text-[11px] font-semibold">+0.68%</span></span>
        <span class="flex items-center gap-1.5"><strong class="text-slate-200">NASDAQ</strong> 18,924.12 <span class="text-emerald-400 text-[11px] font-semibold">+1.04%</span></span>
        <span class="flex items-center gap-1.5"><strong class="text-slate-200">US 10Y</strong> 4.16% <span class="text-rose-400 text-[11px] font-semibold">-0.02</span></span>
        <span class="flex items-center gap-1.5"><strong class="text-slate-200">GOLD</strong> $2,735.10 <span class="text-emerald-400 text-[11px] font-semibold">+0.42%</span></span>
        <span class="flex items-center gap-1.5"><strong class="text-slate-200">BTC/USD</strong> $94,120 <span class="text-emerald-400 text-[11px] font-semibold">+2.15%</span></span>
      </div>
      <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>AI Copilot Synced</span>
      </div>
    </div>
  </div>

  <!-- MAIN BODY CONTENT -->
  <main class="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">

    <!-- TAB 1: OVERVIEW -->
    <div id="view-overview" class="space-y-6">
      <!-- High-level Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Total Invested Assets</span>
            <i class="fa-solid fa-wallet text-emerald-400"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">$164,820.00</div>
          <div class="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
            <i class="fa-solid fa-arrow-trend-up"></i> +$24,310.00 (17.3% All-time)
          </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Personalized Risk Score</span>
            <i class="fa-solid fa-shield-halved text-indigo-400"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2 flex items-center gap-2">
            <span id="card-risk-score">76</span><span class="text-xs font-semibold text-indigo-300">/100</span>
          </div>
          <div class="text-xs text-indigo-300 mt-1 font-medium" id="card-risk-label">Moderate-Aggressive (Long Horizon)</div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Expected Annual CAGR</span>
            <i class="fa-solid fa-chart-pie text-amber-400"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">10.4%</div>
          <div class="text-xs text-slate-400 mt-1">Sharpe Ratio: <strong class="text-white">1.84</strong> (Optimal)</div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Target Goal: Early Retirement</span>
            <i class="fa-solid fa-bullseye text-teal-400"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">72%</div>
          <div class="text-xs text-teal-400 mt-1 font-medium">On track for $1.2M by age 52</div>
        </div>
      </div>

      <!-- Main Columns: Asset Allocation + AI Advisor Recommendations -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Asset Allocation Column -->
        <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-white">Target vs. Current Asset Allocation</h3>
              <p class="text-xs text-slate-400">Modern Portfolio Theory optimized for your profile</p>
            </div>
            <button onclick="setTab('allocation')" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Detailed View &rarr;</button>
          </div>

          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-300">US Large-Cap Growth & Tech</span>
                <span class="text-white font-bold">38% <span class="text-slate-500 font-normal">(Target 35%)</span></span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width: 38%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-300">Global & Emerging Markets</span>
                <span class="text-white font-bold">22% <span class="text-slate-500 font-normal">(Target 25%)</span></span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-teal-500 rounded-full" style="width: 22%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-300">Fixed Income & Short Treasuries</span>
                <span class="text-white font-bold">18% <span class="text-slate-500 font-normal">(Target 15%)</span></span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full" style="width: 18%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-300">Alternative Assets & Real Estate</span>
                <span class="text-white font-bold">14% <span class="text-slate-500 font-normal">(Target 15%)</span></span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full" style="width: 14%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-300">Liquid Cash & High Yield</span>
                <span class="text-white font-bold">8% <span class="text-slate-500 font-normal">(Target 10%)</span></span>
              </div>
              <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-cyan-500 rounded-full" style="width: 8%"></div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400"><i class="fa-solid fa-triangle-exclamation text-amber-400 mr-1.5"></i> US Large-Cap is currently +3% overweight.</span>
            <button onclick="triggerRebalanceModal()" class="text-emerald-400 font-semibold hover:underline">Rebalance Now</button>
          </div>
        </div>

        <!-- AI Advisor Action Feed -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 class="text-sm font-bold text-white">AI Personalized Insights</h3>
            </div>
            <p class="text-xs text-slate-400 mb-4">Autonomous intelligence tailored to your cash flow & tax bracket.</p>

            <div class="space-y-3 text-xs">
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between font-bold text-emerald-400 mb-1">
                  <span>Tax-Loss Harvesting Alert</span>
                  <span class="text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Save $420</span>
                </div>
                <p class="text-slate-300 text-[11px]">Harvest unrealized loss in Russell 2000 ETF and swap to equivalent Core Index to offset short-term capital gains.</p>
              </div>

              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between font-bold text-indigo-400 mb-1">
                  <span>Overweight Semiconductor Shift</span>
                  <span class="text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">+3.5% Alpha</span>
                </div>
                <p class="text-slate-300 text-[11px]">Market momentum indicates AI infrastructure tailwind. Recommendation: increase allocation by 2%.</p>
              </div>

              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between font-bold text-teal-400 mb-1">
                  <span>Automated DCA Scheduled</span>
                  <span class="text-[10px] bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">Tomorrow</span>
                </div>
                <p class="text-slate-300 text-[11px]">$750 recurring deposit will be deployed across underweight Fixed Income & Emerging Markets.</p>
              </div>
            </div>
          </div>

          <button onclick="setTab('recommendations')" class="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors text-center">
            View All AI Advisory Directives
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: AI RISK PROFILER -->
    <div id="view-risk" class="hidden space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-1">Interactive AI Risk Profiler</h3>
        <p class="text-xs text-slate-400 mb-6">Adjust your parameters below to dynamically recalibrate your investment horizon, risk budget, and asset distribution.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-medium">Investment Horizon</span>
              <span id="slider-val-horizon" class="text-emerald-400 font-bold">18 Years</span>
            </div>
            <input type="range" id="range-horizon" min="1" max="40" value="18" class="w-full accent-emerald-500 cursor-pointer" oninput="updateRiskCalc()" />
            <p class="text-[11px] text-slate-500">Longer horizons allow higher equity exposure and compounding volatility tolerance.</p>
          </div>

          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-medium">Drawdown Tolerance</span>
              <span id="slider-val-drawdown" class="text-emerald-400 font-bold">25% Max Drop</span>
            </div>
            <input type="range" id="range-drawdown" min="5" max="50" value="25" class="w-full accent-emerald-500 cursor-pointer" oninput="updateRiskCalc()" />
            <p class="text-[11px] text-slate-500">Comfort level with peak-to-trough paper losses during severe economic corrections.</p>
          </div>

          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-medium">Liquidity Need</span>
              <span id="slider-val-liquidity" class="text-emerald-400 font-bold">Low (3-6 mo cash)</span>
            </div>
            <input type="range" id="range-liquidity" min="1" max="3" value="1" class="w-full accent-emerald-500 cursor-pointer" oninput="updateRiskCalc()" />
            <p class="text-[11px] text-slate-500">Determines emergency reserve sizing and allocation to high-yield cash equivalents.</p>
          </div>
        </div>

        <div class="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-emerald-400">Recalculated AI Profile:</div>
            <div id="risk-result-title" class="text-sm font-bold text-white mt-0.5">Aggressive Growth Portfolio (Score: 78/100)</div>
            <div id="risk-result-desc" class="text-xs text-slate-300 mt-1">Recommended: 70% Equities, 15% Real Assets, 10% Fixed Income, 5% Cash.</div>
          </div>
          <button onclick="applyRiskProfile()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all whitespace-nowrap">
            Apply to Target Weights
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 3: ALLOCATION DETAIL -->
    <div id="view-allocation" class="hidden space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-2">Portfolio Holdings Breakdown</h3>
        <p class="text-xs text-slate-400 mb-6">Real-time valuation, weighting, and performance across individual asset tranches.</p>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-3 px-4">Asset / Ticker</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Current Weight</th>
                <th class="py-3 px-4">Market Value</th>
                <th class="py-3 px-4">Unrealized Gain</th>
                <th class="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td class="py-3 px-4 font-bold text-white">Vanguard Total Stock (VTI)</td>
                <td class="py-3 px-4">US Large Cap</td>
                <td class="py-3 px-4">38.2%</td>
                <td class="py-3 px-4">$62,960.00</td>
                <td class="py-3 px-4 text-emerald-400 font-semibold">+$14,200 (+29.1%)</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20">+3% Over</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-white">iShares Core MSCI Total (VXUS)</td>
                <td class="py-3 px-4">International</td>
                <td class="py-3 px-4">22.4%</td>
                <td class="py-3 px-4">$36,920.00</td>
                <td class="py-3 px-4 text-emerald-400 font-semibold">+$4,150 (+12.6%)</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Balanced</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-white">US Treasury 7-10Y Bond (IEF)</td>
                <td class="py-3 px-4">Fixed Income</td>
                <td class="py-3 px-4">18.1%</td>
                <td class="py-3 px-4">$29,830.00</td>
                <td class="py-3 px-4 text-slate-400 font-semibold">+$640 (+2.2%)</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Balanced</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-white">Vanguard Real Estate (VNQ)</td>
                <td class="py-3 px-4">Real Estate REITs</td>
                <td class="py-3 px-4">13.5%</td>
                <td class="py-3 px-4">$22,250.00</td>
                <td class="py-3 px-4 text-emerald-400 font-semibold">+$2,840 (+14.6%)</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Balanced</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-white">Treasury Floating Cash (SGOV)</td>
                <td class="py-3 px-4">Cash Equivalents</td>
                <td class="py-3 px-4">7.8%</td>
                <td class="py-3 px-4">$12,860.00</td>
                <td class="py-3 px-4 text-emerald-400 font-semibold">+$580 (+5.2% APY)</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20">Underweight</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: GOAL SIMULATOR -->
    <div id="view-simulator" class="hidden space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-1">Monte Carlo Wealth & Retirement Projection</h3>
        <p class="text-xs text-slate-400 mb-6">Simulate probability distributions across 1,000 statistical market cycles.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400">Monthly Contribution</span>
            <div class="text-xl font-bold text-white mt-1">$1,250 / mo</div>
          </div>
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400">Target Horizon</span>
            <div class="text-xl font-bold text-emerald-400 mt-1">20 Years (Age 55)</div>
          </div>
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400">Projected Portfolio (Median 50th)</span>
            <div class="text-xl font-bold text-teal-400 mt-1">$1,482,900</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950 rounded-xl border border-slate-800/80 space-y-4">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-300 font-bold">Confidence Interval Percentiles</span>
            <span class="text-emerald-400 font-medium">94.2% Probability of Reaching $1M+</span>
          </div>

          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-emerald-400 font-medium">Optimistic (90th Percentile — 12.8% CAGR)</span>
                <span class="text-white font-bold">$2,190,000</span>
              </div>
              <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-400 rounded-full" style="width: 90%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-teal-400 font-medium">Median Case (50th Percentile — 9.8% CAGR)</span>
                <span class="text-white font-bold">$1,482,900</span>
              </div>
              <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-teal-500 rounded-full" style="width: 65%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400 font-medium">Conservative (10th Percentile — 5.4% CAGR)</span>
                <span class="text-white font-bold">$840,500</span>
              </div>
              <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-slate-500 rounded-full" style="width: 38%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: AI RECOMMENDATIONS -->
    <div id="view-recommendations" class="hidden space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-1">Active AI Directives & Recommendations</h3>
        <p class="text-xs text-slate-400 mb-6">Continuous algorithmic monitoring across inflation forecasts, rate paths, and tax efficiency.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-emerald-400 uppercase tracking-wide">Fiduciary Action #1</span>
                <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">High Impact</span>
              </div>
              <h4 class="text-sm font-bold text-white mb-1">Trim Tech Outperformance into Dividend Aristocrats</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Your tech equity bucket has expanded by 6.4% over the last 90 days. Locking in gains and redirecting $4,800 into defensive high-dividend holdings maintains target risk bounds while capturing 4.2% yield.
              </p>
            </div>
            <button onclick="triggerRebalanceModal()" class="mt-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors">
              Execute Trim Order ($4,800)
            </button>
          </div>

          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-indigo-400 uppercase tracking-wide">Fiduciary Action #2</span>
                <span class="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">Tax Optimized</span>
              </div>
              <h4 class="text-sm font-bold text-white mb-1">Enable Automated Tax-Loss Harvesting</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Algorithms scan daily for lots with paper losses exceeding $250. Automatically replaces with highly correlated partner funds to prevent IRS wash-sales while lowering net taxable capital gains.
              </p>
            </div>
            <button onclick="alert('Automated Tax-Loss Harvesting enabled for this session!')" class="mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors">
              Enable Auto-Harvesting
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- REBALANCE MODAL -->
  <div id="rebalance-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-arrows-rotate text-emerald-400"></i>
          <span>One-Click Portfolio Rebalance</span>
        </h3>
        <button onclick="closeRebalanceModal()" class="text-slate-400 hover:text-white">&times;</button>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed">
        ApexWealth will execute the following trades with zero commission and optimal tax routing:
      </p>
      <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
        <div class="flex justify-between text-rose-400">
          <span>SELL VTI (US Large Cap)</span>
          <span>-$4,800.00</span>
        </div>
        <div class="flex justify-between text-emerald-400">
          <span>BUY VXUS (Intl Core)</span>
          <span>+$3,200.00</span>
        </div>
        <div class="flex justify-between text-emerald-400">
          <span>BUY SGOV (Liquid Cash)</span>
          <span>+$1,600.00</span>
        </div>
      </div>
      <div class="text-[11px] text-slate-500">
        Estimated tax impact: <strong class="text-emerald-400">$0.00</strong> (offset via harvested short-term losses).
      </div>
      <div class="flex gap-2 pt-2">
        <button onclick="closeRebalanceModal()" class="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
        <button onclick="confirmRebalance()" class="flex-1 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 shadow-md">Confirm & Execute</button>
      </div>
    </div>
  </div>

  <script>
    function setTab(tab) {
      ['overview', 'risk', 'allocation', 'simulator', 'recommendations'].forEach(t => {
        const v = document.getElementById('view-' + t);
        const b = document.getElementById('tab-' + t);
        if (v) v.classList.toggle('hidden', t !== tab);
        if (b) {
          if (t === tab) {
            b.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium transition-all';
          } else {
            b.className = 'px-3 py-1.5 rounded-lg text-slate-300 hover:text-white font-medium transition-all';
          }
        }
      });
    }

    function updateRiskCalc() {
      const h = parseInt(document.getElementById('range-horizon').value);
      const d = parseInt(document.getElementById('range-drawdown').value);
      const l = parseInt(document.getElementById('range-liquidity').value);

      document.getElementById('slider-val-horizon').innerText = h + ' Years';
      document.getElementById('slider-val-drawdown').innerText = d + '% Max Drop';
      document.getElementById('slider-val-liquidity').innerText = l === 1 ? 'Low (3 mo)' : l === 2 ? 'Medium (6 mo)' : 'High (12 mo)';

      const score = Math.min(95, Math.max(20, Math.round((h * 1.5) + (d * 0.9) - (l * 8) + 15)));
      document.getElementById('card-risk-score').innerText = score;

      let label = 'Balanced Core';
      let title = 'Balanced Growth Portfolio (Score: ' + score + '/100)';
      let desc = 'Recommended: 50% Equities, 30% Fixed Income, 15% Alternatives, 5% Cash.';

      if (score >= 70) {
        label = 'Moderate-Aggressive (Long Horizon)';
        title = 'Aggressive Growth Portfolio (Score: ' + score + '/100)';
        desc = 'Recommended: 70% Equities, 15% Real Assets, 10% Fixed Income, 5% Cash.';
      } else if (score <= 45) {
        label = 'Conservative Wealth Preservation';
        title = 'Capital Preservation Portfolio (Score: ' + score + '/100)';
        desc = 'Recommended: 25% Equities, 50% Fixed Income & Treasuries, 25% Cash.';
      }

      document.getElementById('card-risk-label').innerText = label;
      document.getElementById('risk-result-title').innerText = title;
      document.getElementById('risk-result-desc').innerText = desc;
    }

    function applyRiskProfile() {
      alert('Risk profile calibrated and applied across all advisory models!');
      setTab('overview');
    }

    function triggerRebalanceModal() {
      document.getElementById('rebalance-modal').classList.remove('hidden');
    }

    function closeRebalanceModal() {
      document.getElementById('rebalance-modal').classList.add('hidden');
    }

    function confirmRebalance() {
      closeRebalanceModal();
      alert('Rebalance complete! All asset weights aligned with target allocations.');
    }
  </script>
</body>
</html>`;
}

export function generateCalculatorHtml(title = "OmniCalc Pro — Scientific & Financial Calculation Suite"): string {
  const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    input[type=range] { accent-color: #6366f1; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 antialiased selection:bg-indigo-600/30">
  <div class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <i class="fa-solid fa-calculator text-sm"></i>
        </div>
        <div>
          <h1 class="font-bold text-sm text-white tracking-wide flex items-center gap-2">
            ${cleanTitle}
            <span class="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] rounded-full font-mono font-medium">v2.4</span>
          </h1>
          <p class="text-[11px] text-slate-400">Scientific, Financial & Precision Engine</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="toggleHistoryDrawer()" id="btn-history-toggle" class="px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all">
          <i class="fa-solid fa-clock-rotate-left text-[11px]"></i>
          <span class="hidden sm:inline">History</span>
          <span id="history-badge" class="hidden w-4 h-4 rounded-full bg-indigo-500 text-slate-950 text-[9px] font-bold flex items-center justify-center ml-0.5">0</span>
        </button>
      </div>
    </header>

    <!-- Mode Selector Tabs -->
    <nav class="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl mb-4 text-xs font-semibold">
      <button onclick="switchMode('standard')" id="tab-standard" class="py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25">
        <i class="fa-solid fa-calculator text-[10px]"></i> Standard
      </button>
      <button onclick="switchMode('scientific')" id="tab-scientific" class="py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200">
        <i class="fa-solid fa-atom text-[10px]"></i> Scientific
      </button>
      <button onclick="switchMode('financial')" id="tab-financial" class="py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200">
        <i class="fa-solid fa-chart-line text-[10px]"></i> Financial
      </button>
      <button onclick="switchMode('converter')" id="tab-converter" class="py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200">
        <i class="fa-solid fa-right-left text-[10px]"></i> Converter
      </button>
    </nav>

    <!-- Display Panel (Standard & Scientific) -->
    <div id="display-container" class="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-4 shadow-inner relative group">
      <div class="flex items-center justify-between text-[11px] font-mono mb-1 text-slate-500">
        <div class="flex items-center gap-2">
          <button id="deg-rad-btn" onclick="toggleDegRad()" class="hidden px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors">DEG</button>
          <span id="mem-indicator" class="hidden px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">M</span>
        </div>
        <div id="history-expr" class="h-4 truncate text-slate-400 overflow-hidden text-right font-mono">&nbsp;</div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <button onclick="copyDisplayResult()" id="btn-copy" class="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs" title="Copy result">
          <i class="fa-solid fa-copy"></i>
        </button>
        <div id="main-result" class="flex-1 text-right text-3xl sm:text-4xl font-mono font-black text-white tracking-wider truncate">0</div>
      </div>
    </div>

    <!-- Memory Buttons (Standard & Scientific) -->
    <div id="memory-ribbon" class="grid grid-cols-5 gap-1.5 mb-3 text-xs font-mono font-semibold">
      <button onclick="memClear()" class="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white transition-all">MC</button>
      <button onclick="memRecall()" class="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white transition-all">MR</button>
      <button onclick="memAdd()" class="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-all">M+</button>
      <button onclick="memSubtract()" class="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-all">M-</button>
      <button onclick="memStore()" class="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white transition-all">MS</button>
    </div>

    <!-- Standard Keypad -->
    <div id="keypad-standard" class="grid grid-cols-4 gap-2">
      <button onclick="clearAll()" class="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-rose-400 font-bold text-sm transition-all">AC</button>
      <button onclick="deleteDigit()" class="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 font-bold text-sm transition-all"><i class="fa-solid fa-delete-left"></i></button>
      <button onclick="appendOperator('%')" class="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-400 font-bold text-sm transition-all">%</button>
      <button onclick="appendOperator('÷')" class="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">÷</button>

      <button onclick="appendDigit('7')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">7</button>
      <button onclick="appendDigit('8')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">8</button>
      <button onclick="appendDigit('9')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">9</button>
      <button onclick="appendOperator('×')" class="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">×</button>

      <button onclick="appendDigit('4')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">4</button>
      <button onclick="appendDigit('5')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">5</button>
      <button onclick="appendDigit('6')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">6</button>
      <button onclick="appendOperator('-')" class="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">−</button>

      <button onclick="appendDigit('1')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">1</button>
      <button onclick="appendDigit('2')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">2</button>
      <button onclick="appendDigit('3')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">3</button>
      <button onclick="appendOperator('+')" class="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">+</button>

      <button onclick="toggleSign()" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 font-semibold text-sm transition-all">±</button>
      <button onclick="appendDigit('0')" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">0</button>
      <button onclick="appendDot()" class="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">.</button>
      <button onclick="calculateResult()" class="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-md shadow-emerald-600/25">=</button>
    </div>

    <!-- Scientific Keypad -->
    <div id="keypad-scientific" class="hidden space-y-2">
      <div class="grid grid-cols-5 gap-1.5 text-xs font-mono">
        <button onclick="sciOp('sin')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">sin</button>
        <button onclick="sciOp('cos')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">cos</button>
        <button onclick="sciOp('tan')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">tan</button>
        <button onclick="sciOp('sqrt')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">√x</button>
        <button onclick="sciOp('sqr')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">x²</button>

        <button onclick="sciOp('ln')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">ln</button>
        <button onclick="sciOp('log')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">log₁₀</button>
        <button onclick="appendOperator('^')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">xʸ</button>
        <button onclick="sciOp('recip')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">1/x</button>
        <button onclick="sciOp('fact')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-semibold transition-all">n!</button>

        <button onclick="sciOp('pi')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 font-semibold transition-all">π</button>
        <button onclick="sciOp('e')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 font-semibold transition-all">e</button>
        <button onclick="appendOperator('(')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold transition-all">(</button>
        <button onclick="appendOperator(')')" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold transition-all">)</button>
        <button onclick="clearAll()" class="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 font-bold transition-all">AC</button>
      </div>

      <div class="grid grid-cols-4 gap-2 pt-1">
        <button onclick="appendDigit('7')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">7</button>
        <button onclick="appendDigit('8')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">8</button>
        <button onclick="appendDigit('9')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">9</button>
        <button onclick="appendOperator('÷')" class="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">÷</button>

        <button onclick="appendDigit('4')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">4</button>
        <button onclick="appendDigit('5')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">5</button>
        <button onclick="appendDigit('6')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">6</button>
        <button onclick="appendOperator('×')" class="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">×</button>

        <button onclick="appendDigit('1')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">1</button>
        <button onclick="appendDigit('2')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">2</button>
        <button onclick="appendDigit('3')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">3</button>
        <button onclick="appendOperator('-')" class="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">−</button>

        <button onclick="appendDigit('0')" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">0</button>
        <button onclick="appendDot()" class="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">.</button>
        <button onclick="deleteDigit()" class="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"><i class="fa-solid fa-delete-left"></i></button>
        <button onclick="calculateResult()" class="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-md shadow-emerald-600/25">=</button>
      </div>
    </div>

    <!-- Financial View -->
    <div id="view-financial" class="hidden space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
          <div class="text-[11px] text-slate-400 font-medium">Monthly Payment (EMI)</div>
          <div id="fin-emi" class="text-xl font-black text-emerald-400 font-mono mt-1">$1,580</div>
        </div>
        <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
          <div class="text-[11px] text-slate-400 font-medium">Total Interest</div>
          <div id="fin-interest" class="text-xl font-black text-amber-400 font-mono mt-1">$318,861</div>
        </div>
        <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
          <div class="text-[11px] text-slate-400 font-medium">Total Loan Cost</div>
          <div id="fin-total" class="text-xl font-black text-indigo-400 font-mono mt-1">$568,861</div>
        </div>
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-xs text-slate-400">
          <span id="fin-lbl-principal">Principal ($250,000)</span>
          <span id="fin-lbl-ratio">Interest (56.1%)</span>
        </div>
        <div class="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
          <div id="fin-bar-principal" class="bg-indigo-600 h-full w-[44%]"></div>
          <div id="fin-bar-interest" class="bg-amber-500 h-full w-[56%]"></div>
        </div>
      </div>

      <div class="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
        <div>
          <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1">
            <span>Loan Principal</span>
            <span id="fin-val-principal" class="font-mono text-white">$250,000</span>
          </div>
          <input type="range" id="fin-slider-p" min="10000" max="1000000" step="5000" value="250000" oninput="updateLoanCalc()" class="w-full cursor-pointer" />
        </div>
        <div>
          <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1">
            <span>Annual Interest Rate</span>
            <span id="fin-val-rate" class="font-mono text-white">6.5%</span>
          </div>
          <input type="range" id="fin-slider-r" min="1" max="20" step="0.1" value="6.5" oninput="updateLoanCalc()" class="w-full cursor-pointer" />
        </div>
        <div>
          <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1">
            <span>Tenure (Years)</span>
            <span id="fin-val-t" class="font-mono text-white">30 Years (360 mo)</span>
          </div>
          <input type="range" id="fin-slider-t" min="1" max="40" step="1" value="30" oninput="updateLoanCalc()" class="w-full cursor-pointer" />
        </div>
      </div>
    </div>

    <!-- Converter View -->
    <div id="view-converter" class="hidden space-y-4">
      <div class="grid grid-cols-4 gap-2 text-xs font-semibold">
        <button onclick="switchConvCat('length')" id="btn-cat-length" class="py-2 rounded-xl capitalize transition-all bg-indigo-600 text-white font-bold">Length</button>
        <button onclick="switchConvCat('mass')" id="btn-cat-mass" class="py-2 rounded-xl capitalize transition-all bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">Mass</button>
        <button onclick="switchConvCat('temp')" id="btn-cat-temp" class="py-2 rounded-xl capitalize transition-all bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">Temperature</button>
        <button onclick="switchConvCat('digital')" id="btn-cat-digital" class="py-2 rounded-xl capitalize transition-all bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">Digital</button>
      </div>

      <div class="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-400">Input Value & Unit</label>
          <div class="flex gap-2">
            <input type="number" id="conv-input" value="100" oninput="runUnitConvert()" class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-indigo-500" />
            <select id="conv-from" onchange="runUnitConvert()" class="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"></select>
          </div>
        </div>

        <div class="flex justify-center">
          <button onclick="swapUnits()" class="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-indigo-400 flex items-center justify-center transition-all shadow" title="Swap units">
            <i class="fa-solid fa-arrow-down-up text-xs"></i>
          </button>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-400">Converted Output</label>
          <div class="flex gap-2">
            <div id="conv-output" class="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-base flex items-center">328.084</div>
            <select id="conv-to" onchange="runUnitConvert()" class="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"></select>
          </div>
        </div>
      </div>
    </div>

    <!-- History Slide-over Drawer -->
    <div id="history-drawer" class="hidden absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl p-5 flex flex-col z-20 transition-all">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-clock-rotate-left text-indigo-400 text-sm"></i>
          <h3 class="font-bold text-sm text-white">Calculation Ledger</h3>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="clearHistoryLog()" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1">Clear All</button>
          <button onclick="toggleHistoryDrawer()" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div id="history-list" class="flex-1 overflow-y-auto space-y-2 pr-1"></div>
    </div>
  </div>

  <script>
    let curMode = 'standard';
    let curInput = '0';
    let curExpr = '';
    let memVal = 0;
    let hasMem = false;
    let isDeg = true;
    let resetNext = false;
    let historyEntries = [];

    function updateDisplay() {
      document.getElementById('main-result').innerText = curInput;
      document.getElementById('history-expr').innerText = curExpr || '\\u00A0';
      const memInd = document.getElementById('mem-indicator');
      if (hasMem) memInd.classList.remove('hidden');
      else memInd.classList.add('hidden');
    }

    function switchMode(mode) {
      curMode = mode;
      ['standard', 'scientific', 'financial', 'converter'].forEach(m => {
        const tab = document.getElementById('tab-' + m);
        if (m === mode) {
          tab.className = 'py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25';
        } else {
          tab.className = 'py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
        }
      });

      const disp = document.getElementById('display-container');
      const memRib = document.getElementById('memory-ribbon');
      const kpStd = document.getElementById('keypad-standard');
      const kpSci = document.getElementById('keypad-scientific');
      const vFin = document.getElementById('view-financial');
      const vConv = document.getElementById('view-converter');
      const degBtn = document.getElementById('deg-rad-btn');

      if (mode === 'standard') {
        disp.classList.remove('hidden');
        memRib.classList.remove('hidden');
        kpStd.classList.remove('hidden');
        kpSci.classList.add('hidden');
        vFin.classList.add('hidden');
        vConv.classList.add('hidden');
        degBtn.classList.add('hidden');
      } else if (mode === 'scientific') {
        disp.classList.remove('hidden');
        memRib.classList.remove('hidden');
        kpStd.classList.add('hidden');
        kpSci.classList.remove('hidden');
        vFin.classList.add('hidden');
        vConv.classList.add('hidden');
        degBtn.classList.remove('hidden');
      } else if (mode === 'financial') {
        disp.classList.add('hidden');
        memRib.classList.add('hidden');
        kpStd.classList.add('hidden');
        kpSci.classList.add('hidden');
        vFin.classList.remove('hidden');
        vConv.classList.add('hidden');
        updateLoanCalc();
      } else if (mode === 'converter') {
        disp.classList.add('hidden');
        memRib.classList.add('hidden');
        kpStd.classList.add('hidden');
        kpSci.classList.add('hidden');
        vFin.classList.add('hidden');
        vConv.classList.remove('hidden');
        populateUnits('length');
        runUnitConvert();
      }
    }

    function appendDigit(d) {
      if (curInput === '0' || resetNext) {
        curInput = d;
        resetNext = false;
      } else if (curInput.length < 16) {
        curInput += d;
      }
      updateDisplay();
    }

    function appendDot() {
      if (resetNext) {
        curInput = '0.';
        resetNext = false;
      } else if (!curInput.includes('.')) {
        curInput += '.';
      }
      updateDisplay();
    }

    function appendOperator(op) {
      if (curExpr && !resetNext) {
        curExpr = curExpr + ' ' + curInput + ' ' + op;
      } else {
        curExpr = curInput + ' ' + op;
      }
      resetNext = true;
      updateDisplay();
    }

    function clearAll() {
      curInput = '0';
      curExpr = '';
      resetNext = false;
      updateDisplay();
    }

    function deleteDigit() {
      if (resetNext) return;
      curInput = curInput.length > 1 ? curInput.slice(0, -1) : '0';
      updateDisplay();
    }

    function toggleSign() {
      if (curInput !== '0') {
        curInput = curInput.startsWith('-') ? curInput.slice(1) : '-' + curInput;
        updateDisplay();
      }
    }

    function calculateResult() {
      const fullExpr = curExpr ? curExpr + ' ' + curInput : curInput;
      let clean = fullExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      try {
        let res = Function('"use strict";return (' + clean + ')')();
        if (typeof res === 'number' && !isNaN(res)) {
          if (!isFinite(res)) res = 'Error: Div by zero';
          else res = Math.round(res * 10000000000) / 10000000000;
        } else {
          res = 'Error';
        }
        addHistoryEntry(fullExpr, res + '');
        curInput = res + '';
        curExpr = '';
        resetNext = true;
      } catch (e) {
        curInput = 'Error';
        resetNext = true;
      }
      updateDisplay();
    }

    function sciOp(op) {
      const val = parseFloat(curInput);
      if (isNaN(val)) return;
      let res = 0;
      let lbl = '';
      try {
        if (op === 'sin') { res = isDeg ? Math.sin(val * Math.PI / 180) : Math.sin(val); lbl = 'sin(' + val + ')'; }
        else if (op === 'cos') { res = isDeg ? Math.cos(val * Math.PI / 180) : Math.cos(val); lbl = 'cos(' + val + ')'; }
        else if (op === 'tan') { res = isDeg ? Math.tan(val * Math.PI / 180) : Math.tan(val); lbl = 'tan(' + val + ')'; }
        else if (op === 'sqrt') { if (val < 0) throw new Error('Invalid'); res = Math.sqrt(val); lbl = '√(' + val + ')'; }
        else if (op === 'sqr') { res = val * val; lbl = '(' + val + ')²'; }
        else if (op === 'ln') { if (val <= 0) throw new Error('Invalid'); res = Math.log(val); lbl = 'ln(' + val + ')'; }
        else if (op === 'log') { if (val <= 0) throw new Error('Invalid'); res = Math.log10(val); lbl = 'log(' + val + ')'; }
        else if (op === 'recip') { if (val === 0) throw new Error('Div by 0'); res = 1 / val; lbl = '1/(' + val + ')'; }
        else if (op === 'pi') { res = Math.PI; lbl = 'π'; }
        else if (op === 'e') { res = Math.E; lbl = 'e'; }
        else if (op === 'fact') {
          let n = Math.floor(val);
          if (n < 0) throw new Error('Invalid');
          let f = 1; for (let i = 2; i <= n; i++) f *= i;
          res = f; lbl = n + '!';
        }
        res = Math.round(res * 1000000000) / 1000000000;
        addHistoryEntry(lbl, res + '');
        curInput = res + '';
        resetNext = true;
      } catch (err) {
        curInput = 'Error';
        resetNext = true;
      }
      updateDisplay();
    }

    function toggleDegRad() {
      isDeg = !isDeg;
      document.getElementById('deg-rad-btn').innerText = isDeg ? 'DEG' : 'RAD';
    }

    function memClear() { memVal = 0; hasMem = false; updateDisplay(); }
    function memRecall() { curInput = memVal + ''; resetNext = true; updateDisplay(); }
    function memAdd() { memVal += parseFloat(curInput) || 0; hasMem = true; resetNext = true; updateDisplay(); }
    function memSubtract() { memVal -= parseFloat(curInput) || 0; hasMem = true; resetNext = true; updateDisplay(); }
    function memStore() { memVal = parseFloat(curInput) || 0; hasMem = true; resetNext = true; updateDisplay(); }

    function addHistoryEntry(expr, res) {
      historyEntries.unshift({ expr, res, time: new Date().toLocaleTimeString() });
      if (historyEntries.length > 25) historyEntries.pop();
      renderHistory();
    }

    function renderHistory() {
      const badge = document.getElementById('history-badge');
      if (historyEntries.length > 0) {
        badge.classList.remove('hidden');
        badge.innerText = historyEntries.length;
      } else {
        badge.classList.add('hidden');
      }
      const list = document.getElementById('history-list');
      if (historyEntries.length === 0) {
        list.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 mt-8"><i class="fa-regular fa-folder-open text-2xl"></i><span>No calculations yet</span></div>';
        return;
      }
      list.innerHTML = historyEntries.map(function(h) {
        return '<div onclick="restoreHistory(\'' + h.res + '\')" class="p-3 bg-slate-900 border border-slate-800/80 rounded-xl hover:border-indigo-500/50 cursor-pointer transition-all space-y-1">' +
          '<div class="text-[11px] text-slate-500 font-mono">' + h.time + '</div>' +
          '<div class="text-xs text-slate-300 font-mono truncate">' + h.expr + '</div>' +
          '<div class="text-sm font-bold text-emerald-400 font-mono text-right">= ' + h.res + '</div>' +
        '</div>';
      }).join('');
    }

    function restoreHistory(val) {
      curInput = val;
      curExpr = '';
      resetNext = true;
      toggleHistoryDrawer();
      updateDisplay();
    }

    function toggleHistoryDrawer() {
      const drawer = document.getElementById('history-drawer');
      drawer.classList.toggle('hidden');
      renderHistory();
    }

    function clearHistoryLog() {
      historyEntries = [];
      renderHistory();
    }

    function copyDisplayResult() {
      navigator.clipboard.writeText(curInput);
      const btn = document.getElementById('btn-copy');
      btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i>';
      setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
    }

    // Financial calculations
    function updateLoanCalc() {
      const p = parseFloat(document.getElementById('fin-slider-p').value);
      const r = parseFloat(document.getElementById('fin-slider-r').value);
      const t = parseFloat(document.getElementById('fin-slider-t').value);

      document.getElementById('fin-val-principal').innerText = '$' + p.toLocaleString();
      document.getElementById('fin-val-rate').innerText = r + '%';
      document.getElementById('fin-val-t').innerText = t + ' Years (' + (t * 12) + ' mo)';

      const monthlyRate = r / 12 / 100;
      const n = t * 12;
      let emi = 0;
      if (monthlyRate === 0) emi = p / n;
      else emi = (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

      const total = emi * n;
      const interest = total - p;
      const ratio = Math.round((interest / total) * 1000) / 10;

      document.getElementById('fin-emi').innerText = '$' + Math.round(emi).toLocaleString();
      document.getElementById('fin-interest').innerText = '$' + Math.round(interest).toLocaleString();
      document.getElementById('fin-total').innerText = '$' + Math.round(total).toLocaleString();
      document.getElementById('fin-lbl-principal').innerText = 'Principal ($' + p.toLocaleString() + ')';
      document.getElementById('fin-lbl-ratio').innerText = 'Interest (' + ratio + '%)';
      document.getElementById('fin-bar-principal').style.width = (100 - ratio) + '%';
      document.getElementById('fin-bar-interest').style.width = ratio + '%';
    }

    // Unit Converter
    const CONV_UNITS = {
      length: [
        { id: 'm', name: 'Meters (m)', factor: 1 },
        { id: 'km', name: 'Kilometers (km)', factor: 1000 },
        { id: 'cm', name: 'Centimeters (cm)', factor: 0.01 },
        { id: 'ft', name: 'Feet (ft)', factor: 0.3048 },
        { id: 'in', name: 'Inches (in)', factor: 0.0254 },
        { id: 'mi', name: 'Miles (mi)', factor: 1609.344 }
      ],
      mass: [
        { id: 'kg', name: 'Kilograms (kg)', factor: 1 },
        { id: 'g', name: 'Grams (g)', factor: 0.001 },
        { id: 'lb', name: 'Pounds (lb)', factor: 0.45359237 },
        { id: 'oz', name: 'Ounces (oz)', factor: 0.028349523 }
      ],
      temp: [
        { id: 'C', name: 'Celsius (°C)' },
        { id: 'F', name: 'Fahrenheit (°F)' },
        { id: 'K', name: 'Kelvin (K)' }
      ],
      digital: [
        { id: 'B', name: 'Bytes (B)', factor: 1 },
        { id: 'KB', name: 'Kilobytes (KB)', factor: 1024 },
        { id: 'MB', name: 'Megabytes (MB)', factor: 1024 * 1024 },
        { id: 'GB', name: 'Gigabytes (GB)', factor: 1024 * 1024 * 1024 },
        { id: 'TB', name: 'Terabytes (TB)', factor: 1024 * 1024 * 1024 * 1024 }
      ]
    };
    let activeCat = 'length';

    function switchConvCat(cat) {
      activeCat = cat;
      ['length', 'mass', 'temp', 'digital'].forEach(c => {
        const b = document.getElementById('btn-cat-' + c);
        if (c === cat) b.className = 'py-2 rounded-xl capitalize transition-all bg-indigo-600 text-white font-bold';
        else b.className = 'py-2 rounded-xl capitalize transition-all bg-slate-950 border border-slate-800 text-slate-400 hover:text-white';
      });
      populateUnits(cat);
      runUnitConvert();
    }

    function populateUnits(cat) {
      const units = CONV_UNITS[cat] || [];
      const f = document.getElementById('conv-from');
      const t = document.getElementById('conv-to');
      f.innerHTML = units.map((u, i) => '<option value="' + u.id + '" ' + (i === 0 ? 'selected' : '') + '>' + u.name + '</option>').join('');
      t.innerHTML = units.map((u, i) => '<option value="' + u.id + '" ' + (i === 1 ? 'selected' : '') + '>' + u.name + '</option>').join('');
    }

    function swapUnits() {
      const f = document.getElementById('conv-from');
      const t = document.getElementById('conv-to');
      const tmp = f.value;
      f.value = t.value;
      t.value = tmp;
      runUnitConvert();
    }

    function runUnitConvert() {
      const val = parseFloat(document.getElementById('conv-input').value) || 0;
      const from = document.getElementById('conv-from').value;
      const to = document.getElementById('conv-to').value;
      let out = 0;

      if (activeCat === 'temp') {
        let c = val;
        if (from === 'F') c = (val - 32) * 5 / 9;
        else if (from === 'K') c = val - 273.15;

        if (to === 'C') out = c;
        else if (to === 'F') out = (c * 9 / 5) + 32;
        else if (to === 'K') out = c + 273.15;
      } else {
        const units = CONV_UNITS[activeCat] || [];
        const uFrom = units.find(u => u.id === from);
        const uTo = units.find(u => u.id === to);
        const inBase = val * (uFrom ? uFrom.factor : 1);
        out = inBase / (uTo ? uTo.factor : 1);
      }
      document.getElementById('conv-output').innerText = Math.round(out * 100000) / 100000;
    }

    document.addEventListener('keydown', (e) => {
      if (curMode !== 'standard' && curMode !== 'scientific') return;
      if (e.target.tagName === 'INPUT') return;
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
      if (e.key === '.') appendDot();
      if (e.key === '+') appendOperator('+');
      if (e.key === '-') appendOperator('-');
      if (e.key === '*') appendOperator('×');
      if (e.key === '/') { e.preventDefault(); appendOperator('÷'); }
      if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculateResult(); }
      if (e.key === 'Backspace') deleteDigit();
      if (e.key === 'Escape') clearAll();
    });
  </script>
</body>
</html>`;
}

export function generateGenericAppHtml(topic: string): string {
  const cleanTitle = topic.charAt(0).toUpperCase() + topic.slice(1);
  const lower = topic.toLowerCase();

  // 0. COSMETICS & SKINCARE E-COMMERCE
  if (
    lower.includes("cosmetic") ||
    lower.includes("skincare") ||
    lower.includes("skin care") ||
    lower.includes("facial kit") ||
    lower.includes("makeup") ||
    lower.includes("beauty") ||
    lower.includes("serum")
  ) {
    return generateCosmeticsEcommerceHtml(cleanTitle);
  }

  // 1. CALCULATOR APP
  if (lower.includes("calc")) {
    return generateCalculatorHtml(cleanTitle);
  }

  // 2. TODO / TASK MANAGER
  if (lower.includes("todo") || lower.includes("task") || lower.includes("kanban") || lower.includes("checklist")) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-8 antialiased">
  <div class="max-w-2xl mx-auto space-y-6">
    <header class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
          <i class="fa-solid fa-list-check"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-white">${cleanTitle}</h1>
          <p id="stats-counter" class="text-xs text-slate-400">0 tasks remaining</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="filterTasks('all')" id="btn-filter-all" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">All</button>
        <button onclick="filterTasks('active')" id="btn-filter-active" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">Active</button>
        <button onclick="filterTasks('completed')" id="btn-filter-completed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white">Done</button>
      </div>
    </header>

    <!-- Add Task Input -->
    <div class="flex gap-2">
      <input id="task-input" type="text" placeholder="Add a new task..." onkeydown="if(event.key==='Enter')addTask()" class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
      <button onclick="addTask()" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2">
        <i class="fa-solid fa-plus"></i> Add
      </button>
    </div>

    <!-- Task List -->
    <div id="task-list" class="space-y-2"></div>
  </div>

  <script>
    let tasks = [
      { id: 1, text: "Explore application architecture", done: true, priority: "High" },
      { id: 2, text: "Review real-time updates and live preview", done: false, priority: "Medium" },
      { id: 3, text: "Test full interactive task workflows", done: false, priority: "High" },
    ];
    let currentFilter = 'all';

    function renderTasks() {
      const list = document.getElementById('task-list');
      list.innerHTML = '';
      const filtered = tasks.filter(t => currentFilter === 'all' ? true : currentFilter === 'active' ? !t.done : t.done);
      const remaining = tasks.filter(t => !t.done).length;
      document.getElementById('stats-counter').innerText = remaining + ' tasks remaining';

      filtered.forEach(task => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl transition-all hover:border-slate-700';
        item.innerHTML = \`
          <div class="flex items-center gap-3">
            <input type="checkbox" \${task.done ? 'checked' : ''} onchange="toggleTask(\${task.id})" class="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer" />
            <span class="\${task.done ? 'line-through text-slate-500' : 'text-slate-200'} text-sm font-medium">\${task.text}</span>
          </div>
          <button onclick="deleteTask(\${task.id})" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        \`;
        list.appendChild(item);
      });
    }

    function addTask() {
      const input = document.getElementById('task-input');
      const val = input.value.trim();
      if (!val) return;
      tasks.unshift({ id: Date.now(), text: val, done: false, priority: "Normal" });
      input.value = '';
      renderTasks();
    }

    function toggleTask(id) {
      const t = tasks.find(x => x.id === id);
      if (t) t.done = !t.done;
      renderTasks();
    }

    function deleteTask(id) {
      tasks = tasks.filter(x => x.id !== id);
      renderTasks();
    }

    function filterTasks(f) {
      currentFilter = f;
      ['all', 'active', 'completed'].forEach(tab => {
        const el = document.getElementById('btn-filter-' + tab);
        if (tab === f) {
          el.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
        } else {
          el.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
        }
      });
      renderTasks();
    }

    renderTasks();
  </script>
</body>
</html>`;
  }

  // 3. FITNESS / WORKOUT TRACKER
  if (lower.includes("fit") || lower.includes("workout") || lower.includes("gym") || lower.includes("exercise")) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-8 antialiased">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
          <i class="fa-solid fa-dumbbell"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-white">${cleanTitle}</h1>
          <p class="text-xs text-slate-400">Daily Fitness, Workouts & Calorie Tracking</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs text-slate-400">Today's Burn</span>
        <div id="calories-display" class="text-lg font-bold text-emerald-400">480 kcal</div>
      </div>
    </header>

    <!-- Metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs text-slate-400">Completed Exercises</div>
        <div id="exercise-count" class="text-2xl font-bold text-white mt-1">4 Completed</div>
        <div class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div class="bg-rose-500 h-full w-4/5"></div>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs text-slate-400">Active Workout Timer</div>
        <div id="timer-display" class="text-2xl font-bold font-mono text-white mt-1">00:24:15</div>
        <div class="flex gap-2 mt-2">
          <button onclick="toggleTimer()" id="timer-btn" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold">Pause</button>
          <button onclick="resetTimer()" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold">Reset</button>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div class="text-xs text-slate-400">Heart Rate Target</div>
        <div class="text-2xl font-bold text-rose-400 mt-1">138 BPM</div>
        <div class="text-[11px] text-slate-400 mt-2">Aerobic Cardio Zone</div>
      </div>
    </div>

    <!-- Log Exercise -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h2 class="text-sm font-bold text-white">Log Exercise Routine</h2>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input id="ex-name" type="text" placeholder="Exercise (e.g. Bench Press)" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <input id="ex-sets" type="number" placeholder="Sets" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <input id="ex-reps" type="number" placeholder="Reps" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <button onclick="logExercise()" class="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2 rounded-xl transition-all">Add Exercise</button>
      </div>
      <div id="exercises-list" class="space-y-2 pt-2">
        <div class="flex items-center justify-between p-3 bg-slate-950 rounded-xl text-xs border border-slate-800/80">
          <div><span class="font-bold text-white">Barbell Squats</span> • 4 sets × 10 reps</div>
          <span class="text-emerald-400 font-semibold">+120 kcal</span>
        </div>
        <div class="flex items-center justify-between p-3 bg-slate-950 rounded-xl text-xs border border-slate-800/80">
          <div><span class="font-bold text-white">Incline Dumbbell Press</span> • 3 sets × 12 reps</div>
          <span class="text-emerald-400 font-semibold">+95 kcal</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    let seconds = 1455;
    let timerRunning = true;
    let interval = setInterval(() => {
      if (timerRunning) {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        document.getElementById('timer-display').innerText = '00:' + m + ':' + s;
      }
    }, 1000);

    function toggleTimer() {
      timerRunning = !timerRunning;
      document.getElementById('timer-btn').innerText = timerRunning ? 'Pause' : 'Resume';
    }

    function resetTimer() {
      seconds = 0;
      document.getElementById('timer-display').innerText = '00:00:00';
    }

    let cals = 480;
    function logExercise() {
      const name = document.getElementById('ex-name').value.trim();
      const sets = document.getElementById('ex-sets').value.trim() || 3;
      const reps = document.getElementById('ex-reps').value.trim() || 10;
      if (!name) return;

      cals += 75;
      document.getElementById('calories-display').innerText = cals + ' kcal';

      const list = document.getElementById('exercises-list');
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3 bg-slate-950 rounded-xl text-xs border border-slate-800/80';
      item.innerHTML = '<div><span class="font-bold text-white">' + name + '</span> • ' + sets + ' sets × ' + reps + ' reps</div><span class="text-emerald-400 font-semibold">+75 kcal</span>';
      list.prepend(item);

      document.getElementById('ex-name').value = '';
      document.getElementById('ex-sets').value = '';
      document.getElementById('ex-reps').value = '';
    }
  </script>
</body>
</html>`;
  }

  // 4. WEATHER APP
  if (lower.includes("weather") || lower.includes("forecast") || lower.includes("climate")) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-8 antialiased">
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold">
          <i class="fa-solid fa-cloud-sun"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-white">${cleanTitle}</h1>
          <p class="text-xs text-slate-400">Live Global Weather & Atmospheric Conditions</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="setTempUnit('C')" id="btn-c" class="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white">°C</button>
        <button onclick="setTempUnit('F')" id="btn-f" class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400">°F</button>
      </div>
    </div>

    <!-- Current City Hero -->
    <div class="bg-gradient-to-br from-cyan-900/40 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div>
        <span class="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Current Conditions</span>
        <h2 id="city-name" class="text-3xl font-bold text-white mt-1">San Francisco, CA</h2>
        <p class="text-xs text-slate-400 mt-1">Partly Cloudy • Humidity 68% • Wind 12 mph</p>
      </div>
      <div class="text-right">
        <div id="temp-val" class="text-5xl font-extrabold text-white">19°C</div>
        <div class="text-xs text-slate-400 mt-1">Feels like 18°C</div>
      </div>
    </div>

    <!-- 5 Day Forecast -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs text-slate-400">Mon</span>
        <div class="text-2xl text-amber-400"><i class="fa-solid fa-sun"></i></div>
        <div class="text-sm font-bold text-white">22° / 14°</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs text-slate-400">Tue</span>
        <div class="text-2xl text-cyan-400"><i class="fa-solid fa-cloud-sun"></i></div>
        <div class="text-sm font-bold text-white">19° / 13°</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs text-slate-400">Wed</span>
        <div class="text-2xl text-blue-400"><i class="fa-solid fa-cloud-rain"></i></div>
        <div class="text-sm font-bold text-white">16° / 11°</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs text-slate-400">Thu</span>
        <div class="text-2xl text-slate-300"><i class="fa-solid fa-cloud"></i></div>
        <div class="text-sm font-bold text-white">18° / 12°</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs text-slate-400">Fri</span>
        <div class="text-2xl text-amber-400"><i class="fa-solid fa-sun"></i></div>
        <div class="text-sm font-bold text-white">23° / 15°</div>
      </div>
    </div>
  </div>

  <script>
    let isC = true;
    function setTempUnit(u) {
      isC = (u === 'C');
      document.getElementById('btn-c').className = isC ? 'px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white' : 'px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400';
      document.getElementById('btn-f').className = !isC ? 'px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white' : 'px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400';
      document.getElementById('temp-val').innerText = isC ? '19°C' : '66°F';
    }
  </script>
</body>
</html>`;
  }

  // 5. DEFAULT / CUSTOM APPLICATION
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle} — Interactive Application</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
  <header class="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
        <i class="fa-solid fa-code"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white">${cleanTitle}</h1>
        <p class="text-[11px] text-slate-400">Generated by Rex Voice AI Assistant</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="text-xs text-slate-300 font-medium">Live & Interactive</span>
    </div>
  </header>

  <main class="max-w-6xl mx-auto w-full p-6 flex-1 space-y-6">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-white">${cleanTitle} Workspace</h2>
          <p class="text-xs text-slate-400 mt-0.5">Interactive software compiled and served inside this isolated sandbox.</p>
        </div>
        <button onclick="handleAction()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer">
          Trigger Action
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400">Status</span>
          <div class="text-lg font-bold text-emerald-400 mt-1">Operational</div>
        </div>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400">Interactive Inputs</span>
          <div id="counter-val" class="text-lg font-bold text-white mt-1">0 Executions</div>
        </div>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400">Sandbox Isolation</span>
          <div class="text-lg font-bold text-indigo-400 mt-1">100% Dedicated</div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
        <div class="font-semibold text-slate-200">System Logs</div>
        <div id="log-console" class="font-mono text-[11px] text-slate-400 space-y-1 max-h-40 overflow-y-auto">
          <div>[system] Application initialized successfully for "${cleanTitle}".</div>
          <div>[ready] All components mounted in isolated session.</div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let count = 0;
    function handleAction() {
      count++;
      document.getElementById('counter-val').innerText = count + ' Executions';
      const log = document.getElementById('log-console');
      const item = document.createElement('div');
      item.className = 'text-emerald-400';
      item.innerText = '[event #' + count + '] Action triggered interactively in preview!';
      log.appendChild(item);
    }
  </script>
</body>
</html>`;
}

export function generateRoomCanvasHtml(roomName = "Collaborative Virtual Space"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${roomName} — 2D Spatial Canvas & Presence</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    .grid-bg {
      background-size: 32px 32px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    }
    @keyframes floatUp {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-70px) scale(1.4); }
    }
    .reaction-bubble {
      animation: floatUp 1.2s ease-out forwards;
      pointer-events: none;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden antialiased">

  <!-- Top Navigation & Room Info -->
  <header class="h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between z-20 flex-shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
        <i class="fa-solid fa-shapes text-sm"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xs sm:text-sm font-bold text-white tracking-tight">${roomName}</h1>
          <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Sync Active
          </span>
        </div>
        <p class="text-[10.5px] text-slate-400 -mt-0.5">Spatial 2D Canvas • Multi-peer presence & audio anchors</p>
      </div>
    </div>

    <!-- Layout Mode Controls -->
    <div class="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
      <button onclick="setLayout('studio')" id="layout-studio" class="px-2.5 py-1 rounded-md bg-indigo-600 text-white font-medium transition-all text-[11px]">
        Open Studio
      </button>
      <button onclick="setLayout('focus')" id="layout-focus" class="px-2.5 py-1 rounded-md text-slate-400 hover:text-white font-medium transition-all text-[11px]">
        Focus Pods
      </button>
      <button onclick="setLayout('townhall')" id="layout-townhall" class="px-2.5 py-1 rounded-md text-slate-400 hover:text-white font-medium transition-all text-[11px]">
        Town Hall
      </button>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-3">
      <div class="text-right hidden sm:block">
        <div class="text-[11px] font-semibold text-slate-300" id="coords-display">Position: X: 420, Y: 280</div>
        <div class="text-[10px] text-slate-500">Spatial Audio: Active (300px radius)</div>
      </div>
      <button onclick="toggleSidebar()" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs">
        <i class="fa-solid fa-users"></i>
      </button>
    </div>
  </header>

  <!-- Main Canvas Container -->
  <div class="flex-1 flex min-h-0 relative">

    <!-- Interactive Spatial Canvas Stage -->
    <div id="canvas-container" class="flex-1 relative bg-[#090d16] grid-bg overflow-hidden cursor-crosshair">
      <canvas id="room-canvas" class="absolute inset-0 w-full h-full block"></canvas>

      <!-- Floating Toolbar for Spawning Objects -->
      <div class="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl">
        <span class="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Add:</span>
        <button onclick="spawnObject('whiteboard')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95">
          <i class="fa-solid fa-chalkboard text-indigo-400"></i>
          <span>Whiteboard</span>
        </button>
        <button onclick="spawnObject('desk')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95">
          <i class="fa-solid fa-laptop text-emerald-400"></i>
          <span>Desk</span>
        </button>
        <button onclick="spawnObject('plant')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95">
          <i class="fa-solid fa-seedling text-green-400"></i>
          <span>Plant</span>
        </button>
        <button onclick="spawnObject('sticky')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95">
          <i class="fa-solid fa-note-sticky text-amber-400"></i>
          <span>Note</span>
        </button>
        <button onclick="spawnObject('podium')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105 active:scale-95">
          <i class="fa-solid fa-tv text-purple-400"></i>
          <span>Screen</span>
        </button>

        <div class="h-5 w-[1px] bg-slate-700 mx-1"></div>

        <!-- Floating Quick Reactions -->
        <div class="flex items-center gap-1">
          <button onclick="triggerReaction('👍')" class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sm flex items-center justify-center transition-all hover:scale-110">👍</button>
          <button onclick="triggerReaction('🚀')" class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sm flex items-center justify-center transition-all hover:scale-110">🚀</button>
          <button onclick="triggerReaction('💡')" class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sm flex items-center justify-center transition-all hover:scale-110">💡</button>
          <button onclick="triggerReaction('🎉')" class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sm flex items-center justify-center transition-all hover:scale-110">🎉</button>
        </div>
      </div>

      <!-- Tip Overlay -->
      <div class="absolute top-4 left-4 z-10 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-300 shadow">
        <p><i class="fa-solid fa-mouse-pointer text-indigo-400 mr-1.5"></i><strong>Click anywhere</strong> on canvas to walk avatar</p>
        <p class="text-slate-400 mt-0.5"><i class="fa-solid fa-hand text-amber-400 mr-1.5"></i><strong>Drag objects</strong> to rearrange room layout</p>
      </div>

      <!-- Reaction Container (dynamic elements injected here) -->
      <div id="reactions-container" class="absolute inset-0 pointer-events-none z-40 overflow-hidden"></div>
    </div>

    <!-- Real-time Presence & Spatial Audio Sidebar -->
    <aside id="presence-sidebar" class="w-72 bg-slate-900 border-l border-slate-800 flex flex-col z-20 transition-all duration-300">
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-circle-nodes text-indigo-400"></i>
          Peer Presence (<span id="peer-count">4</span>)
        </h3>
        <span class="text-[10px] text-emerald-400 font-mono">18ms ping</span>
      </div>

      <!-- Peers List -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2.5" id="peers-list">
        <!-- You -->
        <div class="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-400">
              You
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>You (Host)</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <div class="text-[10px] text-indigo-300 font-medium">Navigating Canvas</div>
            </div>
          </div>
          <span class="text-[10px] font-mono text-slate-400" id="you-coord">420, 280</span>
        </div>

        <!-- Sarah -->
        <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-pink-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-pink-400/50">
              SD
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Sarah Day</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <div class="text-[10px] text-slate-400">At Whiteboard #1</div>
            </div>
          </div>
          <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <i class="fa-solid fa-volume-high text-[9px]"></i> 95%
          </span>
        </div>

        <!-- Alex -->
        <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-400/50">
              AK
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Alex Kim</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <div class="text-[10px] text-slate-400">Coding at Pod #3</div>
            </div>
          </div>
          <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <i class="fa-solid fa-volume-high text-[9px]"></i> 82%
          </span>
        </div>

        <!-- Devon -->
        <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-amber-400/50">
              DV
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Devon Vance</span>
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </div>
              <div class="text-[10px] text-slate-400">Reviewing Screen #1</div>
            </div>
          </div>
          <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-solid fa-volume-low text-[9px]"></i> 34%
          </span>
        </div>
      </div>

      <!-- Spatial Audio Meter -->
      <div class="p-3 bg-slate-950 border-t border-slate-800 text-xs space-y-2">
        <div class="flex items-center justify-between text-[11px] text-slate-300">
          <span class="flex items-center gap-1.5 font-medium">
            <i class="fa-solid fa-headphones-simple text-indigo-400"></i>
            Spatial Proximity Audio
          </span>
          <span class="text-emerald-400 font-bold">Active</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full w-[72%] rounded-full"></div>
        </div>
        <p class="text-[10px] text-slate-500">Audio volume smoothly attenuates based on avatar proximity in 2D coordinate space.</p>
      </div>
    </aside>
  </div>

  <script>
    const canvas = document.getElementById('room-canvas');
    const ctx = canvas.getContext('2d');
    const coordsDisplay = document.getElementById('coords-display');
    const youCoord = document.getElementById('you-coord');
    const reactionsContainer = document.getElementById('reactions-container');

    let width = 0, height = 0;
    function resizeCanvas() {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width;
      canvas.height = height;
      render();
    }
    window.addEventListener('resize', resizeCanvas);

    // User Avatar State
    const user = {
      x: 420,
      y: 280,
      targetX: 420,
      targetY: 280,
      name: "You",
      color: "#6366f1",
      radius: 20
    };

    // Peers
    const peers = [
      { id: 1, name: "Sarah Day", initials: "SD", x: 260, y: 190, targetX: 260, targetY: 190, color: "#ec4899", status: "At Whiteboard" },
      { id: 2, name: "Alex Kim", initials: "AK", x: 620, y: 350, targetX: 620, targetY: 350, color: "#10b981", status: "Coding" },
      { id: 3, name: "Devon Vance", initials: "DV", x: 740, y: 180, targetX: 740, targetY: 180, color: "#f59e0b", status: "Reviewing" },
    ];

    // Objects on canvas
    let objects = [
      { id: 'w1', type: 'whiteboard', x: 200, y: 100, w: 140, h: 80, label: "Sprint Architecture", icon: "chalkboard", color: "#312e81" },
      { id: 'd1', type: 'desk', x: 560, y: 280, w: 120, h: 70, label: "Workstation Alpha", icon: "laptop", color: "#064e3b" },
      { id: 'p1', type: 'podium', x: 700, y: 90, w: 130, h: 75, label: "Main Screen Podium", icon: "tv", color: "#581c87" },
      { id: 's1', type: 'sticky', x: 380, y: 120, w: 60, h: 60, label: "Sync @ 2pm", icon: "note-sticky", color: "#78350f" },
      { id: 'pl1', type: 'plant', x: 120, y: 340, w: 50, h: 50, label: "Ficus", icon: "seedling", color: "#065f46" }
    ];

    let draggedObject = null;
    let dragOffsetX = 0, dragOffsetY = 0;

    // Canvas click & drag handlers
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if clicking an object to drag
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (mouseX >= obj.x && mouseX <= obj.x + obj.w && mouseY >= obj.y && mouseY <= obj.y + obj.h) {
          draggedObject = obj;
          dragOffsetX = mouseX - obj.x;
          dragOffsetY = mouseY - obj.y;
          return;
        }
      }

      // Otherwise move avatar
      user.targetX = mouseX;
      user.targetY = mouseY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!draggedObject) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      draggedObject.x = Math.max(10, Math.min(width - draggedObject.w - 10, mouseX - dragOffsetX));
      draggedObject.y = Math.max(10, Math.min(height - draggedObject.h - 10, mouseY - dragOffsetY));
    });

    window.addEventListener('mouseup', () => {
      draggedObject = null;
    });

    function spawnObject(type) {
      const id = 'obj_' + Date.now();
      const spawnX = Math.round(width / 2 - 50 + (Math.random() * 80 - 40));
      const spawnY = Math.round(height / 2 - 40 + (Math.random() * 80 - 40));

      const configs = {
        whiteboard: { w: 140, h: 80, label: "Team Whiteboard", icon: "chalkboard", color: "#312e81" },
        desk: { w: 110, h: 65, label: "Work Desk", icon: "laptop", color: "#064e3b" },
        plant: { w: 50, h: 50, label: "Fern Plant", icon: "seedling", color: "#065f46" },
        sticky: { w: 65, h: 65, label: "Task Note", icon: "note-sticky", color: "#78350f" },
        podium: { w: 130, h: 75, label: "Display Podium", icon: "tv", color: "#581c87" }
      };

      const cfg = configs[type] || configs.whiteboard;
      objects.push({ id, type, x: spawnX, y: spawnY, ...cfg });
      triggerReaction('✨');
    }

    function triggerReaction(emoji) {
      const el = document.createElement('div');
      el.className = 'absolute reaction-bubble text-2xl font-bold flex items-center justify-center';
      el.innerText = emoji;
      el.style.left = (user.x - 12) + 'px';
      el.style.top = (user.y - 30) + 'px';
      reactionsContainer.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }

    function setLayout(mode) {
      ['studio', 'focus', 'townhall'].forEach(m => {
        const btn = document.getElementById('layout-' + m);
        if (btn) {
          btn.className = m === mode
            ? 'px-2.5 py-1 rounded-md bg-indigo-600 text-white font-medium transition-all text-[11px]'
            : 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white font-medium transition-all text-[11px]';
        }
      });

      if (mode === 'focus') {
        user.targetX = 620; user.targetY = 280;
        peers[0].targetX = 180; peers[0].targetY = 160;
        peers[1].targetX = 400; peers[1].targetY = 320;
        peers[2].targetX = 680; peers[2].targetY = 160;
      } else if (mode === 'townhall') {
        user.targetX = width / 2; user.targetY = height / 2 + 60;
        peers[0].targetX = width / 2 - 80; peers[0].targetY = height / 2 + 50;
        peers[1].targetX = width / 2 + 80; peers[1].targetY = height / 2 + 50;
        peers[2].targetX = width / 2; peers[2].targetY = height / 2 - 80;
      } else {
        user.targetX = 420; user.targetY = 280;
        peers[0].targetX = 260; peers[0].targetY = 190;
        peers[1].targetX = 620; peers[1].targetY = 350;
        peers[2].targetX = 740; peers[2].targetY = 180;
      }
    }

    function toggleSidebar() {
      const sb = document.getElementById('presence-sidebar');
      sb.classList.toggle('hidden');
    }

    // Main animation loop
    function updatePhysics() {
      // Move user towards target
      const dx = user.targetX - user.x;
      const dy = user.targetY - user.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.5) {
        user.x += dx * 0.12;
        user.y += dy * 0.12;
        coordsDisplay.innerText = 'Position: X: ' + Math.round(user.x) + ', Y: ' + Math.round(user.y);
        youCoord.innerText = Math.round(user.x) + ', ' + Math.round(user.y);
      }

      // Gentle wander for peers
      peers.forEach(p => {
        const pdx = p.targetX - p.x;
        const pdy = p.targetY - p.y;
        if (Math.abs(pdx) > 1 || Math.abs(pdy) > 1) {
          p.x += pdx * 0.08;
          p.y += pdy * 0.08;
        } else if (Math.random() < 0.008) {
          p.targetX = p.x + (Math.random() * 40 - 20);
          p.targetY = p.y + (Math.random() * 40 - 20);
        }
      });
    }

    function render() {
      if (!ctx || width === 0) return;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Furniture / Objects
      objects.forEach(obj => {
        ctx.save();
        ctx.fillStyle = obj.color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(obj.x, obj.y, obj.w, obj.h, 12);
        ctx.fill();
        ctx.stroke();

        // Object label
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
        ctx.restore();
      });

      // 2. Draw Spatial Audio Proximity Circle for User
      ctx.save();
      ctx.beginPath();
      ctx.arc(user.x, user.y, 140, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();

      // 3. Draw Peers
      peers.forEach(p => {
        ctx.save();
        // Pulse ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Avatar body
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.initials, p.x, p.y);

        // Name tag
        ctx.font = '500 10px system-ui, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(p.name, p.x, p.y + 28);
        ctx.restore();
      });

      // 4. Draw User Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(user.x, user.y, 24, 0, Math.PI * 2);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(user.x, user.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("You", user.x, user.y);

      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText("You (Host)", user.x, user.y + 30);
      ctx.restore();
    }

    function loop() {
      updatePhysics();
      render();
      requestAnimationFrame(loop);
    }

    // Init
    setTimeout(() => {
      resizeCanvas();
      loop();
    }, 50);
  </script>
</body>
</html>`;
}

export function generateCosmeticsEcommerceHtml(projectName = "AuraBeauty — Cosmetics & Skincare E-Commerce Platform"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 min-h-screen flex flex-col antialiased">

  <!-- TOP PROMO BANNER -->
  <div class="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 text-rose-200 text-xs py-2 px-4 text-center font-medium border-b border-rose-800/40 flex items-center justify-center gap-2">
    <span>🌸 <strong>Spring Beauty Event:</strong> Use code <span class="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">GLOW20</span> for 20% off all Facial Kits &amp; Serums!</span>
    <span class="hidden sm:inline text-rose-400">•</span>
    <span class="hidden sm:inline text-rose-300">Free eco-shipping on orders over $50</span>
  </div>

  <!-- MAIN HEADER -->
  <header class="sticky top-0 z-40 bg-[#0c1220]/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <div class="flex items-center gap-3 cursor-pointer" onclick="resetFilters()">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-rose-500/20">
          <i class="fa-solid fa-spa text-white"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold tracking-tight text-white">Aura<span class="text-rose-400">Beauty</span></span>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Live Store</span>
          </div>
          <p class="text-[11px] text-slate-400 font-medium">Clean Cosmetics &amp; Skincare Platform</p>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="flex-1 max-w-md hidden md:block">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
          <input
            id="searchInput"
            type="text"
            placeholder="Search facial kits, hyaluronic serums, cleansers..."
            oninput="handleSearch(this.value)"
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      <!-- Header Actions -->
      <div class="flex items-center gap-3">
        <!-- Wishlist -->
        <button class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-slate-700 flex items-center justify-center text-xs transition-all relative">
          <i class="fa-regular fa-heart"></i>
          <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">2</span>
        </button>

        <!-- Cart Button -->
        <button
          onclick="toggleCart(true)"
          class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
        >
          <i class="fa-solid fa-bag-shopping"></i>
          <span>Bag (<span id="cartCountBadge">0</span>)</span>
          <span class="hidden sm:inline border-l border-rose-400/40 pl-2" id="cartTotalHeader">$0.00</span>
        </button>
      </div>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section class="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#111827] to-[#090d16] py-10 px-4 sm:px-6">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="max-w-xl space-y-4 text-center md:text-left">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
          <i class="fa-solid fa-leaf text-emerald-400"></i>
          <span>100% Botanical Formulations • Dermatologist Approved</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
          Radiance Formulated by Nature, <br class="hidden sm:inline" />
          <span class="bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">Perfected by Clinical Science</span>
        </h1>
        <p class="text-sm text-slate-300 leading-relaxed">
          Nourish, protect, and rejuvenate your skin barrier with targeted facial kits, pure bio-active serums, and nutrient-dense cosmetics crafted without harsh sulfates or synthetics.
        </p>
        <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
          <button onclick="filterCategory('facial_kit')" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all">
            <i class="fa-solid fa-box-open mr-1.5"></i> Shop Facial Kits
          </button>
          <button onclick="filterCategory('serum')" class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all">
            <i class="fa-solid fa-droplet text-rose-400 mr-1.5"></i> Explore Serums
          </button>
        </div>
      </div>

      <!-- Feature Highlight Badges -->
      <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-1">
          <div class="text-rose-400 text-sm"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="text-xs font-bold text-white">Clean &amp; Certified</div>
          <div class="text-[11px] text-slate-400">Cruelty-free &amp; paraben free</div>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-1">
          <div class="text-amber-400 text-sm"><i class="fa-solid fa-star"></i></div>
          <div class="text-xs font-bold text-white">4.9/5 Rating</div>
          <div class="text-[11px] text-slate-400">Over 18,400 beauty reviews</div>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-1">
          <div class="text-emerald-400 text-sm"><i class="fa-solid fa-truck-fast"></i></div>
          <div class="text-xs font-bold text-white">Fast Dispatch</div>
          <div class="text-[11px] text-slate-400">Shipped within 24 hours</div>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-1">
          <div class="text-indigo-400 text-sm"><i class="fa-solid fa-rotate-left"></i></div>
          <div class="text-xs font-bold text-white">30-Day Guarantee</div>
          <div class="text-[11px] text-slate-400">100% skin compatibility</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CONTROLS & FILTER BAR -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-4">
    <!-- Category Tabs -->
    <div class="flex items-center justify-between gap-4 flex-wrap border-b border-slate-800/80 pb-4">
      <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-full" id="categoryTabs">
        <button onclick="filterCategory('all')" id="cat-all" class="cat-btn px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs whitespace-nowrap transition-all">All Products</button>
        <button onclick="filterCategory('facial_kit')" id="cat-facial_kit" class="cat-btn px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-medium text-xs whitespace-nowrap transition-all">Facial Kits &amp; Sets</button>
        <button onclick="filterCategory('serum')" id="cat-serum" class="cat-btn px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-medium text-xs whitespace-nowrap transition-all">Serums &amp; Elixirs</button>
        <button onclick="filterCategory('cleanser')" id="cat-cleanser" class="cat-btn px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-medium text-xs whitespace-nowrap transition-all">Cleansers &amp; Toners</button>
        <button onclick="filterCategory('mask')" id="cat-mask" class="cat-btn px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-medium text-xs whitespace-nowrap transition-all">Detox Masks</button>
        <button onclick="filterCategory('lip_eye')" id="cat-lip_eye" class="cat-btn px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-medium text-xs whitespace-nowrap transition-all">Lip &amp; Eye Care</button>
      </div>

      <!-- Sorting -->
      <div class="flex items-center gap-2 text-xs">
        <span class="text-slate-400 hidden sm:inline">Sort:</span>
        <select id="sortSelect" onchange="handleSort(this.value)" class="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500">
          <option value="featured">Featured Curations</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>
    </div>

    <!-- Skin Type Filter Pills -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-xs font-semibold text-slate-400 mr-1"><i class="fa-solid fa-sliders text-rose-400 mr-1"></i> Skin Routine:</span>
      <button onclick="filterSkinType('all')" id="skin-all" class="skin-btn px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-white border border-slate-700 transition-all">All Skin Types</button>
      <button onclick="filterSkinType('sensitive')" id="skin-sensitive" class="skin-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all">🌸 Sensitive</button>
      <button onclick="filterSkinType('dry')" id="skin-dry" class="skin-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all">💧 Dry &amp; Dehydrated</button>
      <button onclick="filterSkinType('oily')" id="skin-oily" class="skin-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all">🌿 Oily / Acne-Prone</button>
      <button onclick="filterSkinType('mature')" id="skin-mature" class="skin-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all">✨ Mature / Anti-Aging</button>
    </div>
  </section>

  <!-- PRODUCT GRID -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
    <div id="productGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Products dynamically injected via JavaScript -->
    </div>

    <div id="noResults" class="hidden text-center py-16 space-y-3">
      <div class="w-14 h-14 rounded-full bg-slate-900 text-slate-500 flex items-center justify-center mx-auto text-xl">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <h3 class="text-base font-bold text-white">No products found</h3>
      <p class="text-xs text-slate-400 max-w-sm mx-auto">Try clearing your search query or choosing "All Skin Types" to discover our full formulation range.</p>
      <button onclick="resetFilters()" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all">Reset All Filters</button>
    </div>
  </main>

  <!-- QUICK VIEW MODAL -->
  <div id="quickViewModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
      <button onclick="closeQuickView()" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div id="modalVisual" class="w-full h-56 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-800 relative overflow-hidden">
          <!-- Injected -->
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span id="modalCategory" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Facial Kit</span>
            <span id="modalSkinType" class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">Sensitive Skin</span>
          </div>
          <h3 id="modalTitle" class="text-lg font-black text-white leading-snug">Rosewater Radiance 5-Step Facial Kit</h3>
          <div class="flex items-center gap-2 text-xs">
            <div class="flex text-amber-400 text-xs">
              <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            </div>
            <span id="modalRating" class="text-slate-300 font-semibold">4.9</span>
            <span class="text-slate-500">(148 reviews)</span>
          </div>
          <div class="text-xl font-black text-rose-400" id="modalPrice">$68.00</div>
          <p id="modalDesc" class="text-xs text-slate-300 leading-relaxed">
            Five-step clinical botanical routine: Purifying Cleanser, Rosehip Exfoliant, Calming Essence, Barrier Cream, and Hydrating Mask.
          </p>

          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
            <div class="font-bold text-slate-200">🌿 Key Active Ingredients:</div>
            <div id="modalIngredients" class="text-slate-400 text-[11px]">Organic Damask Rosewater, Hyaluronic Acid, Cold-Pressed Rosehip Seed Oil, Niacinamide 3%.</div>
          </div>

          <div class="pt-2 flex items-center gap-3">
            <button id="modalAddBtn" onclick="addModalProduct()" class="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE-OVER SHOPPING BAG DRAWER -->
  <div id="cartDrawerBackdrop" onclick="toggleCart(false)" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden transition-all"></div>
  <aside id="cartDrawer" class="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[#0c1220] border-l border-slate-800 shadow-2xl translate-x-full transition-transform duration-300 flex flex-col">
    <!-- Drawer Header -->
    <div class="p-4 border-b border-slate-800 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-bag-shopping text-rose-400"></i>
        <h3 class="font-bold text-sm text-white">Your Shopping Bag</h3>
        <span class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold" id="drawerCartCount">0</span>
      </div>
      <button onclick="toggleCart(false)" class="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Free Shipping Progress -->
    <div class="p-3 bg-slate-900/60 border-b border-slate-800 text-xs">
      <div class="flex justify-between items-center text-slate-300 mb-1.5" id="shippingProgressText">
        <span>Add $50.00 for <strong>FREE Shipping</strong></span>
        <i class="fa-solid fa-truck text-rose-400"></i>
      </div>
      <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div id="shippingProgressBar" class="bg-gradient-to-r from-rose-500 to-amber-400 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
      </div>
    </div>

    <!-- Items List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" id="cartItemsList">
      <!-- Injected -->
    </div>

    <!-- Empty Cart State -->
    <div id="emptyCartView" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-3">
      <div class="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-2xl text-slate-600">
        <i class="fa-solid fa-bag-shopping"></i>
      </div>
      <h4 class="font-bold text-sm text-white">Your bag is empty</h4>
      <p class="text-xs text-slate-400 max-w-xs">Discover our facial kits and botanical serums formulated to revitalize your daily routine.</p>
      <button onclick="toggleCart(false)" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-all">Start Shopping</button>
    </div>

    <!-- Drawer Footer -->
    <div class="p-4 border-t border-slate-800 bg-[#090d16] space-y-3" id="cartFooter">
      <!-- Promo Code Input -->
      <div class="flex gap-2">
        <input
          id="promoInput"
          type="text"
          placeholder="Promo code (e.g. GLOW20)"
          class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 uppercase font-mono tracking-wider focus:outline-none focus:border-rose-500"
        />
        <button onclick="applyPromo()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold transition-all">Apply</button>
      </div>
      <div id="promoNotice" class="hidden text-[11px] text-emerald-400 font-medium">✓ Promo code <strong>GLOW20</strong> applied (20% off)!</div>

      <!-- Pricing Summary -->
      <div class="space-y-1.5 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span id="drawerSubtotal" class="font-medium text-slate-200">$0.00</span>
        </div>
        <div id="discountRow" class="hidden justify-between text-emerald-400">
          <span>Discount (20%)</span>
          <span id="drawerDiscount">-$0.00</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Estimated Eco-Shipping</span>
          <span id="drawerShipping" class="font-medium text-slate-200">$5.99</span>
        </div>
        <div class="border-t border-slate-800 pt-1.5 flex justify-between text-sm font-black text-white">
          <span>Total</span>
          <span id="drawerTotal" class="text-rose-400">$0.00</span>
        </div>
      </div>

      <!-- Checkout Button -->
      <button
        onclick="openCheckout()"
        class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <i class="fa-solid fa-lock text-[10px]"></i> Secure Checkout
      </button>
    </div>
  </aside>

  <!-- CHECKOUT MODAL -->
  <div id="checkoutModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <button onclick="closeCheckout()" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="space-y-1">
        <div class="flex items-center gap-2 text-rose-400 text-xs font-bold">
          <i class="fa-solid fa-shield-halved"></i> 256-Bit Encrypted Checkout
        </div>
        <h3 class="text-lg font-black text-white">Complete Your Order</h3>
      </div>

      <!-- Shipping Form -->
      <div class="space-y-3 text-xs">
        <div class="font-bold text-slate-300">1. Shipping Address</div>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" id="chkFirst" placeholder="First Name" value="Elena" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
          <input type="text" id="chkLast" placeholder="Last Name" value="Rostova" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
        </div>
        <input type="email" id="chkEmail" placeholder="Email for delivery tracking" value="elena.rostova@example.com" class="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
        <input type="text" id="chkAddress" placeholder="Street Address" value="742 Evergreen Botanical Way" class="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
        <div class="grid grid-cols-3 gap-2">
          <input type="text" id="chkCity" placeholder="City" value="San Francisco" class="col-span-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
          <input type="text" id="chkZip" placeholder="ZIP" value="94107" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500" />
        </div>

        <div class="font-bold text-slate-300 pt-2">2. Payment Method</div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-medium"><i class="fa-regular fa-credit-card text-rose-400 mr-1.5"></i> Credit Card (Simulated)</span>
            <div class="flex gap-1.5 text-xs text-slate-400">
              <i class="fa-brands fa-cc-visa"></i>
              <i class="fa-brands fa-cc-mastercard"></i>
              <i class="fa-brands fa-cc-apple-pay"></i>
            </div>
          </div>
          <input type="text" readonly value="•••• •••• •••• 4242" class="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono text-xs cursor-not-allowed" />
        </div>

        <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
          <span class="text-slate-400">Total Charged Today:</span>
          <span class="text-base font-black text-rose-400" id="checkoutAmount">$0.00</span>
        </div>

        <button
          id="paySubmitBtn"
          onclick="submitPayment()"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Confirm &amp; Place Order</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ORDER SUCCESS MODAL -->
  <div id="orderSuccessModal" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden items-center justify-center p-4">
    <div class="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/20">
        <i class="fa-solid fa-check"></i>
      </div>

      <div class="space-y-1">
        <h3 class="text-lg font-black text-white">Order Confirmed!</h3>
        <p class="text-xs text-slate-300">Thank you for ordering with AuraBeauty.</p>
        <div class="text-[11px] font-mono text-rose-400 mt-1" id="orderIdDisplay">Order #AB-74921</div>
      </div>

      <!-- Tracking Timeline -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3">
        <div class="text-xs font-bold text-slate-200 mb-2">Live Fulfillment Status</div>
        <div class="space-y-2.5 text-xs">
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center"><i class="fa-solid fa-check"></i></span>
            <div>
              <div class="font-bold text-white">Order Verified</div>
              <div class="text-[10px] text-slate-400">Payment authorized via 256-bit gateway</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"><i class="fa-solid fa-flask"></i></span>
            <div>
              <div class="font-bold text-rose-400">Formulating Fresh Batch</div>
              <div class="text-[10px] text-slate-400">Clean laboratory packaging in sterile vials</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5 opacity-50">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center"><i class="fa-solid fa-box"></i></span>
            <div>
              <div class="font-semibold text-slate-300">Eco-Dispatch</div>
              <div class="text-[10px] text-slate-500">Estimated delivery in 2 business days</div>
            </div>
          </div>
        </div>
      </div>

      <button onclick="closeOrderSuccess()" class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all">
        Continue Exploring AuraBeauty
      </button>
    </div>
  </div>

  <!-- JAVASCRIPT APP STATE & LOGIC -->
  <script>
    // Product Catalog Database
    const PRODUCTS = [
      {
        id: "prod-1",
        title: "Rosewater Radiance 5-Step Facial Kit",
        category: "facial_kit",
        skinType: "sensitive",
        price: 68.00,
        origPrice: 85.00,
        rating: 4.9,
        reviews: 148,
        badge: "Bestseller",
        badgeColor: "rose",
        gradient: "from-rose-500/20 to-pink-500/10",
        icon: "fa-spa",
        iconColor: "text-rose-400",
        ingredients: "Organic Damask Rosewater, Hyaluronic Acid, Cold-Pressed Rosehip Seed Oil, Niacinamide 3%.",
        desc: "Complete 5-step daily ritual designed for delicate skin: Gentle Cleanser, Rose Elixir Toner, Hyaluronic Booster, Day Barrier Cream, and Overnight Sleep Mask."
      },
      {
        id: "prod-2",
        title: "Hydra-Barrier 2% Pure Hyaluronic Serum",
        category: "serum",
        skinType: "dry",
        price: 42.00,
        origPrice: 52.00,
        rating: 4.8,
        reviews: 94,
        badge: "Derm Approved",
        badgeColor: "indigo",
        gradient: "from-indigo-500/20 to-cyan-500/10",
        icon: "fa-droplet",
        iconColor: "text-cyan-400",
        ingredients: "Multi-Molecular Weight Hyaluronic Acid (2%), Vitamin B5 (Panthenol), Centella Asiatica.",
        desc: "Triple-weight formulation deeply penetrates multi-depth dermal layers to replenish hydration and plumping for up to 72 hours."
      },
      {
        id: "prod-3",
        title: "Clarifying Green Tea & 1.5% Salicylic Cleanser",
        category: "cleanser",
        skinType: "oily",
        price: 28.00,
        origPrice: 34.00,
        rating: 4.7,
        reviews: 112,
        badge: "Organic",
        badgeColor: "emerald",
        gradient: "from-emerald-500/20 to-teal-500/10",
        icon: "fa-leaf",
        iconColor: "text-emerald-400",
        ingredients: "Matcha Green Tea Extract, Salicylic Acid (BHA 1.5%), Zinc PCA, Tea Tree Hydrosol.",
        desc: "Deeply unblocks congested pores and eliminates excess sebum without stripping the delicate lipid moisture layer."
      },
      {
        id: "prod-4",
        title: "Botanical Glow Bakuchiol & Squalane Night Elixir",
        category: "serum",
        skinType: "mature",
        price: 54.00,
        origPrice: 65.00,
        rating: 4.9,
        reviews: 82,
        badge: "Award Winner",
        badgeColor: "amber",
        gradient: "from-amber-500/20 to-rose-500/10",
        icon: "fa-sun",
        iconColor: "text-amber-400",
        ingredients: "Bakuchiol (100% plant-derived Retinol alternative), Plant Squalane, Marula Seed Oil, CoQ10.",
        desc: "Smooths fine lines and supports cellular turnover overnight without the redness or flaking typical of synthetic retinol."
      },
      {
        id: "prod-5",
        title: "Volcanic French Clay Detox Face Mask",
        category: "mask",
        skinType: "oily",
        price: 34.00,
        origPrice: 40.00,
        rating: 4.8,
        reviews: 76,
        badge: "Purifying",
        badgeColor: "teal",
        gradient: "from-teal-500/20 to-slate-500/10",
        icon: "fa-volcano",
        iconColor: "text-teal-400",
        ingredients: "French Kaolin Clay, Activated Charcoal, Witch Hazel, Willow Bark.",
        desc: "Draws out micro-pollutants and tightens skin texture in just 10 minutes. Leaves skin matte, clean, and velvety soft."
      },
      {
        id: "prod-6",
        title: "Velvet Peptide Lip Repair & Plump Balm",
        category: "lip_eye",
        skinType: "sensitive",
        price: 22.00,
        origPrice: 26.00,
        rating: 4.9,
        reviews: 165,
        badge: "Hydrating",
        badgeColor: "pink",
        gradient: "from-pink-500/20 to-rose-500/10",
        icon: "fa-heart",
        iconColor: "text-pink-400",
        ingredients: "Palmitoyl Tripeptide-1, Shea Butter, Cold-Pressed Camellia Oil, Vegan Squalane.",
        desc: "Instant volume and deep chapped-lip barrier restoration with a smooth, non-sticky satin rose tint."
      },
      {
        id: "prod-7",
        title: "Vitamin C 15% Radiance Brightening Day Cream",
        category: "facial_kit",
        skinType: "mature",
        price: 48.00,
        origPrice: 58.00,
        rating: 4.8,
        reviews: 89,
        badge: "Antioxidant",
        badgeColor: "amber",
        gradient: "from-amber-500/20 to-orange-500/10",
        icon: "fa-bolt",
        iconColor: "text-amber-400",
        ingredients: "15% Stabilized L-Ascorbic Acid, Ferulic Acid, Kakadu Plum, Vitamin E.",
        desc: "Fades dark spots, evens discoloration, and provides daytime photoprotection alongside broad-spectrum daily SPF."
      },
      {
        id: "prod-8",
        title: "Soothing Chamomile Calming Essence Mist",
        category: "cleanser",
        skinType: "sensitive",
        price: 26.00,
        origPrice: 32.00,
        rating: 4.7,
        reviews: 58,
        badge: "Calming",
        badgeColor: "rose",
        gradient: "from-rose-500/20 to-yellow-500/10",
        icon: "fa-feather",
        iconColor: "text-rose-300",
        ingredients: "German Blue Chamomile Hydrosol, Colloidal Oat, Allantoin, Aloe Barbadensis.",
        desc: "Instant relief for reactive or stressed skin. Spritz throughout the day to calm redness and reset environmental stressors."
      }
    ];

    // Reactive State
    let cart = [];
    let selectedCategory = "all";
    let selectedSkinType = "all";
    let searchQuery = "";
    let sortMethod = "featured";
    let promoDiscount = 0; // 0 or 0.20
    let activeQuickViewId = null;

    // Render Products Grid
    function renderProducts() {
      const grid = document.getElementById("productGrid");
      const noResults = document.getElementById("noResults");
      grid.innerHTML = "";

      let list = PRODUCTS.filter(p => {
        const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
        const matchesSkin = selectedSkinType === "all" || p.skinType === selectedSkinType;
        const matchesSearch = searchQuery === "" ||
          p.title.toLowerCase().includes(searchQuery) ||
          p.desc.toLowerCase().includes(searchQuery) ||
          p.ingredients.toLowerCase().includes(searchQuery);
        return matchesCat && matchesSkin && matchesSearch;
      });

      // Sort
      if (sortMethod === "price-asc") list.sort((a, b) => a.price - b.price);
      else if (sortMethod === "price-desc") list.sort((a, b) => b.price - a.price);
      else if (sortMethod === "rating") list.sort((a, b) => b.rating - a.rating);

      if (list.length === 0) {
        noResults.classList.remove("hidden");
        return;
      }
      noResults.classList.add("hidden");

      list.forEach(p => {
        const card = document.createElement("div");
        card.className = "bg-[#0c1220] border border-slate-800/80 hover:border-rose-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-950/20 group";
        
        const skinTag = p.skinType === "sensitive" ? "Sensitive" : p.skinType === "dry" ? "Dry Skin" : p.skinType === "oily" ? "Oily/Acne" : "Mature";

        card.innerHTML = \`
          <div class="space-y-3">
            <!-- Visual Box -->
            <div class="relative w-full h-44 rounded-xl bg-gradient-to-tr \${p.gradient} border border-slate-800/80 flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform">
              <span class="absolute top-2.5 left-2.5 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                \${p.badge}
              </span>
              <span class="absolute top-2.5 right-2.5 text-[9px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-300 backdrop-blur">
                \${skinTag}
              </span>
              <div class="text-4xl \${p.iconColor} drop-shadow-md">
                <i class="fa-solid \${p.icon}"></i>
              </div>
              <button onclick="openQuickView('\${p.id}')" class="absolute bottom-2 inset-x-2 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 hover:bg-slate-900">
                <i class="fa-solid fa-eye text-[10px]"></i> Quick View
              </button>
            </div>

            <!-- Details -->
            <div class="space-y-1">
              <div class="flex items-center gap-1 text-[11px] text-amber-400">
                <i class="fa-solid fa-star"></i>
                <span class="font-bold text-slate-200">\${p.rating}</span>
                <span class="text-slate-500">(\${p.reviews})</span>
              </div>
              <h4 class="font-bold text-xs text-white line-clamp-1 leading-snug group-hover:text-rose-300 transition-colors">\${p.title}</h4>
              <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">\${p.desc}</p>
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div>
              <span class="text-sm font-black text-rose-400">$\${p.price.toFixed(2)}</span>
              <span class="text-[11px] text-slate-500 line-through ml-1.5">$\${p.origPrice.toFixed(2)}</span>
            </div>
            <button onclick="addToCart('\${p.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-plus text-[10px]"></i> Add
            </button>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    // Filter by Category
    function filterCategory(cat) {
      selectedCategory = cat;
      document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.classList.remove("bg-rose-600", "text-white");
        btn.classList.add("bg-slate-900", "text-slate-300");
      });
      const activeBtn = document.getElementById("cat-" + cat);
      if (activeBtn) {
        activeBtn.classList.remove("bg-slate-900", "text-slate-300");
        activeBtn.classList.add("bg-rose-600", "text-white");
      }
      renderProducts();
    }

    // Filter by Skin Type
    function filterSkinType(skin) {
      selectedSkinType = skin;
      document.querySelectorAll(".skin-btn").forEach(btn => {
        btn.classList.remove("bg-slate-800", "text-white", "border-slate-700");
        btn.classList.add("bg-slate-900/60", "text-slate-400");
      });
      const activeBtn = document.getElementById("skin-" + skin);
      if (activeBtn) {
        activeBtn.classList.remove("bg-slate-900/60", "text-slate-400");
        activeBtn.classList.add("bg-slate-800", "text-white", "border-slate-700");
      }
      renderProducts();
    }

    // Handle Search
    function handleSearch(val) {
      searchQuery = val.trim().toLowerCase();
      renderProducts();
    }

    // Handle Sort
    function handleSort(val) {
      sortMethod = val;
      renderProducts();
    }

    // Reset Filters
    function resetFilters() {
      selectedCategory = "all";
      selectedSkinType = "all";
      searchQuery = "";
      document.getElementById("searchInput").value = "";
      filterCategory("all");
      filterSkinType("all");
    }

    // Cart Management
    function addToCart(productId) {
      const prod = PRODUCTS.find(p => p.id === productId);
      if (!prod) return;

      const existing = cart.find(item => item.id === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ ...prod, quantity: 1 });
      }

      updateCartUi();
      toggleCart(true);
    }

    function updateQuantity(productId, delta) {
      const item = cart.find(i => i.id === productId);
      if (!item) return;

      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
      }
      updateCartUi();
    }

    function removeFromCart(productId) {
      cart = cart.filter(i => i.id !== productId);
      updateCartUi();
    }

    function updateCartUi() {
      const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = subtotal * promoDiscount;
      const finalSubtotal = subtotal - discount;
      const isFreeShipping = subtotal >= 50.00;
      const shipping = (subtotal === 0 || isFreeShipping) ? 0.00 : 5.99;
      const total = subtotal === 0 ? 0 : finalSubtotal + shipping;

      // Header Badges
      document.getElementById("cartCountBadge").innerText = totalCount;
      document.getElementById("drawerCartCount").innerText = totalCount;
      document.getElementById("cartTotalHeader").innerText = "$" + total.toFixed(2);

      // Shipping Progress
      const shippingProgressText = document.getElementById("shippingProgressText");
      const shippingProgressBar = document.getElementById("shippingProgressBar");
      if (subtotal >= 50) {
        shippingProgressText.innerHTML = \`<span class="text-emerald-400 font-bold">✓ Free Eco-Shipping unlocked!</span> <i class="fa-solid fa-truck text-emerald-400"></i>\`;
        shippingProgressBar.style.width = "100%";
      } else {
        const remaining = (50 - subtotal).toFixed(2);
        shippingProgressText.innerHTML = \`<span>Add $\${remaining} more for <strong>FREE Shipping</strong></span> <i class="fa-solid fa-truck text-rose-400"></i>\`;
        shippingProgressBar.style.width = Math.min(100, (subtotal / 50) * 100) + "%";
      }

      // Items list
      const itemsList = document.getElementById("cartItemsList");
      const emptyCartView = document.getElementById("emptyCartView");
      const cartFooter = document.getElementById("cartFooter");

      if (cart.length === 0) {
        itemsList.innerHTML = "";
        emptyCartView.classList.remove("hidden");
        cartFooter.classList.add("opacity-50", "pointer-events-none");
      } else {
        emptyCartView.classList.add("hidden");
        cartFooter.classList.remove("opacity-50", "pointer-events-none");
        itemsList.innerHTML = "";

        cart.forEach(item => {
          const row = document.createElement("div");
          row.className = "p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3";
          row.innerHTML = \`
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr \${item.gradient} flex items-center justify-center text-lg \${item.iconColor} shrink-0">
              <i class="fa-solid \${item.icon}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h5 class="text-xs font-bold text-white truncate">\${item.title}</h5>
              <div class="text-[11px] text-rose-400 font-semibold">$\${item.price.toFixed(2)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <button onclick="updateQuantity('\${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs">-</button>
                <span class="w-6 text-center text-xs font-bold text-white">\${item.quantity}</span>
                <button onclick="updateQuantity('\${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs">+</button>
              </div>
              <button onclick="removeFromCart('\${item.id}')" class="text-slate-500 hover:text-rose-400 text-xs p-1">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          \`;
          itemsList.appendChild(row);
        });
      }

      // Summary lines
      document.getElementById("drawerSubtotal").innerText = "$" + subtotal.toFixed(2);
      const discountRow = document.getElementById("discountRow");
      if (promoDiscount > 0 && subtotal > 0) {
        discountRow.classList.remove("hidden");
        discountRow.classList.add("flex");
        document.getElementById("drawerDiscount").innerText = "-$" + discount.toFixed(2);
      } else {
        discountRow.classList.add("hidden");
        discountRow.classList.remove("flex");
      }
      document.getElementById("drawerShipping").innerText = (subtotal > 0 && isFreeShipping) ? "FREE" : "$" + shipping.toFixed(2);
      document.getElementById("drawerTotal").innerText = "$" + total.toFixed(2);
      document.getElementById("checkoutAmount").innerText = "$" + total.toFixed(2);
    }

    // Toggle Drawer
    function toggleCart(open) {
      const drawer = document.getElementById("cartDrawer");
      const backdrop = document.getElementById("cartDrawerBackdrop");
      if (open) {
        backdrop.classList.remove("hidden");
        drawer.classList.remove("translate-x-full");
      } else {
        backdrop.classList.add("hidden");
        drawer.classList.add("translate-x-full");
      }
    }

    // Promo Code
    function applyPromo() {
      const input = document.getElementById("promoInput").value.trim().toUpperCase();
      const notice = document.getElementById("promoNotice");
      if (input === "GLOW20" || input === "BEAUTY20") {
        promoDiscount = 0.20;
        notice.classList.remove("hidden");
        updateCartUi();
      } else {
        alert("Please enter a valid coupon code like GLOW20");
      }
    }

    // Quick View Modal
    function openQuickView(id) {
      activeQuickViewId = id;
      const p = PRODUCTS.find(prod => prod.id === id);
      if (!p) return;

      const visual = document.getElementById("modalVisual");
      visual.className = "w-full h-56 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-800 relative overflow-hidden bg-gradient-to-tr " + p.gradient;
      visual.innerHTML = \`<div class="text-6xl \${p.iconColor} drop-shadow-lg"><i class="fa-solid \${p.icon}"></i></div>\`;

      document.getElementById("modalTitle").innerText = p.title;
      document.getElementById("modalCategory").innerText = p.category.replace("_", " ");
      document.getElementById("modalSkinType").innerText = p.skinType.toUpperCase();
      document.getElementById("modalRating").innerText = p.rating;
      document.getElementById("modalPrice").innerText = "$" + p.price.toFixed(2);
      document.getElementById("modalDesc").innerText = p.desc;
      document.getElementById("modalIngredients").innerText = p.ingredients;

      const modal = document.getElementById("quickViewModal");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }

    function closeQuickView() {
      const modal = document.getElementById("quickViewModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    function addModalProduct() {
      if (activeQuickViewId) {
        addToCart(activeQuickViewId);
        closeQuickView();
      }
    }

    // Checkout Modal
    function openCheckout() {
      toggleCart(false);
      const modal = document.getElementById("checkoutModal");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }

    function closeCheckout() {
      const modal = document.getElementById("checkoutModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    function submitPayment() {
      const btn = document.getElementById("paySubmitBtn");
      btn.innerHTML = \`<i class="fa-solid fa-spinner fa-spin"></i> Processing Secure Payment...\`;
      btn.disabled = true;

      setTimeout(() => {
        closeCheckout();
        btn.innerHTML = "Confirm & Place Order";
        btn.disabled = false;

        // Reset cart
        cart = [];
        updateCartUi();

        // Show Success
        const orderId = "AB-" + Math.floor(10000 + Math.random() * 90000);
        document.getElementById("orderIdDisplay").innerText = "Order #" + orderId;
        const successModal = document.getElementById("orderSuccessModal");
        successModal.classList.remove("hidden");
        successModal.classList.add("flex");
      }, 1200);
    }

    function closeOrderSuccess() {
      const modal = document.getElementById("orderSuccessModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    // Initial load: add 1 bestselling product by default so users see an active cart
    cart.push({ ...PRODUCTS[0], quantity: 1 });
    renderProducts();
    updateCartUi();
  </script>
</body>
</html>`;
}


