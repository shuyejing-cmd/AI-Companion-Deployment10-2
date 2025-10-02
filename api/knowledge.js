import request from './request';
import { baseUrl } from '../config.js';
import { getToken } from '../utils/auth.js';

/**
 * 获取指定伙伴的知识文件列表
 * @param {string} companionId - 伙伴的ID
 */
export function getKnowledgeFiles(companionId) {
    return request({
        // 后端定义的正确路径是 /api/v1/companions/{companion_id}/knowledge
        url: `/api/v1/companions/${companionId}/knowledge`,
        method: 'get'
    });
}

/**
 * 为指定伙伴上传知识文件
 * @param {string} companionId - 伙伴的ID
 * @param {string} filePath - 要上传的文件的临时路径
 */
export function uploadKnowledgeFile(companionId, filePath) {
    const token = getToken();
    return new Promise((resolve, reject) => {
        uni.uploadFile({
            url: `${baseUrl}/api/v1/companions/${companionId}/knowledge`,
            filePath: filePath,
            name: 'file', // 这个 'file' 必须和后端 FastAPI.File(...) 的参数名一致
            header: {
                'Authorization': `Bearer ${token}`
            },
            success: (uploadRes) => {
                if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
                    resolve(JSON.parse(uploadRes.data));
                } else {
                    reject(uploadRes);
                }
            },
            fail: (err) => {
                reject(err);

            }
        });
    });
}

/**
 * 删除指定的知识文件
 * @param {string} fileId - 文件的ID
 */
export function deleteKnowledgeFile(fileId) {
    return request({
        url: `/api/v1/knowledge/${fileId}`,
        method: 'delete'
    });
}