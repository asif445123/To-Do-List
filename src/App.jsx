import Navbar from "./Components/Navbar";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { FaEdit } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import html2canvas from "html2canvas";
import { domToPng } from 'modern-screenshot';

function App() {
  const [todo, setTodo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [estimated, setEstimated] = useState("");
  const [date, setDate] = useState("");
  const [todos, setTodos] = useState([]);
  const [showFinished, setshowFinished] = useState(true);
  const [activeView, setActiveView] = useState("list");
  const [selectedReportDate, setSelectedReportDate] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [priceHistory, setPriceHistory] = useState({});
  const [autoFilledPrice, setAutoFilledPrice] = useState(false);
  const [activeCompareItem, setActiveCompareItem] = useState(null);

  const isUrduText = (text = "") =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

  // ========== LOAD FROM LOCALSTORAGE ==========
  useEffect(() => {
    const todoString = localStorage.getItem("todos");
    if (todoString) setTodos(JSON.parse(todoString));

    const historyString = localStorage.getItem("priceHistory");
    if (historyString) setPriceHistory(JSON.parse(historyString));

    // ✅ آج کی تاریخ خود بخود
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
  }, []);

  const SaveToLS = (newTodos) => {
    localStorage.setItem("todos", JSON.stringify(newTodos));
  };

  const SavePriceHistory = (history) => {
    localStorage.setItem("priceHistory", JSON.stringify(history));
  };

  // ========== BUILD PRICE HISTORY ==========
  const buildPriceHistory = (allTodos) => {
    const history = {};
    allTodos.forEach((t) => {
      const key = t.todo.toLowerCase().trim();
      if (!history[key]) history[key] = [];
      const exists = history[key].find(
        (h) => h.date === t.date && h.id === t.id
      );
      if (!exists) {
        history[key].push({
          id: t.id,
          date: t.date,
          estimatedRate: t.estimatedRate,
          realAmount: t.realAmount,
          quantity: t.quantity,
          estimatedAmount: t.estimatedAmount,
          displayName: t.todo,
        });
      }
    });
    Object.keys(history).forEach((k) => {
      history[k].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return history;
  };

  // ========== HANDLE TODO INPUT ==========
  const handleChange = (e) => {
    const val = e.target.value;
    setTodo(val);
    setAutoFilledPrice(false);

    if (val.trim().length >= 1) {
      const allNames = [...new Set(todos.map((t) => t.todo))];
      const filtered = allNames.filter((name) =>
        name.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ========== SUGGESTION SELECT ==========
  const handleSelectSuggestion = (name) => {
    setTodo(name);
    setShowSuggestions(false);
    setSuggestions([]);

    const history = buildPriceHistory(todos);
    const key = name.toLowerCase().trim();
    if (history[key] && history[key].length > 0) {
      const latest = history[key][0];
      setEstimated(String(latest.estimatedRate));
      setQuantity(String(latest.quantity));
      setAutoFilledPrice(true);
    }
  };

  const handleQuantityChange = (e) => setQuantity(e.target.value);
  const handleEstimatedChange = (e) => {
    setEstimated(e.target.value);
    setAutoFilledPrice(false);
  };
  const handleDateChange = (e) => setDate(e.target.value);

  const calculateEstimatedAmount = (qty, rate) => {
    const q = parseFloat(qty);
    const r = parseFloat(rate);
    if (isNaN(q) || isNaN(r)) return 0;
    if (q < 1) return r;
    return q * r;
  };

  const toggledFinished = () => setshowFinished(!showFinished);

  // ========== ADD TODO ==========
  const handleAdd = () => {
    if (!todo.trim() || !quantity || !estimated || !date) return;
    const estTotal = calculateEstimatedAmount(quantity, estimated);

    const newItem = {
      id: uuidv4(),
      todo,
      quantity: parseFloat(quantity),
      estimatedRate: parseFloat(estimated),
      estimatedAmount: estTotal,
      realAmount: null,
      difference: null,
      isCompleted: false,
      date,
    };

    const newTodos = [...todos, newItem];
    setTodos(newTodos);
    SaveToLS(newTodos);

    const newHistory = buildPriceHistory(newTodos);
    setPriceHistory(newHistory);
    SavePriceHistory(newHistory);

    setTodo("");
    setQuantity("");
    setEstimated("");
    setAutoFilledPrice(false);
  };

  // ========== CHECKBOX ==========
  const handleCheckbox = async (e) => {
    const id = e.target.name;
    const index = todos.findIndex((item) => item.id === id);
    const newTodos = [...todos];
    newTodos[index].isCompleted = !newTodos[index].isCompleted;

    if (newTodos[index].isCompleted) {
      const result = await Swal.fire({
        text: "اصل قیمت لکھیں",
        input: "number",
        inputPlaceholder: "اصل قیمت درج کریں",
        inputAttributes: { min: 0, step: 0.01 },
        showCancelButton: true,
        confirmButtonText: "محفوظ کریں",
        cancelButtonText: "منسوخ کریں",
        inputValidator: (value) => {
          if (!value) return "براہ کرم اصل قیمت درج کریں۔";
          if (isNaN(value) || parseFloat(value) < 0)
            return "صحیح قیمت درج کریں۔";
          return null;
        },
      });

      if (!result.isConfirmed) {
        newTodos[index].isCompleted = false;
      } else {
        const r = parseFloat(result.value);
        newTodos[index].realAmount = r;
        newTodos[index].difference = newTodos[index].estimatedAmount - r;
        await Swal.fire({
          icon: "success",
          title: "اصل قیمت محفوظ ہو گئی",
          text: `اصل قیمت Rs.${r.toFixed(2)} محفوظ ہو گئی۔`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } else {
      newTodos[index].realAmount = null;
      newTodos[index].difference = null;
    }

    setTodos(newTodos);
    SaveToLS(newTodos);
    const newHistory = buildPriceHistory(newTodos);
    setPriceHistory(newHistory);
    SavePriceHistory(newHistory);
  };

  // ========== EDIT ==========
  const handleEdit = (e, id) => {
    const t = todos.find((i) => i.id === id);
    setTodo(t.todo);
    setQuantity(String(t.quantity));
    setEstimated(String(t.estimatedRate));
    setDate(t.date || "");
    const newTodos = todos.filter((item) => item.id !== id);
    setTodos(newTodos);
    SaveToLS(newTodos);
  };

  // ========== DELETE ==========
  const handleDelete = (e, id) => {
    const newTodos = todos.filter((item) => item.id !== id);
    setTodos(newTodos);
    SaveToLS(newTodos);
    const newHistory = buildPriceHistory(newTodos);
    setPriceHistory(newHistory);
    SavePriceHistory(newHistory);
  };

  // ========== HELPERS ==========
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatQuantity = (qty) => {
    if (qty < 1) return `${qty * 1000}g`;
    return qty;
  };

  // ========== GROUPING ==========
  const groupByDate = (todoList) => {
    const groups = {};
    todoList.forEach((item) => {
      const d = item.date || "no-date";
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  };

  // ========== PRICE COMPARISON ==========
  const getPriceComparisonData = () => {
    const history = buildPriceHistory(todos);
    return Object.keys(history)
      .map((key) => ({
        name: history[key][0]?.displayName || key,
        key,
        entries: history[key],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // ========== TOTALS ==========
  const allDates = [...new Set(todos.map((t) => t.date).filter(Boolean))].sort(
    (a, b) => new Date(b) - new Date(a)
  );

  const selectedReportTodos = selectedReportDate
    ? todos.filter((t) => t.date === selectedReportDate)
    : [];

  const totalEstimated = todos.reduce(
    (acc, t) => acc + (t.estimatedAmount || 0), 0
  );
  const totalReal = todos.reduce((acc, t) => acc + (t.realAmount || 0), 0);
  const totalDiff = todos.reduce((acc, t) => acc + (t.difference || 0), 0);

  const groupedTodos = groupByDate(todos);
  const priceComparisonData = getPriceComparisonData();

  // ========== BUILD SHARE MESSAGE ==========
  const buildShareMessage = (dateKey) => {
    const items = groupedTodos[dateKey] || [];
    const dateEst = items.reduce((acc, t) => acc + (t.estimatedAmount || 0), 0);
    const dateReal = items.reduce((acc, t) => acc + (t.realAmount || 0), 0);
    const dateDiff = items.reduce((acc, t) => acc + (t.difference || 0), 0);

    const lines = items.map(
      (i) =>
        `${i.todo} (${formatQuantity(i.quantity)}) - Rs.${(
          i.estimatedAmount || 0
        ).toFixed()}`
    );

    return `📅 ${formatDate(dateKey)}\n\n${lines.join(
      "\n"
    )}\n\nاندازہ: Rs.${dateEst.toFixed()}\nاصل: Rs.${dateReal.toFixed()}\nفرق: Rs.${dateDiff.toFixed()}`;
  };

  // ========== ✅ SHARE DATE AS IMAGE ==========
 const handleDownloadDateImage = async (dateKey) => {
  try {
    const items = groupedTodos[dateKey] || [];
    if (items.length === 0) {
      Swal.fire({ icon: "warning", title: "کوئی سامان نہیں" });
      return;
    }

    const dateEst = items.reduce((acc, t) => acc + (t.estimatedAmount || 0), 0);
    const dateReal = items.reduce((acc, t) => acc + (t.realAmount || 0), 0);
    const dateDiff = items.reduce((acc, t) => acc + (t.difference || 0), 0);
    const completed = items.filter((t) => t.isCompleted).length;

    // ✅ سامان کی rows
    const itemRows = items
      .map((item, idx) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9f5ff';
        const status = item.isCompleted ? '✅' : '⬜';
        const lineStyle = item.isCompleted ? 'text-decoration:line-through;color:#9ca3af;' : '';
        
        return `
          <tr style="background:${bgColor};">
            <td style="padding:10px;border-bottom:1px solid #e9d5ff;text-align:center;font-size:14px;">${status}</td>
            <td style="padding:10px;border-bottom:1px solid #e9d5ff;text-align:right;font-size:14px;${lineStyle}">
              <strong>${item.todo}</strong>
              <span style="color:#6b7280;font-size:12px;"> (${formatQuantity(item.quantity)})</span>
            </td>
            <td style="padding:10px;border-bottom:1px solid #e9d5ff;text-align:center;font-size:13px;color:#7c3aed;font-weight:bold;">
              Rs.${item.estimatedAmount?.toFixed() ?? '-'}
            </td>
            <td style="padding:10px;border-bottom:1px solid #e9d5ff;text-align:center;font-size:13px;color:#2563eb;">
              ${item.realAmount ? `Rs.${item.realAmount.toFixed()}` : '-'}
            </td>
            <td style="padding:10px;border-bottom:1px solid #e9d5ff;text-align:center;font-size:13px;font-weight:bold;color:${item.difference >= 0 ? '#16a34a' : '#dc2626'};">
              ${item.difference !== null ? `Rs.${item.difference.toFixed()}` : '-'}
            </td>
          </tr>
        `;
      })
      .join('');

    // ✅ پورا HTML template
    const htmlContent = `
      <div style="width:780px;padding:20px;background:#f5f3ff;font-family:Arial,sans-serif;direction:rtl;">
        <div style="background:#7c3aed;color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:26px;">🛒 بازار کا سامان</h1>
          <p style="margin:8px 0 0;font-size:18px;">📅 ${formatDate(dateKey)}</p>
          <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">کل ${items.length} اشیاء | ${completed} مکمل</p>
        </div>
        
        <table style="width:100%;border-collapse:collapse;background:white;">
          <thead>
            <tr style="background:#6d28d9;color:white;">
              <th style="padding:12px;text-align:center;font-size:13px;">حالت</th>
              <th style="padding:12px;text-align:right;font-size:13px;">سامان</th>
              <th style="padding:12px;text-align:center;font-size:13px;">اندازہ</th>
              <th style="padding:12px;text-align:center;font-size:13px;">اصل</th>
              <th style="padding:12px;text-align:center;font-size:13px;">فرق</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div style="background:#5b21b6;color:white;padding:18px;border-radius:0 0 10px 10px;">
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:bold;">
            <span>💰 اندازہ: Rs.${dateEst.toFixed()}</span>
            <span>💵 اصل: Rs.${dateReal.toFixed()}</span>
            <span style="color:${dateDiff >= 0 ? '#86efac' : '#fca5a5'};">
              ${dateDiff >= 0 ? '✅' : '⚠️'} فرق: Rs.${dateDiff.toFixed()}
            </span>
          </div>
        </div>

        <p style="text-align:center;margin-top:15px;color:#6b7280;font-size:11px;">
          📱 بازار لسٹ ایپ
        </p>
      </div>
    `;

    // ✅ Container بنائیں - screen سے باہر
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '780px';
    document.body.appendChild(container);

    let canvas;
    try {
      canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      document.body.removeChild(container);
    }

    // ✅ Blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Blob failed"))),
        "image/png",
        1.0
      );
    });

    const fileName = `bazaar-${dateKey}.png`;
    const file = new File([blob], fileName, { type: "image/png" });

    // ✅ شیئر
    if (navigator.share) {
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    downloadBlob(blob, fileName);
    Swal.fire({
      icon: "success",
      title: "تصویر ڈاؤن لوڈ ہو گئی",
      timer: 2000,
      showConfirmButton: false,
    });

  } catch (err) {
    console.error("Error:", err);
    Swal.fire({ icon: "error", title: "خرابی", text: err.message });
  }
};
  // ========== SHARE TEXT ONLY ==========
  const handleShareDateText = (dateKey) => {
    const message = buildShareMessage(dateKey);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  // ========== TODO CARD ==========
  const TodoCard = ({ item }) => {
    const history = buildPriceHistory(todos);
    const key = item.todo.toLowerCase().trim();
    const itemHistory = history[key] || [];
    const prevEntry = itemHistory.find((h) => h.id !== item.id);

    return (
      <div className="todo flex flex-col bg-white shadow-md rounded-lg p-3 my-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <input
              name={item.id}
              onChange={handleCheckbox}
              type="checkbox"
              checked={item.isCompleted}
            />
            <div
              dir={isUrduText(item.todo) ? "rtl" : "ltr"}
              className={`font-semibold ${
                item.isCompleted ? "line-through text-gray-400" : ""
              } ${isUrduText(item.todo) ? "urdu" : ""}`}
            >
              {item.todo}{" "}
              <span className="text-sm text-gray-500 font-normal">
                ({formatQuantity(item.quantity)})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prevEntry && prevEntry.estimatedRate !== item.estimatedRate && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${
                  item.estimatedRate > prevEntry.estimatedRate
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {item.estimatedRate > prevEntry.estimatedRate ? "▲" : "▼"}
                Rs.
                {Math.abs(
                  item.estimatedRate - prevEntry.estimatedRate
                ).toFixed()}
              </span>
            )}
            <button
              onClick={(e) => handleEdit(e, item.id)}
              className="bg-violet-500 hover:bg-violet-600 p-2 text-sm text-white rounded-md"
            >
              <FaEdit />
            </button>
            <button
              onClick={(e) => handleDelete(e, item.id)}
              className="bg-violet-500 hover:bg-violet-600 p-2 text-sm text-white rounded-md"
            >
              <AiFillDelete />
            </button>
          </div>
        </div>

        <div className="flex justify-between text-sm mt-2 text-gray-700 flex-wrap gap-1">
          <p>
            فی عدد:{" "}
            <span className="font-semibold">Rs.{item.estimatedRate}</span>
          </p>
          <p>
            اندازہ:{" "}
            <span className="font-semibold text-violet-700">
              Rs.{item.estimatedAmount?.toFixed() ?? "-"}
            </span>
          </p>
          <p>
            اصل:{" "}
            <span className="font-semibold text-blue-600">
              {item.realAmount ? `Rs.${item.realAmount.toFixed()}` : "-"}
            </span>
          </p>
          <p>
            فرق:{" "}
            <span
              className={`font-semibold ${
                item.difference >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {item.difference !== null
                ? `Rs.${item.difference.toFixed()}`
                : "-"}
            </span>
          </p>
        </div>

        {prevEntry && (
          <div className="text-xs text-gray-400 mt-1">
            آخری قیمت ({formatDate(prevEntry.date)}): Rs.
            {prevEntry.estimatedRate}/عدد
            {prevEntry.realAmount
              ? ` | اصل: Rs.${prevEntry.realAmount.toFixed()}`
              : ""}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="mx-3 md:container md:mx-auto my-5 rounded-xl p-5 bg-violet-200 min-h-[80vh]">
        <h1 className="font-bold text-center text-3xl urdu mb-4">
          بازار کے سامان کی لسٹ
        </h1>

        {/* ========== TABS ========== */}
        <div className="flex gap-2 my-4 justify-center flex-wrap">
          {[
            { id: "list", label: "📋 لسٹ" },
            { id: "report", label: "📊 تاریخ وار رپورٹ" },
            { id: "price", label: "💰 قیمت موازنہ" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-all urdu ${
                activeView === tab.id
                  ? "bg-violet-600 text-white shadow-lg"
                  : "bg-white text-violet-600 border border-violet-400 hover:bg-violet-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== LIST VIEW ==================== */}
        {activeView === "list" && (
          <>
            <div className="addTodo my-5 grid grid-cols-2 gap-3 items-center bg-white p-4 rounded-xl shadow">

              <h2 className="text-xl font-bold urdu">سامان</h2>
              <div className="relative w-full">
                <input
                  onChange={handleChange}
                  value={todo}
                  type="text"
                  placeholder="سامان کا نام لکھیں"
                  className="bg-gray-50 rounded-lg px-5 py-3 border w-full focus:outline-none focus:ring-1 focus:ring-violet-500"
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-violet-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map((s) => {
                      const history = buildPriceHistory(todos);
                      const key = s.toLowerCase().trim();
                      const latest = history[key]?.[0];
                      return (
                        <div
                          key={s}
                          onMouseDown={() => handleSelectSuggestion(s)}
                          className="px-4 py-3 hover:bg-violet-50 cursor-pointer border-b last:border-0"
                        >
                          <div className="flex justify-between items-center">
                            <span
                              className={
                                isUrduText(s)
                                  ? "urdu font-semibold"
                                  : "font-semibold"
                              }
                              dir={isUrduText(s) ? "rtl" : "ltr"}
                            >
                              {s}
                            </span>
                            {latest && (
                              <span className="text-xs text-violet-600 bg-violet-100 px-2 py-1 rounded-full ml-2">
                                آخری: Rs.{latest.estimatedRate} |{" "}
                                {formatDate(latest.date)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {autoFilledPrice && (
                <div className="col-span-2 text-center">
                  <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-semibold">
                    ✅ آخری قیمت خود بخود بھری گئی — تبدیل کر سکتے ہیں
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold urdu">تعداد</h2>
              <input
                onChange={handleQuantityChange}
                value={quantity}
                type="number"
                step="0.001"
                placeholder="جیسے کلو، گرام یا گنتی"
                className="bg-gray-50 rounded-lg px-5 py-3 border w-full focus:outline-none focus:ring-1 focus:ring-violet-500"
              />

              <h2 className="text-xl font-bold urdu">
                {quantity && parseFloat(quantity) < 1
                  ? "ٹوٹل قیمت"
                  : "فی عدد قیمت"}
              </h2>
              <input
                onChange={handleEstimatedChange}
                value={estimated}
                type="number"
                placeholder="اندازہ قیمت"
                className="bg-gray-50 rounded-lg px-5 py-3 border w-full focus:outline-none focus:ring-1 focus:ring-violet-500"
              />

              {quantity && estimated && (
                <div className="col-span-2 text-center bg-violet-100 rounded-lg py-2 font-semibold text-violet-800">
                  اندازہ ٹوٹل:{" "}
                  <span className="text-xl">
                    Rs.
                    {calculateEstimatedAmount(quantity, estimated).toFixed()}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold urdu">تاریخ</h2>
              <input
                onChange={handleDateChange}
                value={date}
                type="date"
                className="bg-gray-50 rounded-lg px-5 py-3 border w-full focus:outline-none focus:ring-1 focus:ring-violet-500"
              />

              {date && (
                <div className="col-span-2 text-center">
                  <span className="bg-violet-500 text-white px-4 py-1 rounded-full text-sm">
                    📅 {formatDate(date)} کی لسٹ میں شامل ہوگا
                  </span>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={!todo.trim() || !estimated || !quantity || !date}
                className="bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 p-3 text-xl font-bold text-white rounded-md col-span-2 w-full urdu"
              >
                ➕ شامل کریں
              </button>
            </div>

            <div className="flex items-center gap-2 my-3">
              <input
                onChange={toggledFinished}
                type="checkbox"
                checked={showFinished}
                className="w-4 h-4"
              />
              <label className="urdu">مکمل دکھائیں</label>
            </div>

            <div className="h-[1px] opacity-25 w-full my-3 bg-black"></div>

            {todos.length === 0 ? (
              <div className="text-center text-gray-500 urdu mt-10">
                کوئی سامان نہیں
              </div>
            ) : (
              Object.keys(groupedTodos).map((dateKey) => {
                const items = groupedTodos[dateKey];
                const containerId = `date-${dateKey.replace(
                  /[^a-zA-Z0-9]/g,
                  "_"
                )}`;
                const visibleItems = showFinished
                  ? items
                  : items.filter((i) => !i.isCompleted);
                if (visibleItems.length === 0) return null;

                const dateEst = items.reduce(
                  (acc, t) => acc + (t.estimatedAmount || 0),
                  0
                );
                const dateReal = items.reduce(
                  (acc, t) => acc + (t.realAmount || 0),
                  0
                );
                const dateDiff = items.reduce(
                  (acc, t) => acc + (t.difference || 0),
                  0
                );

                return (
                  <div key={dateKey} id={containerId} className="mb-6">
                    <div className="flex items-center justify-between bg-violet-600 text-white px-4 py-2 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          📅 {formatDate(dateKey)}
                        </span>
                        <div className="flex gap-1">
                          {/* ✅ تصویر شیئر بٹن */}
                          <button
                            onClick={() => handleDownloadDateImage(dateKey)}
                            className="text-sm bg-violet-800 hover:bg-violet-700 px-3 py-1 rounded-full transition-all"
                            title="تصویر شیئر کریں"
                          >
                            🖼️
                          </button>
                          {/* ✅ ٹیکسٹ شیئر بٹن */}
                          <button
                            onClick={() => handleShareDateText(dateKey)}
                            className="text-sm bg-violet-800 hover:bg-violet-700 px-3 py-1 rounded-full transition-all"
                            title="ٹیکسٹ شیئر کریں"
                          >
                            💬
                          </button>
                        </div>
                      </div>
                      <span className="text-sm bg-violet-800 px-3 py-1 rounded-full">
                        {items.length} : ٹوٹل اشیاء
                      </span>
                    </div>
                    <div className="bg-violet-50 p-3 rounded-b-lg">
                      {visibleItems.map((item) => (
                        <TodoCard key={item.id} item={item} />
                      ))}
                      <div className="flex justify-between text-sm font-semibold mt-2 bg-violet-100 p-2 rounded-lg flex-wrap gap-1">
                        <span>اندازہ: Rs.{dateEst.toFixed()}</span>
                        <span>اصل: Rs.{dateReal.toFixed()}</span>
                        <span
                          className={
                            dateDiff >= 0 ? "text-green-700" : "text-red-600"
                          }
                        >
                          فرق: Rs.{dateDiff.toFixed()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {todos.length > 0 && (
              <div className="bg-violet-700 text-white p-4 mt-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-2 text-center urdu">
                  مجموعی ٹوٹل (تمام تاریخیں)
                </h2>
                <div className="flex justify-between font-semibold flex-wrap gap-2">
                  <p>ٹوٹل اندازہ: Rs.{totalEstimated.toFixed()}</p>
                  <p>ٹوٹل اصل: Rs.{totalReal.toFixed()}</p>
                  <p>
                    ٹوٹل فرق:{" "}
                    <span
                      className={
                        totalDiff >= 0 ? "text-green-300" : "text-red-300"
                      }
                    >
                      Rs.{totalDiff.toFixed()}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== REPORT VIEW ==================== */}
        {activeView === "report" && (
          <div>
            <h2 className="text-xl font-bold text-center urdu my-3">
              تاریخ وار رپورٹ
            </h2>

            <div className="bg-white p-4 rounded-xl shadow mb-4">
              <label className="block urdu font-bold mb-2 text-violet-700">
                تاریخ منتخب کریں:
              </label>
              <select
                value={selectedReportDate}
                onChange={(e) => setSelectedReportDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">-- تاریخ چنیں --</option>
                {allDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDate(d)} (
                    {todos.filter((t) => t.date === d).length} اشیاء)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-5">
              {allDates.map((d) => {
                const dayTodos = todos.filter((t) => t.date === d);
                const dayEst = dayTodos.reduce(
                  (acc, t) => acc + (t.estimatedAmount || 0), 0
                );
                const dayReal = dayTodos.reduce(
                  (acc, t) => acc + (t.realAmount || 0), 0
                );
                const dayDiff = dayTodos.reduce(
                  (acc, t) => acc + (t.difference || 0), 0
                );
                const completed = dayTodos.filter(
                  (t) => t.isCompleted
                ).length;

                return (
                  <div
                    key={d}
                    onClick={() => setSelectedReportDate(d)}
                    className={`bg-white rounded-xl p-4 shadow cursor-pointer border-2 transition-all ${
                      selectedReportDate === d
                        ? "border-violet-600"
                        : "border-transparent hover:border-violet-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-violet-700 text-lg">
                        📅 {formatDate(d)}
                      </span>
                      <span className="text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-full">
                        {completed}/{dayTodos.length} مکمل
                      </span>
                    </div>
                    <div className="flex justify-between text-sm flex-wrap gap-1">
                      <span>اندازہ: Rs.{dayEst.toFixed()}</span>
                      <span>اصل: Rs.{dayReal.toFixed()}</span>
                      <span
                        className={
                          dayDiff >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        فرق: Rs.{dayDiff.toFixed()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full"
                        style={{
                          width: `${
                            dayTodos.length > 0
                              ? (completed / dayTodos.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedReportDate && selectedReportTodos.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-lg font-bold urdu text-violet-700 mb-3 text-center">
                  📅 {formatDate(selectedReportDate)} کی تفصیل
                </h3>
                {selectedReportTodos.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b py-2 flex-wrap gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`${
                          item.isCompleted ? "line-through text-gray-400" : ""
                        } ${isUrduText(item.todo) ? "urdu" : ""}`}
                        dir={isUrduText(item.todo) ? "rtl" : "ltr"}
                      >
                        {item.isCompleted ? "✅" : "🔲"} {item.todo}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatQuantity(item.quantity)})
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm flex-wrap">
                      <span className="text-violet-600">
                        اندازہ: Rs.{item.estimatedAmount?.toFixed() ?? "-"}
                      </span>
                      <span className="text-blue-600">
                        اصل:{" "}
                        {item.realAmount
                          ? `Rs.${item.realAmount.toFixed()}`
                          : "-"}
                      </span>
                      <span
                        className={
                          item.difference >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        فرق:{" "}
                        {item.difference !== null
                          ? `Rs.${item.difference.toFixed()}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="mt-4 bg-violet-700 text-white rounded-lg p-3">
                  <div className="flex justify-between font-bold flex-wrap gap-2">
                    <span>
                      ٹوٹل اندازہ: Rs.
                      {selectedReportTodos
                        .reduce(
                          (acc, t) => acc + (t.estimatedAmount || 0),
                          0
                        )
                        .toFixed()}
                    </span>
                    <span>
                      ٹوٹل اصل: Rs.
                      {selectedReportTodos
                        .reduce((acc, t) => acc + (t.realAmount || 0), 0)
                        .toFixed()}
                    </span>
                    <span>
                      ٹوٹل فرق: Rs.
                      {selectedReportTodos
                        .reduce((acc, t) => acc + (t.difference || 0), 0)
                        .toFixed()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {allDates.length === 0 && (
              <div className="text-center urdu text-gray-500 mt-10">
                کوئی ڈیٹا نہیں
              </div>
            )}
          </div>
        )}

        {/* ==================== PRICE COMPARISON VIEW ==================== */}
        {activeView === "price" && (
          <div>
            <h2 className="text-xl font-bold text-center urdu my-3">
              💰 قیمت موازنہ (ہر چیز کی قیمت تاریخ کے ساتھ)
            </h2>

            {priceComparisonData.length === 0 ? (
              <div className="text-center urdu text-gray-500 mt-10">
                کوئی ڈیٹا نہیں
              </div>
            ) : (
              priceComparisonData.map((item) => {
                const isOpen = activeCompareItem === item.key;
                const latest = item.entries[0];
                const oldest = item.entries[item.entries.length - 1];
                const overallChange =
                  item.entries.length > 1
                    ? latest.estimatedRate - oldest.estimatedRate
                    : 0;

                return (
                  <div
                    key={item.key}
                    className="bg-white rounded-xl shadow mb-4 overflow-hidden"
                  >
                    <div
                      className="flex justify-between items-center p-4 cursor-pointer hover:bg-violet-50"
                      onClick={() =>
                        setActiveCompareItem(isOpen ? null : item.key)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold text-lg ${
                            isUrduText(item.name) ? "urdu" : ""
                          }`}
                          dir={isUrduText(item.name) ? "rtl" : "ltr"}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-full">
                          {item.entries.length} : کتنی مرتبہ خریدا
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.entries.length > 1 && (
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              overallChange > 0
                                ? "bg-red-100 text-red-600"
                                : overallChange < 0
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {overallChange > 0
                              ? `▲ Rs.${overallChange.toFixed()}`
                              : overallChange < 0
                              ? `▼ Rs.${Math.abs(overallChange).toFixed()}`
                              : "مستحکم"}
                          </span>
                        )}
                        <span className="text-violet-400">
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 pb-3 flex gap-4 flex-wrap text-sm border-t bg-violet-50">
                      <span className="mt-2">
                        تازہ قیمت:{" "}
                        <strong className="text-violet-700">
                          Rs.{latest.estimatedRate}
                        </strong>
                      </span>
                      <span className="mt-2">
                        تاریخ: <strong>{formatDate(latest.date)}</strong>
                      </span>
                      {latest.realAmount && (
                        <span className="mt-2">
                          اصل قیمت:{" "}
                          <strong className="text-blue-600">
                            Rs.{latest.realAmount.toFixed()}
                          </strong>
                        </span>
                      )}
                    </div>

                    {isOpen && (
                      <div className="p-4 border-t">
                        <h4 className="font-bold urdu mb-3 text-violet-700">
                          قیمت کی تاریخ:
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-violet-600 text-white">
                                <th className="p-2 text-left rounded-tl-lg">
                                  تاریخ
                                </th>
                                <th className="p-2 text-center">تعداد</th>
                                <th className="p-2 text-center">
                                  فی عدد قیمت
                                </th>
                                <th className="p-2 text-center">
                                  اندازہ ٹوٹل
                                </th>
                                <th className="p-2 text-center">اصل ٹوٹل</th>
                                <th className="p-2 text-center rounded-tr-lg">
                                  تبدیلی
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.entries.map((entry, idx) => {
                                const nextEntry = item.entries[idx + 1];
                                const change = nextEntry
                                  ? entry.estimatedRate -
                                    nextEntry.estimatedRate
                                  : null;

                                return (
                                  <tr
                                    key={entry.id}
                                    className={`border-b ${
                                      idx === 0
                                        ? "bg-violet-50 font-semibold"
                                        : "bg-white"
                                    }`}
                                  >
                                    <td className="p-2">
                                      {formatDate(entry.date)}
                                      {idx === 0 && (
                                        <span className="ml-1 text-xs bg-green-100 text-green-600 px-1 rounded">
                                          تازہ
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      {formatQuantity(entry.quantity)}
                                    </td>
                                    <td className="p-2 text-center">
                                      Rs.{entry.estimatedRate}
                                    </td>
                                    <td className="p-2 text-center text-violet-700">
                                      Rs.
                                      {entry.estimatedAmount?.toFixed() ?? "-"}
                                    </td>
                                    <td className="p-2 text-center text-blue-600">
                                      {entry.realAmount
                                        ? `Rs.${entry.realAmount.toFixed()}`
                                        : "-"}
                                    </td>
                                    <td className="p-2 text-center">
                                      {change !== null ? (
                                        <span
                                          className={`font-bold ${
                                            change > 0
                                              ? "text-red-500"
                                              : change < 0
                                              ? "text-green-500"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {change > 0
                                            ? `▲ Rs.${change.toFixed()}`
                                            : change < 0
                                            ? `▼ Rs.${Math.abs(
                                                change
                                              ).toFixed()}`
                                            : "—"}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">
                                          پہلی بار
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {item.entries.length > 1 && (
                          <div className="mt-4">
                            <h4 className="font-bold urdu mb-2 text-violet-700">
                              قیمت کا گراف:
                            </h4>
                            <div className="flex items-end gap-2 h-24 bg-gray-50 p-2 rounded-lg">
                              {[...item.entries].reverse().map((entry) => {
                                const maxRate = Math.max(
                                  ...item.entries.map((e) => e.estimatedRate)
                                );
                                const heightPct =
                                  (entry.estimatedRate / maxRate) * 100;
                                return (
                                  <div
                                    key={entry.id}
                                    className="flex flex-col items-center flex-1"
                                  >
                                    <span className="text-xs mb-1 font-bold text-violet-700">
                                      {entry.estimatedRate}
                                    </span>
                                    <div
                                      className="w-full rounded-t-md bg-violet-500 transition-all"
                                      style={{ height: `${heightPct}%` }}
                                      title={`Rs.${entry.estimatedRate} - ${formatDate(entry.date)}`}
                                    />
                                    <span className="text-xs mt-1 text-gray-500 text-center">
                                      {formatDate(entry.date)
                                        .split("/")
                                        .slice(0, 2)
                                        .join("/")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default App;