import React, { useState, useCallback, useEffect } from 'react';
import { generateRssFeedFromUrl } from './services/geminiService';
import { Loader } from './components/Loader';
import { RssIcon } from './components/icons/RssIcon';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [rssFeed, setRssFeed] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [view, setView] = useState<'pretty' | 'raw'>('pretty');
  const [parsedItems, setParsedItems] = useState<RssItem[]>([]);

  useEffect(() => {
    if (rssFeed) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rssFeed, "text/xml");
        const errorNode = xmlDoc.querySelector("parsererror");

        if (errorNode) {
          throw new Error("Lỗi phân tích XML.");
        }

        const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => ({
          title: item.querySelector("title")?.textContent || 'Không có tiêu đề',
          link: item.querySelector("link")?.textContent || '#',
          description: item.querySelector("description")?.textContent || 'Không có mô tả.',
          pubDate: item.querySelector("pubDate")?.textContent || '',
        }));

        if (items.length > 0) {
          setParsedItems(items);
          setView('pretty');
        } else {
          setParsedItems([]);
          setView('raw');
        }
      } catch (e) {
        console.error("Lỗi phân tích XML:", e);
        setParsedItems([]);
        setView('raw');
      }
    } else {
      setParsedItems([]);
    }
  }, [rssFeed]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) {
      setError('Vui lòng nhập một URL trang web.');
      return;
    }
    setError(null);
    setRssFeed('');
    setIsLoading(true);

    try {
      const feed = await generateRssFeedFromUrl(url);
      setRssFeed(feed);
    } catch (err) {
      console.error(err);
      const errorMessage = (err instanceof Error) ? err.message : 'Đã xảy ra lỗi không xác định.';
      
      if (errorMessage.startsWith('API_KEY_MISSING')) {
          setError('Lỗi Cấu hình: API Key của Gemini chưa được thiết lập. Vui lòng thêm biến môi trường API_KEY vào phần cài đặt trang của bạn trên Netlify.');
      } else {
          setError('Đã xảy ra lỗi khi tạo RSS feed. Vui lòng kiểm tra URL hoặc thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  const handleCopy = useCallback(() => {
    if (rssFeed) {
      navigator.clipboard.writeText(rssFeed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rssFeed]);
  
  const handleDownload = useCallback(() => {
    if (rssFeed) {
      const blob = new Blob([rssFeed], { type: 'application/rss+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      let filename = 'feed.xml';
      try {
        const hostname = new URL(url).hostname;
        filename = `${hostname.replace(/^(www\.)?/, '').replace(/\./g, '_')}_feed.xml`;
      } catch (e) { /* ignore invalid URL for filename */ }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }
  }, [rssFeed, url]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <RssIcon className="w-10 h-10 text-orange-500" />
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              Tạo Feed RSS Tự Động
            </h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Biến bất kỳ trang web tin tức hoặc blog nào thành một RSS feed. Dán URL vào bên dưới và để AI thực hiện phần còn lại.
          </p>
        </header>

        <main>
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://vnexpress.net/so-hoa"
                className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                required
                aria-label="URL trang web"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader />
                    <span className="ml-2">Đang xử lý...</span>
                  </>
                ) : (
                  'Tạo Feed'
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6" role="alert">
              <strong className="font-bold">Lỗi! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {rssFeed && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
              <div className="flex flex-wrap justify-between items-center gap-4 p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-gray-200">Kết quả RSS Feed</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-gray-700 rounded-md p-1">
                    <button onClick={() => setView('pretty')} className={`px-3 py-1 text-sm rounded transition-colors ${view === 'pretty' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`} disabled={parsedItems.length === 0}>Xem trước</button>
                    <button onClick={() => setView('raw')} className={`px-3 py-1 text-sm rounded transition-colors ${view === 'raw' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>XML</button>
                  </div>
                   <button
                    onClick={handleDownload}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-3 rounded-md transition duration-200 flex items-center gap-2"
                    aria-label="Tải về file XML"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Tải về</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-3 rounded-md transition duration-200 flex items-center gap-2"
                    aria-label="Sao chép mã RSS"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-5 h-5 text-green-400" />
                        <span>Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-5 h-5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {view === 'raw' ? (
                <pre className="p-4 overflow-x-auto text-sm text-yellow-200 bg-gray-900 rounded-b-lg max-h-[60vh]">
                  <code className="whitespace-pre-wrap font-mono">{rssFeed}</code>
                </pre>
              ) : (
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {parsedItems.map((item, index) => (
                    <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="block bg-gray-800 p-4 rounded-md border border-gray-700 hover:border-orange-500 transition-colors duration-200">
                      <h3 className="text-lg font-bold text-orange-400">{item.title}</h3>
                      {item.pubDate && (
                        <p className="text-gray-400 text-xs mt-1 mb-2">
                           {new Date(item.pubDate).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      )}
                      <p className="text-gray-300 text-sm" dangerouslySetInnerHTML={{ __html: item.description }}></p>
                    </a>
                  ))}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;