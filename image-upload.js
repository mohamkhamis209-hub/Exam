/**
 * منصتك التعليمية — نظام رفع الصور
 * ImgBB image upload helper
 *
 * الاستخدام:
 *   const result = await uploadPlatformImage(file);
 *   console.log(result.url);       // رابط الصورة المباشر
 *   console.log(result.displayUrl);
 *   console.log(result.deleteUrl); // رابط حذف الصورة
 */

const IMGBB_API_KEY = "9d1d0564a17609201cad2cd4a8325c34";
const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

export async function uploadPlatformImage(file) {
    if (!(file instanceof File)) {
        throw new TypeError("يجب اختيار ملف صورة صالح.");
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("الملف المختار ليس صورة.");
    }

    if (file.size > 32 * 1024 * 1024) {
        throw new Error("حجم الصورة أكبر من 32MB.");
    }

    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", file);

    const response = await fetch(IMGBB_ENDPOINT, {
        method: "POST",
        body: formData
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        throw new Error("تعذر قراءة استجابة خدمة الصور.");
    }

    if (!response.ok || !data?.success || !data?.data) {
        throw new Error(
            data?.error?.message ||
            data?.status_txt ||
            "فشل رفع الصورة."
        );
    }

    return {
        id: data.data.id,
        title: data.data.title,
        url: data.data.url,
        displayUrl: data.data.display_url,
        thumbUrl: data.data.thumb?.url || null,
        mediumUrl: data.data.medium?.url || null,
        deleteUrl: data.data.delete_url || null
    };
}
