import request from './request';

/**
 * 获取指定伙伴的历史聊天记录
 * @param {string} companionId - 伙伴的 ID
 */
export function getMessages(companionId) {
    return request({
        // 后端定义的正确路径是 GET /api/v1/chat/messages/{companion_id}
        url: `/api/v1/chat/messages/${companionId}`,
        method: 'get'
    });
}