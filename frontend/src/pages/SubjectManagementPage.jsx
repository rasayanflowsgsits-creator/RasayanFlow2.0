import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Search, Trash2, Edit } from 'lucide-react';
import usePromotionStore from '../store/promotionStore';

export default function SubjectManagementPage() {
    const { subjects, fetchSubjects, createSubject, updateSubject, deleteSubject, subjectLoading } = usePromotionStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [filterCourse, setFilterCourse] = useState('B.Pharm');
    const [filterSemester, setFilterSemester] = useState('1');

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        semester: '1',
        course: 'B.Pharm',
        year: '1',
        maxMarks: 100,
        passingMarks: 40,
        isActive: true
    });

    useEffect(() => {
        fetchSubjects({ course: filterCourse, semester: filterSemester });
    }, [filterCourse, filterSemester, fetchSubjects]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) {
            await updateSubject(editingId, formData);
        } else {
            await createSubject(formData);
        }
        setIsModalOpen(false);
        setEditingId(null);
        fetchSubjects({ course: filterCourse, semester: filterSemester });
    };

    const handleEdit = (sub) => {
        setFormData({
            name: sub.name,
            code: sub.code,
            semester: sub.semester.toString(),
            course: sub.course,
            year: sub.year.toString(),
            maxMarks: sub.maxMarks,
            passingMarks: sub.passingMarks,
            isActive: sub.isActive
        });
        setEditingId(sub._id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this subject?')) {
            await deleteSubject(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3c4e23] flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-[#71805a]" />
                        Subject Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Configure subjects and passing criteria</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', code: '', semester: filterSemester, course: filterCourse, year: Math.ceil(Number(filterSemester) / 2).toString(), maxMarks: 100, passingMarks: 40, isActive: true });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#556b2f] hover:bg-[#435525] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Subject
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                    <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="form-select text-sm rounded-lg border-gray-300">
                        <option value="B.Pharm">B.Pharm</option>
                        <option value="M.Pharm">M.Pharm</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
                    <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="form-select text-sm rounded-lg border-gray-300">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {subjectLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading subjects...</div>
                ) : subjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                        <p className="font-medium">No subjects found for this semester</p>
                        <p className="text-sm mt-1">Click 'Add Subject' to create one.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#fcfdfa]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passing Marks</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subjects.map((sub) => (
                                    <tr key={sub._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{sub.code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#556b2f]">{sub.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.maxMarks}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.passingMarks}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {sub.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleEdit(sub)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"><Edit className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(sub._id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit Subject' : 'Add Subject'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#556b2f] focus:ring focus:ring-[#556b2f] focus:ring-opacity-50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Code</label>
                                    <input type="text" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#556b2f] focus:ring focus:ring-[#556b2f] focus:ring-opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year</label>
                                    <input type="number" required min="1" max="4" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#556b2f] focus:ring focus:ring-[#556b2f] focus:ring-opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Marks</label>
                                    <input type="number" required min="1" value={formData.maxMarks} onChange={e => setFormData({ ...formData, maxMarks: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#556b2f] focus:ring focus:ring-[#556b2f] focus:ring-opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Passing Marks</label>
                                    <input type="number" required min="1" value={formData.passingMarks} onChange={e => setFormData({ ...formData, passingMarks: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#556b2f] focus:ring focus:ring-[#556b2f] focus:ring-opacity-50" />
                                </div>
                            </div>
                            <div className="flex items-center mt-2">
                                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-gray-300 text-[#556b2f] focus:ring-[#556b2f]" />
                                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Active Subject</label>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                                <button type="submit" disabled={subjectLoading} className="px-4 py-2 bg-[#556b2f] text-white rounded-lg hover:bg-[#435525] disabled:opacity-50">
                                    {subjectLoading ? 'Saving...' : 'Save Subject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
