// src/pages/DashboardPage.tsx
import React, { useState } from "react";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { IndexCards } from "../components/dashboard/IndexCards";
import { MainChart } from "../components/dashboard/MainChart";
import { DataTable } from "../components/dashboard/DataTable";
import { Treemap } from "../components/dashboard/Treemap";

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  // selectedStock format: "SYMBOL::EXCHANGE" e.g. "RELIANCE::NSE"
  const [selectedStock, setSelectedStock] = useState("RELIANCE::NSE");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");

  function handleSearch(symbol: string, exchange: "NSE" | "BSE") {
    setSelectedStock(`${symbol}::${exchange}`);
    setExchange(exchange);
  }

  // Called by Treemap or other components that pass a key like "RELIANCE::NSE"
  function handleStockSelect(stockKey: string) {
    if (!stockKey) return;
    setSelectedStock(stockKey);
  }

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar
          activeSection="dashboard"
          onSectionChange={setActiveSection}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader onSearch={handleSearch} onExchangeChange={setExchange} />
        <main className="flex-1 p-6 overflow-auto custom-scrollbar">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Index Cards */}
              <IndexCards />

              {/* Main Chart */}
              <MainChart
                selectedStock={selectedStock}
                onStockChange={setSelectedStock}
              />

              {/* Bottom Row: Data Table and Treemap */}
              <div className="grid lg:grid-cols-2 gap-6">
                <DataTable exchange={exchange} onStockSelect={handleStockSelect} />
                <Treemap onStockSelect={handleStockSelect} exchange={exchange} />

              </div>
            </div>
          )}

          {activeSection === "prediction" && (
            <div className="glass-card soft-shadow p-8 text-center">
              <h2 className="text-2xl text-white mb-4">Prediction Engine</h2>
              <p className="text-neutral-text/80">
                AI-powered stock prediction models coming soon...
              </p>
            </div>
          )}

          {activeSection === "news" && (
            <div className="glass-card soft-shadow p-8 text-center">
              <h2 className="text-2xl text-white mb-4">News Feed</h2>
              <p className="text-neutral-text/80">
                Real-time market news and sentiment analysis coming soon...
              </p>
            </div>
          )}

          {activeSection === "political" && (
            <div className="glass-card soft-shadow p-8 text-center">
              <h2 className="text-2xl text-white mb-4">Political Trading</h2>
              <p className="text-neutral-text/80">
                Political events impact analysis coming soon...
              </p>
            </div>
          )}

          {activeSection === "profile" && (
            <div className="glass-card soft-shadow p-8 text-center">
              <h2 className="text-2xl text-white mb-4">Profile</h2>
              <p className="text-neutral-text/80">
                User profile and settings coming soon...
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

