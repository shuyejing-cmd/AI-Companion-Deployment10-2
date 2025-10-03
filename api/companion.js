import request from '@/utils/request.js';

export function getCompanions() {
    return request({
        url: '/api/v1/companions/', 
        method: 'get'
    });
}

export function createCompanion(data) {
    return request({
        url: '/api/v1/companions/',
        method: 'post',
        data: data
    });
}

export function getCompanionById(id) {
    return request({
        url: `/api/v1/companions/${id}`,
        method: 'get'
    });
}

export function updateCompanion(id, data) {
    return request({
        url: `/api/v1/companions/${id}`,
        method: 'patch',
        data: data
    });
}

// --- ▼▼▼ 【核心新增】 ▼▼▼ ---
// 删除一个伙伴
export function deleteCompanion(id) {
    return request({
        url: `/api/v1/companions/${id}`,
        method: 'delete'
    });
}
// --- ▲▲▲ 【核心新增】 ▲▲▲ ---