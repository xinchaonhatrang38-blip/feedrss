import { GoogleGenAI } from "@google/genai";

// Trì hoãn việc khởi tạo để xử lý lỗi thiếu API key một cách an toàn.
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (ai) {
    return ai;
  }
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Ném ra một lỗi cụ thể để UI có thể bắt và xử lý.
    throw new Error("API_KEY_MISSING: API key is not configured. Please set the API_KEY environment variable in your deployment settings (e.g., Netlify).");
  }
  
  ai = new GoogleGenAI({ apiKey });
  return ai;
};


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
    - <description>: Một bản tóm tắt ngắn gọn hoặc đoạn đầu tiên của bài viết. Sử dụng CDATA để bao bọc mô tả nếu nó chứa các ký tự đặc biệt hoặc HTML.
    - <pubDate>: Ngày xuất bản, được định dạng theo tiêu chuẩn RFC 822 (ví dụ: "Sat, 07 Sep 2002 0:00:01 GMT"). Nếu bạn không thể tìm thấy ngày, bạn có thể bỏ qua thẻ này cho mục đó.
    - <guid>: Sử dụng liên kết của bài viết làm định danh duy nhất toàn cầu (globally unique identifier).
4.  Xây dựng đầu ra cuối cùng dưới dạng một khối XML duy nhất, được định dạng tốt. Không bao gồm bất kỳ văn bản giải thích nào trước hoặc sau mã XML. Phần tử gốc phải là <rss version="2.0">.
`;

export const generateRssFeedFromUrl = async (url: string): Promise<string> => {
  const prompt = createPrompt(url);

  try {
    const geminiClient = getAiClient();
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    const feedText = response.text;
    
    // Dọn dẹp các khối mã markdown có thể có từ phản hồi
    const cleanedText = feedText.replace(/^```(xml)?\s*|```\s*$/g, '').trim();

    return cleanedText;
  } catch (error) {
    // Ném lại lỗi để component UI có thể bắt và hiển thị thông báo phù hợp.
    if (error instanceof Error) {
        throw error;
    }
    console.error("Lỗi không xác định khi gọi Gemini API:", error);
    throw new Error("Không thể giao tiếp với Gemini API.");
  }
};
