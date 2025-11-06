
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API key is not configured. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const createPrompt = (url: string): string => `
Bạn là một chuyên gia phân tích nội dung web và tạo RSS feed.
Nhiệm vụ của bạn là phân tích nội dung của URL trang web tin tức được cung cấp và tạo một RSS 2.0 feed hợp lệ ở định dạng XML.

URL trang web: ${url}

Hướng dẫn:
1.  Kiểm tra trang chính của URL để xác định các bài viết tin tức mới nhất.
2.  Đối với kênh RSS chính, hãy xác định tiêu đề của trang web, URL được cung cấp làm liên kết và một mô tả ngắn gọn phù hợp.
3.  Đối với mỗi bài viết bạn xác định (cố gắng lấy ít nhất 10-15 bài viết gần đây), hãy trích xuất những thông tin sau:
    - <title>: Tiêu đề đầy đủ của bài viết.
    - <link>: URL tuyệt đối, trực tiếp đến trang bài viết.
    - <description>: Một bản tóm tắt ngắn gọn hoặc đoạn đầu tiên của bài viết.
    - <pubDate>: Ngày xuất bản, được định dạng theo tiêu chuẩn RFC 822 (ví dụ: "Sat, 07 Sep 2002 0:00:01 GMT"). Nếu bạn không thể tìm thấy ngày, bạn có thể bỏ qua thẻ này cho mục đó.
    - <guid>: Sử dụng liên kết của bài viết làm định danh duy nhất toàn cầu (globally unique identifier).
4.  Xây dựng đầu ra cuối cùng dưới dạng một khối XML duy nhất, được định dạng tốt. Không bao gồm bất kỳ văn bản giải thích nào trước hoặc sau mã XML. Phần tử gốc phải là <rss version="2.0">.
`;

export const generateRssFeedFromUrl = async (url: string): Promise<string> => {
  const prompt = createPrompt(url);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    const feedText = response.text;
    
    // Clean up potential markdown code blocks from the response
    const cleanedText = feedText.replace(/^```(xml)?\s*|```\s*$/g, '').trim();

    return cleanedText;
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API:", error);
    throw new Error("Không thể giao tiếp với Gemini API.");
  }
};
