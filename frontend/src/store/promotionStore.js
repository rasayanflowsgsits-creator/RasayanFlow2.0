import { create } from 'zustand';
import api from '../services/api';
import useAppStore from './appStore';

const usePromotionStore = create((set, get) => ({
    subjects: [],
    examResults: [],
    subjectLoading: false,
    resultLoading: false,
    error: null,

    // Subjects
    fetchSubjects: async (filters = {}) => {
        set({ subjectLoading: true, error: null });
        try {
            const params = new URLSearchParams(filters);
            const res = await api.get(`/subjects?${params}`);
            set({ subjects: res.data.data, subjectLoading: false });
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, subjectLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
        }
    },

    createSubject: async (data) => {
        set({ subjectLoading: true, error: null });
        try {
            const res = await api.post('/subjects', data);
            set((state) => ({ subjects: [...state.subjects, res.data.data], subjectLoading: false }));
            useAppStore.getState().setToast({ type: 'success', message: 'Subject created successfully' });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, subjectLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return false;
        }
    },

    updateSubject: async (id, data) => {
        set({ subjectLoading: true, error: null });
        try {
            const res = await api.put(`/subjects/${id}`, data);
            set((state) => ({
                subjects: state.subjects.map((sub) => (sub._id === id ? res.data.data : sub)),
                subjectLoading: false,
            }));
            useAppStore.getState().setToast({ type: 'success', message: 'Subject updated successfully' });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, subjectLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return false;
        }
    },

    deleteSubject: async (id) => {
        set({ subjectLoading: true, error: null });
        try {
            await api.delete(`/subjects/${id}`);
            set((state) => ({
                subjects: state.subjects.filter((sub) => sub._id !== id),
                subjectLoading: false,
            }));
            useAppStore.getState().setToast({ type: 'success', message: 'Subject deleted successfully' });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, subjectLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return false;
        }
    },

    // Exam Results
    fetchExamResults: async (filters = {}) => {
        set({ resultLoading: true, error: null });
        try {
            const params = new URLSearchParams(filters);
            const res = await api.get(`/exam-results?${params}`);
            set({ examResults: res.data.data, resultLoading: false });
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
        }
    },

    createExamResult: async (data) => {
        set({ resultLoading: true, error: null });
        try {
            await api.post('/exam-results', data);
            set({ resultLoading: false });
            useAppStore.getState().setToast({ type: 'success', message: 'Result saved successfully' });
            return true;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return false;
        }
    },

    createBulkExamResults: async (data) => {
        set({ resultLoading: true, error: null });
        try {
            const res = await api.post('/exam-results/bulk', data);
            set({ resultLoading: false });
            if (res.data.data.errors && res.data.data.errors.length > 0) {
                useAppStore.getState().setToast({ type: 'warning', message: `Saved ${res.data.data.saved} results, ${res.data.data.errors.length} failed` });
            } else {
                useAppStore.getState().setToast({ type: 'success', message: `Successfully saved ${res.data.data.saved} results` });
            }
            return true;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return false;
        }
    },

    // Promotions
    evaluateBatch: async (data) => {
        set({ resultLoading: true, error: null });
        try {
            const res = await api.post('/promotions/evaluate-batch', data);
            set({ resultLoading: false });
            return res.data.data;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return null;
        }
    },

    applyPromotions: async (data) => {
        set({ resultLoading: true, error: null });
        try {
            const res = await api.post('/promotions/apply', data);
            set({ resultLoading: false });
            useAppStore.getState().setToast({ type: 'success', message: 'Promotions Applied Successfully' });
            return res.data.data;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            useAppStore.getState().setToast({ type: 'error', message: err.response?.data?.message || err.message });
            return null;
        }
    },

    getStudentHistory: async (studentId) => {
        set({ resultLoading: true, error: null });
        try {
            const res = await api.get(`/promotions/history/${studentId}`);
            set({ resultLoading: false });
            return res.data.data;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            return [];
        }
    },

    getStudentResults: async (studentId, semester) => {
        set({ resultLoading: true, error: null });
        try {
            const query = semester ? `?semester=${semester}` : '';
            const res = await api.get(`/exam-results/student/${studentId}${query}`);
            set({ resultLoading: false });
            return res.data.data;
        } catch (err) {
            set({ error: err.response?.data?.message || err.message, resultLoading: false });
            return [];
        }
    },
}));

export default usePromotionStore;
