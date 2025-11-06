import { GoogleGenAI } from "@google/genai";
// FIX: Import the `stream` helper for streaming responses and remove `Handler` type.
import { stream, type HandlerEvent } from "@netlify/functions";

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

// FIX: Wrap the handler with the `stream` utility to enable streaming responses and fix the type error.
const handler = stream(async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lỗi Cấu hình: API Key của Gemini chưa được thiết lập trên Netlify.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const url = body.url;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL là bắt buộc.' }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = createPrompt(url);
    
    // FIX: Rename variable to avoid conflict with imported `stream` function.
    const geminiStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of geminiStream) {
          const text = chunk.text;
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
      // The body can now be a ReadableStream thanks to the `stream` wrapper.
      body: readableStream,
    };

  } catch (error) {
    console.error('Lỗi khi thực thi Netlify function:', error);
    const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định trên máy chủ.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Không thể tạo RSS feed: ${errorMessage}` }),
    };
  }
});

export { handler };
