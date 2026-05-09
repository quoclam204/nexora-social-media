export const getURL = () => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // Biến môi trường tự định nghĩa
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Biến mặc định của Vercel
        'http://localhost:3000/';

    // Đảm bảo có https và không có dấu gạch chéo ở cuối
    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
};
