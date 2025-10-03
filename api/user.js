// api/user.js
import request from '@/utils/request.js'; 

/**
 * 注册请求
 * @param {object} data - { nickname, email, password }
 */
export function registerRequest(data) {
    return request({
        url: '/api/v1/auth/register', 
        method: 'POST',
        data: data
    });
}

/**
 * 登录请求
 * @param {object} data - { email, password }
 */
export function loginRequest(data) {
    // [修正] 根据后端要求，登录字段名为 'username'，但值使用 email
    // FastAPI 的 OAuth2PasswordRequestForm 期望的字段名是 username
    const username = data.email; 
    const password = data.password;

    return request({
        url: '/api/v1/auth/login', 
        method: 'POST',
        header: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        // [修正] 将 data.username 改为使用我们传入的 email 值
        data: `username=${username}&password=${password}`
    });
}

