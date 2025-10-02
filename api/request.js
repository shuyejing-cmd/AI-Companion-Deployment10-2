import { getToken, removeToken } from '@/utils/auth'; // 引入新的token工具

// 请确保您有一个 config.js 文件或直接在这里定义
const BASE_URL = 'http://120.53.230.215:8000'; // 替换成您云服务器的地址

const request = (options) => {
    return new Promise((resolve, reject) => {
        
        const token = getToken();
        const header = options.header || {};
        
        if (token) {
            header['Authorization'] = 'Bearer ' + token;
        }

        uni.request({
            url: BASE_URL + options.url,
            method: options.method || 'GET',
            header: header,
            data: options.data || {},
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else {
                    // --- 改造后的 401 错误处理 ---
                    if (res.statusCode === 401) {
                        uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
                        removeToken(); // 清除无效的token
                        // 跳转到登录页
                        uni.navigateTo({
                             url: '/pages/login/login' 
                        });
                    }
                    console.error("请求失败: ", res);
                    reject(res);
                }
            },
            fail: (err) => {
                uni.showToast({ title: '网络连接失败', icon: 'none' });
                console.error("网络错误: ", err);
                reject(err);
            }
        });
    });
};

export default request;