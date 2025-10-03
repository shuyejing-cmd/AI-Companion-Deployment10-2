// stores/companionStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as companionApi from '@/api/companion.js';

export const useCompanionStore = defineStore('companion', () => {
    // === State ===
    const companionList = ref([]);
    const isLoading = ref(true);

    // === Actions ===

    /**
     * 获取所有AI伙伴列表
     */
    const fetchCompanions = async () => {
        isLoading.value = true;
        try {
            const res = await companionApi.getCompanions();
            companionList.value = res;
            console.log('伙伴列表已更新:', companionList.value);
        } catch (error) {
            console.error('获取伙伴列表失败', error);
            uni.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * 创建一个新的AI伙伴
     * @param {object} companionData - 新伙伴的数据
     */
    const createCompanion = async (companionData) => {
        try {
            await companionApi.createCompanion(companionData);
            uni.showToast({ title: '创建成功！', icon: 'success' });
            
            await fetchCompanions(); 

            setTimeout(() => {
                uni.navigateBack();
            }, 1500);
        } catch (error) {
            console.error("创建伙伴失败", error);
            uni.showToast({ title: '创建失败', icon: 'none' });
            throw error;
        }
    };
    
    /**
     * 更新一个已存在的AI伙伴
     * @param {string} id - 伙伴ID
     * @param {object} companionData - 要更新的数据
     */
    const updateCompanion = async (id, companionData) => {
        try {
            await companionApi.updateCompanion(id, companionData);
            uni.showToast({ title: '更新成功！', icon: 'success' });
            
            await fetchCompanions();

            setTimeout(() => {
                uni.navigateBack();
            }, 1500);
        } catch (error) {
            console.error("更新伙伴失败", error);
            uni.showToast({ title: '更新失败', icon: 'none' });
            throw error;
        }
    };

    /**
     * 【新增】删除一个AI伙伴
     * @param {string} companionId - 要删除的伙伴ID
     */
    const deleteCompanion = async (companionId) => {
        uni.showLoading({ title: '正在删除...', mask: true });
        try {
            // 1. 调用API删除后端数据
            await companionApi.deleteCompanion(companionId);
            uni.showToast({ title: '删除成功', icon: 'success' });

            // 2. 【关键】删除成功后，自动刷新伙伴列表，同步UI
            await fetchCompanions();

            // 3. 稍作延迟后，强制返回主页 (reLaunch可以清空导航栈)
            setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1500);
        } catch (err) {
            console.error('删除伙伴时发生错误', err);
            uni.showToast({ title: '删除失败', icon: 'none' });
            throw err;
        } finally {
            uni.hideLoading();
        }
    };


    // 将 state 和 actions return 出去
    return {
        companionList,
        isLoading,
        fetchCompanions,
        createCompanion,
        updateCompanion,
        deleteCompanion // <-- 【新增】在这里导出新函数
    };
});