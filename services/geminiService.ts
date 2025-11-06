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
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Lỗi máy chủ: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    if (!response.body) {
      throw new Error("Response không có nội dung.");
    }

    // Đọc dữ liệu từ stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let feedText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      feedText += decoder.decode(value, { stream: true });
    }

    // Dọn dẹp các ký tự ```xml có thể bị sót lại
    const cleanedText = feedText.replace(/^```(xml)?\s*|```\s*$/g, '').trim();
    return cleanedText;

  } catch (error) {
    console.error("Lỗi khi gọi Netlify Function:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("Đã xảy ra lỗi không xác định khi giao tiếp với máy chủ.");
  }
};