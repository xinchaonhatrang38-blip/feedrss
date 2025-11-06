export const generateRssFeedFromUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/generate-rss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      // Cố gắng đọc lỗi từ body của response
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Lỗi máy chủ: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    // Netlify function trả về text/xml, nên chúng ta dùng response.text()
    const feedText = await response.text();
    return feedText;

  } catch (error) {
    console.error("Lỗi khi gọi Netlify Function:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("Đã xảy ra lỗi không xác định khi giao tiếp với máy chủ.");
  }
};
