import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Search, Loader2, AlertCircle, Package, MapPin, Hash, X, FileText, Image as ImageIcon } from 'lucide-react';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBfFEYl_TlOiqQn-tal6dVII4wpo1eBaJVp6fhG5nsZqbUxnZ5Go4lIav7MEQjtfVqKLA-UqobCq3n/pub?output=csv';

const CHAR_FOLDER_ID = '114nIDu7yX755vjF9xGtSK5iCJDC7ipqU';
const IMG_FOLDER_ID = '18N0jFivdi4LgOFC6W2eug6AAwV9cRk0f';

interface ItemData {
  料號: string;
  品名: string;
  儲位: string;
}

export default function App() {
  const [data, setData] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateDate, setUpdateDate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(CSV_URL);
        if (!response.ok) {
          throw new Error('無法取得資料，請稍後再試');
        }
        
        // Try to get the last modified date from headers
        const lastModified = response.headers.get('Last-Modified') || response.headers.get('Date');
        if (lastModified) {
          const date = new Date(lastModified);
          setUpdateDate(date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));
        } else {
          // Fallback to current date
          const now = new Date();
          setUpdateDate(now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));
        }

        const csvText = await response.text();
        
        Papa.parse<ItemData>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLoading(false);
          },
          error: (error: any) => {
            setError('解析資料時發生錯誤: ' + error.message);
            setLoading(false);
          }
        });
      } catch (err: any) {
        setError(err.message || '發生未知錯誤');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(item => 
      (item.料號 && item.料號.toLowerCase().includes(lowercasedTerm)) ||
      (item.品名 && item.品名.toLowerCase().includes(lowercasedTerm)) ||
      (item.儲位 && item.儲位.toLowerCase().includes(lowercasedTerm))
    );
  }, [data, searchTerm]);

  return (
    <div className="min-h-screen bg-[#881337] text-slate-900 font-sans selection:bg-rose-200 selection:text-rose-900 pb-20">
      {/* App Header */}
      <header className="sticky top-0 z-20 bg-[#4c0519]/90 backdrop-blur-md border-b border-rose-900 shadow-sm px-4 pt-5 pb-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <h1 className="text-[1.1rem] sm:text-xl font-bold text-white flex items-center gap-2 mb-1 whitespace-nowrap">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300 shrink-0" />
              <span className="truncate">飲片性狀圖片查詢系統（驗收用）</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-rose-200/80 ml-7 sm:ml-8">
              <span>台中慈濟醫院藥學部</span>
              <span>•</span>
              <span>更新日期：{updateDate || '載入中...'}</span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-3.5 border border-rose-200 rounded-2xl leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 text-base transition-all shadow-sm"
              placeholder="輸入儲位、品名或料號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-rose-200">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-rose-300" />
            <p className="font-medium">載入資料中...</p>
          </div>
        ) : error ? (
          <div className="bg-white/10 border border-rose-300/30 rounded-2xl p-4 flex items-start gap-3 text-rose-100 mt-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-300" />
            <div>
              <h3 className="font-medium">載入失敗</h3>
              <p className="text-sm mt-1 opacity-90">{error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium text-rose-200 px-1 mb-1 flex justify-between items-center">
              <span>查詢結果</span>
              <span className="bg-[#4c0519]/60 text-rose-200 px-2.5 py-0.5 rounded-full text-xs border border-rose-800/50">
                共 {filteredData.length} 筆 {filteredData.length > 5 && '(僅顯示前 5 筆)'}
              </span>
            </div>
            
            {filteredData.length === 0 ? (
              <div className="text-center py-16 text-rose-200 bg-white/5 rounded-2xl border border-rose-800/50 shadow-sm backdrop-blur-sm">
                <Package className="w-12 h-12 mx-auto text-rose-300/50 mb-3" />
                <p className="font-medium">找不到符合「{searchTerm}」的資料</p>
                <p className="text-sm mt-1 opacity-70">請嘗試其他關鍵字</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredData.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 flex flex-col gap-3 transition-transform"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <h2 className="text-3xl font-black text-rose-950 leading-tight">
                          {item.品名 || '未知品名'}
                        </h2>
                        <div className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-4 py-2.5 rounded-xl text-2xl sm:text-3xl font-black border border-rose-200 shrink-0 shadow-sm">
                          <MapPin className="w-6 h-6 sm:w-7 sm:h-7" />
                          {item.儲位 || '無'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-lg sm:text-xl text-rose-700 bg-rose-50 w-fit px-3 py-2 rounded-lg border border-rose-100">
                        <Hash className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="font-mono font-bold tracking-wider">{item.料號 || '無'}</span>
                      </div>
                    </div>

                    {/* Google Drive Links */}
                    {item.儲位 && (
                      <div className="flex gap-2 mt-1 pt-3 border-t border-slate-100">
                        <a
                          href={`https://drive.google.com/drive/search?q=parent:${CHAR_FOLDER_ID}%20${item.儲位}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors border border-blue-100"
                        >
                          <FileText className="w-4 h-4" />
                          性狀資料
                        </a>
                        <a
                          href={`https://drive.google.com/drive/search?q=parent:${IMG_FOLDER_ID}%20${item.儲位}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors border border-emerald-100"
                        >
                          <ImageIcon className="w-4 h-4" />
                          圖片資料
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto px-4 py-8 mt-8 text-center text-xs text-white/80 border-t border-rose-900/50">
        <p className="font-medium text-white mb-1">台中慈濟醫院藥學部</p>
        <p>製作：許文馨</p>
        <p>維護：胡仁珍、施瑢家、李紀賢、李家豪</p>
      </footer>
    </div>
  );
}
