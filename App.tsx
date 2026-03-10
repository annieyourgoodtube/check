import React, { useState, useEffect } from 'react';
import { Search, MapPin, FileText, Image as ImageIcon, Loader2, AlertCircle, Package, X } from 'lucide-react';

interface SheetRow {
  [key: string]: string;
}

const PROPERTIES_FOLDER_ID = '114nIDu7yX755vjF9xGtSK5iCJDC7ipqU';
const IMAGES_FOLDER_ID = '18N0jFivdi4LgOFC6W2eug6AAwV9cRk0f';

export default function App() {
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTBfFEYl_TlOiqQn-tal6dVII4wpo1eBaJVp6fhG5nsZqbUxnZ5Go4lIav7MEQjtfVqKLA-UqobCq3n/pubhtml');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [allData, setAllData] = useState<SheetRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchResults, setSearchResults] = useState<SheetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sheetUrl) return;
      setIsLoadingData(true);
      setError(null);
      
      try {
        let csvUrl = sheetUrl;
        if (csvUrl.includes('/pubhtml')) {
          csvUrl = csvUrl.replace('/pubhtml', '/pub?output=csv');
        } else if (!csvUrl.includes('output=csv')) {
          csvUrl += (csvUrl.includes('?') ? '&' : '?') + 'output=csv';
        }

        const sheetRes = await fetch(csvUrl);
        if (!sheetRes.ok) throw new Error(`無法讀取試算表，請確認網址是否正確且已發佈到網路: ${sheetRes.statusText}`);

        const csvText = await sheetRes.text();
        
        const parseRow = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const lines = csvText.split(/\r?\n/);
        if (lines.length < 2) throw new Error('No data found in the spreadsheet.');

        const headers = parseRow(lines[0]);
        const dataRows = lines.slice(1).filter(l => l.trim());
        
        const parsedData = dataRows.map(parseRow).map(row => {
          const rowObj: SheetRow = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] || '';
          });
          return rowObj;
        });

        setAllData(parsedData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || '載入資料時發生錯誤。');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchInitialData();
  }, [sheetUrl]);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) setError('Please allow popups for this site to connect your Google account.');
    } catch (err) {
      console.error('OAuth error:', err);
      setError('Failed to initiate Google Login. Check your configuration.');
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
  };

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const matchedRows = allData.filter(row => 
      Object.values(row).some(cell => String(cell).toLowerCase().includes(queryLower))
    );
    setSearchResults(matchedRows);
  }, [searchQuery, allData]);

  // Helper to extract common fields
  const getField = (row: SheetRow, keywords: string[]) => {
    const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
    return key ? row[key] : null;
  };

  const getDriveSearchUrl = (location: string, folderId: string) => {
    return `https://drive.google.com/drive/search?q=${encodeURIComponent(`title:${location} parent:${folderId}`)}`;
  };

  return (
    <div className="min-h-screen bg-[#7A132B] font-sans flex justify-center">
      <div className="w-full max-w-md bg-[#7A132B] min-h-screen relative flex flex-col">
        
        {/* Header Section */}
        <div className="bg-[#7A132B] px-6 pt-12 pb-6 z-10 relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" />
            <h1 className="text-base sm:text-xl font-bold text-white tracking-wide whitespace-nowrap">飲片性狀圖片查詢系統 <span className="text-xs sm:text-sm font-normal opacity-90">( 驗收用 )</span></h1>
          </div>
          <p className="text-white/70 text-xs mb-6 ml-8 sm:ml-10">台中慈濟醫院藥學部 • 更新日期: 2026-03-10</p>

          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="輸入儲位、品名或料號..."
              className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-inner text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </form>
        </div>

        {/* Results Section */}
        <div className="flex-1 px-4 py-2 bg-[#7A132B]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/70">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-white" />
              <p className="font-medium">載入資料中...</p>
            </div>
          ) : (searchResults.length > 0 || (!searchQuery && allData.length > 0)) ? (
            <>
              <div className="flex justify-between items-end mb-4 px-2">
                <h2 className="text-base font-medium text-white">
                  {searchQuery ? '查詢結果' : '最新資料'}
                </h2>
                <span className="text-sm text-white/90 font-medium">
                  共 {searchQuery ? searchResults.length : allData.length} 筆 (僅顯示前 10 筆)
                </span>
              </div>
              
              <div className="space-y-4 pb-8">
                {(searchQuery ? searchResults.slice(0, 10) : allData.slice(0, 10)).map((row, idx) => {
                  const name = row['品名'] || row['品茗'] || getField(row, ['品名', '品茗', 'name']) || Object.values(row)[0] || '未知品名';
                  const location = row['儲位'] || getField(row, ['儲位', 'location', '位置']) || Object.values(row)[1] || '無儲位';
                  const partNo = row['料號'] || getField(row, ['料號', 'part']) || Object.values(row)[2] || '';

                  return (
                    <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-3xl font-bold text-[#7A132B]">{name}</h3>
                        <div className="flex items-center gap-1.5 bg-rose-100 text-rose-600 px-4 py-2 rounded-full font-bold text-xl">
                          <MapPin className="w-5 h-5" />
                          {location}
                        </div>
                      </div>
                      
                      {partNo && (
                        <div className="mb-6">
                          <div className="inline-block bg-gray-50 border border-gray-100 text-rose-600 px-4 py-2 rounded-lg font-mono font-medium text-base">
                            # {partNo}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={getDriveSearchUrl(location, PROPERTIES_FOLDER_ID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 rounded-2xl font-medium transition-colors border border-blue-100"
                        >
                          <FileText className="w-4 h-4" />
                          性狀資料
                        </a>
                        <a
                          href={getDriveSearchUrl(location, IMAGES_FOLDER_ID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-3 rounded-2xl font-medium transition-colors border border-emerald-100"
                        >
                          <ImageIcon className="w-4 h-4" />
                          圖片資料
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/70">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">找不到符合的資料</p>
            </div>
          ) : null}
        </div>

        {/* Footer Section */}
        <div className="mt-auto pb-8 pt-6 text-center text-white/60 text-xs space-y-1.5 px-4">
          <p className="font-medium text-white/80">台中慈濟醫院藥學部</p>
          <p>製作：許文馨</p>
          <p>維護：胡仁珍、施瑢家、李紀賢、李家豪</p>
        </div>
      </div>
    </div>
  );
}
