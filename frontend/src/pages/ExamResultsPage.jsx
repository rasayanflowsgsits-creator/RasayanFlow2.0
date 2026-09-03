import React, { useEffect, useState } from 'react';
import { ClipboardList, Save, Search, CheckCircle } from 'lucide-react';
import usePromotionStore from '../store/promotionStore';
import api from '../services/api';

export default function ExamResultsPage() {
    const { subjects, fetchSubjects, createBulkExamResults, resultLoading } = usePromotionStore();

    const [filterCourse, setFilterCourse] = useState('B.Pharm');
    const [filterSemester, setFilterSemester] = useState('1');
    const [examSession, setExamSession] = useState('2026-Jan');

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [marksData, setMarksData] = useState({}); // { [studentId]: { [subjectId]: marks } }

    const loadData = async () => {
        setLoading(true);
        // Fetch subjects first
        await fetchSubjects({ course: filterCourse, semester: filterSemester, isActive: true });

        // Fetch students in this semester/course
        try {
            const { data } = await api.get(`/users?role=student&course=${filterCourse}`);
            const filtered = data.data.filter(s => s.semester === filterSemester);
            setStudents(filtered);

            // Fetch existing exam results to pre-populate
            const res = await api.get(`/exam-results?course=${filterCourse}&semester=${filterSemester}&examSession=${examSession}`);
            const existingResults = res.data.data;

            const newMarksData = {};
            existingResults.forEach(r => {
                if (!newMarksData[r.studentId._id]) newMarksData[r.studentId._id] = {};
                newMarksData[r.studentId._id][r.subjectId._id] = r.marks;
            });
            setMarksData(newMarksData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filterCourse, filterSemester, examSession]);

    const handleMarkChange = (studentId, subjectId, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [subjectId]: value === '' ? '' : Number(value)
            }
        }));
    };

    const handleSaveAll = async () => {
        const resultsPayload = [];

        for (const studentId of Object.keys(marksData)) {
            for (const subjectId of Object.keys(marksData[studentId])) {
                const marks = marksData[studentId][subjectId];
                if (marks !== '' && marks !== undefined) {
                    resultsPayload.push({ studentId, subjectId, marks });
                }
            }
        }

        if (resultsPayload.length === 0) return alert('No marks to save');

        await createBulkExamResults({ results: resultsPayload, examSession });
        loadData();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3c4e23] flex items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-[#71805a]" />
                        Exam Results Entry
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Enter marks for students by semester and session</p>
                </div>
                <button
                    onClick={handleSaveAll}
                    disabled={resultLoading}
                    className="flex items-center gap-2 bg-[#556b2f] hover:bg-[#435525] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70"
                >
                    {resultLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                    Save All Changes
                </button>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-5 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Course</label>
                    <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="form-select bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]">
                        <option value="B.Pharm">B.Pharm</option>
                        <option value="M.Pharm">M.Pharm</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Semester</label>
                    <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="form-select bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Exam Session</label>
                    <input type="text" value={examSession} onChange={(e) => setExamSession(e.target.value)} placeholder="e.g. 2026-Jan" className="form-input bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading student roster...</div>
                ) : subjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="font-medium">No subjects found for {filterCourse} Semester {filterSemester}</p>
                        <p className="text-sm mt-1">Please create subjects first before entering marks.</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="font-medium">No students are currently in {filterCourse} Semester {filterSemester}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#fcfdfa]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-[#fcfdfa] z-10 border-r border-gray-100 whitespace-nowrap">
                                        Student Details
                                    </th>
                                    {subjects.map(sub => (
                                        <th key={sub._id} className="px-4 py-4 text-center text-xs font-semibold text-gray-600 border-r border-gray-100 whitespace-nowrap">
                                            <div className="text-sm text-[#556b2f]">{sub.code}</div>
                                            <div className="font-normal text-[10px] text-gray-400 mt-1">Max: {sub.maxMarks} / Pass: {sub.passingMarks}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {students.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-3 sticky left-0 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <div className="font-semibold text-gray-900 text-sm">{student.name}</div>
                                            <div className="text-xs font-mono text-gray-500">{student.rollNumber || 'No Roll No.'}</div>
                                        </td>
                                        {subjects.map(sub => {
                                            const marks = marksData[student._id]?.[sub._id] ?? '';
                                            const isPassing = marks !== '' && marks >= sub.passingMarks;
                                            const isFailing = marks !== '' && marks < sub.passingMarks;

                                            return (
                                                <td key={sub._id} className="px-4 py-3 text-center border-r border-gray-50">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={sub.maxMarks}
                                                        value={marks}
                                                        onChange={(e) => handleMarkChange(student._id, sub._id, e.target.value)}
                                                        className={`w-20 text-center font-medium rounded border ${isPassing ? 'border-green-300 bg-green-50 text-green-700' : isFailing ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200'} py-1.5 text-sm focus:ring-0 focus:border-[#556b2f]`}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
