'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function HomeLandingPage() {
  const { user } = useAuth();
  
  return (
    <div className="fixed inset-0 z-[100] bg-[#f9f9ff] text-[#111c2d] overflow-hidden flex font-sans">
      {/* External CSS for fonts and icons */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      
      <style jsx global>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .metric-card {
            background-color: white;
            box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0px 8px 30px rgba(0, 0, 0, 0.05);
        }
        .font-hanken {
            font-family: 'Hanken Grotesk', sans-serif;
        }
        h1, h2, h3 {
            font-family: 'Hanken Grotesk', sans-serif;
        }
      `}</style>

      {/* SideNavBar Shell */}
      <aside className="bg-white w-[220px] h-screen border-r border-[#c3c6d7] shadow-sm flex flex-col z-50 py-8 px-5 shrink-0 overflow-y-auto">
        <div className="mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#004ac6] text-2xl font-bold">store</span>
          <div>
            <h1 className="text-[18px] font-bold text-[#004ac6] leading-tight">StoreLink Pro</h1>
            <p className="text-[10px] text-[#434655]">SaaS Dashboard</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-[#434655] px-3 py-1.5 uppercase tracking-widest mt-5">Core</p>
          <a className="bg-[#2563eb] text-white font-bold rounded-lg flex items-center gap-3 px-3 py-2 transition-all" href="#">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-[14px]">Dashboard</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
            <span className="text-[14px]">POS</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span className="text-[14px]">My Profile</span>
          </a>
          
          <p className="text-[10px] font-semibold text-[#434655] px-3 py-1.5 uppercase tracking-widest mt-5">Invoicing</p>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-[14px]">Invoices</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            <span className="text-[14px]">Generate</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[14px]">Settings</span>
          </a>

          <p className="text-[10px] font-semibold text-[#434655] px-3 py-1.5 uppercase tracking-widest mt-5">Reports</p>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">trending_up</span>
            <span className="text-[14px]">Sales</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span className="text-[14px]">History</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">assignment_return</span>
            <span className="text-[14px]">Refunds</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="text-[14px]">Products</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">receipt</span>
            <span className="text-[14px]">Expenses</span>
          </a>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">percent</span>
            <span className="text-[14px]">Tax & VAT</span>
          </a>

          <p className="text-[10px] font-semibold text-[#434655] px-3 py-1.5 uppercase tracking-widest mt-5">Financials</p>
          <a className="text-[#434655] hover:bg-[#f0f3ff] transition-colors duration-200 flex items-center gap-3 px-3 py-2 rounded-lg" href="#">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            <span className="text-[14px]">Pay Small Small</span>
          </a>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopNavBar Shell */}
        <header className="h-16 bg-white border-b border-[#c3c6d7] flex justify-between items-center px-6 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#f0f3ff] rounded-full transition-colors">
              <span className="material-symbols-outlined text-[#737686]" style={{ fontSize: '18px' }}>arrow_back_ios</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#f0f3ff] rounded-full transition-colors text-[#737686]">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
            <button className="p-2 hover:bg-[#f0f3ff] rounded-full transition-colors text-[#737686] relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-[#c3c6d7]">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-[12px]">
                {(user?.displayName || 'Doha').substring(0, 2).toUpperCase()}
              </div>
              <span className="font-bold text-[12px] text-[#111c2d]">{user?.displayName || 'Doha'}</span>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Dashboard Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#dee8ff] border border-[#c3c6d7] flex items-center justify-center text-[#004ac6]">
              <span className="material-symbols-outlined text-[32px]">grid_view</span>
            </div>
            <div>
              <h2 className="text-[30px] font-bold text-[#111c2d] leading-tight">Dashboard</h2>
              <p className="text-[14px] text-[#434655]">An overview of your store&apos;s performance.</p>
            </div>
          </div>

          {/* Metric Grid: Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            {/* Total Website Views */}
            <div className="metric-card p-5 rounded-xl border border-[#dbe1ff]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-[#004ac6] uppercase tracking-tight">Total Website Views</span>
                <div className="w-8 h-8 rounded-full bg-[#f0f3ff] flex items-center justify-center text-[#004ac6]">
                  <span className="material-symbols-outlined text-lg">language</span>
                </div>
              </div>
              <h3 className="text-[30px] font-bold text-[#004ac6] mb-1">105</h3>
              <p className="text-[12px] text-[#434655]">Cumulative visits to your public store.</p>
            </div>

            {/* Today's Website Views */}
            <div className="metric-card p-5 rounded-xl border border-[#d1fae5]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-[#059669] uppercase tracking-tight">Today&apos;s Website Views</span>
                <div className="w-8 h-8 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#059669]">
                  <span className="material-symbols-outlined text-lg">monitoring</span>
                </div>
              </div>
              <h3 className="text-[30px] font-bold text-[#059669] mb-1">3</h3>
              <p className="text-[12px] text-[#434655]">Unique page views recorded today.</p>
            </div>

            {/* Today's Online Orders */}
            <div className="metric-card p-5 rounded-xl border border-[#fee2e2]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-[#dc2626] uppercase tracking-tight">Today&apos;s Online Orders</span>
                <div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#dc2626]">
                  <span className="material-symbols-outlined text-lg">shopping_basket</span>
                </div>
              </div>
              <h3 className="text-[30px] font-bold text-[#dc2626] mb-1">12</h3>
              <p className="text-[12px] text-[#434655]">Orders received in the last 24 hours.</p>
            </div>

            {/* Total Online Orders */}
            <div className="metric-card p-5 rounded-xl border border-[#fef3c7]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-[#d97706] uppercase tracking-tight">Total Online Orders</span>
                <div className="w-8 h-8 rounded-full bg-[#fffbeb] flex items-center justify-center text-[#d97706]">
                  <span className="material-symbols-outlined text-lg">shopping_cart</span>
                </div>
              </div>
              <h3 className="text-[30px] font-bold text-[#d97706] mb-1">1,450</h3>
              <p className="text-[12px] text-[#434655]">Successful orders placed via the website.</p>
            </div>
          </div>

          {/* Metric Grid: Row 2 (Six columns on desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-5">
            {/* Today's Tax/VAT */}
            <div className="metric-card p-4 rounded-xl border border-[#ffedd5]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#ea580c] uppercase font-bold tracking-wider">Today&apos;s Tax/VAT</span>
                <div className="w-6 h-6 rounded-md bg-[#fff7ed] flex items-center justify-center text-[#ea580c]">
                  <span className="material-symbols-outlined text-sm">request_quote</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">$425.50</h3>
              <p className="text-[10px] text-[#434655] mt-1">Tax from today&apos;s sales.</p>
            </div>

            {/* This Month's Tax/VAT */}
            <div className="metric-card p-4 rounded-xl border border-[#ccfbf1]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#0d9488] uppercase font-bold tracking-wider">This Month&apos;s Tax/VAT</span>
                <div className="w-6 h-6 rounded-md bg-[#f0fdfa] flex items-center justify-center text-[#0d9488]">
                  <span className="material-symbols-outlined text-sm">receipt</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">$12,840.00</h3>
              <p className="text-[10px] text-[#434655] mt-1">Tax collected this month.</p>
            </div>

            {/* Today's Credit Payments */}
            <div className="metric-card p-4 rounded-xl border border-[#dcfce7]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#16a34a] uppercase font-bold tracking-wider">Today&apos;s Credit Payments</span>
                <div className="w-6 h-6 rounded-md bg-[#f0fdf4] flex items-center justify-center text-[#16a34a]">
                  <span className="material-symbols-outlined text-sm">credit_card</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">$1,200.00</h3>
              <p className="text-[10px] text-[#434655] mt-1">Today&apos;s credit sales.</p>
            </div>

            {/* This Month's Credit Payments */}
            <div className="metric-card p-4 rounded-xl border border-[#f3e8ff]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#9333ea] uppercase font-bold tracking-wider">This Month&apos;s Credit</span>
                <div className="w-6 h-6 rounded-md bg-[#faf5ff] flex items-center justify-center text-[#9333ea]">
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">$45,600.00</h3>
              <p className="text-[10px] text-[#434655] mt-1">Monthly credit intake.</p>
            </div>

            {/* Today's Ad Clicks */}
            <div className="metric-card p-4 rounded-xl border border-[#fce7f3]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#db2777] uppercase font-bold tracking-wider">Today&apos;s Ad Clicks</span>
                <div className="w-6 h-6 rounded-md bg-[#fdf2f8] flex items-center justify-center text-[#db2777]">
                  <span className="material-symbols-outlined text-sm">ads_click</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">142</h3>
              <p className="text-[10px] text-[#434655] mt-1">Clicks recorded today.</p>
            </div>

            {/* Total Ad Clicks */}
            <div className="metric-card p-4 rounded-xl border border-[#ede9fe]">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-[#7c3aed] uppercase font-bold tracking-wider">Total Ad Clicks</span>
                <div className="w-6 h-6 rounded-md bg-[#f5f3ff] flex items-center justify-center text-[#7c3aed]">
                  <span className="material-symbols-outlined text-sm">ads_click</span>
                </div>
              </div>
              <h3 className="text-[24px] font-bold text-[#111c2d] truncate">8,430</h3>
              <p className="text-[10px] text-[#434655] mt-1">Total ad performance.</p>
            </div>
          </div>

          {/* Metric Grid: Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {/* Today's Sales */}
            <div className="metric-card p-6 rounded-xl border-l-4 border-l-[#2563eb] border border-[#c3c6d7]/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#2563eb]">Today&apos;s Sales</span>
                  <span className="material-symbols-outlined text-[#434655] text-sm">expand_more</span>
                </div>
                <span className="material-symbols-outlined text-[#737686]">shopping_bag</span>
              </div>
              <h3 className="text-[30px] font-bold text-[#2563eb] mb-1 truncate">$3,240.00</h3>
              <p className="text-[12px] text-[#2563eb]/70">Net sales for today</p>
            </div>

            {/* Sales Snapshot */}
            <div className="metric-card p-6 rounded-xl border-l-4 border-l-[#16a34a] border border-[#c3c6d7]/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#16a34a]">Sales Snapshot</span>
                  <div className="bg-[#f0fdf4] px-2 py-0.5 rounded text-[10px] text-[#16a34a] flex items-center gap-1">
                    This Week <span className="material-symbols-outlined text-[10px]">expand_more</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#737686]">package_2</span>
              </div>
              <h3 className="text-[30px] font-bold text-[#16a34a] mb-1 truncate">$24,500.00</h3>
              <p className="text-[12px] text-[#16a34a]/70">Net sales for this week</p>
            </div>

            {/* Monthly Sales */}
            <div className="metric-card p-6 rounded-xl border-l-4 border-l-[#9333ea] border border-[#c3c6d7]/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#9333ea]">Monthly Sales</span>
                  <span className="material-symbols-outlined text-[#434655] text-sm">more_horiz</span>
                </div>
                <span className="material-symbols-outlined text-[#737686]">wallet</span>
              </div>
              <h3 className="text-[30px] font-bold text-[#9333ea] mb-1 truncate">$118,200.00</h3>
              <p className="text-[12px] text-[#9333ea]/70">Net sales for ...</p>
            </div>

            {/* Yearly Sales */}
            <div className="metric-card p-6 rounded-xl border-l-4 border-l-[#dc2626] border border-[#c3c6d7]/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#dc2626]">Yearly Sales</span>
                  <span className="material-symbols-outlined text-[#434655] text-sm">more_horiz</span>
                </div>
                <span className="material-symbols-outlined text-[#737686]">local_mall</span>
              </div>
              <h3 className="text-[30px] font-bold text-[#dc2626] mb-1 truncate">$1,420,000.00</h3>
              <p className="text-[12px] text-[#dc2626]/70">Net sales for the year</p>
            </div>
          </div>

          {/* Period Analysis Section */}
          <section className="metric-card rounded-2xl p-6 border border-[#c3c6d7]/30 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-[20px] font-bold text-[#111c2d]">Period Analysis</h3>
                <p className="text-[14px] text-[#434655]">Select a date range to analyze sales performance for a specific period.</p>
              </div>
              <div className="flex items-center bg-[#f0f3ff] p-1 rounded-lg border border-[#c3c6d7]/50">
                <button className="px-4 py-1.5 rounded-md text-[12px] font-bold text-[#434655] hover:text-[#111c2d] transition-colors">7 Days</button>
                <button className="px-4 py-1.5 rounded-md text-[12px] font-bold bg-[#004ac6] text-white shadow-sm transition-all">30 Days</button>
                <button className="px-4 py-1.5 rounded-md text-[12px] font-bold text-[#434655] hover:text-[#111c2d] transition-colors">Custom</button>
              </div>
            </div>
            <div className="relative w-full pt-4 pr-4 h-[240px]">
              {/* Y-Axis Markers */}
              <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-[12px] text-[#737686] pointer-events-none pr-4 w-12 items-end border-r border-[#c3c6d7]/20">
                <span>$20k</span>
                <span>$15k</span>
                <span>$10k</span>
                <span>$5k</span>
                <span>$0</span>
              </div>
              {/* Grid Lines */}
              <div className="absolute left-12 right-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-[#c3c6d7]/10"></div>
                <div className="w-full border-t border-[#c3c6d7]/10"></div>
                <div className="w-full border-t border-[#c3c6d7]/10"></div>
                <div className="w-full border-t border-[#c3c6d7]/10"></div>
                <div className="w-full border-t border-[#c3c6d7]/30"></div>
              </div>
              {/* Chart Area */}
              <div className="absolute left-12 right-0 top-4 bottom-8">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25"></stop>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M 0 100 Q 150 15, 333 45 T 666 30 T 1000 5 L 1000 100 L 0 100 Z" fill="url(#chartGradient)"></path>
                  <path d="M 0 100 Q 150 15, 333 45 T 666 30 T 1000 5" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"></path>
                  <circle cx="0" cy="100" fill="white" r="4" stroke="#2563eb" strokeWidth="2"></circle>
                  <circle cx="333" cy="45" fill="white" r="4" stroke="#2563eb" strokeWidth="2"></circle>
                  <circle cx="666" cy="30" fill="white" r="4" stroke="#2563eb" strokeWidth="2"></circle>
                  <circle cx="1000" cy="5" fill="#2563eb" r="5" stroke="white" strokeWidth="2"></circle>
                </svg>
              </div>
              {/* X-Axis Labels */}
              <div className="absolute left-12 right-0 bottom-0 flex justify-between pt-2">
                <span className="text-[12px] text-[#434655]">30 days ago</span>
                <span className="text-[12px] text-[#434655]">20 days ago</span>
                <span className="text-[12px] text-[#434655]">10 days ago</span>
                <span className="text-[12px] text-[#111c2d] font-bold">Today</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
