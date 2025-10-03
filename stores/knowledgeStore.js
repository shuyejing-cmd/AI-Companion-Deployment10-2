// stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as knowledgeApi from '@/api/knowledge.js';

export const useKnowledgeStore = defineStore('knowledge', () => {
    // === State ===
    const files = ref([]);
    const isLoading = ref(true);
    const isUploading = ref(false);
    const currentCompanionId = ref(null);

    // === Actions ===
    
    /**
     * 初始化知识库并获取文件列表
     * @param {string} companionId 
     */
    const initializeKnowledgeBase = async (companionId) => {
        currentCompanionId.value = companionId;
        await fetchFiles();
    };

    /**
     * 获取文件列表
     */
    const fetchFiles = async () => {
        if (!currentCompanionId.value) return;
        isLoading.value = true;
        try {
            const fileList = await knowledgeApi.getKnowledgeFiles(currentCompanionId.value);
            files.value = fileList;
        } catch (err) {
            console.error('获取文件列表失败', err);
            uni.showToast({ title: '获取列表失败', icon: 'none' });
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * 上传文件
     * @param {string | File} fileOrPath - 文件路径或文件对象
     */
    const uploadFile = async (fileOrPath) => {
        if (!currentCompanionId.value) return;
        isUploading.value = true;
        uni.showLoading({ title: '上传中...' });
        try {
            await knowledgeApi.uploadKnowledgeFile(currentCompanionId.value, fileOrPath);
            uni.showToast({ title: '上传成功，后台处理中...', icon: 'success' });
            setTimeout(() => {
                fetchFiles();
            }, 2000);
        } catch (err) {
            console.error('上传失败', err);
            uni.showToast({ title: '上传失败', icon: 'none' });
        } finally {
            isUploading.value = false;
            uni.hideLoading();
        }
    };

    /**
     * 删除文件
     * @param {string} fileId 
     */
    const deleteFile = async (fileId) => {
        uni.showLoading({ title: '删除中...' });
        try {
            await knowledgeApi.deleteKnowledgeFile(fileId);
            uni.showToast({ title: '删除成功', icon: 'success' });
            await fetchFiles(); // 成功后刷新列表
        } catch (err) {
            console.error('删除失败', err);
            uni.showToast({ title: '删除失败', icon: 'none' });
        } finally {
            uni.hideLoading();
        }
    };

    return {
        files,
        isLoading,
        isUploading,
        initializeKnowledgeBase,
        fetchFiles,
        uploadFile,
        deleteFile
    };
});