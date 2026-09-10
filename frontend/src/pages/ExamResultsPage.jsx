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
    const [marksData, setMarksData] = useState({}); // { [studentId]: { [subjectId]: marks | { experiments: [{ marks }] } } }
    const [backlogSubjects, setBacklogSubjects] = useState([]);
    const [backlogStudentsBySubject, setBacklogStudentsBySubject] = useState({});

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

            const carriedLabSubjects = existingResults
                .filter(result => result.isLab && result.semester < Number(filterSemester) && result.subjectId)
                .map(result => ({ ...result.subjectId, type: 'lab', isBacklog: true }))
                .filter((subject, index, list) => list.findIndex(item => item._id === subject._id) === index);
            setBacklogSubjects(carriedLabSubjects);

            const studentsBySubject = {};
            existingResults
                .filter(result => result.isLab && result.semester < Number(filterSemester) && result.subjectId && result.status === 'fail')
                .forEach(result => {
                    const subjectId = result.subjectId._id;
                    if (!studentsBySubject[subjectId]) studentsBySubject[subjectId] = new Set();
                    studentsBySubject[subjectId].add(result.studentId._id);
                });
            setBacklogStudentsBySubject(studentsBySubject);

            const newMarksData = {};
            existingResults.forEach(r => {
                if (!newMarksData[r.studentId._id]) newMarksData[r.studentId._id] = {};
                if (r.isLab && Array.isArray(r.experiments) && r.experiments.length > 0) {
                    newMarksData[r.studentId._id][r.subjectId._id] = { experiments: r.experiments.map(e => ({ marks: e.marks })) };
                } else {
                    newMarksData[r.studentId._id][r.subjectId._id] = r.marks;
                }
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

    const handleExperimentChange = (studentId, subjectId, expIndex, value) => {
        setMarksData(prev => {
            const studentMarks = { ...(prev[studentId] || {}) };
            const subj = studentMarks[subjectId] || { experiments: [] };
            const exps = subj.experiments ? [...subj.experiments] : [];
            exps[expIndex] = { ...(exps[expIndex] || {}), marks: value === '' ? '' : Number(value) };
            studentMarks[subjectId] = { experiments: exps };
            return { ...prev, [studentId]: studentMarks };
        });
    };

    const handleSaveAll = async () => {
        const resultsPayload = [];

        for (const studentId of Object.keys(marksData)) {
            for (const subjectId of Object.keys(marksData[studentId])) {
                const entry = marksData[studentId][subjectId];
                if (entry === '' || entry === undefined) continue;
                if (entry && entry.experiments) {
                    // lab entry
                    const subject = [...subjects, ...backlogSubjects].find(s => s._id === subjectId);
                    const experiments = entry.experiments.map((e, idx) => ({ name: subject?.experiments?.[idx]?.name || `Exp ${idx+1}`, marks: Number(e.marks || 0), maxMarks: subject?.experiments?.[idx]?.maxMarks || 0, passingMarks: subject?.experiments?.[idx]?.passingMarks || 0 }));
                    resultsPayload.push({ studentId, subjectId, experiments });
                } else {
                    resultsPayload.push({ studentId, subjectId, marks: Number(entry) });
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
                ) : subjects.length === 0 && backlogSubjects.length === 0 ? (
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
                                            const entry = marksData[student._id]?.[sub._id] ?? '';

                                            // Lab subject: allow super-admin to set a single overall lab mark
                                            if (sub.type === 'lab') {
                                                const marksVal = (entry && (entry.marks !== undefined ? entry.marks : entry)) || '';
                                                const isPassingLab = marksVal !== '' && marksVal >= sub.passingMarks;
                                                const isFailingLab = marksVal !== '' && marksVal < sub.passingMarks;
                                                return (
                                                    <td key={sub._id} className="px-4 py-3 text-center border-r border-gray-50">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={sub.maxMarks}
                                                            value={marksVal}
                                                            onChange={(e) => handleMarkChange(student._id, sub._id, e.target.value)}
                                                            className={`w-20 text-center font-medium rounded border ${isPassingLab ? 'border-green-300 bg-green-50 text-green-700' : isFailingLab ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200'} py-1.5 text-sm focus:ring-0 focus:border-[#556b2f]`}
                                                            placeholder="Lab Marks"
                                                        />
                                                        {sub.isBacklog && <div className="text-[10px] font-bold text-red-600 mt-1">BACKLOG</div>}
                                                        {Array.isArray(sub.experiments) && sub.experiments.length > 0 ? (
                                                            <div className="text-xs text-gray-400 mt-1">Experiments defined — entering overall lab marks will be recorded as aggregate.</div>
                                                        ) : null}
                                                    </td>
                                                );
                                            }

                                            // Theory/normal subject
                                            const marks = entry ?? '';
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

            {backlogSubjects.length > 0 && (
                <div className="mt-6 bg-red-50/40 rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-red-200">
                        <h2 className="text-lg font-bold text-red-800">Backlog Subject Results</h2>
                        <p className="text-sm text-red-600 mt-1">
                            Enter backlog marks separately. These results are not included in the current-semester promotion evaluation.
                        </p>
                    </div>
                    <div className="p-4 space-y-5">
                        {backlogSubjects.map(subject => {
                            const affectedStudents = students.filter(student => backlogStudentsBySubject[subject._id]?.has(student._id));
                            return (
                                <div key={subject._id} className="bg-white rounded-lg border border-red-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-red-50 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-red-800">{subject.code}</span>
                                            <span className="ml-2 text-sm text-red-700">{subject.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-red-700">BACKLOG ONLY</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-red-100">
                                            <thead className="bg-red-50/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-red-700 uppercase">Student</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-red-700 uppercase">Marks</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-red-700 uppercase">Max / Pass</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-red-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100">
                                                {affectedStudents.map(student => {
                                                    const entry = marksData[student._id]?.[subject._id] ?? '';
                                                    const marks = entry && entry.marks !== undefined ? entry.marks : entry;
                                                    const isPassing = marks !== '' && marks >= subject.passingMarks;
                                                    return (
                                                        <tr key={student._id}>
                                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{student.name}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={subject.maxMarks}
                                                                    value={marks}
                                                                    onChange={(e) => handleMarkChange(student._id, subject._id, e.target.value)}
                                                                    className={`w-20 text-center rounded border py-1.5 text-sm ${isPassing ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}
                                                                    placeholder="Marks"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-gray-500">{subject.maxMarks} / {subject.passingMarks}</td>
                                                            <td className={`px-4 py-3 text-right text-xs font-bold ${isPassing ? 'text-green-700' : 'text-red-700'}`}>
                                                                {isPassing ? 'CLEARED' : 'BACKLOG'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
