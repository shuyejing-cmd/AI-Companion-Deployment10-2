import request from './request'; 
// 我们不再直接从这里调用 uni.request，而是统一使用封装好的 request

// --- 用户注册函数 (无需修改) ---
export function register(data) {
    return request({
        url: '/api/v1/auth/register',
        method: 'post',
        data: data 
    });
}

// --- 【核心修改】用户登录函数 ---
export function login(data) {
    // 手动拼接 x-www-form-urlencoded 格式的字符串
    // 这种方式在任何 JavaScript 环境中都兼容
    const formData = `username=${encodeURIComponent(data.email)}&password=${encodeURIComponent(data.password)}`;

    return request({
        url: '/api/v1/auth/login',
        method: 'POST',
        header: {
            // 明确告诉后端请求体的格式
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: formData
    });
}