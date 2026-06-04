import React, { useState } from "react";
import { TravelPlan, ExpenseItem } from "../types";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { DollarSign, Wallet, AlertTriangle, CheckCircle, Plus, Trash2, Calendar } from "lucide-react";

interface ExpenseDashboardProps {
  plan: TravelPlan;
  onUpdatePlan: (updated: TravelPlan) => void;
}

const GROUPED_COLORS = {
  Flights: "#3b82f6", // Blue
  Accommodation: "#8b5cf6", // Purple
  Activities: "#ec4899", // Pink
};

export default function ExpenseDashboard({ plan, onUpdatePlan }: ExpenseDashboardProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState<number | "">(plan.budget);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState<number | "">("");
  const [newCategory, setNewCategory] = useState<ExpenseItem["category"]>("Other");
  const [newDate, setNewDate] = useState(plan.startDate);

  const totalSpent = plan.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const budget = plan.budget;
  const percentage = Math.min(100, Math.round((totalSpent / budget) * 100));
  const isOverBudget = totalSpent > budget;

  // Helper mapping to group categories: Flights, Accommodation, Activities
  const mapToGroupCategory = (cat: string): "Flights" | "Accommodation" | "Activities" => {
    if (cat === "Flights") return "Flights";
    if (cat === "Hotels") return "Accommodation";
    return "Activities"; // Groups Activities, Food, and Other under Activities
  };

  // Grouped breakdown aggregation
  const groupSummary = plan.expenses.reduce((acc, exp) => {
    const parentCat = mapToGroupCategory(exp.category);
    acc[parentCat] = (acc[parentCat] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(GROUPED_COLORS).map((cat) => ({
    name: cat,
    value: groupSummary[cat] || 0,
  })).filter(item => item.value > 0);

  // Day-by-Day spending trend
  const sortedDates = [...new Set(plan.expenses.map((e) => e.date))].sort();
  let runningSum = 0;
  const trendData = sortedDates.map((date) => {
    const dayTotal = plan.expenses
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.amount, 0);
    runningSum += dayTotal;
    return {
      date: date.split("-").length > 2 ? `${date.split("-")[1]}/${date.split("-")[2]}` : date,
      Daily: dayTotal,
      Cumulative: runningSum,
      BudgetLimit: budget,
    };
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) return;

    const newItem: ExpenseItem = {
      id: "exp-" + Math.random().toString(36).substr(2, 9),
      title: newTitle,
      amount: Number(newAmount),
      category: newCategory,
      date: newDate,
    };

    onUpdatePlan({
      ...plan,
      expenses: [...plan.expenses, newItem],
    });

    setNewTitle("");
    setNewAmount("");
    setShowAddExpense(false);
  };

  const handleDeleteExpense = (id: string) => {
    onUpdatePlan({
      ...plan,
      expenses: plan.expenses.filter((x) => x.id !== id),
    });
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(tempBudget);
    if (!isNaN(num) && num > 0) {
      onUpdatePlan({
        ...plan,
        budget: num,
      });
      setIsEditingBudget(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="text-xl font-semibold text-white tracking-tight">Financial Overview</h3>
            <p className="text-slate-400 text-xs">Simulated cost structures managed by Flight, Hotel and Itinerary Agents.</p>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Total Budget Card */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl min-w-[160px] flex items-center gap-3 relative">
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Budget</span>
                {isEditingBudget ? (
                  <form onSubmit={handleSaveBudget} className="flex items-center gap-2 mt-1">
                    <span className="text-white text-xs font-bold">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-white/20 text-white rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-[10px] bg-blue-600 hover:bg-blue-700 px-1.5 py-0.5 rounded text-white font-bold cursor-pointer"
                    >
                      Save
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-white">${budget.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempBudget(plan.budget);
                        setIsEditingBudget(true);
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Total Spent Card */}
            <div className={`border p-4 rounded-xl min-w-[140px] flex items-center gap-3 bg-white/5 border-white/10 text-slate-100`}>
              <div className="p-2.5 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/15 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aggregate Costs</span>
                <span className="text-base font-bold text-white">${totalSpent.toLocaleString()}</span>
              </div>
            </div>

            {/* Remaining budget Card */}
            <div className={`border p-4 rounded-xl min-w-[140px] flex items-center gap-3 ${
              isOverBudget ? "bg-red-500/10 border-red-500/30 text-rose-200" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            }`}>
              <div className={`p-2.5 rounded-lg border shrink-0 ${
                isOverBudget ? "bg-red-500/20 text-red-400 border-red-500/20" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/15"
              }`}>
                {isOverBudget ? <AlertTriangle className="h-5 w-5 text-rose-400 animate-pulse" /> : <CheckCircle className="h-5 w-5 text-emerald-400" />}
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</span>
                <span className={`text-base font-bold ${isOverBudget ? "text-rose-400" : "text-emerald-400"}`}>
                  {isOverBudget ? `-$${(totalSpent - budget).toLocaleString()}` : `$${(budget - totalSpent).toLocaleString()}`}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Budget ProgressBar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              {isOverBudget ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
                  <span className="text-rose-400 font-medium">Over budget by ${(totalSpent - budget).toLocaleString()}!</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-slate-300 font-medium">Remaining savings: ${(budget - totalSpent).toLocaleString()}</span>
                </>
              )}
            </div>
            <span className="text-slate-400 font-medium">{percentage}% utilizing budget</span>
          </div>
          <div className="h-2.5 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost Charts */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Pie Chart: Categories */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Categories Breakdown</h4>
              {pieData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-500 text-xs italic">
                  No registered expenses.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="h-40 w-40 shrink-0 min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={GROUPED_COLORS[entry.name as keyof typeof GROUPED_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Legend */}
                  <div className="space-y-1.5 text-xs">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: GROUPED_COLORS[item.name as keyof typeof GROUPED_COLORS] }}
                        />
                        <span className="text-slate-400 font-medium">{item.name}:</span>
                        <span className="text-white font-bold">${item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Area Chart: Spending trend over days */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Cumulative Expense Accrual</h4>
              <div className="h-44 w-full min-h-[176px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={176}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Area type="monotone" dataKey="Cumulative" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCum)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Ledger */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-white">Ledger Details</h4>
              <button
                onClick={() => {
                  setNewDate(plan.startDate);
                  setShowAddExpense(!showAddExpense);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg border border-blue-500/20 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record Cost</span>
              </button>
            </div>

            {showAddExpense && (
              <form onSubmit={handleAddExpense} className="bg-slate-950/40 border border-white/10 p-3.5 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-150">
                <div>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    placeholder="Expense item description..."
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder-slate-500 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAmount}
                    placeholder="Amount (USD)"
                    onChange={(e) => setNewAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder-slate-500 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ExpenseItem["category"])}
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder-slate-500 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition cursor-pointer theme-dark"
                  >
                    <option value="Flights">Flights</option>
                    <option value="Hotels">Accommodation</option>
                    <option value="Activities">Activities</option>
                    <option value="Food">Food / Dining</option>
                    <option value="Other">Other / Misc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    min={plan.startDate}
                    max={plan.endDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition theme-dark scheme-dark"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Recording live...</span>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(false)}
                      className="px-2.5 py-1 text-slate-300 text-xs hover:bg-white/5 rounded font-medium border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-blue-600 border border-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Save Cost
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-custom">
              {plan.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex justify-between items-center bg-white/5 border border-white/5 hover:border-white/10 p-2.5 rounded-xl text-xs transition"
                >
                  <div className="space-y-0.5 truncate flex-1 pr-4">
                    <span className="block font-semibold text-slate-100 truncate">{exp.title}</span>
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      {mapToGroupCategory(exp.category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">${exp.amount.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Remove Expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
